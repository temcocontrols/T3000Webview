/**
 * Shape Types
 * Defines all drawable shapes on the canvas
 */

import { Point, Transform } from './canvas.types';

export type ShapeType =
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'polygon'
  | 'polyline'
  | 'text'
  | 'image'
  | 'symbol'
  | 'group'
  | 'path';

export interface BaseShape {
  id: string;
  type: ShapeType;
  name?: string;
  layer: string;
  visible: boolean;
  locked: boolean;
  transform: Transform;
  style: ShapeStyle;
  deviceLink?: DeviceLink;
  data?: Record<string, any>;
}

export interface ShapeStyle {
  fill?: string;
  fillColor?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  opacity?: number;
  strokeDasharray?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: [Point, Point];
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number; // rounded corners
  ry?: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface PolygonShape extends BaseShape {
  type: 'polygon';
  points: Point[];
}

export interface PolylineShape extends BaseShape {
  type: 'polyline';
  points: Point[];
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textAnchor: 'start' | 'middle' | 'end';
}

export interface ImageShape extends BaseShape {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  href: string;
}

export interface SymbolShape extends BaseShape {
  type: 'symbol';
  x: number;
  y: number;
  symbolId: string;
  width: number;
  height: number;
}

export interface GroupShape extends BaseShape {
  type: 'group';
  children: string[]; // IDs of child shapes
}

export interface PathShape extends BaseShape {
  type: 'path';
  d: string; // SVG path data
}

export type Shape =
  | LineShape
  | RectangleShape
  | CircleShape
  | EllipseShape
  | PolygonShape
  | PolylineShape
  | TextShape
  | ImageShape
  | SymbolShape
  | GroupShape
  | PathShape;

export interface DeviceLink {
  serialNumber: number;
  pointType: 'input' | 'output' | 'variable';
  pointIndex: number;
  property?: string; // Which property to display (value, label, etc.)
  dynamicStyling?: boolean; // Enable/disable dynamic styling based on value
}

export interface Symbol {
  id: string;
  name: string;
  category: string;
  svg: string;
  width: number;
  height: number;
  thumbnail?: string;
}
