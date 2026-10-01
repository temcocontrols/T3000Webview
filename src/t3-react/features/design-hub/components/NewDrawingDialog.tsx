/**
 * NewDrawingDialog — Configure a new drawing before opening its editor.
 *
 * Each project type collects its required context first, then opens the editor:
 *  - HVAC             → device/panel + graphic slot (1-8)  → hvac-designer
 *  - LCD UI           → device                             → tstat10-simulator
 *  - LVGL / LVGL+Flow → device + name                      → EEZ New Project wizard
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Spinner,
} from '@fluentui/react-components';
import { InfoRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import type { DrawingType } from '../types';
import { designHubService } from '../services/designHubService';
import { HubIcon } from '../icons';
import { LvglCreateDialog } from './LvglCreateDialog';
import styles from '../pages/DesignHubPage.module.css';
import { designerPath } from '@t3-react/features/designer/kinds';
import { resolveHvacDocumentId } from '@t3-react/features/designer/documents/hvac/hvacDocumentId';

interface DialogDevice {
  serialNumber: number;
  name: string;
  detail: string;
  building: string;
  online: boolean;
}

/**
 * Fetch the device list from the Rust API — same source as the EEZ import flow.
 * Deliberately NOT via deviceTreeStore: that store pulls in the heavy
 * t3-hvac/transport stack and would break this module graph with a TDZ at boot.
 */
async function fetchDevices(): Promise<DialogDevice[]> {
  try {
    const host = window.location.hostname || 'localhost';
    const resp = await fetch(`http://${host}:9103/api/t3_device/devices`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const raw: any[] = json.devices || [];
    return raw
      .map((d: any) => ({
        serialNumber: d.serialNumber ?? d.SerialNumber ?? d.panel_serial_number ?? 0,
        name: d.nameShowOnTree ?? d.showLabelName ?? d.panel_name ?? 'Device',
        detail: [
          d.buildingName ?? d.Building_Name,
          d.floorName ?? d.Floor_Name,
          d.roomName ?? d.Room_Name,
        ]
          .filter(Boolean)
          .join(' · '),
        building:
          d.mainBuildingName ??
          d.MainBuilding_Name ??
          d.buildingName ??
          d.Building_Name ??
          'Unassigned',
        online: d.isOnline === true || d.isOnline === 1,
      }))
      .filter(
        (d: any) =>
          Number.isFinite(d.serialNumber) &&
          d.name &&
          d.name !== 'Unknown' &&
          d.name !== '(Unknown)'
      );
  } catch {
    return [];
  }
}

/**
 * The id the engine files a drawing under for a device + graphic slot — the same call the designer makes from
 * the route (`hvacDocumentId.ts`), so the dialog can tell which slots the device already has drawings on.
 */
function hvacSlotId(serial: number | '', slot: number): string | undefined {
  if (serial === '') return undefined;
  return resolveHvacDocumentId(
    undefined,
    new URLSearchParams({ device: String(serial), graphic: String(slot) })
  );
}

export const NewDrawingDialog: React.FC<{
  type: DrawingType | null;
  onClose: () => void;
}> = ({ type, onClose }) => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DialogDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceSerial, setDeviceSerial] = useState<number | ''>('');
  const [graphic, setGraphic] = useState(1);
  const [name, setName] = useState('');
  // Once the name is typed by hand, the suggestion stops following the device/slot.
  const [nameEdited, setNameEdited] = useState(false);

  // Reset fields whenever a different type is opened. LVGL types are handled by
  // LvglCreateDialog (below), so skip all of this state for them.
  useEffect(() => {
    if (type && type.createMode !== 'lvgl') {
      setDeviceSerial('');
      setGraphic(1);
      setNameEdited(false);
      // HVAC is left empty here — the suggestion below fills it from the device and the slot.
      setName(type.createMode === 'hvac' ? '' : type.name);
    }
  }, [type]);

  // Load the device list when the dialog opens; pre-select the device that is
  // currently selected in the dashboard device bar (persisted in localStorage).
  // LVGL types fetch their own (richer) device list inside LvglCreateDialog.
  useEffect(() => {
    if (type && type.createMode !== 'lvgl') {
      setLoadingDevices(true);
      fetchDevices()
        .then((list) => {
          setDevices(list);
          const lastRaw = localStorage.getItem('t3.lastSelectedDevice');
          const last = lastRaw ? Number(lastRaw) : NaN;
          if (Number.isFinite(last) && list.some((d) => d.serialNumber === last)) {
            setDeviceSerial(last);
          }
        })
        .finally(() => setLoadingDevices(false));
    }
  }, [type]);

  const selectedDevice = devices.find((d) => d.serialNumber === deviceSerial);

  /*
   * HVAC — the device + graphic slot *is* the drawing's identity.
   *
   * The engine files a drawing under `device-<serial>-graphic-<n>`, so handing out a slot that already has a
   * record would replace that drawing. The dialog marks the used slots, opens on the first free one, and
   * offers the existing drawing when a used slot is picked.
   */
  const usedSlots = useMemo(() => {
    const out: Record<number, { id: string; name: string }> = {};
    if (type?.createMode !== 'hvac' || deviceSerial === '') return out;
    const raw = designHubService.getHvacDrawingsRaw();
    for (let slot = 1; slot <= 8; slot++) {
      const id = hvacSlotId(deviceSerial, slot);
      const record = id ? raw[id] : undefined;
      if (id && record) out[slot] = { id, name: String(record.name || id) };
    }
    return out;
  }, [type, deviceSerial]);

  // Open on the first free slot of the selected device.
  useEffect(() => {
    if (type?.createMode !== 'hvac' || deviceSerial === '') return;
    const raw = designHubService.getHvacDrawingsRaw();
    for (let slot = 1; slot <= 8; slot++) {
      const id = hvacSlotId(deviceSerial, slot);
      if (!id || !raw[id]) {
        setGraphic(slot);
        return;
      }
    }
    setGraphic(1);
  }, [type, deviceSerial]);

  // The suggested name follows the device and the slot ("HVAC ESP11134 G2") until it is edited by hand.
  const suggestedName =
    type?.createMode === 'hvac' && deviceSerial !== ''
      ? `HVAC ${selectedDevice?.name ?? `SN ${deviceSerial}`} G${graphic}`
      : '';
  useEffect(() => {
    if (suggestedName && !nameEdited) setName(suggestedName);
  }, [suggestedName, nameEdited]);

  if (!type) return null;

  // LVGL 9.5 / LVGL + Flow 9.5 use a two-mode dialog (Create New / Load from Device).
  if (type.createMode === 'lvgl') {
    return <LvglCreateDialog type={type} onClose={onClose} />;
  }

  const handleCreate = () => {
    // What the drawing will be called: what was typed, else the suggestion.
    const drawingName = name.trim() || suggestedName;

    /* HVAC: the drawing is filed under the device + slot, so write its record now — the Hub lists the project
     * straight away and the designer opens it as an empty drawing (a record without a `document`). */
    if (type.createMode === 'hvac' && deviceSerial !== '') {
      const id = hvacSlotId(deviceSerial, graphic);
      if (id) {
        designHubService.createHvacDrawingRecord(id, {
          name: drawingName,
          serialNumber: Number(deviceSerial),
          replace: Boolean(usedSlots[graphic]),
        });
      }
    }

    const params = new URLSearchParams();
    if (deviceSerial !== '') params.set('device', String(deviceSerial));
    if (type.createMode === 'hvac') params.set('graphic', String(graphic));
    if (type.createMode === 'lvgl' && type.wizardType) params.set('new', type.wizardType);
    if (drawingName) params.set('name', drawingName);

    designHubService.recordActivity('created', `Started "${drawingName || type.name}"`, {
      detail: `${type.name}${deviceSerial !== '' ? ` · SN ${deviceSerial}` : ''}`,
      typeId: type.id,
    });

    const qs = params.toString();
    const target = `${type.openPath}${qs ? `?${qs}` : ''}`;

    // Close the dialog FIRST, then navigate on the next tick. Deferring the
    // navigation guarantees the dialog-close state update is committed before the
    // route change, so the popup can't survive the redirect.
    onClose();
    window.setTimeout(() => {
      try {
        navigate(target);
      } catch (err) {
        console.error('[NewDrawingDialog] navigate failed:', err, target);
      }
    }, 0);
  };

  /** Open the drawing that already occupies the selected slot instead of replacing it. */
  const openExisting = () => {
    const existing = usedSlots[graphic];
    if (!existing) return;
    const target = designerPath('hvac-schematic', existing.id);
    onClose();
    window.setTimeout(() => {
      try {
        navigate(target);
      } catch (err) {
        console.error('[NewDrawingDialog] navigate failed:', err, target);
      }
    }, 0);
  };

  // Same list rules as the device picker: online devices grouped by building,
  // offline/unknown devices in a trailing group.
  const onlineByBuilding = new Map<string, DialogDevice[]>();
  for (const d of devices) {
    if (!d.online) continue;
    if (!onlineByBuilding.has(d.building)) onlineByBuilding.set(d.building, []);
    onlineByBuilding.get(d.building)!.push(d);
  }
  const onlineBuildings = [...onlineByBuilding.keys()].sort((a, b) => a.localeCompare(b));
  const offlineDevices = devices.filter((d) => !d.online);

  return (
    <Dialog
      open={!!type}
      onOpenChange={(_, d) => {
        if (!d.open) onClose();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
              <span style={{ display: 'flex', color: '#48627a' }}>
                <HubIcon icon={type.icon} size={18} />
              </span>
              New {type.name}
            </span>
          </DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={styles.dialogInfoBar}>
              <InfoRegular style={{ fontSize: 14, flexShrink: 0 }} />
              <span>{type.description}</span>
            </div>

            <Field label={<span style={{ fontSize: 12, fontWeight: 600 }}>Device / Panel</span>} required>
              {loadingDevices ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7f94', fontSize: 12 }}>
                  <Spinner size="tiny" /> Loading devices…
                </div>
              ) : (
                <select
                  className={styles.dialogSelect}
                  value={deviceSerial}
                  onChange={(e) => setDeviceSerial(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">
                    {devices.length === 0 ? 'No devices found — is the backend running?' : 'Select a device…'}
                  </option>
                  {onlineBuildings.map((b) => (
                    <optgroup key={b} label={`${b} (${onlineByBuilding.get(b)!.length})`}>
                      {onlineByBuilding.get(b)!.map((d) => (
                        <option key={d.serialNumber} value={d.serialNumber}>
                          {d.name} (SN: {d.serialNumber})
                          {d.detail ? ` — ${d.detail}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {offlineDevices.length > 0 && (
                    <optgroup label={`Offline (${offlineDevices.length})`}>
                      {offlineDevices.map((d) => (
                        <option key={d.serialNumber} value={d.serialNumber}>
                          {d.name} (SN: {d.serialNumber})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </Field>

            {type.createMode === 'hvac' && (
              <>
                <Field
                  label={<span style={{ fontSize: 12, fontWeight: 600 }}>Graphic Slot</span>}
                  hint={<span style={{ fontSize: 11 }}>Each device/panel holds up to 8 graphics</span>}
                >
                  <select
                    className={styles.dialogSelect}
                    value={graphic}
                    onChange={(e) => setGraphic(Number(e.target.value))}
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Graphic {n}
                        {usedSlots[n] ? ' · in use' : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                {usedSlots[graphic] && (
                  <div className={styles.dialogWarn}>
                    <InfoRegular style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                      <span>
                        Graphic {graphic} on this device already holds{' '}
                        <strong>{usedSlots[graphic].name}</strong> — creating replaces that drawing.
                      </span>
                      <Button size="small" appearance="secondary" onClick={openExisting}>
                        Open existing
                      </Button>
                    </span>
                  </div>
                )}
              </>
            )}

            <Field
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>Name</span>}
              hint={
                type.createMode === 'hvac' ? (
                  <span style={{ fontSize: 11 }}>Suggested from the device and slot — edit if you like</span>
                ) : undefined
              }
            >
              <Input
                size="medium"
                value={name}
                onChange={(_, d) => {
                  setName(d.value);
                  // An emptied field takes the suggestion again.
                  setNameEdited(d.value.trim().length > 0);
                }}
                placeholder={type.name}
                style={{ fontSize: 13 }}
              />
            </Field>

            {type.createMode === 'lvgl' && (
              <Field label="LVGL Version">
                <div className={styles.dialogBadge}>LVGL 9.5.0 (embedded)</div>
              </Field>
            )}

            {selectedDevice && (
              <div style={{ fontSize: 12, color: '#4a5a6c', display: 'flex', gap: 8, alignItems: 'center' }}>
                <HubIcon icon="CheckmarkCircle" size={14} />
                Bound to {selectedDevice.name} (SN: {selectedDevice.serialNumber})
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button size="medium" appearance="secondary" onClick={onClose} style={{ fontWeight: 400, fontSize: 13 }}>
              Cancel
            </Button>
            <Button size="medium" appearance="primary" disabled={deviceSerial === ''} onClick={handleCreate} style={{ fontWeight: 400, fontSize: 13 }}>
              {type.createMode === 'hvac' && usedSlots[graphic] ? 'Replace & Open' : 'Create & Open'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default NewDrawingDialog;
