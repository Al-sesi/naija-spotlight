# ========================================================================
# NaijaLift — Git Push Script (Sunday Referral Fix Patch)
# Run in STANDALONE PowerShell (Windows key → "PowerShell" → open,
# then run: powershell -ExecutionPolicy Bypass -File THIS_FILE_PATH
# ========================================================================

$ErrorActionPreference = "Continue"
$PROJECT = "c:\Users\HomePC\Documents\naija-spotlight-1"
$REPO_URL = "https://github.com/Al-sesi/naija-spotlight.git"
$AUTHOR_NAME = "sesibarmandu"
$AUTHOR_EMAIL = "sesibarmandu@gmail.com"
$COMMIT_MSG = "Fix Sunday referral code + add link click tracking + admin dashboard metrics"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NaijaLift Git Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PROJECT
Write-Host "[1/6] Working dir: $(Get-Location)" -ForegroundColor Yellow

Write-Host ""
Write-Host "[2/6] git status ..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "[3/6] Configure git + ensure origin remote ..." -ForegroundColor Yellow
git config user.name  $AUTHOR_NAME
git config user.email $AUTHOR_EMAIL
$remotes = git remote
if ($remotes -notcontains "origin") {
    if (-not (Test-Path .git)) { git init }
    git remote add origin $REPO_URL
    Write-Host "   -> origin added: $REPO_URL" -ForegroundColor Green
} else {
    $current = git remote get-url origin
    Write-Host "   -> origin already set to: $current" -ForegroundColor Green
    if ($current -ne $REPO_URL) {
        Write-Host "   -> updating origin to: $REPO_URL" -ForegroundColor Magenta
        git remote set-url origin $REPO_URL
    }
}

Write-Host ""
Write-Host "[4/6] git add -A (staging all changes) ..." -ForegroundColor Yellow
git add -A
git status --short | Select-Object -First 30

Write-Host ""
Write-Host "[5/6] git commit (author=$AUTHOR_EMAIL) ..." -ForegroundColor Yellow
git commit --author="$AUTHOR_NAME <$AUTHOR_EMAIL>" -m $COMMIT_MSG
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ! commit exited $LASTEXITCODE (possibly nothing to commit — continuing)" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "[6/6] git push -u origin main ..." -ForegroundColor Yellow
$branches = git branch -a
if ($branches -match "remotes/origin/main") {
    git push origin main
} else {
    git branch -M main
    git push -u origin main
}
$pushExit = $LASTEXITCODE

Write-Host ""
if ($pushExit -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCESS  —  code pushed to GitHub." -ForegroundColor Green
    Write-Host "  Vercel auto-deploy triggered." -ForegroundColor Green
    Write-Host "  Wait 1-2 min, then HARD-REFRESH (Ctrl+Shift+R)" -ForegroundColor Green
    Write-Host "  https://www.naijalift.space/sign-up?ref=sundayfideXJ8K" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Push exited with code $pushExit" -ForegroundColor Red
    Write-Host "  If GitHub asks for password, use a Personal Access Token (PAT):" -ForegroundColor Red
    Write-Host "  https://github.com/settings/tokens  (check repo scope)" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}
Write-Host ""
Read-Host "Press Enter to close"
