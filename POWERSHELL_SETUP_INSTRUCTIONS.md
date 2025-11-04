# PowerShell Setup Instructions for claude-export

## What does `claude-export` do? (Simple Explanation)

**`claude-export`** automatically updates your component documentation:

1. **Finds** the newest session file (like `Carousel_08.md` or `ThumbReachmapper_01_04112025.md`)
2. **Creates** a summary snippet from that session
3. **Adds** it to the top of the component's MASTER.md file (above the "END" marker)
4. **Commits** and **pushes** the changes to GitHub automatically

Think of it as: "Take my latest chat notes and add them to the master documentation file, then save everything to GitHub."

---

## Installation Steps

### Step 1: Open Your PowerShell Profile

```powershell
notepad $PROFILE
```

If this opens an empty file, that's fine - you're creating a new profile.

### Step 2: Add the Function

Copy the entire contents of `claude-export-function.ps1` and paste it into your PowerShell profile.

Or, you can copy this directly:

```powershell
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
            & bash './post_chat.sh' $compName
            
            # Small delay between components to avoid git conflicts
            Start-Sleep -Milliseconds 500
        }
        
        Write-Host "`nFinished processing all components!" -ForegroundColor Green
    }
    else {
        # Process single component
        # Use & bash (call operator) to ensure PowerShell properly passes arguments
        # No quotes around $component - PowerShell passes it as a separate argument
        & bash './post_chat.sh' $component
    }
}

function claude-sync { git add .; git commit -m 'Sync Claude session notes'; git push }
```

**Important Notes:**
- Uses single quotes (`'`) for static strings to avoid quote encoding issues
- No quotes around variables (`$compName`, `$component`) when passed to bash - PowerShell passes them correctly as separate arguments
- Uses `& bash` (call operator) to ensure proper argument passing
- No emojis to avoid encoding issues in Notepad

### Step 3: Save and Reload

1. Save the file (Ctrl+S)
2. Close Notepad
3. In PowerShell, reload your profile:
   ```powershell
   . $PROFILE
   ```

---

## Usage

### Update All Components
```powershell
claude-export
```
or
```powershell
claude-export all
```

### Update Single Component
```powershell
claude-export ThumbReachMapper
claude-export Carousel
```

---

## Troubleshooting

### "Function not found" after reloading
- Make sure you saved the file
- Make sure you ran `. $PROFILE` to reload
- Check if the function exists: `Get-Command claude-export`

### "Cannot find path" error
- Make sure you're in the project root directory (where `post_chat.sh` is located)
- Check that `notes/claude-sessions/` exists

### Still processing Carousel instead of your component
- **CRITICAL**: Make sure the function uses `& bash` (with `&`) not just `bash`
- The `&` operator ensures PowerShell properly passes arguments to bash
- **CRITICAL**: Variables should NOT have quotes: `$compName` not `"$compName"` (PowerShell passes unquoted variables correctly)
- Try: `$env:DEBUG="true"; claude-export ThumbReachMapper` to see what arguments are received
- Verify your function: `Get-Command claude-export | Select-Object -ExpandProperty Definition`
- If you see `bash "./post_chat.sh"` (without `&`), that's the problem - it should be `& bash './post_chat.sh' $component`
- If you see quotes around variables like `"$component"`, remove them - use `$component` instead

---

## What Happens Behind the Scenes

When you run `claude-export ThumbReachMapper`:

1. PowerShell function receives "ThumbReachMapper" via `$args[0]`
2. Calls `& bash './post_chat.sh' ThumbReachMapper` (the `&` ensures arguments are passed correctly, and the variable is passed without quotes)
3. Bash script:
   - Looks in `notes/claude-sessions/ThumbReachMapper/`
   - Finds newest `.md` file (excluding MASTER files)
   - Creates a summary snippet
   - Inserts it into `Thumbreachmapper_MASTER.md`
   - Commits and pushes to GitHub

When you run `claude-export` (no arguments):

1. PowerShell function defaults to "all"
2. Finds all directories in `notes/claude-sessions/`
3. Loops through each one and calls `post_chat.sh` for each
4. Processes: Carousel, ThumbReachMapper, and any future components

