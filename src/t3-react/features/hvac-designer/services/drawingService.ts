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

// ── Disk persistence (best-effort, kept local to this service) ──────────────
// Mirrors each drawing to `<T3Web>/t3-hvac/<id>/<id>.json` so the folder can
// later be the source for the Design Hub list. localStorage stays the source of
// truth; these fail silently when the backend isn't available.

async function saveDrawingToDisk(id: string, drawing: unknown): Promise<void> {
  try {
    await fetch(`/api/design-hub/hvac-drawings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: typeof drawing === 'string' ? drawing : JSON.stringify(drawing),
    });
  } catch { /* backend unavailable — localStorage remains primary */ }
}

async function deleteDrawingFromDisk(id: string): Promise<void> {
  try {
    await fetch(`/api/design-hub/hvac-drawings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch { /* backend unavailable — localStorage remains primary */ }
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

  // Best-effort disk mirror under <T3Web>/t3-hvac/<id>/<id>.json.
  // localStorage stays primary.
  await saveDrawingToDisk(id, drawings[id]);

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
    // Best-effort disk mirror.
    await saveDrawingToDisk(id, drawings[id]);
  }
  return { success: true };
}

/**
 * Load a drawing by ID.
 */
export async function loadDrawing(id: string): Promise<Drawing> {
  const drawings = getLocalDrawings();
  if (drawings[id]) return drawings[id];

  // Try disk (backend) — the drawing may exist on disk but not in this browser.
  try {
    const r = await fetch(`/api/design-hub/hvac-drawings/${encodeURIComponent(id)}`);
    if (r.ok) return (await r.json()) as Drawing;
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
  // Best-effort disk delete.
  await deleteDrawingFromDisk(id);
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
