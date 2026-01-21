
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = "re_j74fhNPy_4Y7caZycWGJFH4n2TPbCNKvi";

async function testResend() {
  console.log("Testing Resend API directly...");
  
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NaijaLift <info@send.naijalift.space>",
        to: ["delivered@resend.dev"], // Safe test address
        subject: "Test Email Verification",
        html: "<strong>It works!</strong>",
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("❌ Resend API Error:", JSON.stringify(data, null, 2));
    } else {
      console.log("✅ Success! Email sent successfully.");
      console.log("Response:", data);
    }
  } catch (err) {
    console.error("❌ Network/Script Error:", err);
  }
}

testResend();
