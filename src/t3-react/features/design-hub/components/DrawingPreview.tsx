/**
 * DrawingPreview — renders a drawing's shapes as an inline SVG preview.
 * Uses the real stored shapes (not a gradient placeholder).
 */
import React, { useMemo } from 'react';
import type { HubProject } from '../types';
import { drawingToSvg, getDrawingForProject } from '../services/shapePreview';

export const DrawingPreview: React.FC<{
  project: HubProject;
  className?: string;
  style?: React.CSSProperties;
}> = ({ project, className, style }) => {
  const svg = useMemo(() => {
    const drawing = getDrawingForProject(project);
    return drawing ? drawingToSvg(drawing) : null;
  }, [project]);

  if (!svg) return null;

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        ...style,
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{ width: '100%', height: '100%', display: 'flex' }}
      />
    </div>
  );
};
