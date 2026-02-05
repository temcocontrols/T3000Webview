/**
 * Path Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';

interface PathShapeProps {
  shape: Shape & { type: 'path' };
  isSelected: boolean;
}

export const PathShape: React.FC<PathShapeProps> = ({ shape, isSelected }) => {
  const { transform, style } = shape;
  const pathShape = shape as any;

  return (
    <g data-shape-id={shape.id} transform={`translate(${transform.x}, ${transform.y})`}>
      <path
        d={pathShape.pathData || ''}
        fill={style.fillColor}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinecap={style.strokeLinecap}
        strokeLinejoin={style.strokeLinejoin}
        opacity={style.opacity}
      />
      {isSelected && (
        <path
          d={pathShape.pathData || ''}
          fill="none"
          stroke="#0078d7"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      )}
    </g>
  );
};
