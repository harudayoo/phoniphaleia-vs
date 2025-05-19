# Setup and run tests for the ZKP and Threshold Cryptography system

# Create and activate virtual environment
Write-Host "`n[1/5] Creating and activating Python virtual environment..." -ForegroundColor Cyan
if (-not (Test-Path -Path "venv")) {
    python -m venv venv
}
& .\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "`n[2/5] Installing backend dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "`n[3/5] Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location -Path ..\frontend
npm install

# Run backend tests
Write-Host "`n[4/5] Running backend tests..." -ForegroundColor Cyan
Set-Location -Path ..\backend

# Run regular tests
Write-Host "Running core crypto tests..." -ForegroundColor Yellow
python -m tests.run_tests

# Run challenge-response authentication test if server is running
Write-Host "Running challenge-response authentication tests..." -ForegroundColor Yellow
$testServer = Read-Host "Is the backend server running for authentication tests? (y/n)"
if ($testServer -eq "y") {
    python -m tests.test_challenge_response
} else {
    Write-Host "Skipping authentication tests..." -ForegroundColor Yellow
}

# Run frontend tests
Write-Host "`n[5/5] Running frontend tests..." -ForegroundColor Cyan
Set-Location -Path ..\frontend
node tests\run-tests.js

Write-Host "`nAll tests completed!" -ForegroundColor Green
Set-Location -Path ..\backend
