/**
 * Design Hub — Feature Index
 */
export { DesignHubPage } from './pages/DesignHubPage';
export { ProjectDetailPage } from './pages/ProjectDetailPage';
export { DesignMenuBar } from './components/DesignMenuBar';
export { EditorStatusBar } from './components/EditorStatusBar';
export { BindDeviceDialog } from './components/BindDeviceDialog';
export { NewTypeDialog } from './components/NewTypeDialog';
export { ImportDialog } from './components/ImportDialog';
export { DrawingPreview } from './components/DrawingPreview';
export { TemplatesSection } from './components/TemplatesSection';
export { FoldersBar } from './components/FoldersBar';
export { HubStats } from './components/HubStats';
export { CompareDrawings } from './components/CompareDrawings';
export { CommandPalette } from './components/CommandPalette';
export { useEditorCommands, emitEditorStatus } from './hooks/useEditorCommands';
export {
  DRAWING_TYPES,
  getDrawingType,
  getTypesByEngine,
  getAllDrawingTypes,
  getCustomDrawingTypes,
  addCustomDrawingType,
} from './drawingTypes';
export { DRAWING_TEMPLATES } from './templates';
export { designHubService } from './services/designHubService';
export { useDesignHubStore } from './store/designHubStore';
export type {
  DrawingType,
  DrawingEngine,
  HubProject,
  ProjectStatus,
  ActivityItem,
  ActivityKind,
  LibraryItem,
  ProjectTab,
  SortKey,
  HubView,
  HubFolder,
  RevisionSnapshot,
  ProjectStats,
} from './types';
