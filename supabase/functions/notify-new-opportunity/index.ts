// Notify New Opportunity - Optimized with Brevo SMTP & Robust Batching
// Uses Brevo (Primary) / Resend (Secondary) Architecture.
// ALWAYS returns 200 OK with error details.

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

// --- Types ---
type OpportunityCategory = "government" | "ngo" | "tech" | "career" | "scholarship" | "social";

interface NewOpportunityPayload {
  opportunity: {
    id: string;
    title: string;
    provider: string;
    category: OpportunityCategory;
    description: string | null;
    link: string;
    deadline: string | null;
    event_date?: string | null;
    state: string;
    is_verified: boolean;
    is_remote: boolean;
  };
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
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorText}`);
    }
  }
}

class BrevoProvider implements EmailProvider {
  name = "Brevo (Primary)";
  private transporter: any;

  constructor(private apiKey?: string) {
    if (apiKey) {
      this.transporter = nodemailer.createTransport({
        pool: true, // Use pooled connections for better performance
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

// --- Formatting Helpers ---
function formatCategoryLabel(category: OpportunityCategory): string {
  switch (category) {
    case "government": return "Government Opportunity";
    case "ngo": return "Grant / NGO Opportunity";
    case "tech": return "Tech Opportunity";
    case "career": return "Career Opportunity";
    case "scholarship": return "Scholarship";
    case "social": return "Social Event";
    default: return "Opportunity";
  }
}

function formatLocation(state: string, isRemote: boolean): string {
  if (isRemote) return "Remote / International";
  return state || "Nationwide";
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No fixed deadline";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "No fixed deadline";
  return date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

// --- Main Handler ---

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Diagnostics Check
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Missing Supabase Environment Variables.");
    }
    if (!BREVO_API_KEY && !RESEND_API_KEY) {
        throw new Error("Missing Email API Keys.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Parse Request
    let body;
    try {
        body = await req.json();
    } catch (e) {
        throw new Error("Invalid JSON body in request.");
    }

    const { opportunity } = body as NewOpportunityPayload;
    if (!opportunity) {
        throw new Error("Missing opportunity in request body.");
    }

    console.log(`[${new Date().toISOString()}] New Opportunity Alert: ${opportunity.title}`);

    // 3. Initialize Email Service
    const providers = [
      new BrevoProvider(BREVO_API_KEY),
      new ResendHttpProvider(RESEND_API_KEY)
    ];
    const emailService = new FailoverEmailService(providers);

    // 4. Fetch All Users (Filtered by active/verified if needed, currently all)
    // Note: In a real production app with thousands of users, you might want to filter this
    // or use a separate "notifications" table. For now, we broadcast to all profiles.
    console.log("Fetching all users for opportunity alert...");
    const { data: users, error: dbError } = await supabase
      .from("profiles")
      .select("email, full_name");

    if (dbError) throw new Error(`Database error: ${dbError.message}`);
    
    const userList = users || [];
    if (userList.length === 0) {
      return createResponse({ success: true, message: "No users found." });
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
    const DELAY_MS = 500; // 0.5s delay (Optimized for SMTP pool)

    const categoryLabel = formatCategoryLabel(opportunity.category);
    const location = formatLocation(opportunity.state, opportunity.is_remote);
    const deadlineText = formatDeadline(opportunity.deadline);
    const safeDescription = opportunity.description && opportunity.description.length > 100
      ? opportunity.description.substring(0, 300) + "..."
      : (opportunity.description || "We handpicked this for Nigerians who are serious about their next big move.");

    const subject = `✨ New ${categoryLabel} on NAIJALIFT`;

    for (let i = 0; i < uniqueUsers.length; i += 2) {
      if (Date.now() - START_TIME > TIMEOUT_MS) {
        console.warn("Time limit reached. Stopping alerts.");
        break; 
      }

      const batch = uniqueUsers.slice(i, i + 2);
      
      const promises = batch.map(async (user) => {
        if (!user.email) return;

        const firstName = (user.full_name || "").split(" ")[0] || "Champion";

        // Use EXACT same HTML structure as Welcome/Broadcast Email
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
      text-align: center;
    }
    h1 { 
      color: #008751; 
      margin: 0 0 20px 0;
      font-size: 24px;
      font-weight: 700;
    }
    .message {
      color: #374151;
      line-height: 1.8;
      font-size: 16px;
      margin-bottom: 30px;
      text-align: left;
    }
    .card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
      text-align: left;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .card-tag {
      display: inline-block;
      background: #ecfdf5;
      color: #008751;
      padding: 4px 12px;
      border-radius: 50px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 5px;
    }
    .card-provider {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 15px;
    }
    .meta {
      font-size: 13px;
      color: #4b5563;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #f3f4f6;
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
      <div class="tagline">Fresh Opportunity Alert</div>
    </div>
    <div class="content">
      <h1>New ${categoryLabel}</h1>
      
      <div class="message">
        Hi ${firstName}, we just found a new opportunity that matches what you're looking for.
      </div>

      <div class="card">
        <div class="card-tag">${categoryLabel}</div>
        <div class="card-title">${opportunity.title}</div>
        <div class="card-provider">${opportunity.provider}</div>
        <div class="message" style="margin-bottom:0; font-size:14px;">
          ${safeDescription}
        </div>
        <div class="meta">
          <strong>Deadline:</strong> ${deadlineText} <br>
          <strong>Location:</strong> ${location}
        </div>
      </div>

      <a href="${opportunity.link}" class="btn">View & Apply Now</a>

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
          await emailService.send(user.email, subject, htmlContent, `New Opportunity: ${opportunity.title}`);
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

      if (i + 2 < uniqueUsers.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    return createResponse({ success: true, stats });

  } catch (error: any) {
    console.error("Critical Alert Error:", error);
    return createResponse({ 
        success: false, 
        error: error.message || "Unknown server error",
        stats: { success: 0, failed: 0 }
    });
  }
};

serve(handler);