/**
 * Drawing Document Types
 * Defines the structure of a drawing document
 */

import { Shape, Symbol } from './shape.types';

// Re-export Symbol for convenience
export type { Symbol } from './shape.types';

export interface Drawing {
  id: string;
  name: string;
  description?: string;
  graphicId?: string; // Link to graphics table
  serialNumber?: number; // Link to device

  // Canvas settings
  width: number;
  height: number;
  backgroundColor: string;

  // Content
  shapes: Shape[];
  layers: Layer[];
  symbols: Symbol[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;

  // Settings
  gridSize: number;
  snapToGrid: boolean;
  showRulers: boolean;
  showGrid: boolean;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
}

export interface DrawingMetadata {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  graphicId?: string;
  serialNumber?: number;
  updatedAt: string;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  quality?: number; // For PNG
  scale?: number; // For PNG/PDF
  includeBackground?: boolean;
  selectedOnly?: boolean;
}

export interface ImportOptions {
  format: 'svg' | 'json' | 'dxf';
  replaceExisting?: boolean;
  targetLayer?: string;
}
