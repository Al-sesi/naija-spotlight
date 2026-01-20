import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [, token] = authHeader.split(" ");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const decoded = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(decoded);

    const userId = payload.sub;
    const userEmail = payload.email;

    if (!userId || !userEmail) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(JSON.stringify({ error: "Payment configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    // Inputs: plan (Paystack plan ID if any), categories (array), planTier ('basic' | 'ultra')
    const plan = body?.plan;
    const categories = Array.isArray(body?.categories) ? body.categories : [];
    const planTier = body?.planTier || "basic"; // 'basic' or 'ultra'

    let amount = 0;

    // Pricing Logic
    if (planTier === "ultra") {
      // Ultra Bundle: ₦1500 (150000 kobo) - Flat fee, includes SMS/WhatsApp + All Categories (presumably)
      amount = 150000;
    } else {
      // Basic Premium: ₦197 (19700 kobo) - Per Category (matches previous logic)
      const basePriceKobo = 19700;
      const categoryCount = categories.length > 0 ? categories.length : 1;
      amount = basePriceKobo * categoryCount;
    }

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userEmail,
        amount,
        currency: "NGN",
        plan: plan || undefined,
        callback_url: "https://naijalift.space/payment-callback",
        metadata: {
          user_id: userId,
          plan_type: planTier, // 'basic' or 'ultra'
          categories,
          category_count: categories.length,
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error("Paystack initialization failed:", paystackData);
      return new Response(JSON.stringify({ error: paystackData.message || "Payment initialization failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error initializing payment:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
