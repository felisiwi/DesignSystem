# Script to update PowerShell profile with correct claude-export function
# Run this from PowerShell: .\update-profile.ps1

$profilePath = $PROFILE
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$correctFunctionPath = Join-Path $scriptDir "claude-export-function.ps1"

Write-Host "Updating PowerShell profile at: $profilePath" -ForegroundColor Cyan

# Check if function file exists
if (-not (Test-Path $correctFunctionPath)) {
    Write-Host "ERROR: claude-export-function.ps1 not found!" -ForegroundColor Red
    Write-Host "Expected location: $correctFunctionPath" -ForegroundColor Yellow
    Write-Host "Make sure you run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Check if profile exists, create if not
if (-not (Test-Path $profilePath)) {
    Write-Host "Profile doesn't exist. Creating it..." -ForegroundColor Yellow
    $profileDir = Split-Path $profilePath -Parent
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
}

# Read current profile
$profileContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
if (-not $profileContent) {
    $profileContent = ""
}

# Read the correct function (skip header comments, keep everything from Set-Alias onwards)
$correctFunction = Get-Content $correctFunctionPath -Raw
$functionToAdd = $correctFunction -replace '(?s)^#.*?\n(?=Set-Alias)', ''

# Remove old functions using more reliable pattern
# Remove claude-export function
$profileContent = $profileContent -replace '(?s)function claude-export\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', ''

# Remove claude-sync function  
$profileContent = $profileContent -replace '(?s)function claude-sync\s*\{[^}]*\}', ''

# Remove old bash alias (if standalone, not in function)
$profileContent = $profileContent -replace "(?m)^Set-Alias bash\s+['`"].*['`"]\s*$", ''

# Clean up extra blank lines
$profileContent = $profileContent.Trim() -replace '\n{3,}', "`n`n"

# Add the correct functions
if ($profileContent.Length -gt 0) {
    $profileContent += "`n`n"
}

$profileContent += $functionToAdd.Trim()

# Write updated profile
[System.IO.File]::WriteAllText($profilePath, $profileContent, [System.Text.Encoding]::UTF8)

Write-Host "`nProfile updated successfully!" -ForegroundColor Green
Write-Host "`nReloading profile..." -ForegroundColor Cyan
. $profilePath

Write-Host "`nDone! Test with: claude-export Carousel" -ForegroundColor Green

