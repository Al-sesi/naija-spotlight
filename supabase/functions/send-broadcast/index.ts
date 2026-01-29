import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastPayload {
  subject: string;
  message: string;
  audience: "all" | "premium" | "free";
  is_test_mode?: boolean;
}

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

    const { subject, message, audience, is_test_mode }: BroadcastPayload = await req.json();
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let recipients: { email: string; fullName: string | null }[] = [];

    if (is_test_mode) {
      console.log("Test Mode enabled: Sending broadcast only to admins.");
      const adminEmails = ["abdulmajeedsesiadam@gmail.com", "naijalift01@gmail.com"];
      recipients = adminEmails.map(email => ({ email, fullName: "Admin" }));
    } else {
      let query = supabase.from("profiles").select("email, full_name");
      
      if (audience === "premium") {
        query = query.eq("plan_type", "premium_lifter");
      } else if (audience === "free") {
        query = query.is("plan_type", null);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      if (profiles) {
         const uniqueEmails = new Set<string>();
         profiles.forEach((p: any) => {
             if (p.email && !uniqueEmails.has(p.email)) {
                 uniqueEmails.add(p.email);
                 recipients.push({ email: p.email, fullName: p.full_name });
             }
         });
      }
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

    let sentCount = 0;
    for (const recipient of recipients) {
      const firstName = (recipient.fullName || "").split(" ")[0] || "Champion";
      
      const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background-color: #f0fdf4; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
  .header { color: #008751; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
  .content { line-height: 1.6; color: #333; white-space: pre-line; }
  .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">Message from NAIJALIFT</div>
    <div class="content">
      <p>Hello ${firstName},</p>
      ${message}
    </div>
    <div class="footer">
      <p>You received this message as a member of the NaijaLift community.</p>
    </div>
  </div>
</body>
</html>
      `;

      try {
        await transporter.sendMail({
          from: '"Naijalift Team" <info@naijalift.space>',
          to: recipient.email,
          subject: subject,
          html: html,
          text: message
        });
        sentCount++;
      } catch (e) {
        console.error("Failed to send to", recipient.email, e);
      }
    }

    return new Response(JSON.stringify({ success: true, stats: { success: sentCount, failed: recipients.length - sentCount } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);
