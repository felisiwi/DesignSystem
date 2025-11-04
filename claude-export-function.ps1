# Claude Export PowerShell Function
# Copy this function into your PowerShell profile ($PROFILE)
# 
# IMPORTANT: This version uses single quotes for static strings and no quotes around variables
# to avoid encoding issues with Notepad and PowerShell quote handling.

Set-Alias bash 'C:\Program Files\Git\bin\bash.exe'

function claude-export {
    # Get component name from arguments, or "all" if no arguments
    $component = if ($args.Count -gt 0) { $args[0] } else { 'all' }
    
    # If "all" or empty, process all components
    if ($component -eq 'all' -or $component -eq '') {
        Write-Host 'Processing ALL components...' -ForegroundColor Cyan
        
        # Get all component directories
        $componentDirs = Get-ChildItem -Path 'notes/claude-sessions' -Directory -ErrorAction SilentlyContinue
        
        if ($componentDirs.Count -eq 0) {
            Write-Host 'No component directories found in notes/claude-sessions/' -ForegroundColor Red
            return
        }
        
        foreach ($dir in $componentDirs) {
            $compName = $dir.Name
            Write-Host "`nProcessing component: $compName" -ForegroundColor Yellow
            # Use & bash (call operator) to ensure PowerShell properly passes arguments
            # No quotes around $compName - PowerShell passes it as a separate argument
            & bash './scripts/post_chat.sh' $compName
            
            # Small delay between components to avoid git conflicts
            Start-Sleep -Milliseconds 500
        }
        
        Write-Host "`nFinished processing all components!" -ForegroundColor Green
    }
    else {
        # Process single component
        # Use & bash (call operator) to ensure PowerShell properly passes arguments
        # No quotes around $component - PowerShell passes it as a separate argument
        & bash './scripts/post_chat.sh' $component
    }
}

function claude-sync { git add .; git commit -m 'Sync Claude session notes'; git push }

