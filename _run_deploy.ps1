[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = "Continue"

$TOKEN = $env:VERCEL_TOKEN
if (-not $TOKEN) {
  Write-Host "ERROR: VERCEL_TOKEN env var is not set"
  exit 1
}

Write-Host "=== Deploying naija-spotlight-1 via Vercel CLI (--prebuilt --prod) ==="
Write-Host "Using token starting with: $($TOKEN.Substring(0,6))..."

$vercel = Join-Path $env:APPDATA "npm\vercel.cmd"
if (-not (Test-Path $vercel)) {
  $vercel = "vercel.cmd"
}
Write-Host "Vercel CLI path: $vercel"

& $vercel deploy --prebuilt --prod --yes --token $TOKEN 2>&1 | Tee-Object -Variable deployOutput
$exitCode = $LASTEXITCODE

Write-Host "`n=== Exit code: $exitCode ==="
exit $exitCode
