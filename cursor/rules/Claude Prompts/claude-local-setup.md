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
| `claude-export` | Runs `post_chat.sh` to automatically append the latest Markdown summary to the master file |
| `claude-sync` | Adds, commits, and pushes repo changes to GitHub |

---

## Workflow Summary
1. Start a new chat in the **Claude App** using `Start-of-Chat.md`.  
2. Work through the session.  
3. End the session using `End-of-Chat.md`.  
4. Copy the Markdown summary Claude outputs.  
5. Save it manually to `/notes/claude-sessions/Carousel/` as `[Carousel]_[date].md`.  
6. Run `claude-export` locally — it will:
   - Find the newest `[Carousel]_[date].md` file  
   - Append its content to the end of `Carousel_MASTER.md`  
   - Commit and push changes automatically  
7. (Optional) Run `claude-sync` manually if needed to push other files.

---

## File Roles
| File | Purpose |
|------|----------|
| `/notes/claude-sessions/Carousel/` | Individual chat summaries |
| `/notes/claude-sessions/Carousel/Carousel_MASTER.md` | Canonical master document |
| `/post_chat.sh` | Automation script run by `claude-export` |
| `/notes/Claude Prompts/` | Start-of-Chat and End-of-Chat prompt files |
| `/Cursor/Rules/Project-Context.md` | (Optional) shared context for Cursor |
