#!/usr/bin/env node

/**
 * Carousel Version Update Script
 * 
 * Automatically updates version references across documentation files
 * when the carousel component version changes.
 * 
 * Usage:
 *   node Scripts/update_carousel_version.js [new_version]
 * 
 * Example:
 *   node Scripts/update_carousel_version.js 1.0.5
 * 
 * If no version is provided, it will read from the component file.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CAROUSEL_FILE = 'src/components/carousel/AdaptiveCarousel.1.0.4.tsx';
const FILES_TO_UPDATE = [
  'PROJECT_NOTES.md',
  'notes/claude-sessions/Carousel/Carousel_MASTER.md',
  'src/components/carousel/API_Reference.md',
];

/**
 * Extract version from component filename
 */
function extractVersionFromFilename(filename) {
  const match = filename.match(/AdaptiveCarousel\.(\d+\.\d+\.\d+)\.tsx/);
  return match ? match[1] : null;
}

/**
 * Get new version from command line or component file
 */
function getNewVersion() {
  // Check command line argument
  if (process.argv[2]) {
    const version = process.argv[2].replace(/^v/, ''); // Remove 'v' prefix if present
    if (/^\d+\.\d+\.\d+$/.test(version)) {
      return version;
    } else {
      console.error(`❌ Invalid version format: ${process.argv[2]}`);
      console.error('   Expected format: X.Y.Z (e.g., 1.0.4)');
      process.exit(1);
    }
  }

  // Extract from component file
  const componentPath = path.join(process.cwd(), CAROUSEL_FILE);
  if (fs.existsSync(componentPath)) {
    const version = extractVersionFromFilename(CAROUSEL_FILE);
    if (version) {
      console.log(`📦 Extracted version from component file: ${version}`);
      return version;
    }
  }

  console.error('❌ Could not determine version.');
  console.error('   Please provide version as argument: node Scripts/update_carousel_version.js 1.0.4');
  process.exit(1);
}

/**
 * Update version references in a file
 * Only updates references to "current" or "latest" version, not historical versions
 */
function updateFile(filePath, newVersion) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  let changes = [];

  // Pattern 1: "Current Version: vX.Y.Z" or "Current Version:** vX.Y.Z"
  const currentVersionPattern = /(Current Version[:\s*]+)v(\d+\.\d+\.\d+)/gi;
  content = content.replace(currentVersionPattern, (match, prefix, oldVersion) => {
    const replacement = `${prefix}v${newVersion}`;
    if (oldVersion !== newVersion) {
      changes.push(`  Current Version: v${oldVersion} → v${newVersion}`);
      modified = true;
    }
    return replacement;
  });

  // Pattern 2: "**Current Version**: vX.Y.Z"
  const boldCurrentPattern = /(\*\*Current Version\*\*[:\s]+)v(\d+\.\d+\.\d+)/gi;
  content = content.replace(boldCurrentPattern, (match, prefix, oldVersion) => {
    const replacement = `${prefix}v${newVersion}`;
    if (oldVersion !== newVersion) {
      changes.push(`  **Current Version**: v${oldVersion} → v${newVersion}`);
      modified = true;
    }
    return replacement;
  });

  // Pattern 3: "AdaptiveCarousel.X.Y.Z.tsx ← Current live version"
  const filePattern = /AdaptiveCarousel\.(\d+\.\d+\.\d+)\.tsx(\s+←\s+Current live version)/g;
  content = content.replace(filePattern, (match, oldVersion, suffix) => {
    const replacement = `AdaptiveCarousel.${newVersion}.tsx${suffix}`;
    if (oldVersion !== newVersion) {
      changes.push(`  AdaptiveCarousel.${oldVersion}.tsx → AdaptiveCarousel.${newVersion}.tsx`);
      modified = true;
    }
    return replacement;
  });

  // Pattern 4: "**vX.Y.Z (Monolithic)**" in status sections (only if it's clearly the current version)
  // This is more conservative - only update if it's in a "Current Version Status" section
  const statusPattern = /(\*\*v)(\d+\.\d+\.\d+)(\s+\(Monolithic\)\*\*)/g;
  content = content.replace(statusPattern, (match, prefix, oldVersion, suffix) => {
    // Only update if it's in a section that talks about current version
    // Check context around the match (previous 100 chars)
    const matchIndex = content.indexOf(match);
    const contextBefore = content.substring(Math.max(0, matchIndex - 100), matchIndex);
    const isCurrentVersion = /Current Version|Status|Current/i.test(contextBefore);
    
    if (isCurrentVersion && oldVersion !== newVersion) {
      const replacement = `${prefix}${newVersion}${suffix}`;
      changes.push(`  ${match} → ${replacement}`);
      modified = true;
      return replacement;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    changes.forEach(change => console.log(change));
    return true;
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Carousel Version Update Script\n');

  const newVersion = getNewVersion();
  console.log(`📝 Updating to version: ${newVersion}\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  FILES_TO_UPDATE.forEach(file => {
    const result = updateFile(file, newVersion);
    if (result) {
      updatedCount++;
    } else {
      skippedCount++;
    }
    console.log('');
  });

  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updatedCount} files`);
  console.log(`   ℹ️  Skipped: ${skippedCount} files`);
  console.log(`\n✨ Version update complete!\n`);
}

// Run script
main();
