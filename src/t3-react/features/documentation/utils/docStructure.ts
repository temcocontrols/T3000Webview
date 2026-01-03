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
  items: DocItem[];
}

export const docStructure: DocSection[] = [
  {
    title: 'Quick Start',
    items: [
      { title: 'Overview', path: 'quick-start/overview' },
      { title: 'Installation', path: 'quick-start/installation' },
      { title: 'Configuration', path: 'quick-start/configuration' },
    ],
  },
  {
    title: 'Device Management',
    items: [
      { title: 'Connecting Devices', path: 'device-management/connecting-devices' },
      { title: 'Device Configuration', path: 'device-management/device-configuration' },
      { title: 'Device Monitoring', path: 'device-management/device-monitoring' },
      { title: 'Troubleshooting', path: 'device-management/device-troubleshooting' },
    ],
  },
  {
    title: 'Data Points',
    items: [
      { title: 'Inputs', path: 'data-points/inputs' },
      { title: 'Outputs', path: 'data-points/outputs' },
      { title: 'Variables', path: 'data-points/variables' },
      { title: 'Programs', path: 'data-points/programs' },
      { title: 'PID Loops', path: 'data-points/pid-loops' },
    ],
  },
  {
    title: 'Features',
    items: [
      { title: 'Schedules', path: 'features/schedules' },
      { title: 'Holidays', path: 'features/holidays' },
      { title: 'Graphics', path: 'features/graphics' },
      { title: 'Trend Logs', path: 'features/trendlogs' },
      { title: 'Alarms', path: 'features/alarms' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'REST API', path: 'api-reference/rest-api' },
      { title: 'WebSocket API', path: 'api-reference/websocket-api' },
      { title: 'Events', path: 'api-reference/events' },
      { title: 'Modbus Protocol', path: 'api-reference/modbus-protocol' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Best Practices', path: 'guides/best-practices' },
      { title: 'Troubleshooting', path: 'guides/troubleshooting' },
      { title: 'Performance Tuning', path: 'guides/performance-tuning' },
      { title: 'FAQ', path: 'guides/faq' },
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
