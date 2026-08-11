$ErrorActionPreference = 'Stop'
$auth = Get-Content "$env:APPDATA\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$TOKEN = $auth.token
$TEAM_ID = "team_zptffLzXUaztPWFD0mVQzIzd"

Write-Host "=== 1. Invoke-WebRequest POST v13/deployments minimal hello-world (Capture raw Response + HTTP status) ==="

$minimal = @{
  name = "naija-spotlight-1"
  files = @(@{
    file = "index.html"
    data = "PGh0bWw+PGJvZHk+PGgxPkhlbGxvIGZyb20gTWFqZWVkPC9oMT48L2JvZHk+PC9odG1sPg=="
    encoding = "base64"
    size = 73
    sha = "70e31b535cc0323e85f4d1e817d00b5f3a66be5b"
  })
  region = "iad1"
} | ConvertTo-Json -Depth 8

$headers = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }
$uri = "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID"
try {
  $resp = Invoke-WebRequest -Uri $uri -Headers $headers -Method Post -Body $minimal -UseBasicParsing
  Write-Host "STATUS=$($resp.StatusCode) TYPE=$($resp.Headers['Content-Type'])"
  Write-Host "BODY=$($resp.Content)"
  $c = $resp.Content | ConvertFrom-Json
  Write-Host "ID=$($c.id) URL=$($c.url) STATE=$($c.state)"
} catch {
  $ex = $_.Exception
  Write-Host "EXC=$($ex.GetType().FullName) MSG=$($ex.Message)"
  try {
    Write-Host "HTTP STATUS=$([int]$ex.Response.StatusCode) $($ex.Response.StatusCode)"
    Write-Host "HEADERS==="
    foreach ($k in $ex.Response.Headers.Keys) { Write-Host "  $($k)=$($ex.Response.Headers[$k])" }
    $sr = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
    $body = $sr.ReadToEnd()
    Write-Host "BODY==="
    Write-Host $body
    Write-Host "BODY END==="
    try { $d = $body | ConvertFrom-Json ; if ($d.error) { Write-Host "PARSED ERR: code=$($d.error.code) message=$($d.error.message)" } } catch {}
  } catch { Write-Host "INNER ERR: $($_.Exception.Message)" }
}
