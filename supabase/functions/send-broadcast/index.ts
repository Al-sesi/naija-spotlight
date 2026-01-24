// Broadcast Function - Optimized with HTTP API (Fetch) & Robust Error Handling
// Uses Brevo/Resend HTTP APIs directly.
// ALWAYS returns 200 OK with error details to client to avoid generic "non-2xx" errors.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

// Environment Variables
const BREVO_API_KEY = Deno.env.get("BREVO_SMTP_KEY"); 
const RESEND_API_KEY = Deno.env.get("SECONDARY_SMTP_KEY"); 
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Helper for Consistent Responses ---
function createResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, // We use 200 even for errors to ensure the client receives the JSON body
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface BroadcastRequest {
  subject: string;
  message: string;
  audience: "all" | "premium" | "free" | "admin";
}

// --- Failover Architecture (SMTP Version - Matching Welcome Email) ---

interface EmailProvider {
  name: string;
  isConfigured(): boolean;
  send(to: string, subject: string, html: string, text: string): Promise<void>;
}

class ResendHttpProvider implements EmailProvider {
  name = "Resend (HTTP Secondary)";
  
  constructor(private apiKey?: string) {}

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async send(to: string, subject: string, html: string, text: string) {
    if (!this.apiKey) throw new Error("Resend not configured");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NaijaLift Updates <info@naijalift.space>",
        to: [to],
        subject: subject,
        html: html,
        text: text,
        headers: {
          "List-Unsubscribe": "<https://naijalift.space/dashboard>"
        }
      }),
    });

    if (!response.ok) {
      // Handle Rate Limit specifically
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      const errorText = await response.text();
      console.error(`[Resend Failure] Status: ${response.status}, Body: ${errorText}`);
      throw new Error(`Resend API error: ${response.status} - ${errorText}`);
    }
  }
}

class BrevoProvider implements EmailProvider {
  name = "Brevo (Primary)";
  private transporter: any;

  constructor(private apiKey?: string) {
    const smtpUser = Deno.env.get("BREVO_SMTP_USER") || "a06962001@smtp-brevo.com";
    if (apiKey) {
      this.transporter = nodemailer.createTransport({
        pool: true, // Use pooled connections for better performance
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: { user: smtpUser, pass: apiKey },
      });
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async send(to: string, subject: string, html: string, text: string) {
    if (!this.transporter) throw new Error("Brevo not configured");
    await this.transporter.sendMail({
      from: '"Naijalift" <info@naijalift.space>',
      to,
      subject,
      html,
      text,
    });
  }
}

class FailoverEmailService {
  private providers: EmailProvider[];

  constructor(providers: EmailProvider[]) {
    this.providers = providers.filter(p => p.isConfigured());
  }

  async send(to: string, subject: string, html: string, text: string) {
    if (this.providers.length === 0) {
      throw new Error("No email providers are configured!");
    }

    const errors: string[] = [];

    for (const provider of this.providers) {
      try {
        await provider.send(to, subject, html, text);
        return; 
      } catch (error: any) {
        const errorMessage = error.message || "Unknown error";
        console.warn(`[Failover] Failed to send via ${provider.name}: ${errorMessage}`);
        errors.push(`${provider.name}: ${errorMessage}`);
      }
    }

    throw new Error(`All providers failed. Errors: ${errors.join(" | ")}`);
  }
}

// --- Main Handler ---

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Diagnostics Check
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Missing Supabase Environment Variables (URL or Service Role Key).");
    }
    if (!BREVO_API_KEY && !RESEND_API_KEY) {
        throw new Error("Missing Email API Keys. Please configure BREVO_SMTP_KEY or SECONDARY_SMTP_KEY.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Parse Request
    let body;
    try {
        body = await req.json();
    } catch (e) {
        throw new Error("Invalid JSON body in request.");
    }

    const { subject, message, audience } = body as BroadcastRequest;

    if (!subject || !message) {
        throw new Error("Missing subject or message in request body.");
    }

    console.log(`[${new Date().toISOString()}] Broadcast: ${subject}, Audience: ${audience}`);

    // 3. Initialize Email Service
    const providers = [
      new BrevoProvider(BREVO_API_KEY),
      new ResendHttpProvider(RESEND_API_KEY)
    ];
    const emailService = new FailoverEmailService(providers);

    // 4. Fetch Users
    let users: { email: string; full_name?: string }[] = [];

    if (audience === "admin") {
      console.log("Fetching ADMIN users only...");
      users = [
        { email: "abdulmajeedsesiadam@gmail.com", full_name: "Admin Sesi" },
        { email: "naijalift01@gmail.com", full_name: "Admin NaijaLift" }
      ];
    } else {
      console.log(`Fetching ${audience} users from database...`);
      let query = supabase.from("profiles").select("email, full_name");
      
      if (audience === "premium") {
        query = query.eq("subscription_status", "premium");
      } else if (audience === "free") {
        query = query.neq("subscription_status", "premium");
      }

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(`Database error: ${dbError.message}`);
      users = data || [];
    }
    
    // Add Admin for monitoring if not already in list
    const adminEmail = "abdulmajeedsesiadam@gmail.com";
    const userList = users || [];
    // We don't force add admin to the main loop to avoid duplicate/confusion, 
    // but we will send a confirmation email to admin at the end.

    if (userList.length === 0) {
      return createResponse({ 
        success: true, 
        stats: { success: 0, failed: 0, message: "No users found for this audience." } 
      });
    }

    // 5. Deduplicate
    const uniqueEmails = new Set<string>();
    const uniqueUsers = userList.filter((user) => {
      if (!user.email) return false;
      const normalizedEmail = user.email.toLowerCase().trim();
      if (uniqueEmails.has(normalizedEmail)) return false;
      uniqueEmails.add(normalizedEmail);
      return true;
    });

    const stats = { success: 0, failed: 0, errors: [] as string[] };
    
    // 6. Send Emails (Sequential with 2-Concurrency and Rate Limiting)
    const START_TIME = Date.now();
    const TIMEOUT_MS = 50000; // 50 seconds
    const DELAY_MS = 500; // 0.5s delay between batches (Optimized for SMTP pool)

    for (let i = 0; i < uniqueUsers.length; i += 2) {
      // Safety: Stop if we are running out of time
      if (Date.now() - START_TIME > TIMEOUT_MS) {
        console.warn("Time limit reached. Stopping broadcast.");
        stats.errors.push("Time limit reached. Please run broadcast again to send to remaining users.");
        break; 
      }

      // Process 2 users at a time (or 1 if it's the last one)
      const batch = uniqueUsers.slice(i, i + 2);
      
      const promises = batch.map(async (user) => {
        if (!user.email) return;

        // Use EXACT same HTML structure as Welcome Email to ensure inbox placement
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background-color: #f0fdf4; 
      margin: 0; 
      padding: 20px; 
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%);
      padding: 0;
      border-radius: 16px; 
      box-shadow: 0 20px 60px rgba(0,135,81,0.15);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #008751 0%, #005c36 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo-text {
      font-size: 36px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 2px;
      margin: 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .tagline {
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      margin-top: 8px;
      letter-spacing: 1px;
    }
    .content { 
      padding: 40px 30px;
      text-align: center; /* Centered like welcome email */
    }
    h1 { 
      color: #008751; 
      margin: 0 0 20px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .message {
      color: #374151;
      line-height: 1.8;
      font-size: 16px;
      margin-bottom: 30px;
      text-align: left; /* Keep message left-aligned for readability */
      white-space: pre-line;
    }
    .btn { 
      display: inline-block; 
      padding: 16px 40px; 
      background: linear-gradient(135deg, #008751 0%, #006b41 100%);
      color: white; 
      text-decoration: none; 
      border-radius: 50px; 
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 10px 20px rgba(0,135,81,0.25);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e7eb; 
      font-size: 12px; 
      color: #6b7280; 
    }
    .footer a {
      color: #008751;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">NAIJALIFT</div>
      <div class="tagline">Elevating Nigerian Opportunities</div>
    </div>
    <div class="content">
      <h1>${subject}</h1>
      
      <div class="message">
        ${message}
      </div>

      <a href="https://naijalift.space/dashboard" class="btn">Go to Dashboard</a>

      <div class="footer">
        <p>© ${new Date().getFullYear()} NaijaLift. All rights reserved.</p>
        <p>Lagos, Nigeria 🇳🇬</p>
        <p>
          <a href="https://naijalift.space/dashboard">Manage Preferences</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

        try {
          await emailService.send(user.email, subject, htmlContent, message);
          stats.success++;
        } catch (err: any) {
          console.error(`Failed to send to ${user.email}:`, err);
          stats.failed++;
          const errorMsg = err.message || String(err);
          const shortError = errorMsg.substring(0, 100);
          if (stats.errors.length < 5 && !stats.errors.some(e => e.includes(shortError))) {
            stats.errors.push(`${user.email}: ${shortError}`);
          }
        }
      });

      await Promise.all(promises);

      // Rate limiting delay (only if we are not at the end)
      if (i + 2 < uniqueUsers.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    // 7. Send Admin Confirmation (Always try to send this)
    try {
      await emailService.send(
        adminEmail, 
        `[Broadcast Report] ${subject}`, 
        `<p>Broadcast completed.</p>
         <ul>
           <li>Success: ${stats.success}</li>
           <li>Failed: ${stats.failed}</li>
           <li>Errors: ${stats.errors.join(", ")}</li>
         </ul>
         <hr>
         <h3>Original Message:</h3>
         ${message}`, 
        `Broadcast Report: Success ${stats.success}, Failed ${stats.failed}`
      );
      console.log("Admin confirmation sent.");
    } catch (e) {
      console.error("Failed to send admin confirmation:", e);
    }

    return createResponse({ success: true, stats });

  } catch (error: any) {
    console.error("Critical Broadcast Error:", error);
    // Return 200 with error details so the client can display it
    return createResponse({ 
        success: false, 
        error: error.message || "Unknown server error",
        stats: { success: 0, failed: 0 }
    });
  }
};

serve(handler);
