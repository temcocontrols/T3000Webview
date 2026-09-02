/**
 * BindDeviceDialog — bind a drawing to a device (building/floor/room).
 * Phase 5: device integration.
 */
import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Field,
} from '@fluentui/react-components';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import type { HubProject } from '../types';

export const BindDeviceDialog: React.FC<{
  open: boolean;
  project: HubProject | null;
  onClose: () => void;
  onBind: (binding: { serialNumber?: number; building?: string; floor?: string; room?: string }) => void;
}> = ({ open, project, onClose, onBind }) => {
  const devices = useDeviceTreeStore((s) => s.devices);
  const selectedDevice = useDeviceTreeStore((s) => s.selectedDevice);

  const deviceOptions = useMemo(() => {
    const seen = new Set<number>();
    return devices.filter((d) => {
      if (!d.serialNumber || seen.has(d.serialNumber)) return false;
      seen.add(d.serialNumber);
      return true;
    });
  }, [devices]);

  const [serialNumber, setSerialNumber] = useState<number | undefined>(
    project?.serialNumber ?? selectedDevice?.serialNumber
  );
  const [building, setBuilding] = useState(project?.building ?? selectedDevice?.buildingName ?? '');
  const [floor, setFloor] = useState(project?.floor ?? '');
  const [room, setRoom] = useState(project?.room ?? '');

  // Reset form when a different project opens
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);
  if (open && project && project.id !== lastProjectId) {
    setLastProjectId(project.id);
    setSerialNumber(project.serialNumber ?? selectedDevice?.serialNumber);
    setBuilding(project.building ?? selectedDevice?.buildingName ?? '');
    setFloor(project.floor ?? '');
    setRoom(project.room ?? '');
  }

  const save = () => {
    onBind({
      serialNumber: serialNumber || undefined,
      building: building.trim() || undefined,
      floor: floor.trim() || undefined,
      room: room.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Bind to Device — {project?.name ?? ''}</DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Device">
                <select
                  value={serialNumber ? String(serialNumber) : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSerialNumber(v ? Number(v) : undefined);
                  }}
                  style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #d1d1d1', fontSize: 13 }}
                >
                  <option value="">— None —</option>
                  {deviceOptions.map((d) => (
                    <option key={d.serialNumber} value={d.serialNumber}>
                      {d.nameShowOnTree || `Device ${d.serialNumber}`} (SN {d.serialNumber})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Building">
                <Input value={building} onChange={(_, d) => setBuilding(d.value)} placeholder="e.g. Building B1" />
              </Field>
              <Field label="Floor">
                <Input value={floor} onChange={(_, d) => setFloor(d.value)} placeholder="e.g. Floor 2" />
              </Field>
              <Field label="Room / Zone">
                <Input value={room} onChange={(_, d) => setRoom(d.value)} placeholder="e.g. Lobby" />
              </Field>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>Cancel</Button>
            <Button appearance="primary" onClick={save}>Bind</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
