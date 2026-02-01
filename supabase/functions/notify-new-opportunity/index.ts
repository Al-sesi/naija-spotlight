import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
    case "recruitment":
      return "Recruitments";
    case "internship":
      return "Internship / Fellowship";
    case "competition":
      return "Competition";
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
      background-color: #020617;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    a { color: #fb923c; text-decoration: none; }
    .wrapper {
      width: 100%;
      padding: 24px 0;
      background-color: #020617;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      border-radius: 18px;
      border: 1px solid #1e293b;
      background: radial-gradient(circle at top, rgba(251,146,60,0.16), transparent 55%) #020617;
      overflow: hidden;
    }
    .header {
      padding: 22px 22px 14px 22px;
      text-align: center;
      background: radial-gradient(circle at top, #fb923c 0, #020617 55%);
    }
    .logo {
      font-size: 20px;
      font-weight: 800;
      color: #f9fafb;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .tagline {
      margin-top: 4px;
      font-size: 11px;
      color: #e5e7eb;
      opacity: 0.9;
    }
    .pill {
      display: inline-block;
      margin-top: 14px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      background-color: rgba(15,23,42,0.9);
      color: #fed7aa;
      border: 1px solid rgba(251,146,60,0.6);
    }
    .content {
      padding: 22px 22px 6px 22px;
      color: #e5e7eb;
    }
    .hello {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 12px;
      color: #f9fafb;
    }
    .title span {
      color: #fed7aa;
    }
    .lead {
      font-size: 13px;
      line-height: 1.7;
      color: #d1d5db;
      margin-bottom: 18px;
    }
    .card {
      border-radius: 14px;
      border: 1px solid #1f2937;
      background: linear-gradient(135deg, rgba(15,23,42,0.98), rgba(17,24,39,0.98));
      padding: 14px 16px 12px 16px;
      margin-bottom: 16px;
    }
    .card-tag {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #a5b4fc;
      margin-bottom: 4px;
    }
    .card-title {
      font-size: 15px;
      font-weight: 600;
      color: #f9fafb;
      margin-bottom: 4px;
    }
    .card-provider {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .card-body {
      font-size: 12px;
      color: #d1d5db;
      line-height: 1.7;
      margin-bottom: 8px;
    }
    .meta {
      font-size: 11px;
      color: #9ca3af;
      margin-bottom: 10px;
    }
    .meta strong {
      color: #e5e7eb;
    }
    .cta-wrap {
      text-align: center;
      padding: 6px 22px 22px 22px;
    }
    .button {
      display: inline-block;
      padding: 11px 26px;
      border-radius: 999px;
      background: linear-gradient(135deg, #fb923c, #f97316);
      color: #111827;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }
    .button span {
      display: block;
      font-size: 11px;
      text-transform: none;
      letter-spacing: normal;
      margin-top: 2px;
      font-weight: 500;
      color: #111827;
    }
    .footer {
      font-size: 11px;
      color: #6b7280;
      padding: 10px 22px 18px 22px;
      border-top: 1px solid #111827;
    }
    .footer a {
      color: #9ca3af;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">NAIJALIFT</div>
        <div class="tagline">Fresh, curated opportunities for Nigerians who are serious.</div>
        <div class="pill">New drop just for you</div>
      </div>

      <div class="content">
        <p class="hello">Hi ${firstName || "Champion"},</p>
        <p class="title">
          A <span>${categoryLabel}</span> just landed on NAIJALIFT.
        </p>
        <p class="lead">
          We just added a handpicked opportunity that could move you closer to your next big win.
        </p>

        <div class="card">
          <div class="card-tag">${categoryLabel}</div>
          <div class="card-title">${opportunity.title}</div>
          <div class="card-provider">${opportunity.provider}</div>
          <div class="card-body">
            ${safeDescription}
          </div>
          <div class="meta">
            <strong>Deadline:</strong> ${deadlineText} · <strong>Location:</strong> ${location}
          </div>
          <a href="${opportunity.link}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#fb923c;font-weight:500;">
            View full details and apply →
          </a>
        </div>
      </div>

      <div class="cta-wrap">
        <a href="https://naijalift.space/dashboard" class="button" target="_blank" rel="noopener noreferrer">
          VIEW MORE OPPORTUNITIES
          <span>Log in to NAIJALIFT to see everything waiting for you</span>
        </a>
      </div>

      <div class="footer">
        <p>
          You are receiving this because you turned on email alerts in NAIJALIFT.
          If this is too much, you can pause alerts in your dashboard.
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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    const { opportunity }: NewOpportunityPayload = await req.json();

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name") as {
      data: ProfileRow[] | null;
      error: unknown;
    };

    if (profilesError) {
      throw profilesError;
    }

    const recipients =
      profiles?.filter((p) => p.email).map((p) => ({
        email: p.email as string,
        fullName: p.full_name,
      })) ?? [];

    let sentCount = 0;
    for (const recipient of recipients) {
      const firstName =
        (recipient.fullName || "")
          .split(" ")
          .filter(Boolean)[0] || "Champion";

      const emailHtml = buildEmailHtml(opportunity, firstName);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "NAIJALIFT <onboarding@resend.dev>",
          to: [recipient.email],
          subject: `✨ New ${formatCategoryLabel(opportunity.category)} on NAIJALIFT`,
          html: emailHtml,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Resend error for", recipient.email, errorText);
        continue;
      }

      sentCount += 1;
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
