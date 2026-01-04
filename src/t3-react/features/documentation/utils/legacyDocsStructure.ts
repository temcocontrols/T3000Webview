/**
 * Legacy Documentation Structure
 * Auto-generated structure from docs/ folder
 * Maps all legacy markdown files for navigation
 */

export interface LegacyDocItem {
  title: string;
  path: string;  // Relative path from docs/ folder
  file: string;  // Full file path
}

export interface LegacyDocSection {
  title: string;
  folder: string;
  icon?: string;
  items: LegacyDocItem[];
  collapsed?: boolean;
}

/**
 * Legacy documentation categories
 * Organized by folder with meaningful titles
 */
export const legacyDocsStructure: LegacyDocSection[] = [
  {
    title: 'Analysis & Planning',
    folder: 'analysis',
    icon: 'DocumentSearch',
    items: [
      { title: 'Force Update Implementation', path: 'analysis/force-update-simple.md', file: 'docs/analysis/force-update-simple.md' },
      { title: 'Left Panel Analysis', path: 'analysis/LEFT_PANEL_ANALYSIS.md', file: 'docs/analysis/LEFT_PANEL_ANALYSIS.md' },
      { title: 'Left Panel Fix Summary', path: 'analysis/LEFT_PANEL_FIX_SUMMARY.md', file: 'docs/analysis/LEFT_PANEL_FIX_SUMMARY.md' },
      { title: 'T3000 Version Checking', path: 'analysis/t3000-version-checking.md', file: 'docs/analysis/t3000-version-checking.md' },
      { title: 'Tree View Modes Analysis', path: 'analysis/TREE_VIEW_MODES_ANALYSIS.md', file: 'docs/analysis/TREE_VIEW_MODES_ANALYSIS.md' },
    ],
  },
  {
    title: 'API Documentation',
    folder: 'api',
    icon: 'Code',
    items: [
      { title: 'Action3 vs Action16 Comparison', path: 'api/Action3-vs-Action16-Comparison.md', file: 'docs/api/Action3-vs-Action16-Comparison.md' },
      { title: 'Action 17: Refresh WebView List', path: 'api/ACTION_17_REFRESH_WEBVIEW_LIST.md', file: 'docs/api/ACTION_17_REFRESH_WEBVIEW_LIST.md' },
      { title: 'Action3 Limitations (Critical)', path: 'api/CRITICAL-Action3-Limitations.md', file: 'docs/api/CRITICAL-Action3-Limitations.md' },
      { title: 'Point Update APIs Summary', path: 'api/T3000-Point-Update-APIs-Summary.md', file: 'docs/api/T3000-Point-Update-APIs-Summary.md' },
      { title: 'Point Update APIs (Detailed)', path: 'api/T3000-Point-Update-APIs.md', file: 'docs/api/T3000-Point-Update-APIs.md' },
      { title: 'WebView List Field Mapping', path: 'api/UPDATE_WEBVIEW_LIST-Field-Mapping.md', file: 'docs/api/UPDATE_WEBVIEW_LIST-Field-Mapping.md' },
    ],
  },
  {
    title: 'BACnet Protocol',
    folder: 'bacnet',
    icon: 'PlugConnected',
    items: [
      { title: 'BACnet Overview', path: 'bacnet/README.md', file: 'docs/bacnet/README.md' },
      { title: 'Implementation Plan - Phase 1', path: 'bacnet/BACnet-Implementation-Plan-Phase1.md', file: 'docs/bacnet/BACnet-Implementation-Plan-Phase1.md' },
      { title: 'Technical Roadmap', path: 'bacnet/BACnet-Implementation-Technical-Roadmap.md', file: 'docs/bacnet/BACnet-Implementation-Technical-Roadmap.md' },
      { title: 'Protocol Research (YABE)', path: 'bacnet/BACnet-Protocol-Research-YABE-Analysis.md', file: 'docs/bacnet/BACnet-Protocol-Research-YABE-Analysis.md' },
      { title: 'Testing Guide', path: 'bacnet/BACnet-Testing-Guide.md', file: 'docs/bacnet/BACnet-Testing-Guide.md' },
      { title: 'TrendLog Windows Tool', path: 'bacnet/BACnet-TrendLog-Windows-Tool-Guide.md', file: 'docs/bacnet/BACnet-TrendLog-Windows-Tool-Guide.md' },
      { title: 'Infrastructure Analysis', path: 'bacnet/T3000-BACnet-Infrastructure-Analysis.md', file: 'docs/bacnet/T3000-BACnet-Infrastructure-Analysis.md' },
      { title: 'Integration Analysis', path: 'bacnet/T3000-BACnet-Integration-Analysis.md', file: 'docs/bacnet/T3000-BACnet-Integration-Analysis.md' },
      { title: 'TimeScaleDB Requirements', path: 'bacnet/T3000-BACnet-TimeScaleDB-Requirements-Analysis.md', file: 'docs/bacnet/T3000-BACnet-TimeScaleDB-Requirements-Analysis.md' },
      { title: 'Rust API WebView Integration', path: 'bacnet/T3000-Rust-API-WebView-Integration-Complete.md', file: 'docs/bacnet/T3000-Rust-API-WebView-Integration-Complete.md' },
      { title: 'Source Code Analysis Plan', path: 'bacnet/T3000-Source-Code-Analysis-Plan.md', file: 'docs/bacnet/T3000-Source-Code-Analysis-Plan.md' },
      { title: 'Source Code Integration', path: 'bacnet/T3000-Source-Code-Integration-Complete.md', file: 'docs/bacnet/T3000-Source-Code-Integration-Complete.md' },
      { title: 'TrendLog Analysis', path: 'bacnet/T3000-TrendLog-Analysis-Complete.md', file: 'docs/bacnet/T3000-TrendLog-Analysis-Complete.md' },
      { title: 'WebView Integration', path: 'bacnet/T3000-WebView-Integration-Analysis.md', file: 'docs/bacnet/T3000-WebView-Integration-Analysis.md' },
      { title: 'TimeScaleDB Integration', path: 'bacnet/TimeScaleDB-Integration-Guide.md', file: 'docs/bacnet/TimeScaleDB-Integration-Guide.md' },
    ],
  },
  {
    title: 'Bug Tracking & Fixes',
    folder: 'bugs',
    icon: 'Bug',
    items: [
      { title: 'Bugs Overview', path: 'bugs/README.md', file: 'docs/bugs/README.md' },
      { title: 'GRP Navigation Race Condition', path: 'bugs/grp-navigation-race-condition.md', file: 'docs/bugs/grp-navigation-race-condition.md' },
      { title: 'WebView2 Cache Issues', path: 'bugs/webview2-cache-complete.md', file: 'docs/bugs/webview2-cache-complete.md' },
    ],
  },
  {
    title: 'Data Flow & Architecture',
    folder: 'data-flow',
    icon: 'Flow',
    items: [
      { title: 'React vs Vue Data Flow', path: 'data-flow/react-vue-data-flow-comparison.md', file: 'docs/data-flow/react-vue-data-flow-comparison.md' },
      { title: 'Data Initialization Analysis', path: 'data-flow/T3000_Data_Initialization_Analysis.md', file: 'docs/data-flow/T3000_Data_Initialization_Analysis.md' },
    ],
  },
  {
    title: 'Data Maintenance',
    folder: 'data-mnt',
    icon: 'Database',
    items: [
      { title: 'Overview', path: 'data-mnt/README.md', file: 'docs/data-mnt/README.md' },
      { title: 'Development Notes', path: 'data-mnt/DEVELOPMENT_NOTES.md', file: 'docs/data-mnt/DEVELOPMENT_NOTES.md' },
      { title: 'Implementation Log', path: 'data-mnt/IMPLEMENTATION_LOG.md', file: 'docs/data-mnt/IMPLEMENTATION_LOG.md' },
      { title: 'BACnet Block Polling', path: 'data-mnt/T3000-BACnet-Block-Polling-Implementation.md', file: 'docs/data-mnt/T3000-BACnet-Block-Polling-Implementation.md' },
      { title: 'TimescaleDB Integration', path: 'data-mnt/T3000-TimescaleDB-Integration-Analysis.md', file: 'docs/data-mnt/T3000-TimescaleDB-Integration-Analysis.md' },
      { title: 'Technical Specification', path: 'data-mnt/TECHNICAL_SPECIFICATION.md', file: 'docs/data-mnt/TECHNICAL_SPECIFICATION.md' },
      { title: 'Test Success Summary', path: 'data-mnt/TEST_SUCCESS_SUMMARY.md', file: 'docs/data-mnt/TEST_SUCCESS_SUMMARY.md' },
    ],
  },
  {
    title: 'Database',
    folder: 'database',
    icon: 'Database',
    items: [
      { title: 'Optimization Implementation', path: 'database/OPTIMIZATION_IMPLEMENTATION_SUMMARY.md', file: 'docs/database/OPTIMIZATION_IMPLEMENTATION_SUMMARY.md' },
      { title: 'Settings Field Mapping', path: 'database/SETTINGS_FIELD_MAPPING.md', file: 'docs/database/SETTINGS_FIELD_MAPPING.md' },
    ],
  },
  {
    title: 'Developer Tools',
    folder: 'develop',
    icon: 'DeveloperBoard',
    items: [
      { title: 'Develop Menu Design', path: 'develop/DEVELOP_MENU_DESIGN.md', file: 'docs/develop/DEVELOP_MENU_DESIGN.md' },
      { title: 'Implementation Summary', path: 'develop/IMPLEMENTATION_SUMMARY.md', file: 'docs/develop/IMPLEMENTATION_SUMMARY.md' },
    ],
  },
  {
    title: 'HVAC Design',
    folder: 'hvac',
    icon: 'BuildingFactory',
    items: [
      { title: 'HVAC Overview', path: 'hvac/01_overview.00-hvac-overview.md', file: 'docs/hvac/01_overview.00-hvac-overview.md' },
      { title: 'Master Summary', path: 'hvac/01_overview.01-master-summary.md', file: 'docs/hvac/01_overview.01-master-summary.md' },
      { title: 'Complete File Analysis', path: 'hvac/02_analysis.01-complete-file-analysis.md', file: 'docs/hvac/02_analysis.01-complete-file-analysis.md' },
      { title: 'Deep Code Analysis', path: 'hvac/02_analysis.02-deep-code-analysis.md', file: 'docs/hvac/02_analysis.02-deep-code-analysis.md' },
      { title: 'File-by-File Analysis', path: 'hvac/02_analysis.03-file-by-file-analysis.md', file: 'docs/hvac/02_analysis.03-file-by-file-analysis.md' },
      { title: 'Library Analysis', path: 'hvac/02_analysis.04-library-analysis.md', file: 'docs/hvac/02_analysis.04-library-analysis.md' },
      { title: 'Modernization Roadmap', path: 'hvac/03_arch.01-modernization-roadmap.md', file: 'docs/hvac/03_arch.01-modernization-roadmap.md' },
      { title: 'Best Practices', path: 'hvac/03_arch.02-modernization-best-practices.md', file: 'docs/hvac/03_arch.02-modernization-best-practices.md' },
    ],
  },
  {
    title: 'New UI Development',
    folder: 'new-ui',
    icon: 'Design',
    collapsed: true,
    items: [],  // To be populated with new-ui docs
  },
  {
    title: 'Project Documentation',
    folder: 'project',
    icon: 'FolderOpen',
    collapsed: true,
    items: [],  // To be populated with project docs
  },
  {
    title: 'T3000 Legacy',
    folder: 't3000',
    icon: 'Archive',
    collapsed: true,
    items: [],  // To be populated with t3000 docs
  },
  {
    title: 'T3 BAS Web',
    folder: 't3-bas-web',
    icon: 'Globe',
    collapsed: true,
    items: [],  // To be populated with t3-bas-web docs
  },
  {
    title: 'T3 Vue Components',
    folder: 't3-vue',
    icon: 'Code',
    items: [
      { title: 'TrendLog User Guide', path: 't3-vue/TRENDLOG_USER_GUIDE.md', file: 'docs/t3-vue/TRENDLOG_USER_GUIDE.md' },
    ],
  },
  {
    title: 'Trend Log System',
    folder: 'trend-log',
    icon: 'LineChart',
    collapsed: true,
    items: [],  // To be populated with trend-log docs
  },
  {
    title: 'Release Notes',
    folder: 'revnotes',
    icon: 'DocumentBulletList',
    collapsed: true,
    items: [],  // To be populated with revision notes
  },
];

/**
 * Get all legacy doc paths
 */
export function getAllLegacyDocPaths(): string[] {
  return legacyDocsStructure.flatMap((section) =>
    section.items.map((item) => item.path)
  );
}

/**
 * Find a legacy doc by path
 */
export function findLegacyDocByPath(path: string): LegacyDocItem | undefined {
  for (const section of legacyDocsStructure) {
    const item = section.items.find((i) => i.path === path);
    if (item) return item;
  }
  return undefined;
}

/**
 * Get section by folder name
 */
export function getSectionByFolder(folder: string): LegacyDocSection | undefined {
  return legacyDocsStructure.find((section) => section.folder === folder);
}
