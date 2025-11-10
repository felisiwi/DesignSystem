# Quick PowerShell Profile Update Script
# Run this in PowerShell: .\update-profile.ps1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$correctFunctionPath = Join-Path $scriptDir "claude-export-function.ps1"

if (!(Test-Path $correctFunctionPath)) {
    Write-Host "ERROR: claude-export-function.ps1 not found!" -ForegroundColor Red
    Write-Host "Expected at: $correctFunctionPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "Updating PowerShell profile..." -ForegroundColor Cyan
Write-Host "Profile location: $PROFILE" -ForegroundColor Gray

# Ensure profile directory exists
$profileDir = Split-Path $PROFILE -Parent
if (!(Test-Path $profileDir)) {
    Write-Host "Creating profile directory..." -ForegroundColor Yellow
    New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
}

# Read the function file
$functionContent = Get-Content $correctFunctionPath -Raw

# Check if profile exists and has content
$profileExists = Test-Path $PROFILE
$existingContent = ""

if ($profileExists) {
    $existingContent = Get-Content $PROFILE -Raw
    Write-Host "Profile exists, checking for functions..." -ForegroundColor Gray
} else {
    Write-Host "Profile doesn't exist, creating new one..." -ForegroundColor Yellow
}

# Check if functions already exist
$hasClaudeExport = $existingContent -match 'function claude-export'
$hasClaudeSync = $existingContent -match 'function claude-sync'

if ($hasClaudeExport -and $hasClaudeSync) {
    Write-Host "Functions already exist in profile." -ForegroundColor Green
    Write-Host "Updating to latest version..." -ForegroundColor Yellow
    
    # Remove old functions
    $updatedContent = $existingContent -replace '(?s)# ========================================.*?Claude Export Functions.*?========================================\s*', '' -replace '(?s)Set-Alias bash.*?\r?\n', '' -replace '(?s)function claude-export\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', '' -replace '(?s)function claude-sync\s*\{[^}]*\}', ''
    
    # Add new functions
    $separator = "`n`n"
    if ($updatedContent.Trim() -ne "") {
        $separator = "`n`n# ========================================`n# Claude Export Functions`n# ========================================`n"
    } else {
        $separator = "# ========================================`n# Claude Export Functions`n# ========================================`n"
    }
    
    $newContent = $updatedContent.Trim() + $separator + $functionContent.Trim()
    Set-Content -Path $PROFILE -Value $newContent -Encoding UTF8
} else {
    Write-Host "Adding functions to profile..." -ForegroundColor Yellow
    
    # Add separator if profile has content
    $separator = ""
    if ($existingContent -and $existingContent.Trim() -ne "") {
        $separator = "`n`n# ========================================`n# Claude Export Functions`n# ========================================`n"
    } else {
        $separator = "# ========================================`n# Claude Export Functions`n# ========================================`n"
    }
    
    # Append functions
    Add-Content -Path $PROFILE -Value $separator -Encoding UTF8
    Add-Content -Path $PROFILE -Value $functionContent -Encoding UTF8
}

Write-Host "`nReloading profile..." -ForegroundColor Cyan
. $PROFILE

Write-Host "`n✅ Profile updated! Testing functions..." -ForegroundColor Green

# Test functions
if (Get-Command claude-export -ErrorAction SilentlyContinue) {
    Write-Host "✅ claude-export is available" -ForegroundColor Green
} else {
    Write-Host "⚠️  claude-export not found - you may need to restart PowerShell" -ForegroundColor Yellow
}

if (Get-Command claude-sync -ErrorAction SilentlyContinue) {
    Write-Host "✅ claude-sync is available" -ForegroundColor Green
} else {
    Write-Host "⚠️  claude-sync not found - you may need to restart PowerShell" -ForegroundColor Yellow
}

Write-Host "`nYou can now use:" -ForegroundColor Cyan
Write-Host "  claude-export" -ForegroundColor White
Write-Host "  claude-export Carousel" -ForegroundColor White
Write-Host "  claude-sync" -ForegroundColor White
