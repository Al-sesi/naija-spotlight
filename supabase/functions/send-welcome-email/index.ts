
// Force rebuild 2026-01-19
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";

const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");
const SECONDARY_SMTP_KEY = Deno.env.get("SECONDARY_SMTP_KEY");

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
      from: '"Naijalift" <info@naijalift.space>',
      to,
      subject,
      html,
      text,
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const displayName = fullName || "Champion";

    const emailHtml = `
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
    .welcome-badge {
      display: inline-block;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #1a1a1a;
      padding: 8px 20px;
      border-radius: 50px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
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
    }
    .highlight-box {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-left: 4px solid #008751;
      padding: 20px;
      margin: 25px 0;
      text-align: left;
      border-radius: 0 12px 12px 0;
    }
    .highlight-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      color: #064e3b;
      font-weight: 600;
    }
    .highlight-item:last-child {
      margin-bottom: 0;
    }
    .highlight-icon {
      margin-right: 12px;
      font-size: 20px;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">NAIJALIFT</div>
      <div class="tagline">Elevating Nigerian Opportunities</div>
    </div>
    <div class="content">
      <div class="welcome-badge">Official Member</div>
      <h1>Welcome, ${displayName}! 🇳🇬</h1>
      
      <div class="message">
        You've just joined the most exclusive community for Nigerians who are serious about seizing global opportunities. We're thrilled to have you on board!
      </div>

      <div class="highlight-box">
        <div class="highlight-item">
          <span class="highlight-icon">🚀</span>
          <span>Curated Global Opportunities</span>
        </div>
        <div class="highlight-item">
          <span class="highlight-icon">⚡</span>
          <span>Instant WhatsApp Alerts</span>
        </div>
        <div class="highlight-item">
          <span class="highlight-icon">💎</span>
          <span>Premium Resource Access</span>
        </div>
      </div>

      <a href="https://naijalift.space/dashboard" class="btn">Go to Dashboard</a>

      <div class="footer">
        <p>© ${new Date().getFullYear()} NaijaLift. All rights reserved.</p>
        <p>Lagos, Nigeria 🇳🇬</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Initialize Providers
    const providers = [
      new BrevoProvider(BREVO_SMTP_KEY),
      new ResendProvider(SECONDARY_SMTP_KEY)
    ];
    const emailService = new FailoverEmailService(providers);

    await emailService.send(
      email,
      "Welcome to NaijaLift! 🇳🇬",
      emailHtml,
      `Welcome to NaijaLift, ${displayName}! We are excited to have you.`
    );

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
