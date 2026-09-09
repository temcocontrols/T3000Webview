/**
 * ConfirmPopover — small inline Popover confirmation (auto-tagging style).
 * Used for lightweight destructive confirmations (e.g. snapshot restore/delete).
 */
import React from 'react';
import { Popover, PopoverSurface, PopoverTrigger, Button } from '@fluentui/react-components';

export const ConfirmPopover: React.FC<{
  trigger: React.ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ trigger, title, message, confirmLabel = 'Confirm', open, onOpenChange, onConfirm }) => (
  <Popover open={open} onOpenChange={(_, d) => onOpenChange(d.open)} positioning="above-start">
    <PopoverTrigger disableButtonEnhancement>{trigger}</PopoverTrigger>
    <PopoverSurface style={{ maxWidth: 340, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 16 }}>{message}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button size="small" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button size="small" appearance="primary" style={{ background: '#d32f2f' }} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </PopoverSurface>
  </Popover>
);
