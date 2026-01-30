import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    // Check if user already exists first to avoid ambiguity
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    // listUsers might be heavy, better to just try create and handle error, or use listUsers with filter if supported
    // But listUsers doesn't support filter by email easily in all versions. 
    // Let's stick to createUser and handle error.
    
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

    // 6. Return Success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Ambassador created successfully",
        userId,
        referralCode,
        emailSent: false, // Explicitly false for now
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
        stack: err.stack, // Optional: remove in production if sensitive
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // <--- INTENTIONALLY 200
      }
    );
  }
});
