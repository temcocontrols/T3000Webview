/**
 * DuplicateProjectDialog — Fluent Dialog to name a copy before duplicating.
 * The chosen name is applied to the new project after duplication.
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
import { CopyRegular } from '@fluentui/react-icons';

export const DuplicateProjectDialog: React.FC<{
  projectName: string;
  open: boolean;
  onClose: () => void;
  onDuplicate: (name: string) => void;
}> = ({ projectName, open, onClose, onDuplicate }) => {
  const [name, setName] = useState(`Copy of ${projectName}`);

  useEffect(() => {
    if (open) setName(`Copy of ${projectName}`);
  }, [open, projectName]);

  const trimmed = name.trim();

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
              <CopyRegular style={{ fontSize: 16, color: '#0078d4' }} />
              Duplicate drawing
            </span>
          </DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: '#4a5a6c', lineHeight: 1.5, marginTop: 8 }}>
              Create a copy of this drawing. You can give the copy a new name before it is created.
            </div>
            <Field
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>New name</span>}
              hint={
                <span style={{ fontSize: 11, color: '#7a8699' }}>
                  The copy is a separate drawing — future edits won't affect the original.
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
              disabled={trimmed.length === 0}
              onClick={() => onDuplicate(trimmed)}
              style={{ fontWeight: 400, fontSize: 13 }}
            >
              Duplicate
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
