/**
 * Documentation Structure
 * Defines the navigation tree for the documentation
 */

export interface DocItem {
  title: string;
  path: string;
  icon?: string;
}

export interface DocSection {
  title: string;
  icon?: string;
  items: DocItem[];
}

export const docStructure: DocSection[] = [
  {
    title: 'Quick Start',
    icon: 'Rocket',
    items: [
      { title: 'Overview', path: 't3000/quick-start/overview' },
      { title: 'Installation', path: 't3000/quick-start/installation' },
      { title: 'Configuration', path: 't3000/quick-start/configuration' },
    ],
  },
  {
    title: 'Architecture',
    icon: 'AppFolder',
    items: [
      { title: 'System Overview', path: 't3000/architecture/system-overview' },
      { title: 'Device Loading', path: 't3000/architecture/device-loading' },
    ],
  },
  {
    title: 'Device Management',
    icon: 'Desktop',
    items: [
      { title: 'Connecting Devices', path: 't3000/device-management/connecting-devices' },
      { title: 'Device Configuration', path: 't3000/device-management/device-configuration' },
      { title: 'Device Monitoring', path: 't3000/device-management/device-monitoring' },
      { title: 'Troubleshooting', path: 't3000/device-management/device-troubleshooting' },
    ],
  },
  {
    title: 'Data Points',
    icon: 'DataUsage',
    items: [
      { title: 'Inputs', path: 't3000/data-points/inputs' },
      { title: 'Outputs', path: 't3000/data-points/outputs' },
      { title: 'Variables', path: 't3000/data-points/variables' },
      { title: 'Programs', path: 't3000/data-points/programs' },
      { title: 'PID Loops', path: 't3000/data-points/pid-loops' },
    ],
  },
  {
    title: 'Features',
    icon: 'AppsList',
    items: [
      { title: 'Schedules', path: 't3000/features/schedules' },
      { title: 'Holidays', path: 't3000/features/holidays' },
      { title: 'Graphics', path: 't3000/features/graphics' },
      { title: 'Trend Logs', path: 't3000/features/trendlogs' },
      { title: 'Alarms', path: 't3000/features/alarms' },
    ],
  },
  {
    title: 'API Reference',
    icon: 'Code',
    items: [
      { title: 'REST API', path: 't3000/api-reference/rest-api' },
      { title: 'WebSocket API', path: 't3000/api-reference/websocket-api' },
      { title: 'Events', path: 't3000/api-reference/events' },
      { title: 'Modbus Protocol', path: 't3000/api-reference/modbus-protocol' },
    ],
  },
  {
    title: 'Guides',
    icon: 'BookOpen',
    items: [
      { title: 'Best Practices', path: 't3000/guides/best-practices' },
      { title: 'Troubleshooting', path: 't3000/guides/troubleshooting' },
      { title: 'Performance Tuning', path: 't3000/guides/performance-tuning' },
      { title: 'FAQ', path: 't3000/guides/faq' },
    ],
  },
  {
    title: 'Building Platform',
    icon: 'Settings',
    items: [
      { title: 'Overview', path: 't3000/building-platform/overview' },
      { title: 'Control Messages', path: 't3000/building-platform/control-messages/message-index' },
      { title: 'BACnet Commands', path: 't3000/building-platform/bacnet-commands' },
      { title: 'Data Structures', path: 't3000/building-platform/data-structures' },
    ],
  },
];

/**
 * Get all doc paths for routing
 */
export function getAllDocPaths(): string[] {
  return docStructure.flatMap((section) => section.items.map((item) => item.path));
}

/**
 * Find a doc item by path
 */
export function findDocByPath(path: string): DocItem | undefined {
  for (const section of docStructure) {
    const item = section.items.find((i) => i.path === path);
    if (item) return item;
  }
  return undefined;
}

/**
 * Get breadcrumb trail for a path
 */
export function getBreadcrumbs(path: string): Array<{ title: string; path?: string }> {
  const breadcrumbs = [{ title: 'Documentation', path: '' }];

  // Handle t3000 docs
  if (path.startsWith('t3000/')) {
    breadcrumbs.push({ title: 'T3000' });

    const parts = path.replace('t3000/', '').split('/');
    if (parts.length > 0) {
      const section = docStructure.find((s) =>
        s.items.some((i) => i.path === path)
      );
      if (section) {
        breadcrumbs.push({ title: section.title });
      }
    }

    const doc = findDocByPath(path);
    if (doc) {
      breadcrumbs.push({ title: doc.title });
    }

    return breadcrumbs;
  }

  // Handle legacy docs
  if (path.startsWith('legacy/')) {
    breadcrumbs.push({ title: 'Legacy Docs' });

    const legacyPath = path.replace('legacy/', '');
    const parts = legacyPath.split('/');

    if (parts.length > 0) {
      // Add category (development, implementations, legacy-code, releases)
      const categoryName = parts[0];
      const categoryTitles: Record<string, string> = {
        'development': 'Development Docs',
        'implementations': 'Implementation History',
        'legacy-code': 'Legacy Code',
        'releases': 'Release History',
      };

      if (categoryTitles[categoryName]) {
        breadcrumbs.push({ title: categoryTitles[categoryName] });
      }

      // Add folder name as section
      if (parts.length > 1) {
        const folderName = parts[1];
        const folderTitles: Record<string, string> = {
          'analysis': 'Analysis & Planning',
          'api': 'API Documentation',
          'bacnet': 'BACnet Protocol',
          'bugs': 'Bug Tracking & Fixes',
          'data-flow': 'Data Flow & Architecture',
          'data-mnt': 'Data Maintenance',
          'database': 'Database',
          'develop': 'Developer Tools',
          'new-ui': 'New UI Development',
          'project': 'Project Documentation',
          'tools': 'Tools',
          'hvac': 'HVAC Designer',
          't3000': 'T3000 Legacy',
          't3-bas-web': 'T3 BAS Web',
          't3-vue': 'T3 Vue Components',
          'trend-log': 'Trend Log System',
          'c++': 'C++ Code',
          'v0': 'V0 Archives',
          'revnotes': 'Release Notes',
          'screenshots': 'Screenshots',
          'oscilloscope': 'Oscilloscope',
          'scripts': 'Scripts',
        };

        breadcrumbs.push({ title: folderTitles[folderName] || folderName });

        // Add file name as final crumb
        if (parts.length > 2) {
          const fileName = parts[parts.length - 1].replace('.md', '');
          breadcrumbs.push({ title: fileName });
        }
      }
    }

    return breadcrumbs;
  }

  // Handle user guide docs
  const parts = path.split('/');
  if (parts.length > 0) {
    const section = docStructure.find((s) =>
      s.items.some((i) => i.path === path)
    );
    if (section) {
      breadcrumbs.push({ title: section.title });
    }
  }

  const doc = findDocByPath(path);
  if (doc) {
    breadcrumbs.push({ title: doc.title });
  }

  return breadcrumbs;
}
