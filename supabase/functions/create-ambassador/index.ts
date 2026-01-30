import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// EMAIL TEMPORARILY DISABLED TO DEBUG CRASH
// import nodemailer from "npm:nodemailer@6.9.13";

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured");
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
        full_name: fullName,
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    // 3. Send Welcome Email (DISABLED)
    console.log("Email sending disabled. Would send to:", email);
    /*
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "a06962001@smtp-brevo.com",
        pass: BREVO_SMTP_KEY,
      },
    });
    // ... email sending logic ...
    */

    return new Response(JSON.stringify({ success: true, referralCode, message: "Ambassador created (Email skipped for debugging)" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error creating ambassador:", error);
    return new Response(JSON.stringify({ success: false, error: error.message, stack: error.stack }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
