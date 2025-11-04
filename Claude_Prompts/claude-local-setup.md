# CLAUDE LOCAL SETUP – COMPLETE GUIDE

## Overview
You have two environments for working with Claude:
- 🟣 **Claude App** – Used for reasoning, ideation, and writing Markdown summaries. Cannot modify files.
- 🟢 **Claude Code (Local)** – Installed locally. Can automate tasks, update Markdown files, and push to GitHub.

They do not directly sync — instead, you manually save Markdown summaries from the app into your local repo.

---

## Commands
| Command | Purpose |
|----------|----------|
| `claude-export` | Updates ALL components (finds newest session file for each and adds to MASTER) |
| `claude-export all` | Same as `claude-export` - updates all components |
| `claude-export [ComponentName]` | Updates only the specified component (e.g., `claude-export ThumbReachMapper`) |
| `claude-sync` | Adds, commits, and pushes repo changes to GitHub |

---

## Workflow Summary
1. Start a new chat in the **Claude App** using `Start-of-Chat.md`.  
2. Work through the session.  
3. End the session using `End-of-Chat.md`.  
4. Copy the Markdown summary Claude outputs.  
5. Save it manually to `/notes/claude-sessions/[ComponentName]/` as `[ComponentName]_[date].md`.  
   - Example: `notes/claude-sessions/ThumbReachMapper/ThumbReachmapper_01_04112025.md`
6. Run `claude-export` locally — it will:
   - **If no component specified**: Process ALL components (Carousel, ThumbReachMapper, etc.)
   - **If component specified**: Process only that component
   - For each component: Find the newest session file, create a summary, add it to the MASTER.md file
   - Commit and push changes automatically  
7. (Optional) Run `claude-sync` manually if needed to push other files.

---

## File Roles
| File | Purpose |
|------|----------|
| `/notes/claude-sessions/[ComponentName]/` | Individual chat summaries per component |
| `/notes/claude-sessions/[ComponentName]/*MASTER.md` | Canonical master document for each component |
| `/post_chat.sh` | Automation script run by `claude-export` (handles single component) |
| `/claude-export-function.ps1` | PowerShell function definition (add to your $PROFILE) |
| `/notes/Claude Prompts/` | Start-of-Chat and End-of-Chat prompt files |
| `/PROJECT_NOTES.md` | Project context and component index for Claude & Cursor |

## Setup Required

**Before using `claude-export`, you must add the function to your PowerShell profile:**

1. Open: `notepad $PROFILE`
2. Copy the **entire contents** of `claude-export-function.ps1` into your profile
   - **Important**: The function uses single quotes and no quotes around variables to avoid encoding issues
   - Make sure you copy the exact version from the file (not an older version)
3. Save and reload: `. $PROFILE`
4. Test: `claude-export ThumbReachMapper` (should process ThumbReachMapper, not Carousel)

**If you encounter quote/encoding errors:**
- The function in `claude-export-function.ps1` uses single quotes for strings and no quotes around variables
- This avoids issues with Notepad converting quotes to curly quotes
- See `POWERSHELL_SETUP_INSTRUCTIONS.md` for detailed troubleshooting

See `POWERSHELL_SETUP_INSTRUCTIONS.md` for detailed setup, usage, and troubleshooting instructions.
