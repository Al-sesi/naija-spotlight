[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = 'Stop'

$TOKEN = $env:VERCEL_TOKEN
$TEAM_ID = "team_zptffLzXUaztPWFD0mVQzIzd"
$PROJ_ID = "prj_2uDfcTvxhjs2Mw5HcJ7xZjqqWE25"
$base = (Resolve-Path dist).Path

Write-Host "=== Step 1: Building file list from dist/ (minimal v13 schema) ==="
$items = Get-ChildItem -Path $base -Recurse -File
$files = @()
foreach ($f in $items) {
  $full = $f.FullName
  $rel = $full.Substring($base.Length + 1).Replace('\','/')
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $b64 = [System.Convert]::ToBase64String($bytes)
  $files += [ordered]@{ file = $rel; data = $b64; encoding = "base64" }
  Write-Host "  OK: $rel  b64len=$($b64.Length)"
}
Write-Host "Total files: $($files.Count)"

Write-Host "`n=== Step 2: POST v13/deployments (target=production, forceNew=1, MINIMAL payload) ==="
$body = [ordered]@{
  name = "naija-spotlight-1"
  project = $PROJ_ID
  target = "production"
  forceNew = $true
  files = $files
} | ConvertTo-Json -Depth 8 -Compress

Write-Host "Payload size: $($body.Length) chars"

$h = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }
try {
  $r = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID&forceNew=1" -Headers $h -Method Post -Body $body -UseBasicParsing
  $ID = $r.id
  $URL = $r.url
  $STATE = $r.state
  Write-Host "DEPLOY CREATED -> id=$ID  url=https://$URL  state=$STATE"
  if ($r.alias -and $r.alias.Count -gt 0) { Write-Host "ALIASES (pre-assigned): $($r.alias -join ', ')" }
} catch {
  $ex = $_.Exception
  Write-Host "HTTP: $($ex.Message)"
  try {
    $stream = $ex.Response.GetResponseStream()
    $stream.Position = 0
    $ms=New-Object System.IO.MemoryStream
    $stream.CopyTo($ms)
    $ba=$ms.ToArray()
    Write-Host "RAW: $([System.Text.Encoding]::UTF8.GetString($ba))"
  } catch {}
  exit 1
}

Write-Host "`n=== Step 3: Poll until READY (30x 5s = 2.5 min max) ==="
for ($i=0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 5
  try {
    $p = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments/$ID?teamId=$TEAM_ID" -Headers @{ Authorization = "Bearer $TOKEN" } -UseBasicParsing
    Write-Host "  poll $($i+1): state=$($p.state)"
    if ($p.state -eq "READY") {
      Write-Host "`n====== DEPLOY READY ======"
      Write-Host "Preview URL:    https://$($p.url)"
      if ($p.alias -and $p.alias.Count -gt 0) { foreach ($a in $p.alias) { Write-Host "Production URL: https://$a" } }
      Write-Host "Dashboard:      https://vercel.com/naijalift01-2149s-projects/naija-spotlight-1/$ID"
      exit 0
    }
    if ($p.state -eq "ERROR") {
      Write-Host "STATE=ERROR: $($p.errorMessage)"
      if ($p.errorChecks) { Write-Host "Details: $($p.errorChecks | ConvertTo-Json -Depth 5)" }
      exit 2
    }
  } catch {
    Write-Host "  poll $($i+1): err: $($_.Exception.Message)"
  }
}
Write-Host "TIMEOUT. Check dashboard: https://vercel.com/naijalift01-2149s-projects/naija-spotlight-1/$ID"
exit 3
