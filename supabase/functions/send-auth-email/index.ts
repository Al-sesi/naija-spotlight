// Auth email router: signup confirmation / magic link / password recovery
// Uses Brevo SMTP (same credentials as send-welcome-email) and generates
// Supabase auth links via service_role admin.generateLink() — bypasses
// Supabase's built-in rate-limited email sender entirely.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type AuthEmailType = "signup" | "magiclink" | "recovery";

interface AuthEmailRequest {
  email: string;
  type: AuthEmailType;
  redirectTo?: string;
  fullName?: string;
}

const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ||
  "https://vdliauwtxklhlkltqqua.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const sendSmtpEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  if (!BREVO_SMTP_KEY) {
    throw new Error("BREVO_SMTP_KEY is not configured");
  }
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: "a06962001@smtp-brevo.com",
      pass: BREVO_SMTP_KEY,
    },
  });
  const result = await transporter.sendMail({
    from: '"Naijalift" <info@naijalift.space>',
    to,
    subject,
    html,
  });
  console.log("[send-auth-email] Sent to %s (%s): %s", to, subject, result.messageId);
  return result;
};

const buildEmailHtml = ({
  title,
  headline,
  body,
  ctaText,
  ctaLink,
  fullName,
}: {
  title: string;
  headline: string;
  body: string;
  ctaText: string;
  ctaLink: string;
  fullName?: string;
}) => {
  const greeting = fullName ? `Hi ${fullName},` : "Hi there,";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 36px; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,135,81,0.12); }
    .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
    .brandLogo { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #15803d 0%, #166534 100%); display:flex; align-items:center; justify-content:center; color:white; font-weight:900; font-size:20px; }
    .brandName { color: #052e16; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    h1 { color: #052e16; font-size: 26px; line-height: 1.25; margin: 0 0 14px; }
    p { color: #14532d; font-size: 16px; line-height: 1.65; margin: 0 0 14px; }
    .muted { color: #3f6212; font-size: 14px; line-height: 1.6; margin-top: 22px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #15803d 0%, #166534 100%); color: white !important; padding: 16px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 18px 0 10px; }
    .linkRow { word-break: break-all; background: #f0fdf4; padding: 10px 12px; border-radius: 8px; font-family: Consolas, Monaco, monospace; font-size: 12px; color: #14532d; margin: 10px 0 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #3f6212; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">
      <div class="brandLogo">N</div>
      <div class="brandName">Naijalift</div>
    </div>
    <h1>${headline}</h1>
    <p>${greeting}</p>
    <p>${body}</p>
    <center><a class="cta" href="${ctaLink}">${ctaText}</a></center>
    <p class="muted">Button not working? Copy and paste this link into your browser:</p>
    <div class="linkRow">${ctaLink}</div>
    <div class="footer">
      This link is valid for 1 hour and can only be used once. If you did not request this, you can safely ignore this email — your account remains secure.
      <br/><br/>
      &copy; ${new Date().getFullYear()} Naijalift. All rights reserved.
    </div>
  </div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server missing Supabase service_role configuration");
    }

    const body = (await req.json()) as AuthEmailRequest;
    const email = (body?.email || "").trim().toLowerCase();
    const type = body?.type;
    const redirectTo =
      body?.redirectTo && body.redirectTo.length > 0
        ? body.redirectTo
        : "https://naijalift.space";

    if (!email) throw new Error("Email is required");
    if (!["signup", "magiclink", "recovery"].includes(type)) {
      throw new Error("Invalid auth email type");
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // For magiclink: call admin.generateLink({type:'magiclink'}) and send the link
    // For signup: same with type 'signup' (works even if user already exists — it re-sends)
    // For recovery: type 'recovery'
    let link: string;
    try {
      const { data, error } = await admin.auth.admin.generateLink({
        type:
          type === "magiclink"
            ? "magiclink"
            : type === "recovery"
              ? "recovery"
              : "signup",
        email,
        options: { redirectTo },
      });
      if (error) throw error;
      link = data.properties.action_link;
    } catch (genErr: any) {
      const msg = (genErr?.message || "").toLowerCase();
      // Signups: if user already exists and is already confirmed, Supabase throws
      // "User already registered" — for magiclink, generateLink will still work.
      // For signup retries, fall back to magiclink so user can still log in.
      if (type === "signup" && (msg.includes("already") || msg.includes("registered") || msg.includes("confirmed"))) {
        const { data, error } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo },
        });
        if (error) throw error;
        link = data.properties.action_link;
      } else {
        throw genErr;
      }
    }

    let subject: string;
    let headline: string;
    let bodyText: string;
    let ctaText: string;
    switch (type) {
      case "recovery":
        subject = "Reset your Naijalift password";
        headline = "Reset your password";
        bodyText =
          "Someone requested a password reset for your Naijalift account. Click the button below to choose a new password. If this wasn't you, just ignore this email.";
        ctaText = "Reset My Password";
        break;
      case "magiclink":
        subject = "Your sign-in link for Naijalift";
        headline = "Sign in to Naijalift with one click";
        bodyText =
          "Here's your secure sign-in link. It works for 1 hour, so use it now to access your account and start discovering new opportunities.";
        ctaText = "Sign In to Naijalift";
        break;
      case "signup":
      default:
        subject = "Welcome to Naijalift — confirm your email";
        headline = "Confirm your email to get started";
        bodyText =
          "Thanks for joining Naijalift! Click the button below to verify your email address and unlock all the best scholarship, grant, and career opportunities handpicked for you.";
        ctaText = "Confirm My Email";
    }

    const html = buildEmailHtml({
      title: subject,
      headline,
      body: bodyText,
      ctaText,
      ctaLink: link,
      fullName: body?.fullName,
    });

    await sendSmtpEmail({ to: email, subject, html });

    return new Response(
      JSON.stringify({ success: true, type, email, redirectTo }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    const message = error?.message || "Unknown error sending auth email";
    console.error("[send-auth-email] ERROR:", message, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

serve(handler);
