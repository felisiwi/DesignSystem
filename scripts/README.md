# Scripts Directory

This directory contains automation scripts for the DesignSystem project.

## Available Scripts

### `update_all_component_versions.js` ⭐ **Recommended**

**All-in-one component discovery and documentation updater.**

Automatically discovers all components in `src/components`, finds their latest versions, and updates all documentation files.

#### Usage

```bash
node Scripts/update_all_component_versions.js
```

#### What It Does

1. **Scans** `src/components/` for all component directories
2. **Detects** latest version files by parsing version numbers from filenames
3. **Supports** multiple version formats:
   - `Component.1.0.4.tsx`
   - `Component_1.0.4.tsx`
   - `Component.v1.0.4.tsx`
4. **Updates** documentation files:
   - `PROJECT_NOTES.md` - Component registry table and detailed sections
   - `COMPONENTS.md` - Comprehensive component registry (auto-generated)

#### Example Output

```
🚀 Component Version Discovery & Documentation Update

📦 Scanning components directory...

✅ Found 3 components:

   ✅ Adaptive Carousel         v1.0.4       AdaptiveCarousel.1.0.4.tsx
   ✅ Reachmapper               v1.0.2       Reachmapper_1.0.2.tsx
   ⚠️ Carouseldiagnostics       unversioned  carouseldiagnostics.tsx

📝 Updating documentation files...

✅ Updated: PROJECT_NOTES.md
✅ Updated: COMPONENTS.md

✨ Documentation update complete! (2 files updated)
```

#### Features

- **Automatic discovery** - No manual configuration needed
- **Version detection** - Parses version numbers from filenames
- **Handles unversioned components** - Marks them with ⚠️
- **Generates component registry** - Table view of all components
- **Updates multiple docs** - Keeps PROJECT_NOTES.md and COMPONENTS.md in sync

#### When to Use

- **After adding** a new component
- **After updating** a component version
- **Before committing** - Keep docs in sync
- **Weekly/Monthly** - Regular maintenance

---

### `update_carousel_version.js`

Automatically updates version references across all documentation files when the carousel component version changes.

#### Usage

```bash
# Method 1: Specify version explicitly
node Scripts/update_carousel_version.js 1.0.5

# Method 2: Extract version from component file automatically
node Scripts/update_carousel_version.js
```

#### What It Does

1. **Reads version** from command line argument or extracts it from `AdaptiveCarousel.1.0.4.tsx` filename
2. **Updates documentation files**:
   - `PROJECT_NOTES.md`
   - `notes/claude-sessions/Carousel/Carousel_MASTER.md`
   - `src/components/carousel/API_Reference.md`
3. **Replaces version patterns**:
   - `v1.0.X` → `v1.0.Y` (version numbers)
   - `AdaptiveCarousel.1.0.X.tsx` → `AdaptiveCarousel.1.0.Y.tsx` (file names)
   - Legacy versions like `v1.1.X` are also updated

#### Example Output

```
🚀 Carousel Version Update Script

📦 Extracted version from component file: 1.0.4
📝 Updating to version: 1.0.4

✅ Updated: PROJECT_NOTES.md
  v1.0.2 → v1.0.4
  AdaptiveCarousel.1.0.2.tsx → AdaptiveCarousel.1.0.4.tsx

✅ Updated: notes/claude-sessions/Carousel/Carousel_MASTER.md
  v1.1.0 → v1.0.4
  v1.1.1 → v1.0.4

📊 Summary:
   ✅ Updated: 2 files
   ℹ️  Skipped: 1 files

✨ Version update complete!
```

#### When to Use

- **Before committing** a new carousel version
- **After renaming** the component file to a new version
- **When updating** documentation manually (to ensure consistency)

#### Integration with Git

You can add this as a pre-commit hook or npm script:

**As npm script** (if you have `package.json`):
```json
{
  "scripts": {
    "update-carousel-version": "node Scripts/update_carousel_version.js"
  }
}
```

**As pre-commit hook** (`.git/hooks/pre-commit`):
```bash
#!/bin/bash
# Auto-update carousel version in docs
node Scripts/update_carousel_version.js
```

---

### `auto_commit.sh`

Automated commit script for tracking changes.

### `post_chat.sh`

Session integration script for documenting Claude chat sessions.

---

## Adding New Scripts

When adding new automation scripts:

1. Place them in this `Scripts/` directory
2. Add documentation to this README
3. Make scripts executable: `chmod +x Scripts/script_name.js`
4. Include usage examples and error handling

