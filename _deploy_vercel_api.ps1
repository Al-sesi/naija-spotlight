$ErrorActionPreference = 'Stop'
$auth = Get-Content "$env:APPDATA\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$TOKEN = $auth.token
$TEAM_ID = "team_zptffLzXUaztPWFD0mVQzIzd"
$PROJ_ID = "prj_2uDfcTvxhjs2Mw5HcJ7xZjqqWE25"
$base = "dist"

$headers = @{ Authorization = "Bearer $TOKEN" }
$jsonHeaders = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }

Write-Host "=== Step 1: Build file manifest (rel, size, sha, data) ==="
$items = Get-ChildItem -Path $base -Recurse -File
$files = @()
$map = @{}
foreach ($f in $items) {
  $full = $f.FullName
  $rel = $full.Substring((Resolve-Path $base).Path.Length + 1).Replace('\','/')
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $sha = -join ([System.Security.Cryptography.SHA1]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') })
  $files += @{ file = $rel; sha = $sha; size = $bytes.Length }
  $map[$rel] = $bytes
  Write-Host "  $rel  size=$($bytes.Length)  sha=$($sha.Substring(0,7))"
}
Write-Host "Collected $($files.Count) files"

Write-Host "`n=== Step 2: POST /v13/deployments (forceNew=1, target=production, skip build) ==="
$body = @{
  name = "naija-spotlight-1"
  project = $PROJ_ID
  region = "iad1"
  target = "production"
  forceNew = $true
  files = $files
  functions = @{}
  routing = @(
    @{ handle = "filesystem" },
    @{ src = "^/(.*)$"; dest = "/index.html"; check = $true }
  )
  meta = @{ buildSkip = "true" }
  framework = "vite"
  build = @{ skip = $true }
} | ConvertTo-Json -Depth 10
try {
  $r = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID&forceNew=1" -Headers $jsonHeaders -Method Post -Body $body -UseBasicParsing
  $DEPLOY_ID = $r.id
  $DEPLOY_URL = $r.url
  $READY_STATE = $r.state
  Write-Host "DEPLOY CREATED: id=$DEPLOY_ID url=https://$DEPLOY_URL state=$READY_STATE"
  if ($r.alias.Count -gt 0) { Write-Host "ALIASES: $($r.alias -join ', ')" }
} catch {
  $ex = $_.Exception
  Write-Host "ERROR: $($ex.Message)"
  if ($ex.Response) {
    $sr = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
    $raw = $sr.ReadToEnd()
    Write-Host "RAW ERROR: $raw"
    try { $d = $raw | ConvertFrom-Json ; Write-Host "ERROR CODE=$($d.error.code) MSG=$($d.error.message)" } catch {}
  }
  exit 1
}

Write-Host "`n=== Step 3: Poll until deployment is READY (uploads happen via Vercel CDN via sha we sent) ==="
$maxPoll = 25
for ($i=0; $i -lt $maxPoll; $i++) {
  Start-Sleep -Seconds 6
  try {
    $poll = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments/$DEPLOY_ID?teamId=$TEAM_ID" -Headers $headers -UseBasicParsing
    Write-Host "  poll $($i+1): state=$($poll.state) url=https://$($poll.url)"
    if ($poll.state -eq "READY") {
      Write-Host "`n=== DEPLOY READY! LIVE URLS ==="
      Write-Host "Deployment: https://$($poll.url)"
      if ($poll.alias.Count -gt 0) {
        foreach ($a in $poll.alias) { Write-Host "Production alias: https://$a" }
      }
      Write-Host "Dashboard: https://vercel.com/$TEAM_ID/naija-spotlight-1/$DEPLOY_ID"
      exit 0
    }
    if ($poll.state -eq "ERROR") {
      Write-Host "DEPLOY ERROR: $($poll.errorMessage)"
      exit 2
    }
  } catch { Write-Host "poll err: $($_.Exception.Message)" }
}
Write-Host "TIMEOUT: deployment still not ready. Check dashboard: https://vercel.com/$TEAM_ID/naija-spotlight-1"
exit 3
