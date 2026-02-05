/**
 * Circle Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';

interface CircleShapeProps {
  shape: Shape & { type: 'circle' };
  isSelected: boolean;
}

export const CircleShape: React.FC<CircleShapeProps> = ({ shape, isSelected }) => {
  const { transform, style } = shape;
  const circleShape = shape as any;
  const radius = circleShape.radius || 50;

  return (
    <g data-shape-id={shape.id}>
      <circle
        cx={transform.x}
        cy={transform.y}
        r={radius}
        fill={style.fillColor}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        opacity={style.opacity}
      />
      {isSelected && (
        <circle
          cx={transform.x}
          cy={transform.y}
          r={radius + 2}
          fill="none"
          stroke="#0078d7"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      )}
    </g>
  );
};
