// Broadcast Function - Optimized for Inbox Delivery
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
  subject: string;
  message: string;
  audience: "all" | "premium" | "free";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, message, audience }: BroadcastRequest = await req.json();

    console.log(`[${new Date().toISOString()}] Broadcast request received. Subject: ${subject}, Audience: ${audience}`);

    if (!BREVO_SMTP_KEY) {
      throw new Error("BREVO_SMTP_KEY is not configured");
    }

    // 1. Fetch Target Audience
    let query = supabase.from("profiles").select("email, full_name");
    
    if (audience === "premium") {
      query = query.eq("subscription_status", "premium");
    } else if (audience === "free") {
      query = query.neq("subscription_status", "premium");
    }
    // 'all' fetches everyone

    const { data: users, error } = await query;

    if (error) throw error;
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          stats: { success: 0, failed: 0, message: "No users found for this audience." } 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Deduplicate users by email to prevent double charging/sending
    const uniqueEmails = new Set<string>();
    const uniqueUsers = users.filter((user) => {
      if (!user.email) return false;
      const normalizedEmail = user.email.toLowerCase().trim();
      if (uniqueEmails.has(normalizedEmail)) return false;
      uniqueEmails.add(normalizedEmail);
      return true;
    });

    console.log(`Found ${users.length} raw users, ${uniqueUsers.length} unique emails.`);

    // 2. Configure Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "a06962001@smtp-brevo.com",
        pass: BREVO_SMTP_KEY,
      },
    });

    const stats = { success: 0, failed: 0 };

    // 3. Send Emails
    // Note: For large lists, this should be queued. For now, we loop (carefully).
    const emailPromises = uniqueUsers.map(async (user) => {
      if (!user.email) return;

      // Clean, Minimalist Template to avoid "Promotions" tab
      // Avoid: Large images, excessive heavy HTML, "Free", "Sale" keywords in HTML
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    
    <!-- Simple Text Header -->
    <div style="margin-bottom: 24px;">
      <h2 style="color: #008751; margin: 0;">${subject}</h2>
    </div>

    <!-- Content -->
    <div style="font-size: 16px; color: #444; white-space: pre-line;">
      ${message}
    </div>

    <!-- Footer / Unsubscribe -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #888;">
      <p style="margin: 0;">
        You are receiving this email as a member of <strong>NaijaLift</strong>.
      </p>
      <p style="margin: 8px 0 0 0;">
        <a href="https://naijalift.space/dashboard" style="color: #008751; text-decoration: none;">Manage Preferences</a>
        &nbsp;|&nbsp;
        <a href="https://naijalift.space" style="color: #008751; text-decoration: none;">Visit Website</a>
      </p>
    </div>
  </div>
</body>
</html>
      `;

      try {
        await transporter.sendMail({
          from: '"NaijaLift Updates" <info@naijalift.space>', // Changed from just "Naijalift"
          to: user.email,
          subject: subject,
          html: htmlContent,
          text: message, // Plain text fallback is crucial
          headers: {
            "List-Unsubscribe": "<https://naijalift.space/dashboard>", // Helps reputation
            "X-Entity-ID": "naijalift-broadcast"
          }
        });
        stats.success++;
      } catch (err) {
        console.error(`Failed to send to ${user.email}:`, err);
        stats.failed++;
      }
    });

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ success: true, stats }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Broadcast error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
