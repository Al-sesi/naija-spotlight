import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

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
    .highlight-box h3 {
      color: #008751;
      margin: 0 0 10px 0;
      font-size: 16px;
    }
    .highlight-box ul {
      margin: 0;
      padding-left: 20px;
      color: #374151;
    }
    .highlight-box li {
      margin: 8px 0;
    }
    .cta-button { 
      display: inline-block;
      background: linear-gradient(135deg, #008751 0%, #00a65a 100%);
      color: #ffffff !important; 
      padding: 16px 40px; 
      border-radius: 50px; 
      text-decoration: none; 
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 25px rgba(0,135,81,0.35);
      transition: all 0.3s ease;
    }
    .cta-button:hover {
      box-shadow: 0 12px 35px rgba(0,135,81,0.45);
    }
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #d1d5db, transparent);
      margin: 30px 0;
    }
    .footer { 
      background: #f9fafb;
      text-align: center; 
      font-size: 12px; 
      color: #6b7280; 
      padding: 25px 30px;
      border-top: 1px solid #e5e7eb;
    }
    .footer-brand {
      color: #008751;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .social-note {
      font-style: italic;
      margin-top: 15px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">🇳🇬 NAIJALIFT</h1>
      <p class="tagline">Your Gateway to Nigerian Opportunities</p>
    </div>
    
    <div class="content">
      <span class="welcome-badge">🎉 Welcome Aboard!</span>
      
      <h1>Hello, ${displayName}!</h1>
      
      <p class="message">
        Congratulations! You've just joined <strong>NAIJALIFT</strong> — Nigeria's most exclusive platform connecting ambitious Nigerians with life-changing opportunities.
      </p>
      
      <div class="highlight-box">
        <h3>🎁 Your Premium Trial Includes:</h3>
        <ul>
          <li><strong>30 Days FREE</strong> Premium Access</li>
          <li>Government Programs & Grants</li>
          <li>Scholarships (Local & International)</li>
          <li>Tech & Career Opportunities</li>
          <li>NGO & Social Programs</li>
        </ul>
      </div>
      
      <p class="message">
        Start exploring opportunities that can transform your life and career. The best part? You're now part of an exclusive community of go-getters!
      </p>
      
      <a href="https://naijalift.vercel.app/dashboard" class="cta-button">
        🚀 Explore Opportunities Now
      </a>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: #6b7280;">
        Questions? Reply to this email — we're here to help you succeed.
      </p>
    </div>
    
    <div class="footer">
      <p class="footer-brand">NAIJALIFT — First of its Kind in Nigeria</p>
      <p>© ${new Date().getFullYear()} NAIJALIFT. All rights reserved.</p>
      <p class="social-note">You're receiving this because you signed up for NAIJALIFT.</p>
    </div>
  </div>
</body>
</html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NAIJALIFT <onboarding@resend.dev>",
        to: [email],
        subject: "🎉 Welcome to NAIJALIFT — Your 30-Day Premium Trial Starts Now!",
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const data = await res.json();
    console.log("Welcome email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
