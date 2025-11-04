# Workflow Automation Setup

This document explains the automated workflows set up for this project.

## What's Been Set Up

### 1. Git Hooks (Automatic Component Registry Updates)

**Location:** `.husky/pre-commit`

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

### 2. Release Notes Generator

**Location:** `scripts/generate_release_notes.js`

**What it does:**
- Reads your git commit history
- Groups commits by component (Carousel, ThumbReachMapper, etc.)
- Generates a formatted release notes file

**How to use:**
```bash
# Generate release notes for all components
npm run release-notes v1.0.5

# Generate for specific component
node scripts/generate_release_notes.js v1.0.5 Carousel
```

**Output:**
Creates `notes/releases/RELEASE_NOTES_1_0_5.md` with categorized changes.

### 3. Component Version Update Script

**Location:** `scripts/update_all_component_versions.js`

**What it does:**
- Scans `src/components/` for all components
- Finds latest version files (e.g., `AdaptiveCarousel.1.0.4.tsx`)
- Updates `PROJECT_NOTES.md` and `COMPONENTS.md` automatically

**How to use:**
```bash
npm run update-components
```

Or it runs automatically on every commit via git hooks.

### 4. Cursor Rules

**Location:** `.cursorrules`

**What it does:**
- Tells Cursor AI about your project structure and conventions
- Helps Cursor understand your versioning, file organization, and commit format
- Makes Cursor suggestions more accurate

**How to use:**
Cursor automatically reads this file. No action needed.

### 5. VS Code/Cursor Settings

**Location:** `.vscode/settings.json`

**What it does:**
- Configures auto-formatting on save
- Sets up TypeScript properly
- Hides unnecessary files from explorer

**How to use:**
Cursor/VS Code automatically uses these settings. No action needed.

## NPM Scripts Available

| Script | Command | What It Does |
|--------|---------|--------------|
| `update-components` | `npm run update-components` | Manually update component registry |
| `release-notes` | `npm run release-notes v1.0.5` | Generate release notes |
| `test` | `npm test` | Run tests |
| `test:ui` | `npm run test:ui` | Run tests with UI |

## Commit Message Format

**Recommended format:**
```
[Component] Description
```

**Examples:**
- `[Carousel] Fixed glide distance in 2-column mode`
- `[ThumbReachMapper] Added new calibration step`
- `[Docs] Updated API reference`
- `[Scripts] Added release notes generator`

**Note:** The commit-msg hook will warn if your message doesn't follow this format, but won't block the commit.

## Troubleshooting

### Git hooks not running?

1. Make sure husky is installed:
   ```bash
   npm install --save-dev husky --legacy-peer-deps
   ```

2. Make hooks executable (if on Mac/Linux):
   ```bash
   chmod +x .husky/pre-commit .husky/commit-msg
   ```

3. On Windows, hooks should work automatically with Git Bash.

### Release notes not generating?

1. Make sure you have git commits:
   ```bash
   git log --oneline -5
   ```

2. Try running manually:
   ```bash
   node scripts/generate_release_notes.js v1.0.5
   ```

### Component registry not updating?

1. Check if script exists:
   ```bash
   ls scripts/update_all_component_versions.js
   ```

2. Run manually:
   ```bash
   node scripts/update_all_component_versions.js
   ```

## Next Steps

1. **Test the git hook:**
   - Make a small change to any file
   - Commit: `git commit -m "[Carousel] Test auto-update"`
   - Check if `PROJECT_NOTES.md` was updated

2. **Generate your first release notes:**
   ```bash
   npm run release-notes v1.0.5
   ```

3. **Enjoy automation!**
   - No more manual registry updates
   - Consistent commit messages
   - Easy release note generation

