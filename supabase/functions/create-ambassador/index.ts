import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

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
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");

    // 1. Validate Environment
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Server misconfiguration: Missing Supabase keys." 
      }), {
        status: 200, // Return 200 to ensure client parses JSON
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Parse Payload
    let payload: CreateAmbassadorPayload;
    try {
      payload = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid request body: Failed to parse JSON." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { fullName, email, phoneNumber } = payload;
    if (!email || !fullName) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required fields: email and fullName are required." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3. Create User (Auth)
    let userId: string;
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phoneNumber },
    });

    if (createError) {
      if (createError.message.includes("already has been registered")) {
        const { data: existingUser, error: fetchError } = await supabase.from("profiles").select("id").eq("email", email).single();
        if (fetchError || !existingUser) {
           return new Response(JSON.stringify({ 
            success: false, 
            error: "User exists but could not be found in profiles." 
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        userId = existingUser.id;
      } else {
         return new Response(JSON.stringify({ 
          success: false, 
          error: `Failed to create user: ${createError.message}` 
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      userId = userData.user.id;
    }

    // 4. Update Profile (DB)
    let referralCode = generateReferralCode();
    // Simple collision check
    const { data: existingCode } = await supabase.from("profiles").select("id").eq("referral_code", referralCode).maybeSingle();
    if (existingCode) {
        referralCode = generateReferralCode();
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: "ambassador",
        referral_code: referralCode,
        phone_number: phoneNumber,
        full_name: fullName,
      })
      .eq("id", userId);

    if (updateError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed to update profile: ${updateError.message}. Ensure database migrations are applied.` 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Send Email (Isolated Try/Catch)
    let emailStatus = "sent";
    if (!BREVO_SMTP_KEY) {
      emailStatus = "skipped_missing_key";
      console.warn("BREVO_SMTP_KEY missing, skipping email.");
    } else {
      try {
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
        const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background-color: #f0fdf4; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
  .header { color: #008751; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
  .code { display: inline-block; background: #008751; color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold; font-size: 18px; margin: 20px 0; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">Welcome to the Team! 🚀</div>
    <p>Hi ${firstName},</p>
    <p>You have been officially added as a Naijalift Ambassador!</p>
    <p>Your unique referral code is:</p>
    <div class="code">${referralCode}</div>
    <p>Use this code to invite others.</p>
    <p>Best,<br>The Naijalift Team</p>
  </div>
</body>
</html>
        `;

        await transporter.sendMail({
          from: '"Naijalift Team" <info@naijalift.space>',
          to: email,
          subject: "Welcome to the Naijalift Ambassador Team! 🚀",
          html: html,
          text: `Hi ${firstName}, Your referral code is: ${referralCode}`,
        });
      } catch (emailError: any) {
        console.error("Email sending failed:", emailError);
        emailStatus = `failed: ${emailError.message}`;
        // Do NOT throw here; user is already created/updated.
      }
    }

    // Success Response
    return new Response(JSON.stringify({ 
      success: true, 
      referralCode, 
      emailStatus 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (globalError: any) {
    // Catch-all for unexpected runtime errors
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Unexpected System Error: ${globalError.message}`,
      stack: globalError.stack
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);
