/**
 * Shape Renderer Component
 * Renders shapes based on their type
 */

import React from 'react';
import { Shape } from '../../types/shape.types';
import { LineShape } from './LineShape.tsx';
import { RectShape } from './RectShape.tsx';
import { CircleShape } from './CircleShape.tsx';
import { EllipseShape } from './EllipseShape.tsx';
import { PolygonShape } from './PolygonShape.tsx';
import { PolylineShape } from './PolylineShape.tsx';
import { TextShape } from './TextShape.tsx';
import { ImageShape } from './ImageShape.tsx';
import { GroupShape } from './GroupShape.tsx';
import { PathShape } from './PathShape.tsx';

interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({ shape, isSelected }) => {
  if (!shape.visible) return null;

  switch (shape.type) {
    case 'line':
      return <LineShape shape={shape as any} isSelected={isSelected} />;
    case 'rectangle':
      return <RectShape shape={shape as any} isSelected={isSelected} />;
    case 'circle':
      return <CircleShape shape={shape as any} isSelected={isSelected} />;
    case 'ellipse':
      return <EllipseShape shape={shape as any} isSelected={isSelected} />;
    case 'polygon':
      return <PolygonShape shape={shape as any} isSelected={isSelected} />;
    case 'polyline':
      return <PolylineShape shape={shape as any} isSelected={isSelected} />;
    case 'text':
      return <TextShape shape={shape as any} isSelected={isSelected} />;
    case 'image':
      return <ImageShape shape={shape as any} isSelected={isSelected} />;
    case 'group':
      return <GroupShape shape={shape as any} isSelected={isSelected} />;
    case 'path':
      return <PathShape shape={shape as any} isSelected={isSelected} />;
    default:
      return null;
  }
};
