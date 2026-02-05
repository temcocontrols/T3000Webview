/**
 * Polygon Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';

interface PolygonShapeProps {
  shape: Shape & { type: 'polygon' };
  isSelected: boolean;
}

export const PolygonShape: React.FC<PolygonShapeProps> = ({ shape, isSelected }) => {
  const { transform, style } = shape;
  const polygonShape = shape as any;
  const points = polygonShape.points || [];
  const pointsStr = points.map((p: any) => `${p.x},${p.y}`).join(' ');

  return (
    <g data-shape-id={shape.id} transform={`translate(${transform.x}, ${transform.y})`}>
      <polygon
        points={pointsStr}
        fill={style.fillColor}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinejoin={style.strokeLinejoin}
        opacity={style.opacity}
      />
      {isSelected && (
        <>
          <polygon
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
