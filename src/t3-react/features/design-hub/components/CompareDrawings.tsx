/**
 * CompareDrawings — side-by-side preview of two drawings (or revisions)
 * with a shape-level summary of what changed.
 */
import React, { useMemo } from 'react';
import { drawingToSvg } from '../services/shapePreview';

interface ShapeRef {
  id: string;
  type: string;
}

function shapeRefs(drawing: any): ShapeRef[] {
  const shapes = Array.isArray(drawing?.shapes) ? drawing.shapes : [];
  return shapes.map((s: any, i: number) => ({
    id: String(s?.id ?? s?.ShapeId ?? `shape-${i}`),
    type: String(s?.ShapeType ?? s?.type ?? 'shape'),
  }));
}

function SvgView({ drawing, label, highlight }: { drawing: any; label: string; highlight?: string }) {
  const svg = useMemo(() => (drawing ? drawingToSvg(drawing) : '<svg xmlns="http://www.w3.org/2000/svg"/>'), [drawing]);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#1c2b3a', marginBottom: 8 }}>{label}</div>
      <div
        style={{
          border: '1px solid #e6eaf0',
          borderRadius: 10,
          overflow: 'hidden',
          background: '#fff',
          aspectRatio: '4 / 3',
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

export const CompareDrawings: React.FC<{
  a: any;
  b: any;
  nameA?: string;
  nameB?: string;
}> = ({ a, b, nameA = 'Version A', nameB = 'Version B' }) => {
  const diff = useMemo(() => {
    const ra = new Map(shapeRefs(a).map((s) => [s.id, s]));
    const rb = new Map(shapeRefs(b).map((s) => [s.id, s]));
    const removed = [...ra.values()].filter((s) => !rb.has(s.id));
    const added = [...rb.values()].filter((s) => !ra.has(s.id));
    const common = shapeRefs(a).filter((s) => rb.has(s.id)).length;
    return { removed, added, common };
  }, [a, b]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <SvgView drawing={a} label={nameA} />
        <SvgView drawing={b} label={nameB} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={{ background: '#eaf6ec', color: '#0e700e', padding: '4px 10px', borderRadius: 20 }}>
          {diff.common} unchanged
        </span>
        <span style={{ background: '#fdeaea', color: '#c50f1f', padding: '4px 10px', borderRadius: 20 }}>
          {diff.removed.length} removed
        </span>
        <span style={{ background: '#eef4fb', color: '#0078d4', padding: '4px 10px', borderRadius: 20 }}>
          {diff.added.length} added
        </span>
      </div>
      {(diff.removed.length > 0 || diff.added.length > 0) && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#5b6b7c', lineHeight: 1.6 }}>
          {diff.added.length > 0 && (
            <div>➕ Added: {diff.added.map((s) => s.type).join(', ')}</div>
          )}
          {diff.removed.length > 0 && (
            <div>➖ Removed: {diff.removed.map((s) => s.type).join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
};
