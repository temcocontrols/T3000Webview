/**
 * Design Hub Types
 * Unified metadata model across all drawing engines (HVAC, EEZ, Simulator).
 */

/** Which drawing engine a type/project belongs to. */
export type DrawingEngine = 'hvac' | 'eez' | 'simulator' | 'symbols';

/** A pluggable "type of drawing" — the core extensibility unit of the hub. */
export interface DrawingType {
  id: string;
  name: string;
  description: string;
  engine: DrawingEngine;
  /** Route opened when the user clicks the tile / opens a project of this type. */
  openPath: string;
  /** File formats the engine can import/export. */
  importFormats: string[];
  /** Whether drawings of this type can be bound to a device. */
  deviceAware: boolean;
  /** Accent color used on tiles, badges and thumbnails. */
  accent: string;
  /** Fluent icon key (resolved via DESIGN_HUB_ICONS). */
  icon: string;
  /** Default canvas for a new drawing. */
  template?: { width: number; height: number; backgroundColor: string };
  /** How the "New Drawing" dialog should configure this type. */
  createMode?: 'hvac' | 'lcd' | 'lvgl';
  /** HVAC only — a drawing is tied to a graphic slot (1-8) per device/panel. */
  graphicSlots?: boolean;
  /** LVGL only — template id pre-selected in the EEZ New Project wizard. */
  wizardType?: string;
}

export type ProjectStatus = 'synced' | 'local' | 'bound' | 'deployed';

export interface HubProject {
  id: string;
  name: string;
  description?: string;
  typeId: string;
  engine: DrawingEngine;
  serialNumber?: number;
  building?: string;
  floor?: string;
  room?: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  boundPoints?: number;
  /** Where this project originated (drives refresh behavior). */
  source: 'hvac' | 'eez' | 'simulator' | 'hub';
  openPath: string;
  // Type-aware detail info (EEZ/LVGL on-disk projects).
  lvglVersion?: string;
  folder?: string;
  fileSize?: number;
  pages?: number;
  widgets?: number;
}

export type ActivityKind =
  | 'created'
  | 'edited'
  | 'opened'
  | 'deployed'
  | 'imported'
  | 'shared';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  label: string;
  detail?: string;
  typeId?: string;
  timestamp: string;
  projectId?: string;
}

export interface LibraryItem {
  id: string;
  name: string;
  description?: string;
  kind: 'symbols' | 'template' | 'logo' | 'part' | 'custom';
  count?: number;
  thumbnail?: string;
  source?: 'local' | 'inkscape' | 'cloud';
  updatedAt: string;
}

/** Project grid filter tabs. */
export type ProjectTab = 'all' | 'hvac' | 'lvgl-9-5' | 'lvgl-flow-9-5';

/** Sort key for the projects grid. */
export type SortKey = 'updated' | 'name' | 'created';

/** Projects grid view mode. */
export type HubView = 'grid' | 'list';

/** A user-defined folder for organizing projects. */
export interface HubFolder {
  id: string;
  name: string;
  color?: string;
}

/** A captured revision snapshot of a drawing. */
export interface RevisionSnapshot {
  id: string;
  name: string;
  timestamp: string;
  drawing: any;
}

/** Computed statistics for a drawing. */
export interface ProjectStats {
  shapeCount: number;
  width: number;
  height: number;
  layers: number;
  boundPoints: number;
  complexity: 'simple' | 'medium' | 'complex';
}
