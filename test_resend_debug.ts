
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = "re_j74fhNPy_4Y7caZycWGJFH4n2TPbCNKvi";

async function testResend() {
  console.log("Attempting to send test email via Resend API...");
  
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "NaijaLift <info@send.naijalift.space>",
      to: ["inquiriesbaruten@gmail.com"],
      subject: "Test Email from Trae - Verification Check",
      html: "<p>If you see this, Resend is working and the domain is verified.</p>",
    }),
  });

  const data = await res.json();
  
  if (res.ok) {
    console.log("✅ SUCCESS: Email sent successfully!");
    console.log("ID:", data.id);
  } else {
    console.log("❌ ERROR: Failed to send email.");
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  }
}

testResend();
