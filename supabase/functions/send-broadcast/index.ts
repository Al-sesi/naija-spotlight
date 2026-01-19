import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAILS = ["abdulmajeedsesiadam@gmail.com", "naijalift01@gmail.com"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastPayload {
  subject: string;
  message: string; // HTML content
  audience: "all" | "premium" | "free";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Verify Auth (Must be logged in)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // 2. Verify Admin
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      throw new Error("Forbidden: Admin access only");
    }

    const { subject, message, audience } = await req.json() as BroadcastPayload;

    if (!subject || !message) {
      throw new Error("Subject and message are required");
    }

    // 3. Fetch Target Users
    let query = supabase.from("profiles").select("id, email, first_name, subscription_status, trial_ends_at");
    
    // For now, fetch all and filter in memory for simplicity unless dataset is huge
    const { data: profiles, error: profilesError } = await query;
    
    if (profilesError) throw profilesError;
    if (!profiles) throw new Error("No profiles found");

    let recipients = profiles.filter(p => p.email); // Must have email

    // Filter by audience
    if (audience === "premium" || audience === "free") {
      const now = new Date();
      
      recipients = recipients.filter(profile => {
        // Logic from useSubscription.tsx
        const isOwner = (profile.email || "").toLowerCase() === "naijalift01@gmail.com";
        const isPremium = isOwner || (
          profile.subscription_status === "active" ||
          (profile.trial_ends_at ? new Date(profile.trial_ends_at) > now : false)
        );

        if (audience === "premium") return isPremium;
        if (audience === "free") return !isPremium;
        return true;
      });
    }

    console.log(`Found ${recipients.length} recipients for audience: ${audience}`);

    // 4. Send Emails via Resend
    // We'll send in batches to avoid rate limits or timeouts
    // For this implementation, we'll do simple iteration. For production with thousands of users, use a queue.
    
    const results = {
      success: 0,
      failed: 0
    };

    // Use a simple template
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">${subject}</h2>
        <div style="line-height: 1.6; color: #333;">
          ${message.replace(/\n/g, "<br/>")}
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">
          You received this message because you are a registered member of NAIJALIFT.
        </p>
      </div>
    `;

    // Send in parallel with limit
    const batchSize = 5;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await Promise.all(batch.map(async (recipient) => {
        if (!recipient.email) return;

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "NAIJALIFT <notifications@naijalift.com>", // Update if you have a specific sender
              to: recipient.email,
              subject: subject,
              html: htmlContent,
            }),
          });

          if (res.ok) {
            results.success++;
          } else {
            console.error(`Failed to send to ${recipient.email}:`, await res.text());
            results.failed++;
          }
        } catch (err) {
          console.error(`Error sending to ${recipient.email}:`, err);
          results.failed++;
        }
      }));
    }

    return new Response(
      JSON.stringify({ message: "Broadcast completed", stats: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Broadcast error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
