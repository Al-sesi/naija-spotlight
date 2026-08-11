[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = 'Stop'

$TOKEN = $env:VERCEL_TOKEN
$TEAM_ID = "team_zptffLzXUaztPWFD0mVQzIzd"
$PROJ_ID = "prj_2uDfcTvxhjs2Mw5HcJ7xZjqqWE25"
$base = (Resolve-Path dist).Path

Write-Host "=== Step 1: Building file list (ABSOLUTE MINIMAL payload) ==="
$items = Get-ChildItem -Path $base -Recurse -File
$files = @()
foreach ($f in $items) {
  $full = $f.FullName
  $rel = $full.Substring($base.Length + 1).Replace('\','/')
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $b64 = [System.Convert]::ToBase64String($bytes)
  $files += [ordered]@{ file = $rel; data = $b64; encoding = "base64" }
  Write-Host "  OK: $rel"
}
Write-Host "Total files: $($files.Count)"

Write-Host "`n=== Step 2: POST deployments (v14, minimal body, forceNew in query) ==="
$body = [ordered]@{
  name = "naija-spotlight-1"
  project = $PROJ_ID
  target = "production"
  files = $files
} | ConvertTo-Json -Depth 8 -Compress

Write-Host "Payload size: $($body.Length) bytes"

$h = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }
try {
  $uri = "https://api.vercel.com/v14/deployments?teamId=$TEAM_ID&forceNew=1&skipAutoDetectionConfirmation=1"
  $r = Invoke-RestMethod -Uri $uri -Headers $h -Method Post -Body $body -UseBasicParsing
  $ID = $r.id
  $URL = $r.url
  $STATE = $r.state
  Write-Host "DEPLOY CREATED -> id=$ID"
  Write-Host "  URL:   https://$URL"
  Write-Host "  STATE: $STATE"
  if ($r.alias -and $r.alias.Count -gt 0) { Write-Host "  ALIASES: $($r.alias -join ', ')" }
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
      Write-Host "Error code: $($err.error.code)"
      Write-Host "Error msg:  $($err.error.message)"
      if ($err.error.params) { Write-Host "Params: $($err.error.params | ConvertTo-Json -Depth 5)" }
    } catch {}
  } catch {}
  exit 1
}

Write-Host "`n=== Step 3: Poll until READY (40x 5s = 3.3min) ==="
for ($i=0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 5
  try {
    $p = Invoke-RestMethod -Uri "https://api.vercel.com/v14/deployments/$ID?teamId=$TEAM_ID" -Headers @{ Authorization = "Bearer $TOKEN" } -UseBasicParsing
    $st = $p.state
    Write-Host "  poll $($i+1): state=$st"
    if ($st -eq "READY") {
      Write-Host "`n====== DEPLOY SUCCESS (READY) ======"
      Write-Host "Unique URL:  https://$($p.url)"
      if ($p.alias -and $p.alias.Count -gt 0) { foreach ($a in $p.alias) { Write-Host "Production:  https://$a" } }
      Write-Host "Dashboard:   https://vercel.com/naijalift01-2149s-projects/naija-spotlight-1/$ID"
      exit 0
    }
    if ($st -eq "ERROR") {
      Write-Host "STATE=ERROR: $($p.errorMessage)"
      exit 2
    }
    if ($st -eq "CANCELED") {
      Write-Host "STATE=CANCELED"
      exit 3
    }
  } catch {
    Write-Host "  poll $($i+1): exception: $($_.Exception.Message.Substring(0, [Math]::Min(80, $_.Exception.Message.Length)))"
  }
}
Write-Host "TIMEOUT after 40 polls. Check dashboard manually."
exit 4
