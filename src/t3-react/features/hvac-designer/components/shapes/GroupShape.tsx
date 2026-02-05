/**
 * Group Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';
import { ShapeRenderer } from './ShapeRenderer';

interface GroupShapeProps {
  shape: Shape & { type: 'group' };
  isSelected: boolean;
}

export const GroupShape: React.FC<GroupShapeProps> = ({ shape, isSelected }) => {
  const { transform } = shape;
  const groupShape = shape as any;
  const children = groupShape.children || [];

  return (
    <g
      data-shape-id={shape.id}
      transform={`translate(${transform.x}, ${transform.y}) rotate(${transform.rotation})`}
    >
      {children.map((childShape: Shape) => (
        <ShapeRenderer key={childShape.id} shape={childShape} isSelected={false} />
      ))}
      {isSelected && (
        <rect
          x={-2}
          y={-2}
          width={groupShape.width || 100}
          height={groupShape.height || 100}
          fill="none"
          stroke="#0078d7"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      )}
    </g>
  );
};
