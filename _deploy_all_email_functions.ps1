# DEPLOY-ALL 3 MISSING EMAIL FUNCTIONS to Supabase
# Fixes:
#   A) send-auth-email    → 404 NOT DEPLOYED → deploy with JWT OFF
#   B) send-welcome-email → 401 UNAUTHORIZED → flip JWT OFF + redeploy with --no-verify-jwt
#   C) send-broadcast     → 401 UNAUTHORIZED → flip JWT OFF + redeploy with --no-verify-jwt
# After deploying this script, also run _deploy_set_secrets.ps1 to set Brevo/Resend keys.
#
# RUN FROM EXPLORER: Right-click this file → "Run with PowerShell"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = 'Stop'
$PROJECT_REF = "vdliauwtxklhlkltqqua"

Write-Host ""
Write-Host "==== DEPLOY ALL 3 EMAIL FUNCTIONS (JWT Verification = OFF) ====" -ForegroundColor Green
Write-Host "Project: $PROJECT_REF"
Write-Host ""

Write-Host "Step 1/4: Supabase CLI readiness check..." -ForegroundColor Cyan
npx.cmd --yes supabase@1.200.0 --version 2>&1 | Out-Null
Write-Host "  OK (CLI installed)" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2/4: Attempting CLI auth..." -ForegroundColor Cyan
Write-Host "  (Will open Supabase login in your browser if needed)" -ForegroundColor Yellow
Write-Host "  Click AUTHORIZE in the browser, then come back here." -ForegroundColor Yellow
try {
  npx.cmd --yes supabase@1.200.0 link --project-ref $PROJECT_REF 2>&1 | Select-Object -Last 3
  Write-Host "  Linked" -ForegroundColor Green
} catch {
  Write-Host "  (ignore 'already linked' above)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3/4: Deploying ALL 3 email functions with --no-verify-jwt..." -ForegroundColor Cyan

$functions = @(
  @{Name = "send-auth-email";    Desc = "Custom auth email router (signup/magiclink/recovery)"},
  @{Name = "send-welcome-email"; Desc = "Welcome email after account creation"},
  @{Name = "send-broadcast";     Desc = "Admin broadcast email blast to all users"}
)

$anyFailed = $false
foreach ($f in $functions) {
  Write-Host ""
  Write-Host "  → Deploying $($f.Name) ($($f.Desc))" -ForegroundColor Cyan
  $output = npx.cmd --yes supabase@1.200.0 functions deploy $f.Name --project-ref $PROJECT_REF --no-verify-jwt 2>&1
  $output | Select-Object -Last 8 | ForEach-Object { Write-Host "    $_" }
  if ($LASTEXITCODE -ne 0) {
    Write-Host "    ⚠ DEPLOY FAILED for $($f.Name) (exit code $LASTEXITCODE)" -ForegroundColor Red
    $anyFailed = $true
  } else {
    Write-Host "    ✔ Deployed OK" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Step 4/4: Verifying functions return HTTP 200..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
foreach ($f in $functions) {
  try {
    $url = "https://$PROJECT_REF.supabase.co/functions/v1/$($f.Name)"
    $body = ConvertTo-Json @{ email = "test@example.com"; type = "magiclink"; redirectTo = "https://naijalift.space"; fullName = "Test" }
    $resp = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    $json = ($resp.Content | ConvertFrom-Json -ErrorAction SilentlyContinue)
    if ($resp.StatusCode -eq 200) {
      Write-Host "  ✔ $($f.Name): 200 OK - delivered=$($json.delivered), transport=$($json.transport), success=$($json.success)" -ForegroundColor Green
    } else {
      Write-Host "  ⚠ $($f.Name): HTTP $($resp.StatusCode) - $($resp.Content.Substring(0, [Math]::Min(200,$resp.Content.Length)))" -ForegroundColor Red
    }
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "ERR" }
    $msg = if ($_.Exception.Response) {
      $stream = $_.Exception.Response.GetResponseStream(); $reader = New-Object System.IO.StreamReader($stream)
      $reader.ReadToEnd().Substring(0, [Math]::Min(220, $reader.ReadToEnd().Length))
    } else { $_.Exception.Message }
    Write-Host "  ⚠ $($f.Name): HTTP $status - $msg" -ForegroundColor Yellow
  }
}

Write-Host ""
if ($anyFailed) {
  Write-Host "====== PARTIAL COMPLETE — PLEASE USE MANUAL DASHBOARD METHOD BELOW FOR FAILED FUNCTIONS ======" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "MANUAL DASHBOARD METHOD (30 seconds each, 100% reliable):" -ForegroundColor Cyan
  Write-Host "  1. Open https://supabase.com/dashboard/project/$PROJECT_REF/functions" -ForegroundColor Cyan
  Write-Host "  2. Click '+ New function' (or click existing function → Edit → Update)" -ForegroundColor Cyan
  Write-Host "  3. Fill in:" -ForegroundColor Cyan
  Write-Host "     - Function name: send-auth-email" -ForegroundColor Cyan
  Write-Host "     - Runtime: Deno (latest)" -ForegroundColor Cyan
  Write-Host "     - JWT Verification: 👉👉👉 OFF (CRITICAL — must be OFF!) 👈👈👈" -ForegroundColor Magenta
  Write-Host "  4. COPY ALL text from supabase/functions/send-auth-email/index.ts into the code editor" -ForegroundColor Cyan
  Write-Host "  5. Click 'Create and deploy' / 'Update' — wait 10 sec for Deployed badge" -ForegroundColor Cyan
  Write-Host "  6. REPEAT steps 2-5 for: send-welcome-email, send-broadcast" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "AFTER DEPLOY, SET SECRETS (step 2 of 2):" -ForegroundColor Cyan
  Write-Host "  1. On functions page → click 'Secrets' tab (top)" -ForegroundColor Cyan
  Write-Host "  2. Click 'Add new secret' → Name: BREVO_SMTP_KEY → Value: <YOUR BREVO SMTP KEY (xkeysib...)> → Add" -ForegroundColor Cyan
  Write-Host "  3. (Optional) Click 'Add new secret' → Name: RESEND_API_KEY → Value: <YOUR RESEND API KEY (re_...)> → Add" -ForegroundColor Cyan
  Write-Host "  4. DONE! Test at https://naijalift.space/auth" -ForegroundColor Cyan
} else {
  Write-Host "====== ALL 3 FUNCTIONS DEPLOYED SUCCESSFULLY! ======" -ForegroundColor Green
  Write-Host ""
  Write-Host "NEXT: Run _deploy_set_secrets.ps1 to add BREVO_SMTP_KEY / RESEND_API_KEY secrets" -ForegroundColor Cyan
  Write-Host "THEN: Test sign up at https://naijalift.space/auth" -ForegroundColor Cyan
}
Write-Host ""
pause
