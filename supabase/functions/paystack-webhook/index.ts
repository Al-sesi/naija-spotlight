import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    
    // Verify webhook signature
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create hash to verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.event) {
      case "subscription.create": {
        const data = event.data;
        const email = data.customer?.email;
        const subscriptionCode = data.subscription_code;
        const customerCode = data.customer?.customer_code;
        
        if (email) {
          const { error } = await supabase
            .from("profiles")
            .update({
              subscription_status: "active",
              plan_type: "premium_lifter",
              paystack_subscription_code: subscriptionCode,
              paystack_customer_code: customerCode,
              subscription_started_at: new Date().toISOString(),
            })
            .eq("email", email);
          
          if (error) {
            console.error("Error updating subscription:", error);
          } else {
            console.log("Subscription created for:", email);
          }
        }
        break;
      }

      case "charge.success": {
        const data = event.data;
        const email = data.customer?.email;
        const metadata = data.metadata;
        
        // Check if this is a subscription payment
        if (metadata?.subscription_code) {
          const { error } = await supabase
            .from("profiles")
            .update({
              subscription_status: "active",
              subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("email", email);
          
          if (error) {
            console.error("Error updating charge success:", error);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const data = event.data;
        const email = data.customer?.email;
        
        if (email) {
          const { error } = await supabase
            .from("profiles")
            .update({
              subscription_status: "past_due",
            })
            .eq("email", email);
          
          if (error) {
            console.error("Error updating payment failed:", error);
          }
        }
        break;
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        const data = event.data;
        const email = data.customer?.email;
        
        if (email) {
          const { error } = await supabase
            .from("profiles")
            .update({
              subscription_status: "cancelled",
              plan_type: null,
              paystack_subscription_code: null,
            })
            .eq("email", email);
          
          if (error) {
            console.error("Error cancelling subscription:", error);
          } else {
            console.log("Subscription cancelled for:", email);
          }
        }
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
