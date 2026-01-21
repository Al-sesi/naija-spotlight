
const https = require('https');

const data = JSON.stringify({
  from: "NaijaLift <info@send.naijalift.space>",
  to: ["delivered@resend.dev"],
  subject: "Test Email Verification",
  html: "<strong>It works!</strong>"
});

const options = {
  hostname: 'api.resend.com',
  path: '/emails',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer re_j74fhNPy_4Y7caZycWGJFH4n2TPbCNKvi',
    'Content-Length': data.length
  }
};

console.log("Testing Resend API...");

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
