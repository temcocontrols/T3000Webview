/**
 * shapePreview — render a stored drawing's shapes into a lightweight SVG
 * string for real previews/thumbnails.
 *
 * Tolerant of both the t3-hvac library shape format (ShapeType / Frame /
 * Paint) and the React-side shape format (type / x/y/width/height / style).
 */
import type { HubProject } from '../types';
import { designHubService } from './designHubService';

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v) || 0;
}

function frameOf(s: any): { x: number; y: number; w: number; h: number } | null {
  if (s?.Frame) {
    const f = s.Frame;
    return { x: num(f.x), y: num(f.y), w: num(f.width), h: num(f.height) };
  }
  if (
    s?.x != null && s?.y != null && s?.width != null && s?.height != null &&
    (s?.x || 0) !== 0 && (s?.width || 0) !== 0
  ) {
    return { x: num(s.x), y: num(s.y), w: num(s.width), h: num(s.height) };
  }
  return null;
}

function paintOf(s: any): { fill?: string; stroke?: string; sw: number } {
  let fill: string | undefined;
  const paint = s?.Paint;
  if (paint && paint.Color) fill = String(paint.Color);
  else if (s?.style?.fill) fill = s.style.fill;
  else if (s?.style?.fillColor) fill = s.style.fillColor;

  const stroke = s?.style?.stroke || s?.style?.strokeColor;
  const sw = num(s?.style?.strokeWidth) || 1;
  return { fill, stroke, sw };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ptsAttr(pts: any[]): string | null {
  if (!Array.isArray(pts) || pts.length === 0) return null;
  return pts
    .map((pt: any) => {
      const x = pt?.x ?? pt?.X ?? (Array.isArray(pt) ? pt[0] : 0);
      const y = pt?.y ?? pt?.Y ?? (Array.isArray(pt) ? pt[1] : 0);
      return `${num(x)},${num(y)}`;
    })
    .join(' ');
}

export function shapeToSvg(s: any): string | null {
  const frame = frameOf(s);
  const { fill, stroke, sw } = paintOf(s);
  const strokeAttr = stroke ? ` stroke="${escapeXml(String(stroke))}" stroke-width="${sw}"` : '';
  const isTrans = !fill || String(fill).toLowerCase() === 'transparent';
  const fillAttr = isTrans ? ' fill="none"' : ` fill="${escapeXml(String(fill))}"`;
  const st = String(s?.ShapeType ?? s?.type ?? '').toLowerCase();

  switch (st) {
    case 'rectangle':
    case 'rect':
    case 'rrrect':
    case 'roundedrectangle':
      if (frame) {
        const rx = num(s?.rx) || num(s?.cornerRadius) || 0;
        return `<rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" rx="${rx}"${fillAttr}${strokeAttr}/>`;
      }
      break;
    case 'circle':
    case 'oval':
    case 'ellipse':
      if (frame && frame.w > 0) {
        return `<ellipse cx="${frame.x + frame.w / 2}" cy="${frame.y + frame.h / 2}" rx="${frame.w / 2}" ry="${frame.h / 2}"${fillAttr}${strokeAttr}/>`;
      }
      break;
    case 'line':
    case 'segmentedline':
    case 'freeline':
    case 'poliline':
    case 'polyline': {
      const p = ptsAttr(s?.Points ?? s?.points);
      if (p) return `<polyline points="${p}" fill="none"${strokeAttr}/>`;
      if (frame) return `<line x1="${frame.x}" y1="${frame.y}" x2="${frame.x + frame.w}" y2="${frame.y + frame.h}"${strokeAttr}/>`;
      break;
    }
    case 'polygon': {
      const p = ptsAttr(s?.Points ?? s?.points);
      if (p) return `<polygon points="${p}"${fillAttr}${strokeAttr}/>`;
      break;
    }
    case 'text':
      if (frame) {
        const fs = num(s?.fontSize) || 12;
        const text = escapeXml(String(s?.text ?? s?.Text ?? ''));
        return `<text x="${frame.x}" y="${frame.y + fs}" font-size="${fs}"${fillAttr}>${text}</text>`;
      }
      break;
    case 'path': {
      const d = s?.d ?? s?.D ?? s?.PathData;
      if (d) return `<path d="${escapeXml(String(d))}"${fillAttr}${strokeAttr}/>`;
      break;
    }
    default:
      break;
  }

  // Fallback: render whatever we can from the frame as a rectangle.
  if (frame) return `<rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}"${fillAttr}${strokeAttr}/>`;
  return null;
}

export function drawingToSvg(drawing: any): string {
  const w = num(drawing?.width) || 1600;
  const h = num(drawing?.height) || 1000;
  const bg = drawing?.backgroundColor && String(drawing.backgroundColor).toLowerCase() !== 'transparent'
    ? String(drawing.backgroundColor)
    : '#ffffff';
  const shapes = Array.isArray(drawing?.shapes) ? drawing.shapes : [];
  const body = shapes
    .map((s: any) => shapeToSvg(s))
    .filter(Boolean)
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">` +
    `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;
}

/** Fetch a drawing by project id (raw localStorage entry). */
export function getDrawingForProject(project: HubProject): any | null {
  if (project.source !== 'hvac') return null;
  try {
    return designHubService.getHvacDrawingsRaw()[project.id] ?? null;
  } catch {
    return null;
  }
}
