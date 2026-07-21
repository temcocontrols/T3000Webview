/**
 * Drawing Service
 * Handles saving and loading drawings from the backend API
 */

import { Drawing, DrawingMetadata, ExportOptions, ImportOptions } from '../types/drawing.types';
import { Shape } from '../types/shape.types';
import { Layer } from '../types/drawing.types';

const API_BASE = '/api';

/**
 * Save a drawing to the database
 */
export async function saveDrawing(drawing: Drawing): Promise<{ success: boolean; id: string }> {
  try {
    const response = await fetch(`${API_BASE}/drawings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(drawing),
    });

    if (!response.ok) {
      throw new Error(`Failed to save drawing: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error saving drawing:', error);
    throw error;
  }
}

/**
 * Update an existing drawing
 */
export async function updateDrawing(id: string, drawing: Partial<Drawing>): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/drawings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(drawing),
    });

    if (!response.ok) {
      throw new Error(`Failed to update drawing: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating drawing:', error);
    throw error;
  }
}

/**
 * Load a drawing from the database
 */
export async function loadDrawing(id: string): Promise<Drawing> {
  try {
    const response = await fetch(`${API_BASE}/drawings/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to load drawing: ${response.statusText}`);
    }

    const drawing = await response.json();
    return drawing;
  } catch (error) {
    console.error('Error loading drawing:', error);
    throw error;
  }
}

/**
 * Delete a drawing
 */
export async function deleteDrawing(id: string): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/drawings/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete drawing: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting drawing:', error);
    throw error;
  }
}

/**
 * List all drawings (for picker/browser)
 */
export async function listDrawings(): Promise<DrawingMetadata[]> {
  try {
    const response = await fetch(`${API_BASE}/drawings`);

    if (!response.ok) {
      throw new Error(`Failed to list drawings: ${response.statusText}`);
    }

    const drawings = await response.json();
    return drawings;
  } catch (error) {
    console.error('Error listing drawings:', error);
    throw error;
  }
}

/**
 * List drawings for a specific graphic
 */
export async function listDrawingsByGraphic(graphicId: string): Promise<DrawingMetadata[]> {
  try {
    const response = await fetch(`${API_BASE}/drawings?graphicId=${graphicId}`);

    if (!response.ok) {
      throw new Error(`Failed to list drawings: ${response.statusText}`);
    }

    const drawings = await response.json();
    return drawings;
  } catch (error) {
    console.error('Error listing drawings:', error);
    throw error;
  }
}

/**
 * Export drawing to various formats
 */
export async function exportDrawing(
  drawing: Drawing,
  options: ExportOptions
): Promise<Blob | string> {
  const { format, quality, scale, includeBackground, selectedOnly } = options;

  switch (format) {
    case 'json':
      return exportToJSON(drawing, selectedOnly);
    case 'svg':
      return exportToSVG(drawing, includeBackground, selectedOnly);
    case 'png':
      return exportToPNG(drawing, quality, scale, includeBackground, selectedOnly);
    case 'pdf':
      return exportToPDF(drawing, scale, includeBackground, selectedOnly);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export to JSON
 */
function exportToJSON(drawing: Drawing, selectedOnly?: boolean): string {
  const data = selectedOnly
    ? { ...drawing, shapes: drawing.shapes.filter((s) => s.visible) }
    : drawing;

  return JSON.stringify(data, null, 2);
}

/**
 * Export to SVG
 */
function exportToSVG(
  drawing: Drawing,
  includeBackground?: boolean,
  _selectedOnly?: boolean
): string {
  // TODO: Filter shapes based on selectedOnly parameter

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${drawing.width}" height="${drawing.height}" viewBox="0 0 ${drawing.width} ${drawing.height}">`;

  if (includeBackground) {
    svg += `<rect width="${drawing.width}" height="${drawing.height}" fill="${drawing.backgroundColor}" />`;
  }

  // TODO: Render shapes to SVG
  // This would need to convert each shape type to SVG elements

  svg += '</svg>';
  return svg;
}

/**
 * Export to PNG
 */
async function exportToPNG(
  drawing: Drawing,
  quality?: number,
  scale?: number,
  includeBackground?: boolean,
  _selectedOnly?: boolean
): Promise<Blob> {
  // Create an off-screen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const scaleFactor = scale || 1;
  canvas.width = drawing.width * scaleFactor;
  canvas.height = drawing.height * scaleFactor;

  if (includeBackground) {
    ctx.fillStyle = drawing.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // TODO: Render shapes to canvas
  // This would need to convert SVG shapes to canvas drawing commands

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/png',
      quality || 0.92
    );
  });
}

/**
 * Export to PDF
 */
async function exportToPDF(
  _drawing: Drawing,
  _scale?: number,
  _includeBackground?: boolean,
  _selectedOnly?: boolean
): Promise<Blob> {
  // TODO: Implement PDF export
  // Would use a library like jsPDF or pdfmake
  throw new Error('PDF export not yet implemented');
}

/**
 * Import drawing from various formats
 */
export async function importDrawing(
  file: File,
  options: ImportOptions
): Promise<{ shapes: Shape[]; layers: Layer[] }> {
  const { format, replaceExisting, targetLayer } = options;

  switch (format) {
    case 'json':
      return importFromJSON(file, replaceExisting, targetLayer);
    case 'svg':
      return importFromSVG(file, targetLayer);
    case 'dxf':
      return importFromDXF(file, targetLayer);
    default:
      throw new Error(`Unsupported import format: ${format}`);
  }
}

/**
 * Import from JSON
 */
async function importFromJSON(
  file: File,
  replaceExisting?: boolean,
  targetLayer?: string
): Promise<{ shapes: Shape[]; layers: Layer[] }> {
  const text = await file.text();
  const data = JSON.parse(text);

  const shapes = data.shapes || [];
  const layers = data.layers || [];

  if (targetLayer) {
    // Assign all shapes to target layer
    shapes.forEach((shape: Shape) => {
      shape.layer = targetLayer;
    });
  }

  return { shapes, layers: replaceExisting ? layers : [] };
}

/**
 * Import from SVG
 */
async function importFromSVG(
  _file: File,
  _targetLayer?: string
): Promise<{ shapes: Shape[]; layers: Layer[] }> {
  // TODO: Implement SVG import
  // Would parse SVG and convert elements to shapes
  throw new Error('SVG import not yet implemented');
}

/**
 * Import from DXF
 */
async function importFromDXF(
  _file: File,
  _targetLayer?: string
): Promise<{ shapes: Shape[]; layers: Layer[] }> {
  // TODO: Implement DXF import
  // Would use a DXF parser library
  throw new Error('DXF import not yet implemented');
}

/**
 * Create a thumbnail from a drawing
 */
export async function createThumbnail(drawing: Drawing, maxWidth = 200, maxHeight = 150): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const scale = Math.min(maxWidth / drawing.width, maxHeight / drawing.height);
  canvas.width = drawing.width * scale;
  canvas.height = drawing.height * scale;

  ctx.fillStyle = drawing.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // TODO: Render shapes to canvas for thumbnail

  return canvas.toDataURL('image/png', 0.8);
}
