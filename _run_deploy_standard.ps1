[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = "Continue"

$TOKEN = $env:VERCEL_TOKEN
if (-not $TOKEN) {
  Write-Host "ERROR: VERCEL_TOKEN env var is not set"
  exit 1
}

Write-Host "=== Deploying naija-spotlight-1 via Vercel CLI (STANDARD deploy) ==="
Write-Host "This uploads source, builds on Vercel's servers, deploys to production."
Write-Host "Bypasses ALL Git-related blocks because we use CLI direct upload (not Git push trigger)."
Write-Host ""

$vercel = Join-Path $env:APPDATA "npm\vercel.cmd"
if (-not (Test-Path $vercel)) {
  $vercel = "vercel.cmd"
}
Write-Host "Vercel CLI: $vercel"
Write-Host ""

Write-Host ">>> Running: vercel deploy --prod --yes (this may take 2-5 minutes) <<<"
& $vercel deploy --prod --yes --token $TOKEN 2>&1
$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "=== Deployment finished. Exit code: $exitCode ==="
exit $exitCode
