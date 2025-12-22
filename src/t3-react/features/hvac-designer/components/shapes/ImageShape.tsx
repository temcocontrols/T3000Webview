/**
 * Image Shape Component
 */

import React from 'react';
import { Shape } from '../../types/shape.types';

interface ImageShapeProps {
  shape: Shape & { type: 'image' };
  isSelected: boolean;
}

export const ImageShape: React.FC<ImageShapeProps> = ({ shape, isSelected }) => {
  const { transform, style } = shape;
  const imageShape = shape as any;

  return (
    <g data-shape-id={shape.id}>
      <image
        x={transform.x}
        y={transform.y}
        width={imageShape.width || 100}
        height={imageShape.height || 100}
        href={imageShape.src || ''}
        opacity={style.opacity}
        transform={`rotate(${transform.rotation} ${transform.x + (imageShape.width || 100) / 2} ${transform.y + (imageShape.height || 100) / 2})`}
        preserveAspectRatio={imageShape.preserveAspectRatio ? 'xMidYMid meet' : 'none'}
        aria-label={imageShape.alt || 'Image shape'}
      />
      {isSelected && (
        <rect
          x={transform.x - 2}
          y={transform.y - 2}
          width={(imageShape.width || 100) + 4}
          height={(imageShape.height || 100) + 4}
          fill="none"
          stroke="#0078d7"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      )}
    </g>
  );
};
