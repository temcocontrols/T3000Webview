/**
 * Polyline Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';

interface PolylineShapeProps {
  shape: Shape & { type: 'polyline' };
  isSelected: boolean;
}

export const PolylineShape: React.FC<PolylineShapeProps> = ({ shape, isSelected }) => {
  const { transform, style } = shape;
  const polylineShape = shape as any;
  const points = polylineShape.points || [];
  const pointsStr = points.map((p: any) => `${p.x},${p.y}`).join(' ');

  return (
    <g data-shape-id={shape.id} transform={`translate(${transform.x}, ${transform.y})`}>
      <polyline
        points={pointsStr}
        fill="none"
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinecap={style.strokeLinecap}
        strokeLinejoin={style.strokeLinejoin}
        opacity={style.opacity}
      />
      {isSelected && (
        <>
          <polyline
            points={pointsStr}
            fill="none"
            stroke="#0078d7"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
          {points.map((p: any, i: number) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#0078d7" />
          ))}
        </>
      )}
    </g>
  );
};
