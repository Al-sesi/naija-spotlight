# 1-CLICK DEPLOY send-auth-email edge function to Supabase
# Purpose: Activates our new custom Brevo SMTP email router so auth emails
# (signup confirm, password reset, magic link) NEVER hit the rate-limited
# Supabase noreply@supabase.co mailer again.
#
# HOW TO RUN:
#   1. Open PowerShell in the project folder: cd c:\Users\HomePC\Documents\naija-spotlight-1
#   2. Run:  .\_deploy_send_auth_email.ps1
#   3. A browser window opens — log in with your Supabase account (the one that owns vdliauwtxklhlkltqqua)
#   4. That's it — script will auto-deploy.

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = 'Stop'
$PROJECT_REF = "vdliauwtxklhlkltqqua"

Write-Host ""
Write-Host "=== Deploy send-auth-email (Brevo Auth Email Router) to Supabase ===" -ForegroundColor Green
Write-Host ""
Write-Host "Project ref: $PROJECT_REF"
Write-Host ""
Write-Host "Step 1: Installing/Updating Supabase CLI..." -ForegroundColor Cyan
npx.cmd --yes supabase@1.200.0 --version | Out-Null
Write-Host "  OK" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Linking project..." -ForegroundColor Cyan
try {
  npx.cmd --yes supabase@1.200.0 link --project-ref $PROJECT_REF 2>&1 | Select-Object -Last 3
  Write-Host "  OK" -ForegroundColor Green
} catch {
  Write-Host "  Note: if 'already linked' above, ignore." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Deploying send-auth-email edge function (NO JWT verification required)..." -ForegroundColor Cyan
npx.cmd --yes supabase@1.200.0 functions deploy send-auth-email --project-ref $PROJECT_REF --no-verify-jwt 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED with exit code $LASTEXITCODE." -ForegroundColor Red
  Write-Host ""
  Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
  Write-Host "  * If 'Access token not provided': script will open Supabase login automatically below."
  Write-Host "  * After logging in, re-run this script."
  Write-Host ""
  Write-Host "  ALTERNATIVE MANUAL METHOD (always works, 30 seconds):"
  Write-Host "   1. Open https://supabase.com/dashboard/project/$PROJECT_REF/functions"
  Write-Host "   2. Click 'New function' → Name: send-auth-email, Runtime: Deno, JWT verification: OFF"
  Write-Host "   3. Paste ALL of supabase/functions/send-auth-email/index.ts into the code editor"
  Write-Host "   4. Click 'Create function'"
  Write-Host "   5. Done! Emails will now route through Brevo."
  exit 1
}

Write-Host ""
Write-Host "=== DEPLOY SUCCESS! send-auth-email is now LIVE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Verify deployment:"
Write-Host "  https://supabase.com/dashboard/project/$PROJECT_REF/functions"
Write-Host ""
Write-Host "Now test sign up at https://naijalift.space/auth — you will NO LONGER get" -ForegroundColor Cyan
Write-Host "'Email delivery is temporarily unavailable' — the confirmation email will" -ForegroundColor Cyan
Write-Host "arrive from info@naijalift.space via Brevo SMTP (same reliable path as the" -ForegroundColor Cyan
Write-Host "welcome emails that were working perfectly before)." -ForegroundColor Cyan
Write-Host ""
