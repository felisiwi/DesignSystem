# PowerShell Profile Setup Script
# This script adds claude-export and claude-sync functions to your PowerShell profile

Write-Host "Setting up PowerShell profile..." -ForegroundColor Cyan

# Get the profile path
$profilePath = $PROFILE

# Check if profile directory exists
$profileDir = Split-Path $profilePath -Parent
if (!(Test-Path $profileDir)) {
    Write-Host "Creating profile directory: $profileDir" -ForegroundColor Yellow
    New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
}

# Get the function content from the project file
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$functionFile = Join-Path $projectRoot "claude-export-function.ps1"

if (!(Test-Path $functionFile)) {
    Write-Host "ERROR: claude-export-function.ps1 not found at: $functionFile" -ForegroundColor Red
    Write-Host "Make sure you're running this from the project directory." -ForegroundColor Yellow
    exit 1
}

$functionContent = Get-Content $functionFile -Raw

# Check if functions already exist in profile
$needsUpdate = $true
if (Test-Path $profilePath) {
    $existingContent = Get-Content $profilePath -Raw
    if ($existingContent -match 'function claude-export' -and $existingContent -match 'function claude-sync') {
        Write-Host "Functions already exist in profile." -ForegroundColor Green
        $needsUpdate = $false
    }
}

if ($needsUpdate) {
    # Read existing profile content (if any)
    $existingContent = ""
    if (Test-Path $profilePath) {
        $existingContent = Get-Content $profilePath -Raw
    }
    
    # Check if we need to add the functions
    if ($existingContent -notmatch 'function claude-export') {
        Write-Host "Adding claude-export and claude-sync functions to profile..." -ForegroundColor Yellow
        
        # Add a separator comment if profile already has content
        $separator = ""
        if ($existingContent -and $existingContent.Trim() -ne "") {
            $separator = "`n`n# ========================================`n# Claude Export Functions`n# ========================================`n"
        }
        
        # Append functions to profile
        Add-Content -Path $profilePath -Value "$separator$functionContent"
        
        Write-Host "✅ Functions added to profile!" -ForegroundColor Green
    } else {
        Write-Host "Functions already in profile, but may need updating..." -ForegroundColor Yellow
        # Replace existing functions
        $updatedContent = $existingContent -replace '(?s)function claude-export\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', '' -replace '(?s)function claude-sync\s*\{[^}]*\}', ''
        $updatedContent = $updatedContent.Trim() + "`n`n# ========================================`n# Claude Export Functions`n# ========================================`n$functionContent"
        Set-Content -Path $profilePath -Value $updatedContent
        Write-Host "✅ Functions updated in profile!" -ForegroundColor Green
    }
} else {
    Write-Host "Profile is already set up correctly." -ForegroundColor Green
}

Write-Host "`nReloading profile..." -ForegroundColor Cyan
. $profilePath

Write-Host "`n✅ Setup complete! Testing functions..." -ForegroundColor Green

# Test if functions are available
if (Get-Command claude-export -ErrorAction SilentlyContinue) {
    Write-Host "✅ claude-export is available" -ForegroundColor Green
} else {
    Write-Host "❌ claude-export not found - try reloading: . `$PROFILE" -ForegroundColor Red
}

if (Get-Command claude-sync -ErrorAction SilentlyContinue) {
    Write-Host "✅ claude-sync is available" -ForegroundColor Green
} else {
    Write-Host "❌ claude-sync not found - try reloading: . `$PROFILE" -ForegroundColor Red
}

Write-Host "`nYou can now use:" -ForegroundColor Cyan
Write-Host "  claude-export" -ForegroundColor White
Write-Host "  claude-export Carousel" -ForegroundColor White
Write-Host "  claude-sync" -ForegroundColor White

