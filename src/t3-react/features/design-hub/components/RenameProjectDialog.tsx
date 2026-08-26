/**
 * RenameProjectDialog — Fluent Dialog for renaming a drawing.
 * Replaces the native window.prompt with a proper dialog + text field.
 */
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Field,
} from '@fluentui/react-components';
import { EditRegular } from '@fluentui/react-icons';

export const RenameProjectDialog: React.FC<{
  projectName: string;
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}> = ({ projectName, open, onClose, onSave }) => {
  const [name, setName] = useState(projectName);

  useEffect(() => {
    if (open) setName(projectName);
  }, [open, projectName]);

  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed !== projectName;

  return (
    <Dialog
      open={open}
      onOpenChange={(_, d) => {
        if (!d.open) onClose();
      }}
    >
      <DialogSurface style={{ width: 440, maxWidth: 'calc(100vw - 40px)' }}>
        <DialogBody>
          <DialogTitle>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600 }}>
              <EditRegular style={{ fontSize: 16, color: '#0078d4' }} />
              Rename drawing
            </span>
          </DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: '#4a5a6c', lineHeight: 1.5, marginTop: 8 }}>
              Give this drawing a new name. The name is shown in the Design Hub list and when you deploy the drawing to a device.
            </div>
            <Field
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>Name</span>}
              hint={
                <span style={{ fontSize: 11, color: '#7a8699' }}>
                  A short, descriptive name — e.g. “Main Lobby Thermostat”.
                </span>
              }
            >
              <Input
                value={name}
                onChange={(_, d) => setName(d.value)}
                autoFocus
                onFocus={(e) => e.target.select()}
                style={{ fontSize: 13 }}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose} style={{ fontWeight: 400, fontSize: 13 }}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={!valid}
              onClick={() => onSave(trimmed)}
              style={{ fontWeight: 400, fontSize: 13 }}
            >
              Save
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
