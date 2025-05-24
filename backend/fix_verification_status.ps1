# Fix verification status for election results
# This script calls the Python script to fix verification status for election results

param (
    [Parameter(Mandatory=$false)]
    [int]$ElectionId
)

Write-Host "Election Result Verification Status Fix Utility" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "fix_verification_status.py"

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: Could not find fix_verification_status.py script at $scriptPath" -ForegroundColor Red
    exit 1
}

if ($ElectionId) {
    Write-Host "Fixing verification status for election ID: $ElectionId" -ForegroundColor Yellow
    python $scriptPath --election_id $ElectionId
}
else {
    Write-Host "Fixing verification status for all elections" -ForegroundColor Yellow
    python $scriptPath
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Fix operation completed with errors. See output above for details." -ForegroundColor Red
    exit $LASTEXITCODE
}
else {
    Write-Host "Fix operation completed successfully." -ForegroundColor Green
}
