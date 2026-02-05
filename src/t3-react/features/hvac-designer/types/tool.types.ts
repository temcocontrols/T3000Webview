/**
 * Tool Types
 * Defines drawing tools and their options
 */

export type ToolType =
  | 'select'
  | 'pan'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'polygon'
  | 'polyline'
  | 'text'
  | 'image'
  | 'symbol';

export interface ToolState {
  activeTool: ToolType;
  isDrawing: boolean;
  options: ToolOptions;
}

export interface ToolOptions {
  // Line tool options
  lineType?: 'straight' | 'curved' | 'stepped';

  // Shape tool options
  preserveAspectRatio?: boolean;

  // Text tool options
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;

  // Common options
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface ToolbarConfig {
  tools: ToolConfig[];
}

export interface ToolConfig {
  id: ToolType;
  name: string;
  icon: string;
  tooltip: string;
  shortcut?: string;
}
