import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-access-token",
};

type VerifiedResult = {
  verified: boolean;
  reference?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  paid_at?: string;
  subscription_code?: string | null;
  customer_code?: string | null;
  plan_type?: string | null;
  error?: string;
  activated?: boolean;
  already_active?: boolean;
};

function thirtyDaysFromNowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const result: VerifiedResult = { verified: false };

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("x-access-token");
    if (!authHeader) {
      return new Response(JSON.stringify({ ...result, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tokenParts = authHeader.split(" ");
    const token = tokenParts.length === 2 ? tokenParts[1] : tokenParts[0];
    if (!token) {
      return new Response(JSON.stringify({ ...result, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return new Response(JSON.stringify({ ...result, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const decoded = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(decoded);
    const userId = payload.sub;
    const userEmail = payload.email;
    if (!userId || !userEmail) {
      return new Response(JSON.stringify({ ...result, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(JSON.stringify({ ...result, error: "Payment configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference } = await req.json();
    if (!reference || typeof reference !== "string" || reference.trim().length === 0) {
      return new Response(JSON.stringify({ ...result, error: "Missing payment reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackVerifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!paystackVerifyResponse.ok) {
      const errText = await paystackVerifyResponse.text().catch(() => "");
      return new Response(
        JSON.stringify({
          ...result,
          error: `Paystack verification failed (HTTP ${paystackVerifyResponse.status}): ${errText || "Unknown"}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const paystackData = await paystackVerifyResponse.json();
    if (!paystackData?.status) {
      return new Response(
        JSON.stringify({
          ...result,
          error: paystackData?.message || "Paystack could not verify this transaction",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tx = paystackData.data || {};
    const txStatus = tx.status;
    const txGatewayResponse = tx.gateway_response || "";
    const txPaidAt = tx.paid_at;
    const txMetadata = tx.metadata || {};
    const txCustomer = tx.customer || {};
    const txSubscriptionCode = tx.subscription?.subscription_code
      || txMetadata?.subscription_code
      || tx.subscription_code
      || null;
    const txCustomerCode = txCustomer.customer_code || tx.customer_code || null;
    const metadataPlanType = txMetadata?.plan_type || null;

    result.reference = reference;
    result.amount = tx.amount;
    result.currency = tx.currency;
    result.channel = tx.channel;
    result.paid_at = txPaidAt;
    result.subscription_code = txSubscriptionCode;
    result.customer_code = txCustomerCode;
    result.plan_type = metadataPlanType;

    const success = txStatus === "success";
    if (!success) {
      return new Response(
        JSON.stringify({
          ...result,
          error: `Transaction status is ${txStatus || "unknown"} (gateway: ${txGatewayResponse || "n/a"})`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    result.verified = true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine plan: use user_id from metadata if present (matches the
    // currently-authenticated user), otherwise fall back to the JWT user.
    const effectiveUserId = (txMetadata?.user_id && typeof txMetadata.user_id === "string")
      ? txMetadata.user_id
      : userId;

    const { data: currentProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, subscription_status, plan_type, subscription_started_at, subscription_ends_at, paystack_subscription_code, paystack_customer_code")
      .eq("id", effectiveUserId)
      .maybeSingle();

    if (profileErr) {
      console.error("verify: fetch profile error:", profileErr);
    }

    if (currentProfile && currentProfile.subscription_status === "active") {
      // Already active - avoid overwriting existing longer-term dates, but
      // ensure codes are filled in and extend if within 7 days of expiry.
      const existingEnds = currentProfile.subscription_ends_at
        ? new Date(currentProfile.subscription_ends_at).getTime()
        : 0;
      const sevenDaysOut = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const needRenewalExtend = !existingEnds || existingEnds <= sevenDaysOut;

      const update: Record<string, unknown> = {
        subscription_status: "active",
        plan_type: currentProfile.plan_type || metadataPlanType || "premium_lifter",
      };
      if (txSubscriptionCode && !currentProfile.paystack_subscription_code) {
        update.paystack_subscription_code = txSubscriptionCode;
      }
      if (txCustomerCode && !currentProfile.paystack_customer_code) {
        update.paystack_customer_code = txCustomerCode;
      }
      if (needRenewalExtend) {
        update.subscription_ends_at = thirtyDaysFromNowISO();
      }

      const { error: upErr } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", effectiveUserId);
      if (upErr) console.error("verify: reactivate profile error:", upErr);

      result.already_active = true;
      result.activated = true;
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const activatePayload: Record<string, unknown> = {
      subscription_status: "active",
      plan_type: metadataPlanType || "premium_lifter",
      subscription_started_at: txPaidAt || now,
      subscription_ends_at: thirtyDaysFromNowISO(),
    };
    if (txSubscriptionCode) activatePayload.paystack_subscription_code = txSubscriptionCode;
    if (txCustomerCode) activatePayload.paystack_customer_code = txCustomerCode;

    const { error: updateErr } = await supabase
      .from("profiles")
      .update(activatePayload)
      .eq("id", effectiveUserId);

    if (updateErr) {
      console.error("verify: update profile error:", updateErr);
      return new Response(
        JSON.stringify({
          ...result,
          error: "Payment verified but we couldn't activate your subscription. Please contact support.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    result.activated = true;
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paystack-verify-transaction error:", err);
    return new Response(
      JSON.stringify({ ...result, error: err instanceof Error ? err.message : "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
