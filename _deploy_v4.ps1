[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = 'Stop'

$auth = Get-Content "$env:APPDATA\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$TOKEN = $auth.token
$TEAM_ID = "team_zptffLzXUaztPWFD0mVQzIzd"
$PROJ_ID = "prj_2uDfcTvxhjs2Mw5HcJ7xZjqqWE25"
$base = (Resolve-Path dist).Path

Write-Host "=== Step 1: Build file list (ONLY file/encoding/data fields per v13 API) ==="
$items = Get-ChildItem -Path $base -Recurse -File
$files = @()
foreach ($f in $items) {
  $full = $f.FullName
  $rel = $full.Substring($base.Length + 1).Replace('\','/')
  $bytes = [System.IO.File]::ReadAllBytes($full)
  $b64 = [System.Convert]::ToBase64String($bytes)
  $files += [ordered]@{ file = $rel; encoding = "base64"; data = $b64 }
  Write-Host "  + $rel  bytes=$($bytes.Length)"
}
Write-Host "Total files: $($files.Count)"

Write-Host "`n=== Step 2: POST v13/deployments ==="
$body = [ordered]@{
  name = "naija-spotlight-1"
  project = $PROJ_ID
  region = "iad1"
  target = "production"
  forceNew = $true
  framework = "vite"
  files = $files
} | ConvertTo-Json -Depth 6 -Compress

$h = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }
try {
  $r = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID" -Headers $h -Method Post -Body $body -UseBasicParsing
  $ID = $r.id; $URL = $r.url; $STATE = $r.state
  Write-Host "OK: id=$ID  url=https://$URL  state=$STATE"
  if ($r.alias.Count -gt 0) { Write-Host "ALIASES: $($r.alias -join ', ')" }
} catch {
  $ex = $_.Exception
  Write-Host "HTTP ERR: $($ex.Message)"
  try {
    $stream = $ex.Response.GetResponseStream(); $stream.Position = 0; $ms=New-Object System.IO.MemoryStream; $stream.CopyTo($ms); $ba=$ms.ToArray()
    Write-Host "RAW> $([System.Text.Encoding]::UTF8.GetString($ba))"
  } catch {}
  exit 1
}

Write-Host "`n=== Step 3: Poll READY ==="
for ($i=0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 5
  try {
    $p = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments/$ID?teamId=$TEAM_ID" -Headers @{ Authorization = "Bearer $TOKEN" } -UseBasicParsing
    Write-Host "  poll $($i+1): state=$($p.state)"
    if ($p.state -eq "READY") {
      Write-Host "`n=== ✅ DEPLOY SUCCESS ==="
      Write-Host "Preview URL:    https://$($p.url)"
      if ($p.alias.Count -gt 0) { foreach ($a in $p.alias) { Write-Host "Production URL: https://$a" } }
      Write-Host "Dashboard:      https://vercel.com/naijalift01-2149s-projects/naija-spotlight-1/$ID"
      exit 0
    }
    if ($p.state -eq "ERROR") { Write-Host "ERROR state: $($p.errorMessage)" ; exit 2 }
  } catch { Write-Host "poll-err: $($_.Exception.Message)" }
}
Write-Host "TIMEOUT — check dashboard"; exit 3
