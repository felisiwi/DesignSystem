# Workflow Automation - Complete Reference Guide

This document explains **all automated workflows** set up for this project. Use this as your reference when you forget what commands are available or how things work.

---

## 🚀 Quick Reference (Commands You Can Use)

| Command | Where to Run | What It Does |
|---------|-------------|--------------|
| `claude-export` | PowerShell/Bash | Updates component MASTER docs from latest session |
| `claude-export [Component]` | PowerShell/Bash | Updates specific component (e.g., `claude-export Carousel`) |
| `claude-export all` | PowerShell/Bash | Updates ALL components |
| `claude-sync` | PowerShell/Bash | Quick commit & push of session notes |
| `npm run update-components` | Terminal | Manually update component registry |
| `npm run release-notes v1.0.5` | Terminal | Generate release notes for a version |
| `npm test` | Terminal | Run tests |
| `npm run test:ui` | Terminal | Run tests with UI |

---

## 📋 Complete Automation Overview

### 1. Claude Session Integration Commands

**Available in:** PowerShell (functions) or Bash (scripts)

**What's Available:**

#### `claude-export` - Auto-Update Component Documentation

**What it does:**
- Finds the newest session file in a component's folder
- Creates a summary snippet
- Adds it to the component's MASTER.md file
- Commits and pushes to GitHub automatically

**How it works:**
1. Looks in `notes/claude-sessions/[ComponentName]/`
2. Finds most recent `.md` file (excluding MASTER files)
3. Extracts key points and date
4. Inserts summary into `[ComponentName]_MASTER.md` above "END OF MASTER DOCUMENTATION"
5. Commits and pushes automatically

**Behind the scenes:**
- Calls `./scripts/post_chat.sh [ComponentName]`
- The bash script handles the actual integration

#### PowerShell Setup

**Location:** Your PowerShell profile (`$PROFILE`)

**Installation:**
1. Open your PowerShell profile:
   ```powershell
   notepad $PROFILE
   ```
2. Copy the entire contents of `claude-export-function.ps1` into your profile
3. Save and reload:
   ```powershell
   . $PROFILE
   ```

**Usage:**
```powershell
# Update all components
claude-export
# or
claude-export all

# Update specific component
claude-export Carousel
claude-export ThumbReachMapper
```

#### Bash Setup

**Location:** `Scripts/claude-export.sh` and `Scripts/claude-sync.sh`

**Option 1: Use Scripts Directly (Recommended)**
```bash
# Update all components
./Scripts/claude-export.sh
# or
./Scripts/claude-export.sh all

# Update specific component
./Scripts/claude-export.sh Carousel
./Scripts/claude-export.sh ThumbReachMapper
```

**Option 2: Add as Commands (Aliases)**
Add to your `~/.bashrc` or `~/.bash_profile`:
```bash
alias claude-export='bash /g/My\ Drive/DesignSystem/DesignSystem/Scripts/claude-export.sh'
alias claude-sync='bash /g/My\ Drive/DesignSystem/DesignSystem/Scripts/claude-sync.sh'
```
Then reload: `source ~/.bashrc`

**Usage (after aliasing):**
```bash
claude-export
claude-export Carousel
claude-sync
```

#### `claude-sync` - Quick Commit & Push

**What it does:**
- Stages all changes
- Commits with message "Sync Claude session notes"
- Pushes to GitHub

**Usage:**
```powershell
# PowerShell
claude-sync
```

```bash
# Bash
./Scripts/claude-sync.sh
# or (if aliased)
claude-sync
```

**When to use:**
- After manually saving session notes
- When you want to quickly sync documentation without running claude-export

---

### 2. Git Hooks (Automatic on Every Commit)

**Location:** `.husky/` directory

#### Pre-Commit Hook (`.husky/pre-commit`)

**What it does:**
- Runs automatically before every commit
- Updates `PROJECT_NOTES.md` and `COMPONENTS.md` with latest component versions
- Stages the updated files so they're included in your commit

**How to use:**
Just commit normally! The registry updates automatically:
```bash
git add .
git commit -m "[Carousel] Fixed glide distance"
# Registry automatically updates before commit!
```

**What gets updated:**
- Component version numbers
- Latest file paths
- Component status (✅/⚠️)
- Links to master documentation

#### Commit Message Hook (`.husky/commit-msg`)

**What it does:**
- Validates commit message format
- Warns (but doesn't block) if format is incorrect
- Encourages consistent commit messages

**Recommended format:**
```
[Component] Description
```

**Examples:**
- `[Carousel] Fixed glide distance in 2-column mode`
- `[ThumbReachMapper] Added new calibration step`
- `[Docs] Updated API reference`
- `[Scripts] Added release notes generator`
- `[Infra] Updated dependencies`

**Note:** The hook warns but doesn't block commits that don't follow the format.

---

### 3. Release Notes Generator

**Location:** `scripts/generate_release_notes.js`

**What it does:**
- Reads your git commit history since last tag (or last 20 commits)
- Groups commits by component (Carousel, ThumbReachMapper, etc.)
- Categorizes by type (Features, Fixes, Docs, etc.)
- Generates a formatted release notes markdown file

**Usage:**
```bash
# Generate release notes for all components
npm run release-notes v1.0.5

# Or run directly
node scripts/generate_release_notes.js v1.0.5

# Generate for specific component only
node scripts/generate_release_notes.js v1.0.5 Carousel
```

**Output:**
Creates `notes/releases/RELEASE_NOTES_1_0_5.md` with:
- Version number and date
- Changes grouped by component
- Categorized by type (Features, Fixes, Documentation, etc.)
- Links to commits

**Example output structure:**
```markdown
# Release Notes v1.0.5

## AdaptiveCarousel
### Features
- Added column-based velocity scaling
- Improved 2-column glide detection

### Fixes
- Fixed glide distance calculation

## ThumbReachMapper
### Features
- Added new calibration step
```

---

### 4. Component Version Update Script

**Location:** `scripts/update_all_component_versions.js`

**What it does:**
- Scans `src/components/` for all components
- Finds latest version files (e.g., `AdaptiveCarousel.1.0.4.tsx`)
- Extracts version numbers
- Updates `PROJECT_NOTES.md` and `COMPONENTS.md` automatically

**How to use:**
```bash
# Run manually
npm run update-components

# Or run directly
node scripts/update_all_component_versions.js
```

**When it runs:**
- Automatically before every commit (via pre-commit hook)
- Or manually when you want to update the registry

**What gets updated:**
- Component registry table in `PROJECT_NOTES.md`
- Component registry table in `COMPONENTS.md`
- Version numbers
- File paths
- Status indicators

---

### 5. Session Integration Script (post_chat.sh)

**Location:** `scripts/post_chat.sh`

**What it does:**
- Called by `claude-export` PowerShell command
- Finds newest session file for a component
- Creates integration snippet
- Updates MASTER.md file
- Commits and pushes changes

**How it works:**
1. Receives component name as argument
2. Looks in `notes/claude-sessions/[ComponentName]/`
3. Finds most recent `.md` file (excluding MASTER files)
4. Extracts date, title, and key points
5. Creates formatted snippet
6. Inserts into MASTER.md above "END OF MASTER DOCUMENTATION"
7. Commits: `"Auto-integrated [session-file] into master log"`
8. Pushes to GitHub

**Direct usage (rarely needed):**
```bash
bash scripts/post_chat.sh Carousel
bash scripts/post_chat.sh ThumbReachMapper
```

**Note:** Usually you'll use `claude-export` instead, which calls this script.

---

### 6. Auto-Commit Script (Optional)

**Location:** `Scripts/auto_commit.sh`

**What it does:**
- Runs in background while you're coding
- Commits changes every minute (if there are any)
- Keeps a "paper trail" of your work

**Usage:**
```bash
# Start it (runs in background)
./Scripts/auto_commit.sh

# Or run in background
nohup ./Scripts/auto_commit.sh &
```

**When to use:**
- When actively iterating on code
- When you want automatic delta commits
- Don't run when idle (it will spam commits)

**What it commits:**
- Changes to `src/**`, `notes/**`, `claude_prompts/**`, `Data/**`
- Changes to `.md`, `.ts`, `.tsx` files
- Commit message: `"delta: changes detected @ [timestamp]"`

---

### 7. Cursor Rules

**Location:** `.cursorrules`

**What it does:**
- Tells Cursor AI about your project structure and conventions
- Helps Cursor understand your versioning, file organization, and commit format
- Makes Cursor suggestions more accurate

**How to use:**
Cursor automatically reads this file. No action needed.

**Contents:**
- Component versioning rules
- Documentation standards
- Code style guidelines
- Git commit format
- File organization structure

---

### 8. VS Code/Cursor Settings

**Location:** `.vscode/settings.json`

**What it does:**
- Configures auto-formatting on save
- Sets up TypeScript properly
- Hides unnecessary files from explorer
- Enables code actions on save

**How to use:**
Cursor/VS Code automatically uses these settings. No action needed.

**Settings:**
- Format on save: Enabled
- Default formatter: Prettier
- TypeScript SDK: Uses local node_modules version
- File exclusions: node_modules, .git hidden

---

## 📝 NPM Scripts Reference

| Script | Command | What It Does |
|--------|---------|--------------|
| `update-components` | `npm run update-components` | Manually update component registry |
| `release-notes` | `npm run release-notes v1.0.5` | Generate release notes for version |
| `test` | `npm test` | Run tests |
| `test:ui` | `npm run test:ui` | Run tests with UI |
| `prepare` | `npm run prepare` | Install husky (runs automatically on npm install) |

---

## 🔄 Typical Workflows

### Daily Development Workflow

1. **Start coding in Cursor**
   - Make changes to components
   - Auto-formatting happens on save

2. **Commit your changes**
   ```bash
   git add .
   git commit -m "[Carousel] Fixed glide distance"
   ```
   - Pre-commit hook automatically updates component registry
   - Commit-msg hook validates message format

3. **Push to GitHub**
   ```bash
   git push
   ```

### Claude Session Workflow

1. **Work in Claude App**
   - Have conversation about component
   - Get session summary at end

2. **Save session summary**
   - Copy Markdown from Claude
   - Save to `notes/claude-sessions/[ComponentName]/[ComponentName]_[date].md`

3. **Integrate into documentation**
   ```powershell
   # PowerShell
   claude-export Carousel
   ```
   ```bash
   # Bash
   ./Scripts/claude-export.sh Carousel
   # or (if aliased)
   claude-export Carousel
   ```
   - Automatically adds to MASTER.md
   - Commits and pushes

### Release Workflow

1. **Make final changes**
   - Test everything
   - Update documentation

2. **Generate release notes**
   ```bash
   npm run release-notes v1.0.5
   ```

3. **Review and commit**
   ```bash
   git add notes/releases/RELEASE_NOTES_1_0_5.md
   git commit -m "[Docs] Release notes for v1.0.5"
   git push
   ```

---

## 🛠️ Troubleshooting

### Git hooks not running?

1. **Check if husky is installed:**
   ```bash
   npm list husky
   ```

2. **Install if missing:**
   ```bash
   npm install --save-dev husky --legacy-peer-deps
   npx husky install
   ```

3. **Make hooks executable (Mac/Linux):**
   ```bash
   chmod +x .husky/pre-commit .husky/commit-msg
   ```

4. **On Windows:** Hooks should work automatically with Git Bash

### claude-export not found?

**PowerShell:**
1. **Check if function exists:**
   ```powershell
   Get-Command claude-export
   ```

2. **If not found, reload profile:**
   ```powershell
   . $PROFILE
   ```

3. **If still not found, check your profile:**
   ```powershell
   notepad $PROFILE
   ```
   - Make sure the function from `claude-export-function.ps1` is there

**Bash:**
1. **Check if scripts exist:**
   ```bash
   ls -la Scripts/claude-export.sh Scripts/claude-sync.sh
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x Scripts/claude-export.sh Scripts/claude-sync.sh
   ```

3. **If using aliases, check your `.bashrc`:**
   ```bash
   cat ~/.bashrc | grep claude-export
   ```
   - Make sure aliases are defined correctly
   - Reload: `source ~/.bashrc`

### Release notes not generating?

1. **Check if you have commits:**
   ```bash
   git log --oneline -5
   ```

2. **Try running manually:**
   ```bash
   node scripts/generate_release_notes.js v1.0.5
   ```

3. **Check for errors in terminal output**

### Component registry not updating?

1. **Check if script exists:**
   ```bash
   ls scripts/update_all_component_versions.js
   ```

2. **Run manually:**
   ```bash
   node scripts/update_all_component_versions.js
   ```

3. **Check if files were updated:**
   ```bash
   git status
   ```

### LF/CRLF warnings in git?

**These are normal on Windows!** They're just informational warnings about line ending conversion. They don't affect functionality. You can ignore them.

To suppress (optional):
```bash
git config core.autocrlf true
git config core.safecrlf false
```

---

## 📚 Related Documentation

- **`claude-export-function.ps1`** - PowerShell function source code (copy to your `$PROFILE`)
- **`Scripts/claude-export.sh`** - Bash script for claude-export
- **`Scripts/claude-sync.sh`** - Bash script for claude-sync
- **`WHAT_IS_CLAUDE_EXPORT.md`** - Simple explanation of claude-export
- **`Unified workflow cursor git guide`** - Complete workflow guide
- **`claude_prompts/claude-local-setup.md`** - Claude integration setup

---

## 🎯 Quick Tips

1. **Always use `claude-export` after saving session notes** - Keeps your MASTER docs up-to-date automatically

2. **Follow commit message format** - Makes release notes generation easier

3. **Let hooks do their job** - Don't manually update component registry, the hook does it

4. **Use `claude-sync` for quick pushes** - When you just want to sync notes without running full integration

5. **Generate release notes before major versions** - Helps track what changed

---

## 📝 Summary: What Happens Automatically

✅ **On every commit:**
- Component registry updates
- Commit message validated (warns if wrong format)

✅ **When you run `claude-export`:**
- Latest session integrated into MASTER.md
- Changes committed and pushed

✅ **When you save files:**
- Auto-formatting applies (if enabled)
- Cursor understands your project structure

✅ **When you install dependencies:**
- Husky sets up git hooks automatically

---

**Last Updated:** November 10, 2025  
**Status:** All automation active and working ✅
