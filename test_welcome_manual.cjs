
const https = require('https');

const FUNCTION_URL = "https://vdliauwtxklhlkltqqua.supabase.co/functions/v1/send-welcome-email";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbGlhdXd0eGtsaGxrbHRxcXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3Mjc1OCwiZXhwIjoyMDgyOTQ4NzU4fQ.DYXQwZFhtCeUM3fzyWWN84NOrAANNZvQkypAJmzjDGU";

const data = JSON.stringify({
  email: "delivered@resend.dev",
  fullName: "Test User"
});

const url = new URL(FUNCTION_URL);
const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Length': data.length
  }
};

console.log("Testing Welcome Email Function...");

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response Body: ${body}`);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
