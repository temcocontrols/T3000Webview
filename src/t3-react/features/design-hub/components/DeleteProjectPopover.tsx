/**
 * DeleteProjectPopover — inline delete confirmation for a drawing.
 *
 * Mirrors the Auto-Tagging rule-delete pattern: a Popover anchored to the
 * trash button (positioning="above-start") with a red danger confirm.
 * Warns when the drawing is deployed to / linked with a device, since deleting
 * locally means it must be re-imported from the device to appear here again.
 */
import React from 'react';
import { Popover, PopoverSurface, PopoverTrigger, Button } from '@fluentui/react-components';
import { DeleteRegular, WarningRegular } from '@fluentui/react-icons';
import type { HubProject } from '../types';
import styles from '../pages/DesignHubPage.module.css';

export const DeleteProjectPopover: React.FC<{
  project: HubProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
  /** Custom trigger element (e.g. a labeled button). Defaults to a trash icon button. */
  trigger?: React.ReactNode;
}> = ({ project, open, onOpenChange, onConfirm, trigger }) => {
  const deviceRef = project.serialNumber ? `SN ${project.serialNumber}` : '';
  const warnDeployed =
    project.status === 'deployed'
      ? `This drawing is deployed to ${deviceRef}. Deleting it here will NOT remove it from the device — you'll need to re-import it from the device to restore it in this list.`
      : project.serialNumber
        ? `This drawing is linked to ${deviceRef}. Deleting it removes the local copy — you'll need to re-import it from the device to restore it.`
        : null;

  return (
    <Popover open={open} onOpenChange={(_, d) => onOpenChange(d.open)} positioning="above-start">
      <PopoverTrigger disableButtonEnhancement>
        {trigger ?? (
          <Button
            size="small"
            appearance="subtle"
            icon={<DeleteRegular style={{ fontSize: 17 }} />}
            className={styles.deleteAction}
            aria-label={`Delete drawing ${project.name}`}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </PopoverTrigger>
      <PopoverSurface style={{ maxWidth: 340, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Delete "{project.name}"?
        </div>
        {warnDeployed ? (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: '#8a5a00',
              background: '#fff4e2',
              border: '1px solid #ffd9a0',
              borderRadius: 6,
              padding: '7px 9px',
              marginBottom: 12,
              display: 'flex',
              gap: 6,
              alignItems: 'flex-start',
            }}
          >
            <WarningRegular style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} />
            <span>{warnDeployed}</span>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 16 }}>
            This action cannot be undone.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button size="small" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="small"
            appearance="primary"
            style={{ background: '#d32f2f' }}
            onClick={() => onConfirm(project.id)}
          >
            Delete
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
