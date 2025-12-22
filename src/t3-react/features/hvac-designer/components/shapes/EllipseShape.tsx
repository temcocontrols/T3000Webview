/**
 * Ellipse Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';

interface EllipseShapeProps {
  shape: Shape & { type: 'ellipse' };
  isSelected: boolean;
}

export const EllipseShape: React.FC<EllipseShapeProps> = ({ shape, isSelected }) => {
  const { transform, style } = shape;
  const ellipseShape = shape as any;
  const rx = ellipseShape.radiusX || 60;
  const ry = ellipseShape.radiusY || 40;

  return (
    <g data-shape-id={shape.id}>
      <ellipse
        cx={transform.x}
        cy={transform.y}
        rx={rx}
        ry={ry}
        fill={style.fillColor}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        opacity={style.opacity}
        transform={`rotate(${transform.rotation} ${transform.x} ${transform.y})`}
      />
      {isSelected && (
        <ellipse
          cx={transform.x}
          cy={transform.y}
          rx={rx + 2}
          ry={ry + 2}
          fill="none"
          stroke="#0078d7"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      )}
    </g>
  );
};
