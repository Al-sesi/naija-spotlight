$ErrorActionPreference = 'Continue'
$PROJECT_DIR = "c:\Users\HomePC\Documents\naija-spotlight-1"
$AUTHOR_EMAIL = "sesibarmandu@gmail.com"
$COMMIT_MSG = "Fix Sunday referral code + add link click tracking + admin dashboard metrics"
$REMOTE_URL = "https://github.com/Al-sesi/naija-spotlight.git"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 1: git status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Set-Location $PROJECT_DIR
git status 2>&1 | Write-Host
Write-Host "Exit code: $LASTEXITCODE"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 2: Check remote origin" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$remotes = git remote 2>&1
Write-Host "Current remotes: $remotes"
if ($remotes -notmatch "origin") {
    Write-Host "Remote origin missing. Running git init + git remote add..." -ForegroundColor Yellow
    git init 2>&1 | Write-Host
    git remote add origin $REMOTE_URL 2>&1 | Write-Host
    Write-Host "Init + remote add exit code: $LASTEXITCODE"
} else {
    Write-Host "Remote origin already exists." -ForegroundColor Green
    $originUrl = git remote get-url origin 2>&1
    Write-Host "Origin URL: $originUrl"
    if ($originUrl -ne $REMOTE_URL) {
        Write-Host "Updating origin URL to: $REMOTE_URL" -ForegroundColor Yellow
        git remote set-url origin $REMOTE_URL 2>&1 | Write-Host
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 3: git add -A" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
git add -A 2>&1 | Write-Host
Write-Host "Exit code: $LASTEXITCODE"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 4: git commit" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
git commit --author="$AUTHOR_EMAIL <$AUTHOR_EMAIL>" -m "$COMMIT_MSG" 2>&1 | Write-Host
Write-Host "Exit code: $LASTEXITCODE"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 5: git push origin main" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$firstPush = $false
$branchOutput = git branch -a 2>&1
if ($branchOutput -notmatch "remotes/origin/main") {
    Write-Host "First push detected - using -u origin main" -ForegroundColor Yellow
    $firstPush = $true
}

if ($firstPush) {
    git push -u origin main 2>&1 | Write-Host
} else {
    git push origin main 2>&1 | Write-Host
}
Write-Host "Exit code: $LASTEXITCODE"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "ALL STEPS COMPLETED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
