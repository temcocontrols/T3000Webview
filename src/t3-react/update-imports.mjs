#!/usr/bin/env node

/**
 * Update Import Paths Script
 * Converts old relative imports to new path alias imports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = __dirname;

// Import mapping rules
const importMappings = [
  // App imports
  { from: /from ['"]\.\.\/App['"]/, to: `from '@app/App'` },
  { from: /from ['"]\.\.\/\.\.\/App['"]/, to: `from '@app/App'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/App['"]/, to: `from '@app/App'` },
  { from: /from ['"]\.\.\/main['"]/, to: `from '@app/main'` },
  { from: /from ['"]\.\.\/router/, to: `from '@app/router` },
  { from: /from ['"]\.\.\/config/, to: `from '@app/config` },

  // Device feature imports
  { from: /from ['"]\.\.\/\.\.\/\.\.\/store\/deviceTreeStore['"]/, to: `from '@features/devices/store/deviceTreeStore'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/store\/deviceTreeStore['"]/, to: `from '@features/devices/store/deviceTreeStore'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/store\/deviceStore['"]/, to: `from '@features/devices/store/deviceStore'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/store\/deviceStore['"]/, to: `from '@features/devices/store/deviceStore'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/services\/deviceApi['"]/, to: `from '@features/devices/services/deviceApi'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/services\/deviceApi['"]/, to: `from '@features/devices/services/deviceApi'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useDeviceData['"]/, to: `from '@features/devices/hooks/useDeviceData'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useDeviceStatusMonitor['"]/, to: `from '@features/devices/hooks/useDeviceStatusMonitor'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useDeviceSyncService['"]/, to: `from '@features/devices/hooks/useDeviceSyncService'` },
  { from: /from ['"]\.\.\/utils\/treeBuilder['"]/, to: `from '@features/devices/lib/treeBuilder'` },
  { from: /from ['"]\.\.\/\.\.\/utils\/treeBuilder['"]/, to: `from '@features/devices/lib/treeBuilder'` },

  // Store imports (global)
  { from: /from ['"]\.\.\/\.\.\/\.\.\/store\/statusBarStore['"]/, to: `from '@store/statusBarStore'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/store\/statusBarStore['"]/, to: `from '@store/statusBarStore'` },
  { from: /from ['"]\.\.\/\.\.\/store\/statusBarStore['"]/, to: `from '@store/statusBarStore'` },
  { from: /from ['"]\.\.\/store\/statusBarStore['"]/, to: `from '@store/statusBarStore'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/store\/authStore['"]/, to: `from '@store/authStore'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/store\/uiStore['"]/, to: `from '@store/uiStore'` },
  { from: /from ['"]\.\.\/store\/index['"]/, to: `from '@store/index'` },
  { from: /from ['"]\.\.\/\.\.\/store\/index['"]/, to: `from '@store/index'` },

  // Shared component imports
  { from: /from ['"]\.\.\/\.\.\/\.\.\/components\/EmptyState['"]/, to: `from '@shared/components/EmptyState'` },
  { from: /from ['"]@t3-react\/components\/EmptyState['"]/, to: `from '@shared/components/EmptyState'` },
  { from: /from ['"]@t3-react\/components\/LoadingSpinner['"]/, to: `from '@shared/components/LoadingSpinner'` },
  { from: /from ['"]@t3-react\/components\/DataTable['"]/, to: `from '@shared/components/DataTable'` },
  { from: /from ['"]@t3-react\/components\/SearchBox['"]/, to: `from '@shared/components/SearchBox'` },
  { from: /from ['"]@t3-react\/components\/ConfirmDialog['"]/, to: `from '@shared/components/ConfirmDialog'` },
  { from: /from ['"]@t3-react\/components\/ErrorBoundary['"]/, to: `from '@shared/components/ErrorBoundary'` },
  { from: /from ['"]@t3-react\/components\/GlobalMessageBar['"]/, to: `from '@shared/components/GlobalMessageBar'` },
  { from: /from ['"]@t3-react\/components\/NotificationCenter['"]/, to: `from '@shared/components/NotificationCenter'` },

  // Shared hooks imports
  { from: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useLocalStorage['"]/, to: `from '@shared/hooks/useLocalStorage'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/usePolling['"]/, to: `from '@shared/hooks/usePolling'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useContextMenu['"]/, to: `from '@shared/hooks/useContextMenu'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useGlobalMessage['"]/, to: `from '@shared/hooks/useGlobalMessage'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useTreeNavigation['"]/, to: `from '@shared/hooks/useTreeNavigation'` },

  // Types imports
  { from: /from ['"]\.\.\/\.\.\/\.\.\/types\/device['"]/, to: `from '@features/devices/types/device'` },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/types\/device['"]/, to: `from '@features/devices/types/device'` },
  { from: /from ['"]\.\.\/types\/device['"]/, to: `from '@features/devices/types/device'` },

  // Layout imports
  { from: /from ['"]\.\.\/\.\.\/\.\.\/layout\//, to: `from '@layout/` },
  { from: /from ['"]\.\.\/layout\//, to: `from '@layout/` },

  // Feature pages imports
  { from: /from ['"]@t3-react\/pages['"]/, to: `from '@features/` },

  // Components from old structure
  { from: /from ['"]\.\.\/components\/panels\/left-panel\//, to: `from '@features/devices/components/` },
];

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Apply each mapping
    for (const mapping of importMappings) {
      if (mapping.from.test(content)) {
        content = content.replace(mapping.from, mapping.to);
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${path.relative(baseDir, filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let filesUpdated = 0;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Skip node_modules and other non-source directories
      if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist') {
        continue;
      }
      filesUpdated += processDirectory(fullPath, extensions);
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (extensions.includes(ext)) {
        if (updateImportsInFile(fullPath)) {
          filesUpdated++;
        }
      }
    }
  }

  return filesUpdated;
}

// Main execution
console.log('🚀 Starting import path updates...\n');

const appDir = path.join(baseDir, 'app');
const featuresDir = path.join(baseDir, 'features');
const sharedDir = path.join(baseDir, 'shared');
const layoutDir = path.join(baseDir, 'layout');

let totalUpdated = 0;

if (fs.existsSync(appDir)) {
  console.log('📦 Processing app/...');
  totalUpdated += processDirectory(appDir);
}

if (fs.existsSync(featuresDir)) {
  console.log('📦 Processing features/...');
  totalUpdated += processDirectory(featuresDir);
}

if (fs.existsSync(sharedDir)) {
  console.log('📦 Processing shared/...');
  totalUpdated += processDirectory(sharedDir);
}

if (fs.existsSync(layoutDir)) {
  console.log('📦 Processing layout/...');
  totalUpdated += processDirectory(layoutDir);
}

console.log(`\n🎉 Import update complete! Updated ${totalUpdated} files.`);
