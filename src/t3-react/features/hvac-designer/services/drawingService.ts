/**
 * Drawing Service
 * Handles saving and loading drawings.
 *
 * Primary: Uses the t3-hvac library's built-in DataOpt (localStorage) for persistence.
 * The library stores app state via DataOpt.SaveAppStateV2() / LoadAppStateV2().
 * We supplement with a localStorage index for drawing metadata.
 *
 * Future: REST API when backend is implemented.
 */

import { Drawing, DrawingMetadata, ExportOptions, ImportOptions } from '../types/drawing.types';
import { Shape } from '../types/shape.types';
import { Layer } from '../types/drawing.types';
import Hvac from '@/lib/t3-hvac';

const API_BASE = '/api';
const LOCAL_STORAGE_KEY = 't3-hvac-drawings';

// ── localStorage helpers ──

function getLocalDrawings(): Record<string, Drawing> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalDrawings(drawings: Record<string, Drawing>): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(drawings));
}

/**
 * Save a drawing.
 * Writes to both the library's appStateV2 persistence and our local index.
 */
export async function saveDrawing(drawing: Drawing): Promise<{ success: boolean; id: string }> {
  // Persist via library
  try { Hvac.IdxPage?.save?.(); } catch { /* library save may not be bound */ }

  const drawings = getLocalDrawings();
  const id = drawing.id || `drawing-${Date.now()}`;
  drawings[id] = { ...drawing, id, updatedAt: new Date().toISOString() };
  saveLocalDrawings(drawings);

  // Try API (backend not yet implemented — fails silently)
  try {
    const r = await fetch(`${API_BASE}/drawings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(drawing),
    });
    if (r.ok) {
      const data = await r.json();
      return { success: true, id: data.id };
    }
  } catch { /* API unavailable */ }

  return { success: true, id };
}

/**
 * Update an existing drawing.
 */
export async function updateDrawing(id: string, drawing: Partial<Drawing>): Promise<{ success: boolean }> {
  const drawings = getLocalDrawings();
  if (drawings[id]) {
    drawings[id] = { ...drawings[id], ...drawing, id, updatedAt: new Date().toISOString() };
    saveLocalDrawings(drawings);
  }
  return { success: true };
}

/**
 * Load a drawing by ID.
 */
export async function loadDrawing(id: string): Promise<Drawing> {
  const drawings = getLocalDrawings();
  if (drawings[id]) return drawings[id];

  // Try API
  try {
    const r = await fetch(`${API_BASE}/drawings/${id}`);
    if (r.ok) return r.json();
  } catch { /* API unavailable */ }

  throw new Error(`Drawing not found: ${id}`);
}

/**
 * Delete a drawing.
 */
export async function deleteDrawing(id: string): Promise<{ success: boolean }> {
  const drawings = getLocalDrawings();
  delete drawings[id];
  saveLocalDrawings(drawings);
  return { success: true };
}

/**
 * List all drawings (for picker/browser).
 */
export async function listDrawings(): Promise<DrawingMetadata[]> {
  const drawings = getLocalDrawings();
  return Object.values(drawings).map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    version: d.version,
  }));
}

/**
 * List drawings for a specific graphic.
 */
export async function listDrawingsByGraphic(graphicId: string): Promise<DrawingMetadata[]> {
  const all = await listDrawings();
  return all.filter((d: any) => d.graphicId === graphicId);
}

/**
 * Export drawing to a specific format.
 */
export async function exportDrawing(
  drawing: Drawing,
  options: ExportOptions
): Promise<Blob | string> {
  switch (options.format) {
    case 'json':
      return JSON.stringify(drawing, null, 2);
    case 'svg': {
      const svgEl = document.querySelector('#svg-area svg');
      return svgEl?.outerHTML || `<svg xmlns="http://www.w3.org/2000/svg"></svg>`;
    }
    default:
      throw new Error(`Export format not yet supported: ${options.format}`);
  }
}

/**
 * Import drawing from a file.
 */
export async function importDrawing(
  file: File,
  _options: ImportOptions
): Promise<{ shapes: Shape[]; layers: Layer[] }> {
  const text = await file.text();
  const data = JSON.parse(text);
  return {
    shapes: data.shapes || [],
    layers: data.layers || [],
  };
}

/**
 * Create a thumbnail from a drawing.
 */
export async function createThumbnail(
  drawing: Drawing,
  maxWidth = 200,
  maxHeight = 150
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const scale = Math.min(maxWidth / drawing.width, maxHeight / drawing.height);
  canvas.width = drawing.width * scale;
  canvas.height = drawing.height * scale;

  ctx.fillStyle = drawing.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // TODO: Render svg.js shapes into canvas for thumbnail

  return canvas.toDataURL('image/png', 0.8);
}
