#!/usr/bin/env node

/**
 * Component Version Discovery & Documentation Update Script
 * 
 * Automatically discovers all components in src/components, finds their latest versions,
 * and updates documentation files with a comprehensive component registry.
 * 
 * Usage:
 *   node Scripts/update_all_component_versions.js
 * 
 * This script:
 * - Scans src/components for all component directories
 * - Finds latest version files (by parsing version numbers)
 * - Updates PROJECT_NOTES.md with current component list
 * - Creates/updates COMPONENTS.md with comprehensive registry
 * - Can update individual component documentation references
 */

const fs = require('fs');
const path = require('path');

// Configuration
const COMPONENTS_DIR = 'src/components';
const FILES_TO_UPDATE = [
  'PROJECT_NOTES.md',
  'COMPONENTS.md', // Will be created if doesn't exist
];

/**
 * Parse version from filename
 * Supports patterns: Component.1.0.4.tsx, Component_1.0.4.tsx, Component.v1.0.4.tsx
 */
function parseVersion(filename) {
  // Pattern 1: ComponentName.X.Y.Z.ext
  let match = filename.match(/(?:^|[/\\])([^/\\]+)\.(\d+)\.(\d+)\.(\d+)(?:\.(?:tsx|ts|jsx|js))?$/);
  if (match) {
    return {
      componentName: match[1],
      version: `${match[2]}.${match[3]}.${match[4]}`,
      major: parseInt(match[2]),
      minor: parseInt(match[3]),
      patch: parseInt(match[4]),
    };
  }
  
  // Pattern 2: ComponentName_X.Y.Z.ext
  match = filename.match(/(?:^|[/\\])([^/\\]+)_(\d+)\.(\d+)\.(\d+)(?:\.(?:tsx|ts|jsx|js))?$/);
  if (match) {
    return {
      componentName: match[1],
      version: `${match[2]}.${match[3]}.${match[4]}`,
      major: parseInt(match[2]),
      minor: parseInt(match[3]),
      patch: parseInt(match[4]),
    };
  }
  
  // Pattern 3: ComponentName.vX.Y.Z.ext
  match = filename.match(/(?:^|[/\\])([^/\\]+)\.v(\d+)\.(\d+)\.(\d+)(?:\.(?:tsx|ts|jsx|js))?$/);
  if (match) {
    return {
      componentName: match[1],
      version: `${match[2]}.${match[3]}.${match[4]}`,
      major: parseInt(match[2]),
      minor: parseInt(match[3]),
      patch: parseInt(match[4]),
    };
  }
  
  return null;
}

/**
 * Compare two version objects
 */
function compareVersions(v1, v2) {
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
}

/**
 * Discover all components and their latest versions
 */
function discoverComponents() {
  const componentsDir = path.join(process.cwd(), COMPONENTS_DIR);
  
  if (!fs.existsSync(componentsDir)) {
    console.error(`❌ Components directory not found: ${COMPONENTS_DIR}`);
    process.exit(1);
  }

  const components = {};
  const entries = fs.readdirSync(componentsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const componentDir = path.join(componentsDir, entry.name);
    const files = fs.readdirSync(componentDir);
    
    // Skip Archive directories
    if (entry.name === 'Archive') continue;
    
    let latestVersion = null;
    let latestFile = null;
    let componentName = null;
    
    // Find all versioned files (not in Archive)
    const versionedFiles = [];
    
    for (const file of files) {
      const filePath = path.join(componentDir, file);
      const stat = fs.statSync(filePath);
      
      // Skip directories (like Archive)
      if (stat.isDirectory()) continue;
      
      // Skip non-code files
      if (!/\.(tsx|ts|jsx|js)$/.test(file)) continue;
      
      const versionInfo = parseVersion(file);
      
      if (versionInfo) {
        versionedFiles.push({
          file,
          versionInfo,
          path: filePath,
        });
      } else {
        // Check if it's a component file without version (e.g., carouseldiagnostics.tsx)
        // Use directory name as component name
        if (!componentName) {
          componentName = entry.name;
          latestFile = file;
          // Treat as version 0.0.0 (unversioned)
          latestVersion = {
            componentName: entry.name,
            version: 'unversioned',
            major: 0,
            minor: 0,
            patch: 0,
          };
        }
      }
    }
    
    // Find latest version from versioned files
    if (versionedFiles.length > 0) {
      versionedFiles.sort((a, b) => compareVersions(b.versionInfo, a.versionInfo));
      latestVersion = versionedFiles[0].versionInfo;
      latestFile = versionedFiles[0].file;
      componentName = latestVersion.componentName;
    }
    
    if (componentName) {
      // Normalize component name (convert to display name)
      const displayName = componentName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
      
      components[entry.name] = {
        directory: entry.name,
        displayName,
        componentName,
        version: latestVersion.version,
        versionObj: latestVersion,
        file: latestFile,
        filePath: path.join(COMPONENTS_DIR, entry.name, latestFile),
        hasVersion: latestVersion.version !== 'unversioned',
      };
    }
  }
  
  return components;
}

/**
 * Generate component list markdown
 */
function generateComponentListMarkdown(components) {
  const sortedComponents = Object.values(components).sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );
  
  let markdown = '## Component Registry\n\n';
  markdown += 'Auto-generated list of all components and their latest versions.\n\n';
  markdown += '| Component | Latest Version | File | Status |\n';
  markdown += '|-----------|----------------|------|--------|\n';
  
  for (const comp of sortedComponents) {
    const version = comp.hasVersion ? `v${comp.version}` : 'unversioned';
    const status = comp.hasVersion ? '✅' : '⚠️ Unversioned';
    const filePathNormalized = comp.filePath.replace(/\\/g, '/');
    const fileLink = `[\`${comp.file}\`](./${filePathNormalized})`;
    
    markdown += `| **${comp.displayName}** | ${version} | ${fileLink} | ${status} |\n`;
  }
  
  markdown += '\n---\n\n';
  return markdown;
}

/**
 * Update PROJECT_NOTES.md with component list
 */
function updateProjectNotes(components) {
  const filePath = path.join(process.cwd(), 'PROJECT_NOTES.md');
  
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️  PROJECT_NOTES.md not found, skipping...');
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the Components section and replace it
  const componentSectionStart = content.indexOf('## Components');
  if (componentSectionStart === -1) {
    console.warn('⚠️  Components section not found in PROJECT_NOTES.md');
    return false;
  }
  
  // Find the end of Components section (next ## or end of file)
  const nextSection = content.indexOf('\n## ', componentSectionStart + 1);
  const sectionEnd = nextSection === -1 ? content.length : nextSection;
  
  // Generate new component section
  let newSection = '## Components\n\n';
  newSection += generateComponentListMarkdown(components);
  
  // Add detailed component entries
  const sortedComponents = Object.values(components).sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );
  
  for (const comp of sortedComponents) {
    const version = comp.hasVersion ? `v${comp.version}` : 'unversioned';
    newSection += `### ${comp.displayName}\n\n`;
    newSection += `**Current Version**: ${version === 'unversioned' ? 'N/A' : version}\n\n`;
    const filePathNormalized = comp.filePath.replace(/\\/g, '/');
    newSection += `**File**: [\`${comp.file}\`](./${filePathNormalized})\n\n`;
    
    // Add component-specific info if available
    if (comp.directory === 'carousel') {
      newSection += '**Master Overview**: [Carousel_MASTER.md](./notes/claude-sessions/Carousel/Carousel_MASTER.md)\n\n';
      newSection += '**Key Features**:\n';
      newSection += '- 93.25% accurate gesture detection\n';
      newSection += '- Multi-tier animation system\n';
      newSection += '- Full accessibility support (WCAG 2.1 AA)\n';
      newSection += '- Monolithic architecture (single-file component)\n';
      newSection += '- Customizable styling and behavior\n\n';
      newSection += '**Quick Links**:\n';
      newSection += '- [API Reference](./src/components/carousel/API_Reference.md)\n';
      newSection += '- [Version History](./notes/claude-sessions/Carousel/)\n\n';
    } else if (comp.directory === 'thumbreachmapper') {
      newSection += '**Master Overview**: [Thumbreachmapper_MASTER.md](./notes/claude-sessions/ThumbReachMapper/Thumbreachmapper_MASTER.md)\n\n';
    } else if (comp.directory === 'carouseldiagnostics') {
      newSection += '**Purpose**: Diagnostic tool for analyzing carousel swipe gestures\n\n';
      newSection += '**Quick Links**:\n';
      newSection += '- [Documentation](./src/components/carouseldiagnostics/carouseldiagnostics_documentation.md)\n';
      newSection += '- [Analysis](./Data/carousel_diagnostics/CarouselDiagnostics_analysis.md)\n\n';
    }
    
    newSection += '---\n\n';
  }
  
  // Replace the section
  const before = content.substring(0, componentSectionStart);
  const after = content.substring(sectionEnd);
  const newContent = before + newSection + after;
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

/**
 * Create or update COMPONENTS.md
 */
function updateComponentsFile(components) {
  const filePath = path.join(process.cwd(), 'COMPONENTS.md');
  
  let content = `# DesignSystem Components Registry\n\n`;
  content += `> **Auto-generated**: This file is automatically updated by \`Scripts/update_all_component_versions.js\`\n\n`;
  content += `> **Last Updated**: ${new Date().toISOString().split('T')[0]}\n\n`;
  content += `---\n\n`;
  
  content += generateComponentListMarkdown(components);
  
  // Add detailed information for each component
  const sortedComponents = Object.values(components).sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );
  
  for (const comp of sortedComponents) {
    const version = comp.hasVersion ? `v${comp.version}` : 'unversioned';
    
    content += `## ${comp.displayName}\n\n`;
    content += `- **Directory**: \`src/components/${comp.directory}/\`\n`;
    content += `- **Latest Version**: ${version === 'unversioned' ? 'N/A (unversioned)' : version}\n`;
    const filePathNormalized = comp.filePath.replace(/\\/g, '/');
    content += `- **Component File**: [\`${comp.file}\`](./${filePathNormalized})\n`;
    content += `- **Component Name**: \`${comp.componentName}\`\n\n`;
    
    if (comp.directory === 'carousel') {
      content += `### Carousel Component\n\n`;
      content += `A sophisticated, gesture-driven carousel component built with React and Framer Motion.\n\n`;
      content += `**Documentation**:\n`;
      content += `- [Master Overview](./notes/claude-sessions/Carousel/Carousel_MASTER.md)\n`;
      content += `- [API Reference](./src/components/carousel/API_Reference.md)\n\n`;
    } else if (comp.directory === 'thumbreachmapper') {
      content += `### Thumb Reach Mapper Component\n\n`;
      content += `**Documentation**:\n`;
      content += `- [Master Overview](./notes/claude-sessions/ThumbReachMapper/Thumbreachmapper_MASTER.md)\n\n`;
    } else if (comp.directory === 'carouseldiagnostics') {
      content += `### Carousel Diagnostics Tool\n\n`;
      content += `Diagnostic tool for analyzing carousel swipe gestures with comprehensive metrics.\n\n`;
      content += `**Documentation**:\n`;
      content += `- [Component Documentation](./src/components/carouseldiagnostics/carouseldiagnostics_documentation.md)\n`;
      content += `- [Analysis Results](./Data/carousel_diagnostics/CarouselDiagnostics_analysis.md)\n\n`;
    }
    
    content += `---\n\n`;
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Component Version Discovery & Documentation Update\n');
  console.log('📦 Scanning components directory...\n');
  
  const components = discoverComponents();
  
  console.log(`✅ Found ${Object.keys(components).length} components:\n`);
  
  for (const [dir, comp] of Object.entries(components)) {
    const version = comp.hasVersion ? `v${comp.version}` : 'unversioned';
    const status = comp.hasVersion ? '✅' : '⚠️';
    console.log(`   ${status} ${comp.displayName.padEnd(25)} ${version.padEnd(12)} ${comp.file}`);
  }
  
  console.log('\n📝 Updating documentation files...\n');
  
  let updatedCount = 0;
  
  if (updateProjectNotes(components)) {
    console.log('✅ Updated: PROJECT_NOTES.md');
    updatedCount++;
  }
  
  if (updateComponentsFile(components)) {
    console.log('✅ Updated: COMPONENTS.md');
    updatedCount++;
  }
  
  console.log(`\n✨ Documentation update complete! (${updatedCount} files updated)\n`);
  console.log('💡 Tip: Review the updated files and commit changes.\n');
}

// Run script
main();

