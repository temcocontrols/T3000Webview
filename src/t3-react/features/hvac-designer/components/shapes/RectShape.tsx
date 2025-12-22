/**
 * Rectangle Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';

interface RectShapeProps {
  shape: Shape & { type: 'rectangle' };
  isSelected: boolean;
}

export const RectShape: React.FC<RectShapeProps> = ({ shape, isSelected }) => {
  const { transform, style } = shape;
  const rectShape = shape as any;

  return (
    <g data-shape-id={shape.id}>
      <rect
        x={transform.x}
        y={transform.y}
        width={rectShape.width || 100}
        height={rectShape.height || 60}
        rx={rectShape.cornerRadius || 0}
        fill={style.fillColor}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        opacity={style.opacity}
        transform={`rotate(${transform.rotation} ${transform.x + (rectShape.width || 100) / 2} ${transform.y + (rectShape.height || 60) / 2})`}
      />
      {isSelected && (
        <rect
          x={transform.x - 2}
          y={transform.y - 2}
          width={(rectShape.width || 100) + 4}
          height={(rectShape.height || 60) + 4}
          fill="none"
          stroke="#0078d7"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      )}
    </g>
  );
};
