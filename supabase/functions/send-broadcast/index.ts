// Broadcast Function - Optimized for Inbox Delivery with Failover System
//
// PREREQUISITES FOR FAILOVER (DNS SETUP):
// 1. SPF Record (TXT @): You can only have ONE SPF record. Merge them!
//    Correct: "v=spf1 include:spf.brevo.com include:resend.com ~all"
//    Incorrect: Two separate TXT records.
//
// 2. DMARC Record (TXT _dmarc): You only need ONE DMARC record.
//    It applies to ALL providers automatically.
//    Value: "v=DMARC1; p=none; rua=mailto:youremail@example.com"
//
// 3. DKIM Records (CNAME/TXT): You MUST have separate records for each provider.
//    Brevo: mail._domainkey.yourdomain.com
//    Resend: resend._domainkey.yourdomain.com
//    They do not conflict because they use different "selectors" (prefixes).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");
// Add your secondary provider key here in Supabase secrets
const SECONDARY_SMTP_KEY = Deno.env.get("SECONDARY_SMTP_KEY"); 

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

// --- Failover Architecture ---

interface EmailProvider {
  name: string;
  isConfigured(): boolean;
  send(to: string, subject: string, html: string, text: string): Promise<void>;
}

class BrevoProvider implements EmailProvider {
  name = "Brevo (Primary)";
  private transporter: any;

  constructor(private apiKey?: string) {
    if (apiKey) {
      this.transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: { user: "a06962001@smtp-brevo.com", pass: apiKey },
      });
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async send(to: string, subject: string, html: string, text: string) {
    if (!this.transporter) throw new Error("Brevo not configured");
    await this.transporter.sendMail({
        from: '"NaijaLift Updates" <info@naijalift.space>',
        to,
        subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": "<https://naijalift.space/dashboard>",
        "X-Entity-ID": "naijalift-broadcast"
      }
    });
  }
}

class ResendProvider implements EmailProvider {
  name = "Resend (Secondary)";
  private transporter: any;

  constructor(private apiKey?: string) {
    if (apiKey) {
      this.transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: apiKey },
      });
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async send(to: string, subject: string, html: string, text: string) {
    if (!this.transporter) throw new Error("Resend not configured");
    await this.transporter.sendMail({
      from: '"NaijaLift Updates" <info@send.naijalift.space>', // Ensure domain is verified in Resend too
      to,
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": "<https://naijalift.space/dashboard>",
      }
    });
  }
}

class FailoverEmailService {
  private providers: EmailProvider[];

  constructor(providers: EmailProvider[]) {
    // Only use providers that are actually configured (have API keys)
    this.providers = providers.filter(p => p.isConfigured());
  }

  async send(to: string, subject: string, html: string, text: string) {
    if (this.providers.length === 0) {
      throw new Error("No email providers are configured!");
    }

    const errors: string[] = [];

    // Try each provider in order
    for (const provider of this.providers) {
      try {
        await provider.send(to, subject, html, text);
        // If successful, log and return (stop trying others)
        // console.log(`Sent via ${provider.name}`); 
        return; 
      } catch (error: any) {
        const errorMessage = error.message || "Unknown error";
        console.warn(`[Failover] Failed to send via ${provider.name}: ${errorMessage}`);
        errors.push(`${provider.name}: ${errorMessage}`);
        
        // Continue to the next provider in the loop...
      }
    }

    // If we get here, ALL providers failed
    throw new Error(`All providers failed. Errors: ${errors.join(" | ")}`);
  }
}

// --- Main Handler ---

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, message, audience }: BroadcastRequest = await req.json();

    console.log(`[${new Date().toISOString()}] Broadcast request received. Subject: ${subject}, Audience: ${audience}`);

    // Initialize Providers
    const providers = [
      new BrevoProvider(BREVO_SMTP_KEY),
      new ResendProvider(SECONDARY_SMTP_KEY) // Will be skipped if key is missing
    ];
    const emailService = new FailoverEmailService(providers);

    // 1. Fetch Target Audience
    let query = supabase.from("profiles").select("email, full_name");
    
    if (audience === "premium") {
      query = query.eq("subscription_status", "premium");
    } else if (audience === "free") {
      query = query.neq("subscription_status", "premium");
    }

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

    // Deduplicate users
    const uniqueEmails = new Set<string>();
    const uniqueUsers = users.filter((user) => {
      if (!user.email) return false;
      const normalizedEmail = user.email.toLowerCase().trim();
      if (uniqueEmails.has(normalizedEmail)) return false;
      uniqueEmails.add(normalizedEmail);
      return true;
    });

    console.log(`Found ${users.length} raw users, ${uniqueUsers.length} unique emails.`);

    const stats = { success: 0, failed: 0 };

    // 2. Send Emails using Failover Service
    const emailPromises = uniqueUsers.map(async (user) => {
      if (!user.email) return;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="margin-bottom: 24px;">
      <h2 style="color: #008751; margin: 0;">${subject}</h2>
    </div>
    <div style="font-size: 16px; color: #444; white-space: pre-line;">
      ${message}
    </div>
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #888;">
      <p style="margin: 0;">You are receiving this email as a member of <strong>NaijaLift</strong>.</p>
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
        // The magic happens here: automatically tries Brevo, then Resend (if configured)
        await emailService.send(user.email, subject, htmlContent, message);
        stats.success++;
      } catch (err) {
        console.error(`Failed to send to ${user.email} after trying all providers:`, err);
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
