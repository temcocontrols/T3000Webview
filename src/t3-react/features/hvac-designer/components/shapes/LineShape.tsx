/**
 * Line Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';

interface LineShapeProps {
  shape: Shape & { type: 'line' };
  isSelected: boolean;
}

export const LineShape: React.FC<LineShapeProps> = ({ shape, isSelected }) => {
  const { transform, style } = shape;
  const lineShape = shape as any; // Type assertion for specific shape properties

  return (
    <g data-shape-id={shape.id}>
      <line
        x1={transform.x}
        y1={transform.y}
        x2={lineShape.endX || transform.x + 100}
        y2={lineShape.endY || transform.y}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinecap={style.strokeLinecap}
        opacity={style.opacity}
      />
      {isSelected && (
        <>
          <circle cx={transform.x} cy={transform.y} r={4} fill="#0078d7" />
          <circle cx={lineShape.endX || transform.x + 100} cy={lineShape.endY || transform.y} r={4} fill="#0078d7" />
        </>
      )}
    </g>
  );
};
