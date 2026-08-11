[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ErrorActionPreference = 'Stop'
$auth = Get-Content "$env:APPDATA\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$TOKEN = $auth.token
$TEAM_ID = "team_zptffLzXUaztPWFD0mVQzIzd"

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
  Write-Host "STATUS=$($resp.StatusCode)"
  Write-Host "BODY=$($resp.Content)"
  exit 0
} catch {
  $ex = $_.Exception
  Write-Host "EXC MSG=$($ex.Message)"
  try {
    $stream = $ex.Response.GetResponseStream()
    $stream.Position = 0
    $ms = New-Object System.IO.MemoryStream
    $stream.CopyTo($ms)
    $ba = $ms.ToArray()
    Write-Host "RAW BYTES LEN=$($ba.Length)"
    Write-Host "UTF8: $([System.Text.Encoding]::UTF8.GetString($ba))"
    Write-Host "LATIN1: $([System.Text.Encoding]::GetEncoding('ISO-8859-1').GetString($ba))"
  } catch { Write-Host "INNER: $($_.Exception.Message)" }
}
