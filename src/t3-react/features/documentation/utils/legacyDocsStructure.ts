/**
 * Legacy Documentation Structure
 * Reorganized structure with clear categorization
 * All paths now use legacy/ prefix
 */

export interface LegacyDocItem {
  title: string;
  path: string;  // Path with legacy/ prefix
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
 * Organized into 4 main groups: Development, Implementations, Legacy Code, Releases
 */
export const legacyDocsStructure: LegacyDocSection[] = [
  // ============================================================================
  // DEVELOPMENT DOCUMENTATION
  // ============================================================================
  {
    title: 'Analysis & Planning',
    folder: 'legacy/development/analysis',
    icon: 'DocumentSearch',
    items: [
      { title: 'Force Update Implementation', path: 'legacy/development/analysis/force-update-simple.md', file: 'docs/legacy/development/analysis/force-update-simple.md' },
      { title: 'Left Panel Analysis', path: 'legacy/development/analysis/LEFT_PANEL_ANALYSIS.md', file: 'docs/legacy/development/analysis/LEFT_PANEL_ANALYSIS.md' },
      { title: 'Left Panel Fix Summary', path: 'legacy/development/analysis/LEFT_PANEL_FIX_SUMMARY.md', file: 'docs/legacy/development/analysis/LEFT_PANEL_FIX_SUMMARY.md' },
      { title: 'T3000 Version Checking', path: 'legacy/development/analysis/t3000-version-checking.md', file: 'docs/legacy/development/analysis/t3000-version-checking.md' },
      { title: 'Tree View Modes Analysis', path: 'legacy/development/analysis/TREE_VIEW_MODES_ANALYSIS.md', file: 'docs/legacy/development/analysis/TREE_VIEW_MODES_ANALYSIS.md' },
    ],
  },
  {
    title: 'API Documentation',
    folder: 'legacy/development/api',
    icon: 'Code',
    items: [
      { title: 'Action3 vs Action16 Comparison', path: 'legacy/development/api/Action3-vs-Action16-Comparison.md', file: 'docs/legacy/development/api/Action3-vs-Action16-Comparison.md' },
      { title: 'Action 17: Refresh WebView List', path: 'legacy/development/api/ACTION_17_REFRESH_WEBVIEW_LIST.md', file: 'docs/legacy/development/api/ACTION_17_REFRESH_WEBVIEW_LIST.md' },
      { title: 'Action3 Limitations (Critical)', path: 'legacy/development/api/CRITICAL-Action3-Limitations.md', file: 'docs/legacy/development/api/CRITICAL-Action3-Limitations.md' },
      { title: 'Point Update APIs Summary', path: 'legacy/development/api/T3000-Point-Update-APIs-Summary.md', file: 'docs/legacy/development/api/T3000-Point-Update-APIs-Summary.md' },
      { title: 'Point Update APIs (Detailed)', path: 'legacy/development/api/T3000-Point-Update-APIs.md', file: 'docs/legacy/development/api/T3000-Point-Update-APIs.md' },
      { title: 'WebView List Field Mapping', path: 'legacy/development/api/UPDATE_WEBVIEW_LIST-Field-Mapping.md', file: 'docs/legacy/development/api/UPDATE_WEBVIEW_LIST-Field-Mapping.md' },
    ],
  },
  {
    title: 'BACnet Protocol',
    folder: 'legacy/development/bacnet',
    icon: 'PlugConnected',
    items: [
      { title: 'BACnet Overview', path: 'legacy/development/bacnet/README.md', file: 'docs/legacy/development/bacnet/README.md' },
      { title: 'Implementation Plan - Phase 1', path: 'legacy/development/bacnet/BACnet-Implementation-Plan-Phase1.md', file: 'docs/legacy/development/bacnet/BACnet-Implementation-Plan-Phase1.md' },
      { title: 'Technical Roadmap', path: 'legacy/development/bacnet/BACnet-Implementation-Technical-Roadmap.md', file: 'docs/legacy/development/bacnet/BACnet-Implementation-Technical-Roadmap.md' },
      { title: 'Protocol Research (YABE)', path: 'legacy/development/bacnet/BACnet-Protocol-Research-YABE-Analysis.md', file: 'docs/legacy/development/bacnet/BACnet-Protocol-Research-YABE-Analysis.md' },
      { title: 'Testing Guide', path: 'legacy/development/bacnet/BACnet-Testing-Guide.md', file: 'docs/legacy/development/bacnet/BACnet-Testing-Guide.md' },
      { title: 'TrendLog Windows Tool', path: 'legacy/development/bacnet/BACnet-TrendLog-Windows-Tool-Guide.md', file: 'docs/legacy/development/bacnet/BACnet-TrendLog-Windows-Tool-Guide.md' },
      { title: 'Infrastructure Analysis', path: 'legacy/development/bacnet/T3000-BACnet-Infrastructure-Analysis.md', file: 'docs/legacy/development/bacnet/T3000-BACnet-Infrastructure-Analysis.md' },
      { title: 'Integration Analysis', path: 'legacy/development/bacnet/T3000-BACnet-Integration-Analysis.md', file: 'docs/legacy/development/bacnet/T3000-BACnet-Integration-Analysis.md' },
      { title: 'TimeScaleDB Requirements', path: 'legacy/development/bacnet/T3000-BACnet-TimeScaleDB-Requirements-Analysis.md', file: 'docs/legacy/development/bacnet/T3000-BACnet-TimeScaleDB-Requirements-Analysis.md' },
      { title: 'Rust API WebView Integration', path: 'legacy/development/bacnet/T3000-Rust-API-WebView-Integration-Complete.md', file: 'docs/legacy/development/bacnet/T3000-Rust-API-WebView-Integration-Complete.md' },
      { title: 'Source Code Analysis Plan', path: 'legacy/development/bacnet/T3000-Source-Code-Analysis-Plan.md', file: 'docs/legacy/development/bacnet/T3000-Source-Code-Analysis-Plan.md' },
      { title: 'Source Code Integration', path: 'legacy/development/bacnet/T3000-Source-Code-Integration-Complete.md', file: 'docs/legacy/development/bacnet/T3000-Source-Code-Integration-Complete.md' },
      { title: 'TrendLog Analysis', path: 'legacy/development/bacnet/T3000-TrendLog-Analysis-Complete.md', file: 'docs/legacy/development/bacnet/T3000-TrendLog-Analysis-Complete.md' },
      { title: 'WebView Integration', path: 'legacy/development/bacnet/T3000-WebView-Integration-Analysis.md', file: 'docs/legacy/development/bacnet/T3000-WebView-Integration-Analysis.md' },
      { title: 'TimeScaleDB Integration', path: 'legacy/development/bacnet/TimeScaleDB-Integration-Guide.md', file: 'docs/legacy/development/bacnet/TimeScaleDB-Integration-Guide.md' },
    ],
  },
  {
    title: 'Bug Tracking & Fixes',
    folder: 'legacy/development/bugs',
    icon: 'Bug',
    items: [
      { title: 'Bugs Overview', path: 'legacy/development/bugs/README.md', file: 'docs/legacy/development/bugs/README.md' },
      { title: 'GRP Navigation Race Condition', path: 'legacy/development/bugs/grp-navigation-race-condition.md', file: 'docs/legacy/development/bugs/grp-navigation-race-condition.md' },
      { title: 'WebView2 Cache Issues', path: 'legacy/development/bugs/webview2-cache-complete.md', file: 'docs/legacy/development/bugs/webview2-cache-complete.md' },
    ],
  },
  {
    title: 'Data Flow & Architecture',
    folder: 'legacy/development/data-flow',
    icon: 'Flow',
    items: [
      { title: 'React vs Vue Data Flow', path: 'legacy/development/data-flow/react-vue-data-flow-comparison.md', file: 'docs/legacy/development/data-flow/react-vue-data-flow-comparison.md' },
      { title: 'Data Initialization Analysis', path: 'legacy/development/data-flow/T3000_Data_Initialization_Analysis.md', file: 'docs/legacy/development/data-flow/T3000_Data_Initialization_Analysis.md' },
    ],
  },
  {
    title: 'Data Maintenance',
    folder: 'legacy/development/data-mnt',
    icon: 'Database',
    items: [
      { title: 'Overview', path: 'legacy/development/data-mnt/README.md', file: 'docs/legacy/development/data-mnt/README.md' },
      { title: 'Development Notes', path: 'legacy/development/data-mnt/DEVELOPMENT_NOTES.md', file: 'docs/legacy/development/data-mnt/DEVELOPMENT_NOTES.md' },
      { title: 'Implementation Log', path: 'legacy/development/data-mnt/IMPLEMENTATION_LOG.md', file: 'docs/legacy/development/data-mnt/IMPLEMENTATION_LOG.md' },
      { title: 'BACnet Block Polling', path: 'legacy/development/data-mnt/T3000-BACnet-Block-Polling-Implementation.md', file: 'docs/legacy/development/data-mnt/T3000-BACnet-Block-Polling-Implementation.md' },
      { title: 'TimescaleDB Integration', path: 'legacy/development/data-mnt/T3000-TimescaleDB-Integration-Analysis.md', file: 'docs/legacy/development/data-mnt/T3000-TimescaleDB-Integration-Analysis.md' },
      { title: 'Technical Specification', path: 'legacy/development/data-mnt/TECHNICAL_SPECIFICATION.md', file: 'docs/legacy/development/data-mnt/TECHNICAL_SPECIFICATION.md' },
      { title: 'Test Success Summary', path: 'legacy/development/data-mnt/TEST_SUCCESS_SUMMARY.md', file: 'docs/legacy/development/data-mnt/TEST_SUCCESS_SUMMARY.md' },
    ],
  },
  {
    title: 'Database',
    folder: 'legacy/development/database',
    icon: 'Database',
    items: [
      { title: 'Optimization Implementation', path: 'legacy/development/database/OPTIMIZATION_IMPLEMENTATION_SUMMARY.md', file: 'docs/legacy/development/database/OPTIMIZATION_IMPLEMENTATION_SUMMARY.md' },
      { title: 'Settings Field Mapping', path: 'legacy/development/database/SETTINGS_FIELD_MAPPING.md', file: 'docs/legacy/development/database/SETTINGS_FIELD_MAPPING.md' },
    ],
  },
  {
    title: 'Developer Tools',
    folder: 'legacy/development/develop',
    icon: 'DeveloperBoard',
    items: [
      { title: 'Develop Menu Design', path: 'legacy/development/develop/DEVELOP_MENU_DESIGN.md', file: 'docs/legacy/development/develop/DEVELOP_MENU_DESIGN.md' },
      { title: 'Implementation Summary', path: 'legacy/development/develop/IMPLEMENTATION_SUMMARY.md', file: 'docs/legacy/development/develop/IMPLEMENTATION_SUMMARY.md' },
    ],
  },
  {
    title: 'New UI Development',
    folder: 'legacy/development/new-ui',
    icon: 'Design',
    collapsed: true,
    items: [],  // To be populated
  },
  {
    title: 'Project Documentation',
    folder: 'legacy/development/project',
    icon: 'FolderOpen',
    collapsed: true,
    items: [],  // To be populated
  },

  // ============================================================================
  // IMPLEMENTATION HISTORY
  // ============================================================================
  {
    title: 'HVAC Designer',
    folder: 'legacy/implementations/hvac',
    icon: 'BuildingFactory',
    items: [
      { title: 'HVAC Overview', path: 'legacy/implementations/hvac/01_overview.00-hvac-overview.md', file: 'docs/legacy/implementations/hvac/01_overview.00-hvac-overview.md' },
      { title: 'Master Summary', path: 'legacy/implementations/hvac/01_overview.01-master-summary.md', file: 'docs/legacy/implementations/hvac/01_overview.01-master-summary.md' },
      { title: 'Complete File Analysis', path: 'legacy/implementations/hvac/02_analysis.01-complete-file-analysis.md', file: 'docs/legacy/implementations/hvac/02_analysis.01-complete-file-analysis.md' },
      { title: 'Deep Code Analysis', path: 'legacy/implementations/hvac/02_analysis.02-deep-code-analysis.md', file: 'docs/legacy/implementations/hvac/02_analysis.02-deep-code-analysis.md' },
      { title: 'File-by-File Analysis', path: 'legacy/implementations/hvac/02_analysis.03-file-by-file-analysis.md', file: 'docs/legacy/implementations/hvac/02_analysis.03-file-by-file-analysis.md' },
      { title: 'Library Analysis', path: 'legacy/implementations/hvac/02_analysis.04-library-analysis.md', file: 'docs/legacy/implementations/hvac/02_analysis.04-library-analysis.md' },
      { title: 'Modernization Roadmap', path: 'legacy/implementations/hvac/03_arch.01-modernization-roadmap.md', file: 'docs/legacy/implementations/hvac/03_arch.01-modernization-roadmap.md' },
      { title: 'Best Practices', path: 'legacy/implementations/hvac/03_arch.02-modernization-best-practices.md', file: 'docs/legacy/implementations/hvac/03_arch.02-modernization-best-practices.md' },
    ],
  },
  {
    title: 'T3000 Legacy Implementation',
    folder: 'legacy/implementations/t3000',
    icon: 'Archive',
    collapsed: true,
    items: [],  // To be populated
  },
  {
    title: 'T3 BAS Web',
    folder: 'legacy/implementations/t3-bas-web',
    icon: 'Globe',
    collapsed: true,
    items: [],  // To be populated
  },
  {
    title: 'T3 Vue Components',
    folder: 'legacy/implementations/t3-vue',
    icon: 'Code',
    items: [
      { title: 'TrendLog User Guide', path: 'legacy/implementations/t3-vue/TRENDLOG_USER_GUIDE.md', file: 'docs/legacy/implementations/t3-vue/TRENDLOG_USER_GUIDE.md' },
    ],
  },
  {
    title: 'Trend Log System',
    folder: 'legacy/implementations/trend-log',
    icon: 'LineChart',
    collapsed: true,
    items: [],  // To be populated
  },

  // ============================================================================
  // LEGACY CODE SAMPLES
  // ============================================================================
  {
    title: 'C++ Code Samples',
    folder: 'legacy/legacy-code/c++',
    icon: 'Code',
    collapsed: true,
    items: [],  // C++ source files
  },
  {
    title: 'V0 Archives',
    folder: 'legacy/legacy-code/v0',
    icon: 'Archive',
    collapsed: true,
    items: [],  // Old version files
  },

  // ============================================================================
  // RELEASE HISTORY
  // ============================================================================
  {
    title: 'Release Notes',
    folder: 'legacy/releases/revnotes',
    icon: 'DocumentBulletList',
    collapsed: true,
    items: [],  // To be populated
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
