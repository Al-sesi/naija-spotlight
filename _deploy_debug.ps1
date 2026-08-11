$ErrorActionPreference = 'Stop'
$auth = Get-Content "$env:APPDATA\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$TOKEN = $auth.token
$TEAM_ID = "team_zptffLzXUaztPWFD0mVQzIzd"
$PROJ_ID = "prj_2uDfcTvxhjs2Mw5HcJ7xZjqqWE25"

Write-Host "token=$($TOKEN.Substring(0,8))... team=$TEAM_ID proj=$PROJ_ID"

Write-Host "`n=== 1. Create deployment (simpler body: no routing, no project link, no target, no build.skip) ==="
$body = @{
  name = "naija-spotlight-1"
  deployment = @{
    meta = @{ byCli = "1"; cliVersion = "39.0.0" }
  }
  files = @(
    @{ file = "index.html"; data = [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes((Join-Path (Resolve-Path dist).Path "index.html"))); encoding = "base64" }
  )
} | ConvertTo-Json -Depth 12

$h1 = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }
try {
  $u = "https://api.vercel.com/v12/now/deployments?teamId=$TEAM_ID"
  Write-Host "POST $u  bodylen=$($body.Length)"
  $r = Invoke-RestMethod -Uri $u -Headers $h1 -Method Post -Body $body -UseBasicParsing
  $DEPLOY_ID = $r.id
  $URL = $r.url
  $STATE = $r.state
  Write-Host "OK: id=$DEPLOY_ID url=$URL state=$STATE"
  exit 0
} catch {
  $ex = $_.Exception
  Write-Host "HTTP ERR: $($ex.Message)"
  if ($ex.Response) {
    try {
      $sr = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
      $raw = $sr.ReadToEnd()
      Write-Host "RAWERR> $raw"
      try { $d = $raw | ConvertFrom-Json ; if ($d.error) { Write-Host "ERR.code=$($d.error.code) ERR.message=$($d.error.message)" } } catch {}
    } catch { Write-Host "no body" }
  }
  exit 1
}
