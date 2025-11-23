/**
 * PointEditor Component
 *
 * Universal editor for BACnet points (Input, Output, Variable)
 * Displays point properties in a form
 */

import React, { useState, useEffect } from 'react';
import {
  Field,
  Input,
  Dropdown,
  Option,
  Switch,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { InputPoint, OutputPoint, VariablePoint } from '@common/react/types/bacnet';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
  },
});

type Point = InputPoint | OutputPoint | VariablePoint;

interface PointEditorProps {
  point: Point;
  onSave: (point: Point) => void;
  onCancel: () => void;
  readonly?: boolean;
}

export const PointEditor: React.FC<PointEditorProps> = ({
  point,
  onSave,
  onCancel,
  readonly = false,
}) => {
  const styles = useStyles();
  const [editedPoint, setEditedPoint] = useState<Point>(point);

  useEffect(() => {
    setEditedPoint(point);
  }, [point]);

  const handleChange = (field: keyof Point, value: any) => {
    setEditedPoint((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onSave(editedPoint);
  };

  return (
    <div className={styles.container}>
      <Field label="Label">
        <Input
          value={editedPoint.label || ''}
          onChange={(_, data) => handleChange('label', data.value)}
          disabled={readonly}
        />
      </Field>

      <Field label="Description">
        <Input
          value={editedPoint.description || ''}
          onChange={(_, data) => handleChange('description', data.value)}
          disabled={readonly}
        />
      </Field>

      <div className={styles.formRow}>
        <Field label="Value">
          <Input
            type="number"
            value={String(editedPoint.value || 0)}
            onChange={(_, data) => handleChange('value', Number(data.value))}
            disabled={readonly}
          />
        </Field>

        <Field label="Units">
          <Input
            value={editedPoint.units || ''}
            onChange={(_, data) => handleChange('units', data.value)}
            disabled={readonly}
          />
        </Field>
      </div>

      <div className={styles.formRow}>
        <Field label="Range Low">
          <Input
            type="number"
            value={String(editedPoint.rangeLow || 0)}
            onChange={(_, data) => handleChange('rangeLow', Number(data.value))}
            disabled={readonly}
          />
        </Field>

        <Field label="Range High">
          <Input
            type="number"
            value={String(editedPoint.rangeHigh || 0)}
            onChange={(_, data) => handleChange('rangeHigh', Number(data.value))}
            disabled={readonly}
          />
        </Field>
      </div>

      {('auto' in editedPoint) && (
        <Field label="Auto/Manual">
          <Switch
            checked={editedPoint.auto}
            onChange={(_, data) => handleChange('auto', data.checked)}
            disabled={readonly}
          />
        </Field>
      )}

      {!readonly && (
        <div className={styles.actions}>
          <Button appearance="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button appearance="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
};
