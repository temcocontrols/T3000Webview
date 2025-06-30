/**
 * T3000 Data Module - Refactored Index
 * Provides backward compatibility while organizing code into focused modules
 *
 * This module has been refactored from a monolithic 1779-line file into:
 * - Constants/RangeDefinitions.ts - Range and type definitions
 * - Constants/ToolDefinitions.ts - Tool configurations and categories
 * - Store/StateStore.ts - Centralized state management
 *
 * All exports maintain backward compatibility with existing code.
 */

// Re-export range definitions and constants
export {
  ranges,
  T3_Types,
  type T3Type,
  type DigitalRange,
  type AnalogRange,
  type RangeDefinitions
} from './Constants/RangeDefinitions';

// Re-export tool definitions and utilities
export {
  newTools as NewTool, // Keep original export name for compatibility
  toolsCategories,
  gaugeDefaultColors as gaugeDefautColors, // Keep original typo for compatibility
  AdjustVlScrollHeight,
  getToolsByCategory,
  getToolByName,
  getAllCategories,
  type Tool,
  type ToolSetting,
  type ToolCategory,
  type ColorRange
} from './Constants/ToolDefinitions';

// Re-export state management
export {
  stateStore,
  // Individual state refs for backward compatibility
  appState,
  appStateV2,
  library,
  deviceAppState,
  deviceModel,
  T3000_Data,
  rulersGridVisible,
  locked,
  isBuiltInEdge,
  viewport,
  moveable,
  documentAreaPosition,
  globalNav,
  grpNav,
  undoHistory,
  redoHistory,
  user,
  linkT3EntryDialog,
  linkT3EntryDialogV2,
  savedNotify,
  globalMsg,
  devVersion,
  localSettings,
  T3Data,
  viewportMargins,
  selectPanelOptions,
  // Types
  type StateStore,
  type Project,
  type Library,
  type ViewportTransform,
  type DocumentAreaPosition,
  type DeviceModel,
  type GlobalNav,
  type T3000Data,
  type LocalSettings,
  type LinkT3EntryDialog,
  type T3DataState
} from './Store/StateStore';

// Legacy exports for complete backward compatibility
export const emptyProject = {
  version: process.env.VERSION,
  items: [],
  selectedTargets: [],
  elementGuidelines: [],
  itemsCount: 0,
  groupCount: 0,
  activeItemIndex: null,
  viewportTransform: { x: 0, y: 0, scale: 1 },
  rulersGridVisible: false
};

export const emptyLib = {
  version: process.env.VERSION,
  imagesCount: 0,
  objLibItemsCount: 0,
  images: [],
  objLib: [],
};
