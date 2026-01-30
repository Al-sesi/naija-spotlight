import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
}

function formatCategoryLabel(category: OpportunityCategory): string {
  switch (category) {
    case "government":
      return "Government Opportunity";
    case "ngo":
      return "Grant / NGO Opportunity";
    case "tech":
      return "Tech Opportunity";
    case "career":
      return "Career Opportunity";
    case "scholarship":
      return "Scholarship";
    case "social":
      return "Social Event";
    default:
      return "Opportunity";
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

function buildEmailHtml(opportunity: NewOpportunityPayload["opportunity"], firstName: string): string {
  const categoryLabel = formatCategoryLabel(opportunity.category);
  const location = formatLocation(opportunity.state, opportunity.is_remote);
  const deadlineText = formatDeadline(opportunity.deadline);
  const safeDescription =
    opportunity.description && opportunity.description.length > 12
      ? opportunity.description
      : "We handpicked this for Nigerians who are serious about their next big move.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>New Opportunity on NAIJALIFT</title>
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
      max-width: 560px;
      margin: 0 auto;
      border-radius: 18px;
      border: 1px solid #dcfce7;
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    .header {
      padding: 22px 22px 14px 22px;
      text-align: center;
      background: linear-gradient(135deg, #008751 0%, #005c36 100%);
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .content {
      padding: 32px 24px;
      color: #1f2937;
    }
    .greeting {
      font-size: 16px;
      color: #374151;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
      margin: 0 0 8px 0;
    }
    .provider {
      font-size: 16px;
      color: #4b5563;
      margin: 0 0 24px 0;
      font-weight: 500;
    }
    .meta-row {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .meta-tag {
      background-color: #f0fdf4;
      color: #166534;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid #bbf7d0;
    }
    .description {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 32px;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-block;
      background-color: #008751;
      color: #ffffff !important;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 135, 81, 0.2);
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #006d41;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer-text {
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.5;
      margin: 0;
    }
    .footer-links {
      margin-top: 12px;
    }
    .footer-links a {
      font-size: 12px;
      color: #6b7280;
      text-decoration: underline;
      margin: 0 8px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="logo">NAIJALIFT</h1>
      </div>
      <div class="content">
        <div class="greeting">Hello ${firstName},</div>
        
        <h2 class="title">${opportunity.title}</h2>
        <p class="provider">by ${opportunity.provider}</p>
        
        <div class="meta-row">
          <span class="meta-tag">${categoryLabel}</span>
          <span class="meta-tag">📍 ${location}</span>
          <span class="meta-tag">📅 Ends: ${deadlineText}</span>
        </div>
        
        <p class="description">
          ${safeDescription}
        </p>
        
        <div class="btn-container">
          <a href="${opportunity.link}" class="btn">View & Apply Now</a>
        </div>
      </div>
      
      <div class="footer">
        <p class="footer-text">
          You received this email because you subscribed to ${categoryLabel} alerts on NAIJALIFT.
        </p>
        <div class="footer-links">
          <a href="https://naijalift.space/dashboard/settings">Manage Alerts</a>
          <a href="https://naijalift.space/dashboard/settings">Unsubscribe</a>
        </div>
        <p class="footer-text" style="margin-top: 16px;">
          &copy; ${new Date().getFullYear()} NAIJALIFT. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    const payload = await req.json();
    const opportunity = payload.opportunity || payload.record;

    if (!opportunity) {
      throw new Error("No opportunity data found in payload");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let recipients: { email: string; fullName: string | null }[] = [];

    // Check for Test Mode
    // Note: The 'is_test_mode' property might not exist on old rows or type definition yet, 
    // so we access it safely. We should update the interface above too, but this works for runtime.
    const isTestMode = (opportunity as any).is_test_mode === true;

    if (isTestMode) {
      console.log("Test Mode enabled: Sending only to admins.");
      const adminEmails = ["abdulmajeedsesiadam@gmail.com", "naijalift01@gmail.com"];
      recipients = adminEmails.map(email => ({ email, fullName: "Admin" }));
    } else {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name") as {
        data: ProfileRow[] | null;
        error: unknown;
      };

      if (profilesError) {
        throw profilesError;
      }

      // Deduplicate recipients by email to prevent double sending
      const uniqueEmails = new Set<string>();
      if (profiles) {
        for (const p of profiles) {
          if (p.email && !uniqueEmails.has(p.email)) {
            uniqueEmails.add(p.email);
            recipients.push({
              email: p.email,
              fullName: p.full_name,
            });
          }
        }
      }
    }

    // Initialize Brevo Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "a06962001@smtp-brevo.com",
        pass: BREVO_SMTP_KEY,
      },
    });

    let sentCount = 0;
    for (const recipient of recipients) {
      const firstName =
        (recipient.fullName || "")
          .split(" ")
          .filter(Boolean)[0] || "Champion";

      const emailHtml = buildEmailHtml(opportunity, firstName);

      try {
        const textBody = `Hi ${firstName},

A new ${formatCategoryLabel(opportunity.category)} is available on NAIJALIFT:
${opportunity.title} by ${opportunity.provider}

${opportunity.description ? opportunity.description.substring(0, 200) + (opportunity.description.length > 200 ? "..." : "") : "Check it out on our platform."}

Deadline: ${formatDeadline(opportunity.deadline)}
Location: ${formatLocation(opportunity.state, opportunity.is_remote)}

View full details: ${opportunity.link}

To manage your alerts, visit https://naijalift.space/dashboard/settings

Best,
The NAIJALIFT Team`;

        await transporter.sendMail({
          from: '"Naijalift" <info@naijalift.space>',
          to: recipient.email,
          replyTo: "info@naijalift.space",
          subject: `${isTestMode ? "[TEST MODE] " : ""}New ${formatCategoryLabel(opportunity.category)}: ${opportunity.title}`,
          html: emailHtml,
          text: textBody,
          headers: {
            "List-Unsubscribe": "<https://naijalift.space/dashboard/settings>",
            "X-Entity-Ref-ID": opportunity.id,
            "X-Auto-Response-Suppress": "OOF, DR, RN, NRN, AutoReply",
            "Precedence": "list",
            "Importance": "normal"
          }
        });
        sentCount += 1;
      } catch (err) {
        console.error("Brevo sending error for", recipient.email, err);
        // Continue to next recipient even if one fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        totalRecipients: recipients.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("notify-new-opportunity error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
  }

serve(handler);
