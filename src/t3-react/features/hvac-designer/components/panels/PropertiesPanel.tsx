/**
 * Properties Panel Component
 * Right sidebar showing properties of selected shapes
 */

import React from 'react';
import {
  Card,
  Text,
  Input,
  Label,
} from '@fluentui/react-components';
import { useHvacDesignerStore } from '../../store/designerStore';

export const PropertiesPanel: React.FC = () => {
  const { shapes, selectedShapeIds, updateShape } = useHvacDesignerStore();

  const selectedShapes = shapes.filter((s) => selectedShapeIds.includes(s.id));

  if (selectedShapes.length === 0) {
    return (
      <div
        style={{
          width: '280px',
          backgroundColor: '#f5f5f5',
          borderLeft: '1px solid #e1e1e1',
          padding: '16px',
        }}
      >
        <Text>No selection</Text>
      </div>
    );
  }

  const shape = selectedShapes[0]; // Show first selected shape properties

  return (
    <div
      style={{
        width: '280px',
        backgroundColor: '#f5f5f5',
        borderLeft: '1px solid #e1e1e1',
        padding: '16px',
        overflow: 'auto',
      }}
    >
      <Text size={500} weight="semibold" block style={{ marginBottom: '16px' }}>
        Properties
      </Text>

      {selectedShapes.length > 1 && (
        <Text size={200} block style={{ marginBottom: '16px' }}>
          {selectedShapes.length} shapes selected
        </Text>
      )}

      <Card style={{ marginBottom: '16px' }}>
        <div style={{ padding: '12px' }}>
          <Text size={400} weight="semibold" block style={{ marginBottom: '8px' }}>
            Transform
          </Text>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <Label size="small">X</Label>
              <Input
                size="small"
                type="number"
                value={shape.transform.x.toString()}
                onChange={(_e, data) => {
                  const x = parseFloat(data.value || '0');
                  updateShape(shape.id, {
                    transform: { ...shape.transform, x },
                  });
                }}
              />
            </div>
            <div>
              <Label size="small">Y</Label>
              <Input
                size="small"
                type="number"
                value={shape.transform.y.toString()}
                onChange={(_e, data) => {
                  const y = parseFloat(data.value || '0');
                  updateShape(shape.id, {
                    transform: { ...shape.transform, y },
                  });
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <Label size="small">Rotation</Label>
            <Input
              size="small"
              type="number"
              value={shape.transform.rotation.toString()}
              onChange={(_e, data) => {
                const rotation = parseFloat(data.value || '0');
                updateShape(shape.id, {
                  transform: { ...shape.transform, rotation },
                });
              }}
            />
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: '16px' }}>
        <div style={{ padding: '12px' }}>
          <Text size={400} weight="semibold" block style={{ marginBottom: '8px' }}>
            Appearance
          </Text>

          <div style={{ marginBottom: '8px' }}>
            <Label size="small">Fill Color</Label>
            <Input
              size="small"
              type="text"
              value={shape.style.fillColor}
              onChange={(_e, data) => {
                updateShape(shape.id, {
                  style: { ...shape.style, fillColor: data.value },
                });
              }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <Label size="small">Stroke Color</Label>
            <Input
              size="small"
              type="text"
              value={shape.style.strokeColor}
              onChange={(_e, data) => {
                updateShape(shape.id, {
                  style: { ...shape.style, strokeColor: data.value },
                });
              }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <Label size="small">Stroke Width</Label>
            <Input
              size="small"
              type="number"
              min="0"
              value={shape.style.strokeWidth?.toString() || '2'}
              onChange={(_e, data) => {
                const strokeWidth = parseFloat(data.value || '1');
                updateShape(shape.id, {
                  style: { ...shape.style, strokeWidth },
                });
              }}
            />
          </div>

          <div>
            <Label size="small">Opacity</Label>
            <Input
              size="small"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={shape.style.opacity?.toString() || '1'}
              onChange={(_e, data) => {
                const opacity = parseFloat(data.value || '1');
                updateShape(shape.id, {
                  style: { ...shape.style, opacity },
                });
              }}
            />
          </div>
        </div>
      </Card>

      {shape.deviceLink && (
        <Card>
          <div style={{ padding: '12px' }}>
            <Text size={400} weight="semibold" block style={{ marginBottom: '8px' }}>
              Device Link
            </Text>
            <Text size={200} block>
              Serial: {shape.deviceLink.serialNumber}
            </Text>
            <Text size={200} block>
              Point: {shape.deviceLink.pointType}[{shape.deviceLink.pointIndex}]
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
};
