import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAmbassadorPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
}

const generateReferralCode = () => {
  const prefix = "LIFT";
  const randomChars = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}${randomChars}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    if (!BREVO_SMTP_KEY) {
      throw new Error("BREVO_SMTP_KEY is not configured");
    }

    const { fullName, email, phoneNumber }: CreateAmbassadorPayload = await req.json();

    if (!email || !fullName) {
      throw new Error("Email and Full Name are required");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Create User
    let userId: string;
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phoneNumber },
    });

    if (createError) {
      // If user already exists, fetch their ID
      if (createError.message.includes("already has been registered")) {
        const { data: existingUser, error: fetchError } = await supabase.from("profiles").select("id").eq("email", email).single();
        if (fetchError || !existingUser) throw new Error("User exists but could not be found");
        userId = existingUser.id;
      } else {
        throw createError;
      }
    } else {
      userId = userData.user.id;
    }

    // 2. Generate Referral Code and Update Profile
    // Retry logic for uniqueness could be added here, but for simplicity we'll try once
    let referralCode = generateReferralCode();
    
    // Check if code exists (simple collision check)
    const { data: existingCode } = await supabase.from("profiles").select("id").eq("referral_code", referralCode).maybeSingle();
    if (existingCode) {
        referralCode = generateReferralCode(); // Try one more time
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: "ambassador",
        referral_code: referralCode,
        phone_number: phoneNumber,
        full_name: fullName, // Ensure name is synced
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    // 3. Send Welcome Email
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "a06962001@smtp-brevo.com",
        pass: BREVO_SMTP_KEY,
      },
    });

    const firstName = fullName.split(" ")[0];
    const subject = "Welcome to the Naijalift Ambassador Team! 🚀";
    const message = `
      Hi ${firstName},
      
      You have been officially added as a Naijalift Ambassador!
      
      Your unique referral code is: ${referralCode}
      
      Use this code to invite others and track your impact. We are excited to have you on board!
      
      Best,
      The Naijalift Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background-color: #f0fdf4; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
  .header { color: #008751; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
  .content { line-height: 1.6; color: #333; white-space: pre-line; }
  .code { display: inline-block; background: #008751; color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold; font-size: 18px; margin: 20px 0; }
  .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">Welcome to the Team! 🚀</div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>You have been officially added as a Naijalift Ambassador!</p>
      <p>Your unique referral code is:</p>
      <div class="code">${referralCode}</div>
      <p>Use this code to invite others and track your impact. We are excited to have you on board!</p>
      <p>Best,<br>The Naijalift Team</p>
    </div>
    <div class="footer">
      <p>You received this message because you are a Naijalift Ambassador.</p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: '"Naijalift Team" <info@naijalift.space>',
      to: email,
      subject: subject,
      html: html,
      text: message,
    });

    return new Response(JSON.stringify({ success: true, referralCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error creating ambassador:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
