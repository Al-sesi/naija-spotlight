import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

function thirtyDaysFromNowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

function getPlanType(metadata: any, fallback: string | null): string {
  if (metadata && typeof metadata.plan_type === "string" && metadata.plan_type.trim()) {
    return metadata.plan_type;
  }
  return fallback || "premium_lifter";
}

/**
 * Resolves a user match from a webhook payload using the strategy:
 *  1. Primary: metadata.user_id (passed by paystack-initialize / paystack-verify-transaction)
 *  2. Fallback: customer email (Paystack always returns customer.email on charge events)
 * Returns a where-clause filter and the profile row, or null if no match found.
 */
async function resolveProfile(
  supabase: any,
  opts: { metadata?: any; customer?: any; customerCode?: string | null },
) {
  const userId = opts.metadata && typeof opts.metadata.user_id === "string" ? opts.metadata.user_id : null;
  const email = opts.customer && typeof opts.customer.email === "string" ? opts.customer.email : null;
  const customerCode = opts.customer && typeof opts.customer.customer_code === "string"
    ? opts.customer.customer_code
    : (typeof opts.customerCode === "string" ? opts.customerCode : null);

  if (userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) console.error("resolveProfile by id error:", error);
    if (data) return { matched_by: "id", row: data } as const;
  }

  if (email) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error) console.error("resolveProfile by email error:", error);
    if (data) return { matched_by: "email", row: data } as const;
  }

  if (customerCode) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("paystack_customer_code", customerCode)
      .maybeSingle();
    if (error) console.error("resolveProfile by customer_code error:", error);
    if (data) return { matched_by: "customer_code", row: data } as const;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event, "| reference:", event.data?.reference);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const paidAt = event.data?.paid_at || now;

    switch (event.event) {
      case "subscription.create": {
        const data = event.data || {};
        const customer = data.customer || {};
        const subscriptionCode = data.subscription_code;
        const customerCode = customer.customer_code || data.customer_code;
        const metadata = data.metadata || {};
        const planType = getPlanType(metadata, data.plan?.plan_code || null);

        const match = await resolveProfile(supabase, { metadata, customer, customerCode });
        if (!match) {
          console.error("subscription.create: no profile match for", { user_id: metadata?.user_id, email: customer.email, customerCode });
          break;
        }

        const update: Record<string, unknown> = {
          subscription_status: "active",
          plan_type: planType,
          subscription_started_at: paidAt,
          subscription_ends_at: thirtyDaysFromNowISO(),
        };
        if (subscriptionCode) update.paystack_subscription_code = subscriptionCode;
        if (customerCode) update.paystack_customer_code = customerCode;

        const { error } = await supabase
          .from("profiles")
          .update(update)
          .eq("id", match.row.id);
        if (error) console.error("subscription.create: update error:", error);
        else console.log("subscription.create: activated profile", match.row.id, "via", match.matched_by);
        break;
      }

      case "charge.success": {
        const data = event.data || {};
        const customer = data.customer || {};
        const metadata = data.metadata || {};
        const subscriptionCode =
          (data.subscription && data.subscription.subscription_code) ||
          metadata.subscription_code ||
          data.subscription_code ||
          null;
        const customerCode = customer.customer_code || data.customer_code || null;
        const planType = getPlanType(metadata, null);

        const match = await resolveProfile(supabase, { metadata, customer, customerCode });
        if (!match) {
          console.error("charge.success: no profile match for", { user_id: metadata?.user_id, email: customer.email, customerCode });
          break;
        }

        // Determine if this is an initial purchase or a renewal.
        const existing = match.row;
        const existingStatus = existing.subscription_status;
        const existingEnds = existing.subscription_ends_at
          ? new Date(existing.subscription_ends_at).getTime()
          : 0;
        const sevenDaysOut = Date.now() + 7 * 24 * 60 * 60 * 1000;
        const isRenewal =
          existingStatus === "active" &&
          !!existing.paystack_subscription_code &&
          existingEnds > 0 &&
          existingEnds <= sevenDaysOut;

        const update: Record<string, unknown> = {
          subscription_status: "active",
          plan_type: existing.plan_type || planType,
        };

        if (subscriptionCode && !existing.paystack_subscription_code) {
          update.paystack_subscription_code = subscriptionCode;
        }
        if (customerCode && !existing.paystack_customer_code) {
          update.paystack_customer_code = customerCode;
        }

        if (existingStatus !== "active" || !existing.subscription_started_at) {
          update.subscription_started_at = paidAt;
        }

        if (isRenewal || existingStatus !== "active" || !existing.subscription_ends_at) {
          update.subscription_ends_at = thirtyDaysFromNowISO();
        } else if (existingEnds <= sevenDaysOut) {
          // Extend if close to expiry even if technically still active.
          update.subscription_ends_at = thirtyDaysFromNowISO();
        }

        const { error } = await supabase
          .from("profiles")
          .update(update)
          .eq("id", match.row.id);
        if (error) console.error("charge.success: update error:", error);
        else console.log("charge.success: activated/renewed profile", match.row.id, "via", match.matched_by, isRenewal ? "(renewal)" : "(initial)");
        break;
      }

      case "invoice.payment_failed": {
        const data = event.data || {};
        const customer = data.customer || {};
        const metadata = data.metadata || {};
        const customerCode = customer.customer_code || data.customer_code || null;

        const match = await resolveProfile(supabase, { metadata, customer, customerCode });
        if (!match) break;

        const { error } = await supabase
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("id", match.row.id);
        if (error) console.error("invoice.payment_failed: update error:", error);
        else console.log("invoice.payment_failed: marked past_due", match.row.id);
        break;
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        const data = event.data || {};
        const customer = data.customer || {};
        const metadata = data.metadata || {};
        const customerCode = customer.customer_code || data.customer_code || null;

        const match = await resolveProfile(supabase, { metadata, customer, customerCode });
        if (!match) break;

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "cancelled",
            plan_type: null,
            paystack_subscription_code: null,
          })
          .eq("id", match.row.id);
        if (error) console.error("subscription cancel: update error:", error);
        else console.log("subscription.cancel: cancelled profile", match.row.id);
        break;
      }

      default:
        console.log("Unhandled event type:", event.event);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
