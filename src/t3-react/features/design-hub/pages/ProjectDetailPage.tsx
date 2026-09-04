/**
 * ProjectDetailPage — full detail view for a drawing.
 * Large preview, metadata, stats, folder, snapshots, compare, and actions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Spinner,
  Tooltip,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
} from '@fluentui/react-components';
import {
  OpenRegular,
  EditRegular,
  CopyRegular,
  DeleteRegular,
  ShareRegular,
  CameraRegular,
  ArrowResetRegular,
  DataHistogramRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  WarningRegular,
  MoreHorizontalRegular,
  RocketRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import type { DeployLogEntry, HubProject, RevisionSnapshot } from '../types';
import { getDrawingType } from '../drawingTypes';
import { designHubService } from '../services/designHubService';
import { useDesignHubStore } from '../store/designHubStore';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import { CompareDrawings } from '../components/CompareDrawings';
import { DeployDeviceDrawer } from '../components/DeployDeviceDrawer';
import { DeleteProjectPopover } from '../components/DeleteProjectPopover';
import { ConfirmPopover } from '../components/ConfirmPopover';
import { RenameProjectDialog } from '../components/RenameProjectDialog';
import { DuplicateProjectDialog } from '../components/DuplicateProjectDialog';
import { HubIcon } from '../icons';
import styles from './DesignHubPage.module.css';

/**
 * Hero background — same family as the dashboard hero, but lighter.
 */
const HERO_GRADIENT = 'linear-gradient(120deg, #2a67a6 0%, #2e6fae 50%, #3277b4 100%)';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  try {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch {
    return '';
  }
}

function formatBytes(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Single expandable deploy-log entry (status dot, time, device, message, detail). */
const DeployLogRow: React.FC<{
  log: DeployLogEntry;
  open: boolean;
  onToggle: () => void;
  wrap?: boolean;
}> = ({ log, open, onToggle, wrap = false }) => {
  const hasDetail =
    (log.screens && log.screens.length > 0) ||
    (log.images && log.images.length > 0) ||
    (log.steps && log.steps.length > 0);
  return (
    <div style={{ borderRadius: 8, marginBottom: 6, background: '#fff' }}>
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer', userSelect: 'none' }}
      >
        {log.status === 'success' ? (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2e9b4f', flexShrink: 0 }} />
        ) : log.status === 'error' ? (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d13438', flexShrink: 0 }} />
        ) : (
          <WarningRegular style={{ fontSize: 13, color: '#b8860b', flexShrink: 0 }} />
        )}
        <span style={{ fontSize: 12, color: '#1c2b3a', fontWeight: 600, flexShrink: 0 }}>{timeAgo(log.timestamp)}</span>
        <span
          style={{
            fontSize: 12,
            color: '#4a5a6c',
            flex: 1,
            minWidth: 0,
            ...(wrap
              ? { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.5 }
              : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
          }}
        >
          {log.deviceName ? `${log.deviceName} (SN ${log.serialNumber})` : log.serialNumber ? `SN ${log.serialNumber}` : ''}
          {' — '}
          {log.message}
        </span>
        {hasDetail &&
          (open ? (
            <ChevronDownRegular style={{ fontSize: 12, flexShrink: 0 }} />
          ) : (
            <ChevronRightRegular style={{ fontSize: 12, flexShrink: 0 }} />
          ))}
      </div>
      {open && hasDetail && (
        <div style={{ borderTop: '1px solid #eef1f6', padding: '8px 12px', background: '#f8fafc', fontSize: 12, color: '#4a5a6c', lineHeight: 1.6 }}>
          {log.steps && log.steps.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 600, color: '#1c2b3a', marginBottom: 4 }}>Steps</div>
              {log.steps.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ color: s.status === 'error' ? '#d13438' : s.status === 'skipped' ? '#b8860b' : '#2e9b4f' }}>
                    {s.status === 'error' ? '✖' : s.status === 'skipped' ? '—' : '✔'}
                  </span>
                  <span>{s.label}</span>
                  {s.detail && <span style={{ color: '#7a8699' }}>· {s.detail}</span>}
                </div>
              ))}
            </div>
          )}
          {log.screens && log.screens.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: '#1c2b3a' }}>Screens ({log.screens.length}): </span>
              {log.screens.join(', ')}
            </div>
          )}
          {log.images && log.images.length > 0 && (
            <div>
              <span style={{ fontWeight: 600, color: '#1c2b3a' }}>Images ({log.images.length}): </span>
              {log.images.map((img) => `${img.name} (${img.width}×${img.height})`).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projects = useDesignHubStore((s) => s.projects);
  const deployProject = useDesignHubStore((s) => s.deployProject);
  const shareProject = useDesignHubStore((s) => s.shareProject);
  const duplicateProject = useDesignHubStore((s) => s.duplicateProject);
  const deleteProject = useDesignHubStore((s) => s.deleteProjects);
  const renameProject = useDesignHubStore((s) => s.renameProject);
  const bindProject = useDesignHubStore((s) => s.bindProject);
  const folders = useDesignHubStore((s) => s.folders);
  const saveSnapshot = useDesignHubStore((s) => s.saveSnapshot);
  const restoreSnapshot = useDesignHubStore((s) => s.restoreSnapshot);
  const deleteSnapshot = useDesignHubStore((s) => s.deleteSnapshot);
  const setMessage = useStatusBarStore((s) => s.setMessage);
  const loadHub = useDesignHubStore((s) => s.load);

  const project = useMemo(
    () => projects.find((p) => p.id === id),
    [projects, id]
  );

  const [deployOpen, setDeployOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deployLogOpen, setDeployLogOpen] = useState(false);
  const [deployLogs, setDeployLogs] = useState<DeployLogEntry[]>([]);
  const [expandedLog, setExpandedLog] = useState<number | null>(0);
  const [snapshots, setSnapshots] = useState<RevisionSnapshot[]>([]);
  const [compareSnap, setCompareSnap] = useState<RevisionSnapshot | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [deleteSnapTarget, setDeleteSnapTarget] = useState<string | null>(null);

  const reloadDeployLogs = () => {
    if (id) {
      const logs = designHubService.listDeployLogs(id);
      setDeployLogs(logs);
      setExpandedLog(logs.length > 0 ? 0 : null); // first row expanded, rest collapsed
    }
  };

  useEffect(() => {
    reloadDeployLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Direct URL refresh / deep-link: DesignHubPage's load() never ran, so the store
  // is empty — kick off a load so the project (and activity/folders) resolve.
  useEffect(() => {
    if (projects.length === 0) {
      loadHub();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load snapshots whenever the project id changes
  useEffect(() => {
    if (id) setSnapshots(designHubService.listSnapshots(id));
  }, [id]);

  const stats = useMemo(
    () => (project ? designHubService.computeProjectStats(project) : null),
    [project]
  );
  const folderId = project ? designHubService.getProjectFolder(project.id) : null;
  const currentRaw = project ? designHubService.getHvacDrawingsRaw()[project.id] : null;

  const reloadSnapshots = () => {
    if (id) setSnapshots(designHubService.listSnapshots(id));
  };

  const handleCapture = () => {
    if (project) {
      saveSnapshot(project.id);
      reloadSnapshots();
      setMessage('Snapshot captured', 'success');
    }
  };

  const handleRestoreConfirm = (snapId: string) => {
    setRestoreTarget(null);
    if (project) {
      restoreSnapshot(project.id, snapId);
      setMessage('Snapshot restored', 'success');
    }
  };

  useEffect(() => {
    if (id && !project && projects.length > 0) {
      // not found — go back
      navigate('/t3000/design');
    }
  }, [id, project, projects.length, navigate]);

  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px' }}>
        <Spinner size="tiny" />
        <span style={{ fontSize: 14, color: '#616161' }}>Loading project…</span>
      </div>
    );
  }

  const type = getDrawingType(project.typeId);
  const locationBits = [project.building, project.floor, project.room].filter(Boolean);

  const isHvac = project.engine === 'hvac';
  const isEez = project.engine === 'eez';

  const getInfoCells = (): [string, string][] => {
    const cells: [string, string][] = [['Type', type.name]];
    if (isHvac && stats) {
      cells.push(['Shapes', String(stats.shapeCount)]);
      cells.push(['Layers', String(stats.layers)]);
      cells.push(['Bound points', String(stats.boundPoints)]);
      cells.push(['Size', `${stats.width} × ${stats.height}`]);
    } else if (isEez) {
      cells.push(['Pages', project.pages != null ? String(project.pages) : '—']);
      cells.push(['LVGL version', project.lvglVersion || '—']);
      cells.push(['File size', project.fileSize != null ? formatBytes(project.fileSize) : '—']);
    }
    cells.push(['Updated', timeAgo(project.updatedAt)]);
    cells.push(['Created', formatDate(project.createdAt)]);
    cells.push(['Status', project.status]);
    return cells;
  };

  const aboutRows: [string, React.ReactNode][] = [['Type', type.name]];
  if (isEez) {
    if (project.lvglVersion) aboutRows.push(['LVGL version', project.lvglVersion]);
    if (project.pages != null) aboutRows.push(['Pages', String(project.pages)]);
    if (project.folder) {
      aboutRows.push(['Storage', `project/${project.folder}`]);
      aboutRows.push(['Path', `project/${project.folder}/${project.folder}.eez-project`]);
    }
    if (project.fileSize != null) aboutRows.push(['File size', formatBytes(project.fileSize)]);
  }
  if (project.serialNumber) {
    aboutRows.push(['Device', `SN ${project.serialNumber}`]);
  }
  if (locationBits.length) aboutRows.push(['Location', locationBits.join(' · ')]);
  aboutRows.push(['Created', formatDate(project.createdAt)]);
  aboutRows.push(['Updated', formatDate(project.updatedAt)]);
  aboutRows.push(['Status', project.status]);

  const fullAboutRows: [string, React.ReactNode][] = [
    ['ID', project.id],
    ...aboutRows,
    ['Folder', folders.find((f) => f.id === folderId)?.name || '—'],
  ];
  const lastDeployError =
    deployLogs.length > 0 &&
    (deployLogs[0].status === 'error' || deployLogs[0].status === 'warning');

  const handleRenameSave = (name: string) => {
    setRenameOpen(false);
    renameProject(project.id, name);
    setMessage(`Renamed to "${name}"`, 'success');
  };

  const handleDuplicateConfirm = (name: string) => {
    setDuplicateOpen(false);
    const copy = duplicateProject(project.id);
    if (copy) {
      renameProject(copy.id, name);
      setMessage(`Duplicated as "${name}"`, 'success');
      navigate(`/t3000/design/projects/${copy.id}`);
    }
  };

  const handleDeleteConfirm = (id: string) => {
    setDeleteOpen(false);
    deleteProject([id]);
    navigate('/t3000/design');
  };

  // Deploy via the dialog: bind to the chosen device, then sync/deploy.
  const handleDeploy = async (binding: {
    serialNumber?: number;
    building?: string;
    floor?: string;
    room?: string;
    deviceName?: string;
  }): Promise<{ success: boolean; message: string }> => {
    if (binding.serialNumber) {
      bindProject(project.id, binding);
    }
    const target = binding.serialNumber ?? project.serialNumber;
    const result = await deployProject({ ...project, serialNumber: target }, { deviceName: binding.deviceName });
    setMessage(result.message, result.success ? 'success' : 'error');
    reloadDeployLogs();
    return result;
  };

  const handleShare = () => {
    const next = project.status !== 'synced';
    shareProject(project.id, next);
    setMessage(next ? `Shared "${project.name}"` : `Unshared "${project.name}"`, 'success');
  };

  // Action row — each button has a short caption directly below it.
  const actions: {
    label: string;
    caption: string;
    icon: React.ReactElement;
    onClick: () => void;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
  }[] = [
      {
        label: project.engine === 'simulator' ? 'Open Simulator' : project.engine === 'eez' ? 'Open in Editor' : 'Open',
        caption: 'Open this project in its editor',
        icon: <OpenRegular />,
        onClick: () => (window.location.hash = `#${project.openPath}`),
        primary: true,
      },
    ];
  actions.push(
    { label: 'Rename', caption: 'Rename this project', icon: <EditRegular />, onClick: () => setRenameOpen(true) },
    { label: 'Duplicate', caption: 'Create a copy', icon: <CopyRegular />, onClick: () => setDuplicateOpen(true) },
    {
      label: project.status === 'synced' ? 'Unshare' : 'Share',
      caption: project.status === 'synced' ? 'Stop sharing' : 'Share this project',
      icon: <ShareRegular />,
      onClick: handleShare,
    },
  );

  return (
    <div className={styles.detailScroll} style={{ padding: '10px 10px 20px', width: '100%', maxWidth: 1600, margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Top nav — simple link */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span
          onClick={() => navigate('/t3000/design')}
          style={{ cursor: 'pointer', color: '#0078d4', fontSize: 13, userSelect: 'none' }}
        >
          ← Design Hub
        </span>
        <span style={{ color: '#8b97a8', fontSize: 13 }}>/</span>
        <span style={{ fontSize: 14, color: '#1c2b3a', fontWeight: 700 }}>{project.name}</span>
      </div>

      {/* Top hero — saturated blue per type, white text */}
      <div
        className={styles.section}
        style={{
          marginBottom: 16,
          background: HERO_GRADIENT,
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Soft white highlight in the corner */}
        {/* <div
          style={{
            position: 'absolute',
            top: -70,
            right: -50,
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        /> */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <HubIcon icon={type.icon} size={36} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{project.name}</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {isEez && project.lvglVersion
                ? `LVGL ${project.lvglVersion} · EEZ Studio project`
                : isEez
                  ? 'EEZ Studio project'
                  : project.engine === 'simulator'
                    ? 'Thermostat LCD simulator'
                    : `${type.name} drawing`}
            </div>
          </div>
        </div>
        {/* Info cells + More detail on the same row, packed left, no dividers */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '10px 26px', marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: 12 }}>
          {getInfoCells().map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
          <span
            onClick={() => setDetailOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: 600, userSelect: 'none', marginBottom: 1 }}
          >
            More detail <MoreHorizontalRegular style={{ fontSize: 16 }} />
          </span>
        </div>
      </div>

      {/* Actions — under the hero, history icon right-aligned */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {actions.map((a) => (
          <Tooltip key={a.label} content={a.caption} relationship="label" positioning="above">
            <Button
              size="small"
              appearance="transparent"
              icon={a.icon}
              disabled={a.disabled}
              onClick={a.onClick}
              style={{ color: a.danger ? '#d13438' : '#0078d4', fontWeight: 600, gap: 6, fontSize: 12 }}
            >
              {a.label}
            </Button>
          </Tooltip>
        ))}
        <DeleteProjectPopover
          project={project}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleDeleteConfirm}
          trigger={
            <Button
              size="small"
              appearance="transparent"
              icon={<DeleteRegular />}
              style={{ color: '#d13438', fontWeight: 600, gap: 6, fontSize: 12 }}
            >
              Delete
            </Button>
          }
        />
      </div>

      {/* Deployment — device state + deploy log (device-aware types only) */}
      {type.deviceAware && (
        <div className={styles.section} style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ width: 4, height: 16, borderRadius: 2, background: '#0078d4', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1c2b3a' }}>Deployment</span>
            <span style={{ marginLeft: 'auto' }}>
              {project.status === 'deployed' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#25632d', background: '#e9f4ea', borderRadius: 999, padding: '3px 10px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2e9b4f' }} /> Deployed
                </span>
              ) : project.serialNumber ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0f5fa8', background: '#e8f2fb', borderRadius: 999, padding: '3px 10px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0078d4' }} /> Bound
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#6b7f94', background: '#eef1f6', borderRadius: 999, padding: '3px 10px' }}>
                  Not deployed
                </span>
              )}
            </span>
          </div>

          {/* Device / state summary */}
          {project.serialNumber ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, marginBottom: 14 }}>
              <div style={{ color: '#1c2b3a', fontWeight: 600 }}>
                {deployLogs[0]?.deviceName ? `${deployLogs[0].deviceName} (SN ${project.serialNumber})` : `Device SN ${project.serialNumber}`}
              </div>
              <div style={{ color: '#7a8699' }}>
                {locationBits.length ? locationBits.join(' · ') : 'Location not set'}
              </div>
              <div style={{ color: lastDeployError ? '#c50f1f' : '#7a8699' }}>
                Last deployed: {deployLogs.length > 0 ? `${timeAgo(deployLogs[0].timestamp)} · ${deployLogs[0].screenCount != null ? `${deployLogs[0].screenCount} items` : deployLogs[0].message}` : '—'}
              </div>
            </div>
          ) : (
            <div style={{ color: '#8b97a8', fontSize: 13, marginBottom: 14 }}>
              Not deployed to any device yet. Pick a device to deploy this project.
            </div>
          )}

          <Button size="medium" appearance="primary" icon={<RocketRegular style={{ fontSize: 10 }} />} onClick={() => setDeployOpen(true)} style={{ fontWeight: 500, fontSize: 12 }}>
            Deploy to device
          </Button>

          {/* Deploy log — first 5, first row expanded, rest collapsed */}
          <div style={{ marginTop: 16, borderTop: '1px solid #eef1f6', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2b3a' }}>Deploy Log</span>
              {deployLogs.length > 5 && (
                <span style={{ marginLeft: 'auto' }}>
                  <Tooltip content="View all deploy logs" relationship="label" positioning="above">
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<MoreHorizontalRegular style={{ fontSize: 15 }} />}
                      onClick={() => setDeployLogOpen(true)}
                    />
                  </Tooltip>
                </span>
              )}
            </div>
            {deployLogs.length === 0 ? (
              <div style={{ color: '#8b97a8', fontSize: 12, padding: '4px 0' }}>No deployments yet for this project.</div>
            ) : (
              deployLogs.slice(0, 5).map((log, idx) => (
                <DeployLogRow
                  key={log.id}
                  log={log}
                  open={expandedLog === idx}
                  onToggle={() => setExpandedLog(expandedLog === idx ? null : idx)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Snapshots — only for HVAC (localStorage drawings can be snapshotted) */}
      {isHvac && (
        <div className={styles.section} style={{ marginTop: 24 }}>
          <div className={styles.sectionTitle} style={{ marginBottom: 10 }}>
            <CameraRegular style={{ fontSize: 15 }} /> Snapshots ({snapshots.length})
          </div>
          <Button size="small" icon={<CameraRegular />} onClick={handleCapture} style={{ marginBottom: 10 }}>
            Capture snapshot
          </Button>
          {snapshots.length === 0 ? (
            <div style={{ color: '#8b97a8', fontSize: 12, padding: '8px 0' }}>No snapshots yet. Capture one before major edits.</div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {snapshots.map((s) => (
                <div key={s.id} style={{ border: '1px solid #e9edf3', borderRadius: 10, padding: '10px 12px', minWidth: 200, background: '#fff' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1c2b3a' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#a5afbf', marginBottom: 8 }}>{formatDate(s.timestamp)}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button size="small" appearance="subtle" icon={<DataHistogramRegular />} title="Compare with current" onClick={() => setCompareSnap(s)} />
                    <ConfirmPopover
                      title="Restore snapshot?"
                      message="Current drawing will be overwritten with this snapshot. This cannot be undone."
                      confirmLabel="Restore"
                      open={restoreTarget === s.id}
                      onOpenChange={(open) => setRestoreTarget(open ? s.id : null)}
                      onConfirm={() => handleRestoreConfirm(s.id)}
                      trigger={<Button size="small" appearance="subtle" icon={<ArrowResetRegular />} title="Restore" />}
                    />
                    <ConfirmPopover
                      title="Delete snapshot?"
                      message={`Delete snapshot "${s.name}"? This cannot be undone.`}
                      confirmLabel="Delete"
                      open={deleteSnapTarget === s.id}
                      onOpenChange={(open) => setDeleteSnapTarget(open ? s.id : null)}
                      onConfirm={() => {
                        setDeleteSnapTarget(null);
                        deleteSnapshot(project.id, s.id);
                        reloadSnapshots();
                        setMessage('Snapshot deleted', 'success');
                      }}
                      trigger={<Button size="small" appearance="subtle" icon={<DeleteRegular />} title="Delete" />}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compare */}
      {compareSnap && (
        <div className={styles.section} style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className={styles.sectionTitle}>
              <DataHistogramRegular style={{ fontSize: 16 }} /> Compare
            </div>
            <Button size="small" onClick={() => setCompareSnap(null)}>Close</Button>
          </div>
          <CompareDrawings a={currentRaw} b={compareSnap.drawing} nameA="Current" nameB={compareSnap.name} />
        </div>
      )}

      {/* Full detail drawer */}
      <Drawer position="end" size="small" open={detailOpen} onOpenChange={(_, d) => !d.open && setDetailOpen(false)}>
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button appearance="subtle" aria-label="Close" icon={<DismissRegular />} onClick={() => setDetailOpen(false)} />
            }
          >
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '20px' }}>{project.name} — Details</span>
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {fullAboutRows.map(([k, v]) => (
              <div
                key={String(k)}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid #f0f3f8', fontSize: 13 }}
              >
                <span style={{ color: '#7a8699', flexShrink: 0 }}>{k}</span>
                <span style={{ color: '#1c2b3a', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
              </div>
            ))}
          </div>
        </DrawerBody>
      </Drawer>

      {/* Full deploy log drawer */}
      <Drawer position="end" size="small" open={deployLogOpen} onOpenChange={(_, d) => !d.open && setDeployLogOpen(false)}>
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button appearance="subtle" aria-label="Close" icon={<DismissRegular />} onClick={() => setDeployLogOpen(false)} />
            }
          >
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '20px' }}>Deploy Log — {project.name}</span>
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody className={styles.deployLogDrawerBody}>
          {deployLogs.length === 0 ? (
            <div style={{ color: '#8b97a8', fontSize: 13, padding: '8px 0' }}>No deployments yet for this project.</div>
          ) : (
            deployLogs.map((log, idx) => (
              <DeployLogRow
                key={log.id}
                log={log}
                open={expandedLog === idx}
                wrap
                onToggle={() => setExpandedLog(expandedLog === idx ? null : idx)}
              />
            ))
          )}
        </DrawerBody>
      </Drawer>

      <DeployDeviceDrawer
        open={deployOpen}
        project={project}
        onClose={() => setDeployOpen(false)}
        onDeploy={handleDeploy}
        onDeployed={() => reloadDeployLogs()}
      />

      <RenameProjectDialog
        projectName={project.name}
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        onSave={handleRenameSave}
      />
      <DuplicateProjectDialog
        projectName={project.name}
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        onDuplicate={handleDuplicateConfirm}
      />
    </div>
  );
};

export default ProjectDetailPage;
