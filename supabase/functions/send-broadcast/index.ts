// Force rebuild 2026-01-19
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");

const sendEmail = async ({ to, subject, html, text, from }: EmailOptions) => {
  if (!BREVO_SMTP_KEY) {
    throw new Error("BREVO_SMTP_KEY is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "a06962001@smtp-brevo.com",
      pass: BREVO_SMTP_KEY,
    },
  });

  const mailOptions = {
    from: from || '"Naijalift" <info@naijalift.space>',
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""), // Simple fallback if text not provided
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent to %s: %s", mailOptions.to, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email to %s:", mailOptions.to, error);
    throw error;
  }
};

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

function buildEmailHtml(subject: string, message: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f0fdf4;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    a { color: #008751; text-decoration: none; }
    .wrapper {
      width: 100%;
      padding: 24px 0;
      background-color: #f0fdf4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      border-radius: 18px;
      border: 1px solid #d1fae5;
      background: linear-gradient(145deg, #ffffff 0%, #ecfdf5 100%);
      overflow: hidden;
    }
    .header {
      padding: 24px 24px 16px 24px;
      text-align: center;
      background: linear-gradient(135deg, #008751 0%, #005c36 100%);
    }
    .logo {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .tagline {
      margin-top: 4px;
      font-size: 12px;
      color: rgba(255,255,255,0.9);
      opacity: 0.95;
    }
    .pill {
      display: inline-block;
      margin-top: 14px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      background-color: rgba(240,253,244,0.95);
      color: #065f46;
      border: 1px solid rgba(209,250,229,0.9);
    }
    .content {
      padding: 32px 24px;
      color: #374151;
      font-size: 16px;
      line-height: 1.6;
    }
    .message-body {
      background-color: #ffffff;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      margin-bottom: 24px;
    }
    .cta-wrap {
      text-align: center;
      padding: 0 24px 32px 24px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      border-radius: 999px;
      background: linear-gradient(135deg, #008751, #00a65a);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .footer {
      font-size: 11px;
      color: #6b7280;
      padding: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      background-color: #f9fafb;
    }
    h1, h2, h3 {
      color: #065f46;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">NAIJALIFT</div>
        <div class="tagline">Empowering Nigerians with Opportunities</div>
        <div class="pill">Community Update</div>
      </div>

      <div class="content">
        <div class="message-body">
          ${message.replace(/\n/g, "<br/>")}
        </div>
      </div>

      <div class="cta-wrap">
        <a href="https://naijalift.space/dashboard" class="button" target="_blank" rel="noopener noreferrer">
          Visit Dashboard
        </a>
      </div>

      <div class="footer">
        <p>
          You received this message because you are a valued member of NAIJALIFT.
        </p>
        <p style="margin-top:6px;">
          © ${new Date().getFullYear()} NAIJALIFT. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
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
    let query = supabase
      .from("profiles")
      .select("id, email, subscription_status, trial_ends_at");
    
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

    // 4. Send Emails via Brevo SMTP
    // We'll send in batches to avoid rate limits or timeouts
    
    const results = {
      success: 0,
      failed: 0
    };

    const htmlContent = buildEmailHtml(subject, message);

    // Send in parallel with limit
    const batchSize = 5;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await Promise.all(batch.map(async (recipient) => {
        if (!recipient.email) return;

        try {
          await sendEmail({
            to: recipient.email,
            subject: subject,
            html: htmlContent,
            text: message, // Plain text fallback
          });

          results.success++;
        } catch (err) {
          console.error(`Error sending to ${recipient.email}:`, err);
          results.failed++;
          // Error is logged but doesn't stop the rest of the queue
        }
      }));
    }

    return new Response(
      JSON.stringify({ message: "Broadcast completed", stats: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Broadcast error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
