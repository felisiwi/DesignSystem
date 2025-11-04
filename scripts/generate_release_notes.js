#!/usr/bin/env node

/**
 * Release Notes Generator
 * 
 * Automatically generates release notes from git commit messages.
 * Groups commits by component and generates a changelog.
 * 
 * Usage:
 *   node scripts/generate_release_notes.js [version] [component]
 * 
 * Examples:
 *   node scripts/generate_release_notes.js v1.0.5
 *   node scripts/generate_release_notes.js v1.0.5 Carousel
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const version = process.argv[2] || 'v1.0.4';
const componentFilter = process.argv[3] || null;

/**
 * Get commits since last tag
 */
function getCommitsSinceLastTag() {
  try {
    // Get last tag
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    // Get commits since last tag
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%h|%s|%b"`, { encoding: 'utf8' });
    return commits.split('\n').filter(line => line.trim());
  } catch (error) {
    // No tags yet, get all commits
    const commits = execSync('git log --pretty=format:"%h|%s|%b"', { encoding: 'utf8' });
    return commits.split('\n').filter(line => line.trim()).slice(0, 20); // Last 20 commits
  }
}

/**
 * Categorize commits by component and type
 */
function categorizeCommits(commits) {
  const categories = {
    'AdaptiveCarousel': [],
    'ThumbReachMapper': [],
    'Carouseldiagnostics': [],
    'Documentation': [],
    'Infrastructure': [],
    'Other': []
  };

  for (const commit of commits) {
    const [hash, subject, body] = commit.split('|');
    const fullMessage = `${subject} ${body || ''}`.toLowerCase();
    
    let categorized = false;
    
    // Check for component names
    if (fullMessage.includes('carousel') && !fullMessage.includes('diagnostic')) {
      categories['AdaptiveCarousel'].push({ hash, subject, body });
      categorized = true;
    } else if (fullMessage.includes('reachmapper') || fullMessage.includes('thumb')) {
      categories['ThumbReachMapper'].push({ hash, subject, body });
      categorized = true;
    } else if (fullMessage.includes('diagnostic')) {
      categories['Carouseldiagnostics'].push({ hash, subject, body });
      categorized = true;
    } else if (fullMessage.includes('doc') || fullMessage.includes('master') || fullMessage.includes('readme')) {
      categories['Documentation'].push({ hash, subject, body });
      categorized = true;
    } else if (fullMessage.includes('script') || fullMessage.includes('git') || fullMessage.includes('workflow')) {
      categories['Infrastructure'].push({ hash, subject, body });
      categorized = true;
    }
    
    if (!categorized) {
      categories['Other'].push({ hash, subject, body });
    }
  }

  // Filter out empty categories
  return Object.fromEntries(
    Object.entries(categories).filter(([_, commits]) => commits.length > 0)
  );
}

/**
 * Generate markdown release notes
 */
function generateReleaseNotes(version, categorizedCommits) {
  const date = new Date().toISOString().split('T')[0];
  
  let notes = `# Release Notes - ${version}\n\n`;
  notes += `**Release Date:** ${date}\n\n`;
  notes += `---\n\n`;

  // Filter by component if specified
  const categories = componentFilter 
    ? Object.fromEntries(Object.entries(categorizedCommits).filter(([name]) => 
        name.toLowerCase().includes(componentFilter.toLowerCase())
      ))
    : categorizedCommits;

  for (const [category, commits] of Object.entries(categories)) {
    if (commits.length === 0) continue;

    notes += `## ${category}\n\n`;
    
    for (const commit of commits) {
      notes += `- ${commit.subject}`;
      if (commit.body) {
        notes += `\n  ${commit.body.trim().split('\n').join('\n  ')}`;
      }
      notes += ` \`${commit.hash.substring(0, 7)}\`\n\n`;
    }
  }

  notes += `---\n\n`;
  notes += `*Generated automatically from git commit history*\n`;

  return notes;
}

/**
 * Save release notes to file
 */
function saveReleaseNotes(version, content) {
  const fileName = `RELEASE_NOTES_${version.replace('v', '').replace(/\./g, '_')}.md`;
  const filePath = path.join(process.cwd(), 'notes', 'releases', fileName);
  
  // Create releases directory if it doesn't exist
  const releasesDir = path.dirname(filePath);
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/**
 * Main execution
 */
function main() {
  console.log('📝 Generating Release Notes\n');
  
  const commits = getCommitsSinceLastTag();
  console.log(`📦 Found ${commits.length} commits\n`);
  
  const categorized = categorizeCommits(commits);
  const notes = generateReleaseNotes(version, categorized);
  
  const filePath = saveReleaseNotes(version, notes);
  
  console.log(`✅ Release notes generated!\n`);
  console.log(`📄 File: ${filePath}\n`);
  console.log('Preview:\n');
  console.log(notes);
  console.log('\n💡 Tip: Review and edit the file before committing.\n');
}

main();

