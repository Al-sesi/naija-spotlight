import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateReferralCode = () => {
  const prefix = "LIFT";
  const randomChars = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}${randomChars}`;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Function started: create-ambassador");

    // 1. Check Environment Variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Server configuration error: Missing environment variables.");
    }

    // 2. Parse Body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request body", e);
      throw new Error("Invalid request body: JSON parsing failed.");
    }

    const { fullName, email, phoneNumber } = body;
    console.log("Received payload:", { fullName, email, phoneNumber });

    if (!email || !fullName) {
      throw new Error("Validation error: Email and Full Name are required.");
    }

    // 3. Initialize Supabase Admin Client
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // 4. Create User in Auth
    console.log("Creating user in Auth...");
    let userId: string;
    
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phoneNumber },
      password: "tempPassword123!" + Math.random().toString(36).slice(-8) // Random temp password
    });

    if (createError) {
      console.error("Auth createUser error:", createError);
      // Check for "user already exists"
      if (createError.message?.toLowerCase().includes("already") || createError.status === 422) {
         // Try to find the user in profiles to get ID
         const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
            
         if (profileError || !profile) {
             console.error("Profile fetch error:", profileError);
             throw new Error(`User already registered but profile not found. Manual intervention required. (${createError.message})`);
         }
         userId = profile.id;
         console.log("User already exists. Found Profile ID:", userId);
      } else {
        throw new Error(`Auth Error: ${createError.message}`);
      }
    } else {
      userId = userData.user.id;
      console.log("User created successfully. ID:", userId);
    }

    // 5. Generate Referral Code and Update Profile
    console.log("Generating referral code...");
    let referralCode = generateReferralCode();
    
    // Collision check
    const { data: existingCode } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();
        
    if (existingCode) {
        console.log("Collision detected, regenerating code...");
        referralCode = generateReferralCode();
    }

    console.log("Updating profile for user:", userId);
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
      console.error("Profile update error:", updateError);
      throw new Error(`Database Error: ${updateError.message}`);
    }

    console.log("Profile updated successfully.");

    // 6. Send Welcome Email (Isolated Try-Catch)
    let emailSent = false;
    let emailError = null;
    
    if (BREVO_SMTP_KEY) {
        try {
            console.log("Attempting to send email via Brevo SMTP...");
            const transporter = nodemailer.createTransport({
                host: "smtp-relay.brevo.com",
                port: 587,
                secure: false,
                auth: {
                    user: "a06962001@smtp-brevo.com",
                    pass: BREVO_SMTP_KEY,
                },
            });

            const firstName = fullName.split(" ")[0] || "Ambassador";
            const subject = "Welcome to the Naijalift Ambassador Team! 🚀";
            const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Hi ${firstName},</h2>
                <p>You have been officially added as a <strong>Naijalift Ambassador</strong>!</p>
                <p>Your unique referral code is: <strong style="font-size: 1.2em; color: #008751;">${referralCode}</strong></p>
                <p>Use this code to invite others and track your impact. We are excited to have you on board!</p>
                <br>
                <p>Best,</p>
                <p>The Naijalift Team</p>
            </div>
            `;

            const info = await transporter.sendMail({
                from: '"Naijalift" <info@naijalift.space>',
                to: email,
                subject: subject,
                html: html,
            });

            console.log("Email sent successfully:", info.messageId);
            emailSent = true;
        } catch (mailErr: any) {
            console.error("Email sending FAILED:", mailErr);
            emailError = mailErr.message;
        }
    } else {
        console.warn("BREVO_SMTP_KEY missing, skipping email.");
        emailError = "SMTP Key missing in server configuration";
    }

    // 7. Return Success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Ambassador created successfully",
        userId,
        referralCode,
        emailSent,
        emailError,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (err: any) {
    console.error("CRITICAL ERROR CAUGHT:", err);
    
    // RETURN 200 OK even on error, so client can read the JSON body
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Unknown server error",
        stack: err.stack, 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, 
      }
    );
  }
});
