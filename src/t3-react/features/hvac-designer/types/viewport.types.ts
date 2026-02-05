/**
 * Viewport Types
 * Defines viewport/drawing area properties and state
 */

export interface ViewportState {
  width: number;
  height: number;
  zoom: number;
  pan: Point;
  gridSize: number;
  snapToGrid: boolean;
  showRulers: boolean;
  showGrid: boolean;
  backgroundColor: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
