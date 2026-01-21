
const FUNCTION_URL = "https://vdliauwtxklhlkltqqua.supabase.co/functions/v1/send-welcome-email";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbGlhdXd0eGtsaGxrbHRxcXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3Mjc1OCwiZXhwIjoyMDgyOTQ4NzU4fQ.DYXQwZFhtCeUM3fzyWWN84NOrAANNZvQkypAJmzjDGU";

async function testWelcome() {
  console.log("Testing Welcome Email Function...");
  
  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email: "delivered@resend.dev", // Test email
        fullName: "Test User"
      }),
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text}`);
  } catch (e) {
    console.error("Error:", e);
  }
}

testWelcome();
