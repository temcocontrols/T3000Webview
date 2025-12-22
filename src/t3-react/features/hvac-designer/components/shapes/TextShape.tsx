/**
 * Text Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';

interface TextShapeProps {
  shape: Shape & { type: 'text' };
  isSelected: boolean;
}

export const TextShape: React.FC<TextShapeProps> = ({ shape, isSelected }) => {
  const { transform, style } = shape;
  const textShape = shape as any;

  return (
    <g data-shape-id={shape.id}>
      <text
        x={transform.x}
        y={transform.y}
        fill={style.fillColor || '#000'}
        fontSize={textShape.fontSize || 16}
        fontFamily={textShape.fontFamily || 'Arial'}
        fontWeight={textShape.fontWeight || 'normal'}
        fontStyle={textShape.fontStyle || 'normal'}
        textAnchor={textShape.textAnchor || 'start'}
        opacity={style.opacity}
        transform={`rotate(${transform.rotation} ${transform.x} ${transform.y})`}
      >
        {textShape.content || 'Text'}
      </text>
      {isSelected && (
        <rect
          x={transform.x - 2}
          y={transform.y - (textShape.fontSize || 16) - 2}
          width={(textShape.content || 'Text').length * (textShape.fontSize || 16) * 0.6 + 4}
          height={(textShape.fontSize || 16) + 4}
          fill="none"
          stroke="#0078d7"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      )}
    </g>
  );
};
