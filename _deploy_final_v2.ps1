[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = 'Stop'

$TOKEN = $env:VERCEL_TOKEN
$TEAM_ID = "team_zptffLzXUaztPWFD0mVQzIzd"
$PROJ_ID = "prj_2uDfcTvxhjs2Mw5HcJ7xZjqqWE25"
$base = (Resolve-Path dist).Path

Write-Host "=== Step 1: Building file list ==="
$items = Get-ChildItem -Path $base -Recurse -File
$files = @()
foreach ($f in $items) {
  $full = $f.FullName
  $rel = $full.Substring($base.Length + 1).Replace('\','/')
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $b64 = [System.Convert]::ToBase64String($bytes)
  $files += [ordered]@{ file = $rel; data = $b64; encoding = "base64" }
  Write-Host "  OK: $rel  size=$($b64.Length)"
}
Write-Host "Total files: $($files.Count)"

Write-Host "`n=== Step 2: POST v13/deployments (forceNew ONLY in query, NOT in body) ==="
$body = [ordered]@{
  name    = "naija-spotlight-1"
  project = $PROJ_ID
  target  = "production"
  files   = $files
} | ConvertTo-Json -Depth 8 -Compress

Write-Host "Body size: $($body.Length) chars"

$h = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }
$uri = "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID&forceNew=1"
Write-Host "URI: $uri"

try {
  $r = Invoke-RestMethod -Uri $uri -Headers $h -Method Post -Body $body -UseBasicParsing
  $ID = $r.id
  $URL = $r.url
  $STATE = $r.state
  Write-Host "`nDEPLOY CREATED SUCCESSFULLY!"
  Write-Host "  ID:    $ID"
  Write-Host "  URL:   https://$URL"
  Write-Host "  STATE: $STATE"
  if ($r.alias -and $r.alias.Count -gt 0) { Write-Host "  ALIAS: $($r.alias -join ', ')" }
} catch {
  $ex = $_.Exception
  Write-Host "HTTP ERROR: $($ex.Message)"
  try {
    $stream = $ex.Response.GetResponseStream()
    $stream.Position = 0
    $ms=New-Object System.IO.MemoryStream
    $stream.CopyTo($ms)
    $ba=$ms.ToArray()
    $raw = [System.Text.Encoding]::UTF8.GetString($ba)
    Write-Host "RAW: $raw"
    try {
      $err = $raw | ConvertFrom-Json
      Write-Host "CODE: $($err.error.code)"
      Write-Host "MSG:  $($err.error.message)"
      if ($err.error.params -and $err.error.params.additionalProperty) {
        Write-Host "REMOVE THIS FIELD: $($err.error.params.additionalProperty)"
      }
    } catch {}
  } catch {}
  exit 1
}

Write-Host "`n=== Step 3: Poll (40x 5s = 3.3 min max) ==="
for ($i=0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 5
  try {
    $p = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments/$ID?teamId=$TEAM_ID" -Headers @{ Authorization = "Bearer $TOKEN" } -UseBasicParsing
    $st = $p.state
    Write-Host "  poll $($i+1): $st"
    if ($st -eq "READY") {
      Write-Host "`n====== DEPLOY READY - SUCCESS! ======"
      Write-Host "Unique URL:  https://$($p.url)"
      if ($p.alias -and $p.alias.Count -gt 0) {
        foreach ($a in $p.alias) { Write-Host "Production:  https://$a" }
      } else {
        Write-Host "(No aliases yet - production domain propagation may take a minute)"
      }
      Write-Host "Dashboard:   https://vercel.com/naijalift01-2149s-projects/naija-spotlight-1/$ID"
      exit 0
    }
    if ($st -eq "ERROR") {
      Write-Host "BUILD ERROR: $($p.errorMessage)"
      if ($p.errorChecks) { Write-Host "Details: $($p.errorChecks | ConvertTo-Json -Depth 5)" }
      exit 2
    }
  } catch {
    $msg = $_.Exception.Message
    if ($msg.Length -gt 90) { $msg = $msg.Substring(0,90) + "..." }
    Write-Host "  poll $($i+1): err: $msg"
  }
}
Write-Host "TIMEOUT. Check dashboard: https://vercel.com/naijalift01-2149s-projects/naija-spotlight-1/$ID"
exit 4
