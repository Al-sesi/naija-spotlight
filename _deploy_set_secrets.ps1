# SET EDGE FUNCTION SECRETS (Brevo SMTP + Resend API keys)
# This ensures send-auth-email, send-welcome-email, send-broadcast have credentials.
#
# RUN FROM EXPLORER: Right-click this file → "Run with PowerShell"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = 'Stop'
$PROJECT_REF = "vdliauwtxklhlkltqqua"

Write-Host ""
Write-Host "==== SET EDGE FUNCTION SECRETS FOR EMAIL DELIVERY ====" -ForegroundColor Green
Write-Host "Project: $PROJECT_REF"
Write-Host ""
Write-Host "What this does:" -ForegroundColor Cyan
Write-Host "  • Sets BREVO_SMTP_KEY secret (xkeysib... from Brevo Dashboard → SMTP & API)" -ForegroundColor Cyan
Write-Host "  • (Optional) Sets RESEND_API_KEY secret (re_... from Resend Dashboard → API Keys)" -ForegroundColor Cyan
Write-Host "  • Secrets are accessible via Deno.env.get() in ALL Edge Functions" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1/3: Check CLI auth..." -ForegroundColor Cyan
try {
  npx.cmd --yes supabase@1.200.0 link --project-ref $PROJECT_REF 2>&1 | Select-Object -Last 2
} catch { Write-Host "  (ignore 'already linked')" -ForegroundColor Yellow }

Write-Host ""
Write-Host "Step 2/3: Set BREVO_SMTP_KEY" -ForegroundColor Cyan
Write-Host "  👉 Get from: https://app.brevo.com/settings/keys/smtp" -ForegroundColor Yellow
Write-Host "  👉 Should look like: xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" -ForegroundColor Yellow
$brevoKey = Read-Host "  Paste BREVO_SMTP_KEY and press Enter (or press Enter to skip)"
if ($brevoKey -and $brevoKey.Length -gt 5) {
  try {
    $env:SUPABASE_FUNCTION_SECRET_BREVO_SMTP_KEY = $brevoKey
    $output = npx.cmd --yes supabase@1.200.0 secrets set BREVO_SMTP_KEY --project-ref $PROJECT_REF 2>&1
    $output | Select-Object -Last 5 | ForEach-Object { Write-Host "    $_" }
    Write-Host "  ✔ BREVO_SMTP_KEY saved" -ForegroundColor Green
  } catch {
    Write-Host "  ⚠ Failed to set BREVO_SMTP_KEY via CLI" -ForegroundColor Red
    Write-Host "     Please set it manually in dashboard: " -ForegroundColor Yellow
    Write-Host "     https://supabase.com/dashboard/project/$PROJECT_REF/functions/secrets" -ForegroundColor Yellow
  }
} else {
  Write-Host "  (skipped)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3/3: Set RESEND_API_KEY (optional, fallback if Brevo fails)" -ForegroundColor Cyan
Write-Host "  👉 Get from: https://resend.com/api-keys" -ForegroundColor Yellow
Write-Host "  👉 Should look like: re_xxxxxxxxxxxxxxxxxxxxx" -ForegroundColor Yellow
$resendKey = Read-Host "  Paste RESEND_API_KEY and press Enter (or press Enter to skip)"
if ($resendKey -and $resendKey.Length -gt 5) {
  try {
    $env:SUPABASE_FUNCTION_SECRET_RESEND_API_KEY = $resendKey
    $output = npx.cmd --yes supabase@1.200.0 secrets set RESEND_API_KEY --project-ref $PROJECT_REF 2>&1
    $output | Select-Object -Last 5 | ForEach-Object { Write-Host "    $_" }
    Write-Host "  ✔ RESEND_API_KEY saved" -ForegroundColor Green
  } catch {
    Write-Host "  ⚠ Failed to set RESEND_API_KEY via CLI" -ForegroundColor Red
    Write-Host "     Please set it manually in dashboard: " -ForegroundColor Yellow
    Write-Host "     https://supabase.com/dashboard/project/$PROJECT_REF/functions/secrets" -ForegroundColor Yellow
  }
} else {
  Write-Host "  (skipped)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====== SECRETS STEP COMPLETE ======" -ForegroundColor Green
Write-Host ""
Write-Host "MANUAL FALLBACK (if CLI didn't set):" -ForegroundColor Cyan
Write-Host "  1. Open: https://supabase.com/dashboard/project/$PROJECT_REF/functions/secrets" -ForegroundColor Cyan
Write-Host "  2. Click 'Add new secret' → Name=BREVO_SMTP_KEY → Value=YOUR_XKEYSIB_KEY → Add" -ForegroundColor Cyan
Write-Host "  3. Click 'Add new secret' → Name=RESEND_API_KEY → Value=YOUR_RE_KEY → Add" -ForegroundColor Cyan
Write-Host ""
Write-Host "AFTER THIS: Test sign-up at https://naijalift.space/auth — emails should land perfectly now!" -ForegroundColor Green
pause
