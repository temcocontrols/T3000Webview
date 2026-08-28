/**
 * LvglCreateDialog — Two-mode "New LVGL project" dialog.
 *
 * For LVGL 9.5 / LVGL + Flow 9.5 the user picks one of two ways to get a project:
 *
 *   • "Create New"        → collect Name / Location / Create directory / Project file
 *                           path (mirroring the EEZ New Project wizard), then open the
 *                           EEZ wizard pre-configured with those values by navigating to
 *                           `/t3000/eez?new=<wizardType>&name=…&location=…&createDirectory=…`.
 *
 *   • "Load from Device"  → import the device's current screens straight into an
 *                           .eez-project using the exact same pipeline as the EEZ home
 *                           "Load from Device" (DeviceRestClient + firmwareToProject +
 *                           /api/eez-studio/* file bridge). Live step progress + a
 *                           collapsible detail log are shown inside the dialog; the
 *                           project is auto-bound to the source device and registered in
 *                           EEZ Recent Projects, then the dialog hops over to the editor.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Checkbox,
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
import {
  ArrowDownloadRegular,
  ArrowUploadRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import type { DrawingType } from '../types';
import { designHubService } from '../services/designHubService';
import { HubIcon } from '../icons';
import { resolveImportLog } from 'project-editor/build/device-import';
import styles from '../pages/DesignHubPage.module.css';

interface ImportDevice {
  serialNumber: number;
  panelId: number;
  name: string;
  ip: string;
  building: string;
  detail: string;
  online: boolean;
}

/**
 * Fetch the device list from the Rust API — same source as the EEZ import flow.
 * Also captures the panel id + IP so we can talk to the device over direct REST.
 */
async function fetchImportDevices(): Promise<ImportDevice[]> {
  try {
    const host = window.location.hostname || 'localhost';
    const resp = await fetch(`http://${host}:9103/api/t3_device/devices`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const raw: any[] = json.devices || [];
    return raw
      .map((d: any) => ({
        serialNumber: d.serialNumber ?? d.SerialNumber ?? d.panel_serial_number ?? 0,
        panelId: d.panelId ?? d.PanelId ?? d.panel_id ?? d.serialNumber ?? 0,
        name: d.nameShowOnTree ?? d.showLabelName ?? d.panel_name ?? 'Device',
        ip:
          d.ipAddress ??
          d.IP_Address ??
          d.pcIpAddress ??
          d.PC_IP_Address ??
          d.panel_ipaddress ??
          '',
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

type LvglMode = 'create' | 'import';

export const LvglCreateDialog: React.FC<{
  type: DrawingType;
  onClose: () => void;
}> = ({ type, onClose }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LvglMode>('create');

  // ── Create New tab state ────────────────────────────────────────────
  const [name, setName] = useState('');
  const [location, setLocation] = useState('project');
  const [createDirectory, setCreateDirectory] = useState(true);

  // ── Load from Device tab state ──────────────────────────────────────
  const [devices, setDevices] = useState<ImportDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceSerial, setDeviceSerial] = useState<number | ''>('');
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Reset fields whenever the type changes
  useEffect(() => {
    setName(type.name);
    setLocation('project');
    setCreateDirectory(true);
    setDeviceSerial('');
    setLog([]);
    setMode('create');
  }, [type]);

  // Load devices only when the import tab is opened; pre-select the device
  // currently selected in the dashboard device bar (persisted in localStorage).
  useEffect(() => {
    if (mode !== 'import') return;
    setLoadingDevices(true);
    fetchImportDevices()
      .then((list) => {
        setDevices(list);
        const lastRaw = localStorage.getItem('t3.lastSelectedDevice');
        const last = lastRaw ? Number(lastRaw) : NaN;
        if (Number.isFinite(last) && list.some((d) => d.serialNumber === last)) {
          setDeviceSerial(last);
        }
      })
      .finally(() => setLoadingDevices(false));
  }, [mode]);

  // Keep the detail log scrolled to the newest line
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [log]);

  // ── Computed create-new path (mirrors EEZ wizard projectFilePath) ──
  const projectFolderPath = useMemo(() => {
    const loc = location.trim();
    const nm = name.trim();
    if (!loc || !nm) return '';
    const trimmed = loc.endsWith('/') || loc.endsWith('\\') ? loc.slice(0, -1) : loc;
    return createDirectory ? `${trimmed}/${nm}` : trimmed;
  }, [location, name, createDirectory]);

  const projectFilePath = useMemo(() => {
    if (!projectFolderPath || !name.trim()) return '';
    return `${projectFolderPath}/${name.trim()}.eez-project`;
  }, [projectFolderPath, name]);

  // ── Create New → open the EEZ New Project wizard pre-configured ────
  const handleCreate = () => {
    if (!name.trim() || !location.trim()) return;
    const params = new URLSearchParams();
    if (type.wizardType) params.set('new', type.wizardType);
    params.set('name', name.trim());
    params.set('location', location.trim());
    params.set('createDirectory', createDirectory ? 'true' : 'false');

    designHubService.recordActivity('created', `Started "${name.trim()}"`, {
      detail: `${type.name} · ${projectFilePath || location.trim()}`,
      typeId: type.id,
    });

    const target = `/t3000/eez?${params.toString()}`;
    // Close the dialog FIRST, then navigate on the next tick so the popup
    // can't survive the redirect.
    onClose();
    window.setTimeout(() => {
      try {
        navigate(target);
      } catch (err) {
        console.error('[LvglCreateDialog] navigate failed:', err, target);
      }
    }, 0);
  };

  // ── Load from Device → import (same pipeline as EEZ home) ──────────
  const runImport = async () => {
    if (deviceSerial === '' || importing) return;
    const device = devices.find((d) => d.serialNumber === deviceSerial);
    if (!device) return;

    setImporting(true);
    setLog([]);

    const push = (msg: string) => setLog((prev) => [...prev, msg]);

    try {
      const { DeviceRestClient } = await import('project-editor/build/device-rest-client');
      const { importProjectFromDevice } = await import('project-editor/build/device-import');
      const client = new DeviceRestClient();
      const result = await importProjectFromDevice({
        client,
        device: {
          name: device.name,
          ip: device.ip,
          serialNumber: device.serialNumber,
          panelId: device.panelId,
        },
        onLog: push,
      });
      const projectPath = result.projectPath;

      // Track imported path (badge display on the design hub)
      try {
        const paths: string[] = JSON.parse(localStorage.getItem('importedProjectPaths') || '[]');
        if (!paths.includes(projectPath)) {
          paths.push(projectPath);
          localStorage.setItem('importedProjectPaths', JSON.stringify(paths));
        }
      } catch {}

      // Step 6 — register in EEZ Recent Projects (MRU) so it shows up
      push('=> Step 6 — Registering in Recent Projects...');
      try {
        const mruItem = {
          filePath: projectPath,
          projectType: 'LVGL',
          hasFlowSupport: type.id === 'lvgl-flow-9-5',
        };
        const existing: any[] = JSON.parse(localStorage.getItem('eez-mru') || '[]');
        if (!existing.some((m) => m.filePath === projectPath)) {
          existing.unshift(mruItem);
        }
        localStorage.setItem('eez-mru', JSON.stringify(existing));
        // Keep the in-memory EEZ settings store in sync if it is already loaded
        try {
          const { settingsController } = await import('home/settings');
          if (!settingsController.mru.some((m: any) => m.filePath === projectPath)) {
            settingsController.mru.unshift(mruItem as any);
          }
        } catch {
          /* in-memory store not loaded — localStorage is enough */
        }
      } catch (err) {
        console.error('[LvglCreateDialog] MRU update failed:', err);
      }
      push('✔ Step 6 — Registered in Recent Projects');

      push('✔ Project imported');
      push(`  → ${projectPath}`);

      // Close the dialog, then hop over to the EEZ editor and open the
      // imported project directly (the ?open= hand-off opens it in a tab).
      onClose();
      window.setTimeout(() => {
        try {
          navigate(`/t3000/eez?open=${encodeURIComponent(projectPath)}`);
        } catch (err) {
          console.error('[LvglCreateDialog] navigate failed:', err);
        }
      }, 900);
    } catch (err: any) {
      const msg = err?.message || String(err);
      push(`X Failed: ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  const selectedDevice = devices.find((d) => d.serialNumber === deviceSerial);

  // Resolve the flat marker log into a per-step summary + detail lines.
  const resolved = useMemo(() => resolveImportLog(log), [log]);

  // Same list rules as the device picker: online devices grouped by building,
  // offline devices in a trailing group.
  const onlineByBuilding = new Map<string, ImportDevice[]>();
  for (const d of devices) {
    if (!d.online) continue;
    if (!onlineByBuilding.has(d.building)) onlineByBuilding.set(d.building, []);
    onlineByBuilding.get(d.building)!.push(d);
  }
  const onlineBuildings = [...onlineByBuilding.keys()].sort((a, b) => a.localeCompare(b));
  const offlineDevices = devices.filter((d) => !d.online);

  const canCreate = !!name.trim() && !!location.trim();
  const canImport = deviceSerial !== '' && !importing;

  return (
    <Dialog
      open
      onOpenChange={(_, d) => {
        if (!d.open) onClose();
      }}
    >
      <DialogSurface style={{ maxWidth: 620, width: 580 }}>
        <DialogBody>
          <DialogTitle>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
              <span style={{ display: 'flex', color: '#48627a' }}>
                <HubIcon icon={type.icon} size={18} />
              </span>
              New {type.name}
            </span>
          </DialogTitle>
          <DialogContent className={styles.dialogScroll} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={styles.dialogInfoBar}>
              <InfoRegular style={{ fontSize: 14, flexShrink: 0 }} />
              <span>{type.description}</span>
            </div>

            {/* Mode switcher */}
            <div className={styles.lvglTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'create'}
                className={mode === 'create' ? styles.lvglTabActive : styles.lvglTab}
                onClick={() => setMode('create')}
              >
                <ArrowUploadRegular style={{ fontSize: 14 }} />
                Create New
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'import'}
                className={mode === 'import' ? styles.lvglTabActive : styles.lvglTab}
                onClick={() => setMode('import')}
              >
                <ArrowDownloadRegular style={{ fontSize: 14 }} />
                Load from Device
              </button>
            </div>

            {mode === 'create' && (
              <>
                <Field
                  label={<span style={{ fontSize: 12, fontWeight: 600 }}>Name</span>}
                  required
                >
                  <Input
                    size="medium"
                    value={name}
                    onChange={(_, d) => setName(d.value)}
                    placeholder={type.name}
                    style={{ fontSize: 13 }}
                  />
                </Field>

                <Field
                  label={<span style={{ fontSize: 12, fontWeight: 600 }}>Location</span>}
                  required
                  hint={<span style={{ fontSize: 11 }}>Folder inside the project data root</span>}
                >
                  <Input
                    size="medium"
                    value={location}
                    onChange={(_, d) => setLocation(d.value)}
                    placeholder="project"
                    style={{ fontSize: 13 }}
                  />
                </Field>

                <div className={styles.createDirRow}>
                  <Checkbox
                    size="medium"
                    checked={createDirectory}
                    onChange={(_, d) => setCreateDirectory(!!d.checked)}
                    label={<span style={{ fontSize: 12.5 }}>Create directory</span>}
                  />
                  <span className={styles.createDirHint}>
                    Wrap the project in a folder named after it
                  </span>
                </div>

                <Field label={<span style={{ fontSize: 12, fontWeight: 600 }}>Project file path</span>}>
                  <div className={styles.pathPreview}>
                    {projectFilePath || <span style={{ color: '#a5afbf' }}>—</span>}
                  </div>
                </Field>
              </>
            )}

            {mode === 'import' && (
              <>
                <Field
                  label={<span style={{ fontSize: 12, fontWeight: 600 }}>Device / Panel</span>}
                  required
                >
                  {loadingDevices ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7f94', fontSize: 12 }}>
                      <Spinner size="tiny" /> Loading devices…
                    </div>
                  ) : (
                    <select
                      className={styles.dialogSelect}
                      value={deviceSerial}
                      disabled={importing}
                      onChange={(e) => setDeviceSerial(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">
                        {devices.length === 0
                          ? 'No devices found — is the backend running?'
                          : 'Select a device…'}
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

                {/* Info bar — separate from the log panel */}
                <div className={styles.importInfo}>
                  <InfoRegular style={{ fontSize: 14, flexShrink: 0 }} />
                  <span>
                    Pulls the device&apos;s current screens into an <b>.eez-project</b> file, then
                    opens the EEZ editor. The project is auto-bound to this device so you can
                    deploy changes back later.
                  </span>
                </div>

                {log.length > 0 && (
                  <div className={styles.importPanel}>
                    {/* Header lines logged before the first step */}
                    {resolved.header.length > 0 && (
                      <div className={styles.panelHeaderLines}>
                        {resolved.header.map((h, i) => (
                          <div key={i} className={styles.stepDetailLine}>{h}</div>
                        ))}
                      </div>
                    )}

                    {/* Steps — each with its detail lines nested below */}
                    <div className={styles.importSteps}>
                      {resolved.steps.map((s, i) => (
                        <div key={i} className={styles.stepItem}>
                          <div className={`${styles.stepRow} ${styles[`stepRow_${s.status}`]}`}>
                            <span className={styles.stepIcon}>
                              {s.status === 'done' ? (
                                <CheckmarkCircleRegular style={{ color: '#2c7a3c', fontSize: 15, flexShrink: 0 }} />
                              ) : s.status === 'active' ? (
                                <Spinner size="extra-tiny" />
                              ) : (
                                <DismissCircleRegular style={{ color: '#c0392b', fontSize: 15, flexShrink: 0 }} />
                              )}
                            </span>
                            <span className={styles.stepText}>{s.text}</span>
                          </div>
                          {s.details.length > 0 && (
                            <div className={styles.stepDetails}>
                              {s.details.map((d, j) => (
                                <div key={j} className={styles.stepDetailLine}>{d}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div ref={logEndRef} />
                  </div>
                )}

                {selectedDevice && (
                  <div style={{ fontSize: 12, color: '#4a5a6c', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <HubIcon icon="CheckmarkCircle" size={14} />
                    Bound to {selectedDevice.name} (SN: {selectedDevice.serialNumber})
                  </div>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              size="medium"
              appearance="secondary"
              onClick={onClose}
              style={{ fontWeight: 400, fontSize: 13 }}
            >
              Cancel
            </Button>
            {mode === 'create' ? (
              <Button
                size="medium"
                appearance="primary"
                disabled={!canCreate}
                onClick={handleCreate}
                style={{ fontWeight: 400, fontSize: 13 }}
              >
                Create &amp; Open
              </Button>
            ) : (
              <Button
                size="medium"
                appearance="primary"
                disabled={!canImport}
                onClick={runImport}
                style={{ fontWeight: 400, fontSize: 13 }}
              >
                {importing ? (
                  <>
                    <Spinner size="tiny" /> Importing…
                  </>
                ) : (
                  'Import from Device'
                )}
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default LvglCreateDialog;
