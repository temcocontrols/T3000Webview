/**
 * ProjectDetailPage — full detail view for a drawing.
 * Large preview, metadata, stats, folder, snapshots, compare, and actions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner, Tooltip } from '@fluentui/react-components';
import {
  OpenRegular,
  EditRegular,
  CopyRegular,
  DeleteRegular,
  ArrowSyncRegular,
  ShareRegular,
  LinkSquareRegular,
  CameraRegular,
  ArrowResetRegular,
  DataHistogramRegular,
} from '@fluentui/react-icons';
import type { HubProject, RevisionSnapshot } from '../types';
import { getDrawingType } from '../drawingTypes';
import { designHubService } from '../services/designHubService';
import { useDesignHubStore } from '../store/designHubStore';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import { CompareDrawings } from '../components/CompareDrawings';
import { BindDeviceDialog } from '../components/BindDeviceDialog';
import { HubIcon } from '../icons';
import styles from './DesignHubPage.module.css';

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

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projects = useDesignHubStore((s) => s.projects);
  const activity = useDesignHubStore((s) => s.activity);
  const deployProject = useDesignHubStore((s) => s.deployProject);
  const shareProject = useDesignHubStore((s) => s.shareProject);
  const duplicateProject = useDesignHubStore((s) => s.duplicateProject);
  const deleteProject = useDesignHubStore((s) => s.deleteProjects);
  const renameProject = useDesignHubStore((s) => s.renameProject);
  const bindProject = useDesignHubStore((s) => s.bindProject);
  const folders = useDesignHubStore((s) => s.folders);
  const setProjectFolder = useDesignHubStore((s) => s.setProjectFolder);
  const saveSnapshot = useDesignHubStore((s) => s.saveSnapshot);
  const restoreSnapshot = useDesignHubStore((s) => s.restoreSnapshot);
  const deleteSnapshot = useDesignHubStore((s) => s.deleteSnapshot);
  const setMessage = useStatusBarStore((s) => s.setMessage);

  const project = useMemo(
    () => projects.find((p) => p.id === id),
    [projects, id]
  );

  const [bindOpen, setBindOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snapshots, setSnapshots] = useState<RevisionSnapshot[]>([]);
  const [compareSnap, setCompareSnap] = useState<RevisionSnapshot | null>(null);

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

  const handleRestore = (snapId: string) => {
    if (project && window.confirm('Restore this snapshot? Current drawing will be overwritten.')) {
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
  const relatedActivity = activity.filter((a) => a.projectId === project.id).slice(0, 8);
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

  const handleRename = () => {
    const name = window.prompt('Rename drawing', project.name);
    if (name && name.trim()) renameProject(project.id, name.trim());
  };

  const handleDuplicate = () => {
    const copy = duplicateProject(project.id);
    if (copy) navigate(`/t3000/design/projects/${copy.id}`);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      deleteProject([project.id]);
      navigate('/t3000/design');
    }
  };

  const handleDeploy = async () => {
    if (!project.serialNumber) {
      setBindOpen(true);
      return;
    }
    setBusy(true);
    const result = await deployProject(project);
    setBusy(false);
    setMessage(result.message, result.success ? 'success' : 'error');
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
    icon: React.ReactNode;
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
  if (type.deviceAware) {
    actions.push({
      label: 'Bind',
      caption: 'Bind to a device',
      icon: <LinkSquareRegular />,
      onClick: () => setBindOpen(true),
    });
    actions.push({
      label: busy ? '…' : 'Deploy',
      caption: 'Deploy to the bound device',
      icon: <ArrowSyncRegular />,
      onClick: handleDeploy,
      disabled: busy,
    });
  }
  actions.push(
    { label: 'Rename', caption: 'Rename this project', icon: <EditRegular />, onClick: handleRename },
    { label: 'Duplicate', caption: 'Create a copy', icon: <CopyRegular />, onClick: handleDuplicate },
    {
      label: project.status === 'synced' ? 'Unshare' : 'Share',
      caption: project.status === 'synced' ? 'Stop sharing' : 'Share this project',
      icon: <ShareRegular />,
      onClick: handleShare,
    },
    { label: 'Delete', caption: 'Delete this project', icon: <DeleteRegular />, onClick: handleDelete, danger: true },
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
        <span style={{ fontSize: 17, color: '#1c2b3a', fontWeight: 700 }}>{project.name}</span>
      </div>

      {/* Top hero — blue gradient; title on top, key info at the bottom (white text) */}
      <div
        style={{
          borderRadius: 14,
          marginBottom: 16,
          color: '#fff',
          background: 'linear-gradient(120deg, #0b4f8a 0%, #0078d4 48%, #2e7db9 100%)',
          padding: '20px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
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
        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: 12 }}>
          {getInfoCells().map(([k, v], i) => (
            <div key={k} style={{ flex: '1 1 120px', minWidth: 120, padding: '2px 14px', borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.22)' }}>
              <div style={{ fontSize: 10, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions — title with primary vertical indicator, descriptions as tooltips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 4px 22px', borderBottom: '1px solid #e6eaf0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10 }}>
          <span style={{ width: 4, height: 12, borderRadius: 2, background: '#0078d4', flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1c2b3a' }}>Actions</span>
        </div>
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', alignItems: 'center', marginLeft: 10 }}>
          {actions.map((a) => (
            <Tooltip key={a.label} content={a.caption} relationship="label">
              <span
                onClick={a.disabled ? undefined : a.onClick}
                style={{
                  cursor: a.disabled ? 'default' : 'pointer',
                  opacity: a.disabled ? 0.5 : 1,
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: a.danger ? '#d13438' : '#0078d4',
                }}
              >
                {a.icon} {a.label}
              </span>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Detail + History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 20, alignItems: 'start', marginTop: 15 }}>
        <div className={styles.section}>
          <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>Detail</div>
          {aboutRows.map(([k, v]) => (
            <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid #f0f3f8', fontSize: 13 }}>
              <span style={{ color: '#7a8699' }}>{k}</span>
              <span style={{ color: '#1c2b3a', fontWeight: 600, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', fontSize: 13, alignItems: 'center' }}>
            <span style={{ color: '#7a8699' }}>Folder</span>
            <select value={folderId ?? ''} onChange={(e) => setProjectFolder(project.id, e.target.value || null)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d1d1', fontSize: 12 }}>
              <option value="">— None —</option>
              {folders.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
            </select>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle} style={{ marginBottom: 8 }}>History</div>
          {relatedActivity.length === 0 ? (
            <div style={{ color: '#8b97a8', fontSize: 12, padding: '8px 0' }}>No events recorded for this drawing yet.</div>
          ) : (
            relatedActivity.map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 0', fontSize: 12, borderBottom: '1px solid #f0f3f8' }}>
                <span style={{ color: '#1c2b3a' }}>{a.label}</span>
                <span style={{ color: '#a5afbf', flexShrink: 0 }}>{formatDate(a.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </div>

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
                    <Button size="small" appearance="subtle" icon={<ArrowResetRegular />} title="Restore" onClick={() => handleRestore(s.id)} />
                    <Button size="small" appearance="subtle" icon={<DeleteRegular />} title="Delete" onClick={() => { deleteSnapshot(project.id, s.id); reloadSnapshots(); }} />
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

      <BindDeviceDialog
        open={bindOpen}
        project={project}
        onClose={() => setBindOpen(false)}
        onBind={(binding) => bindProject(project.id, binding)}
      />
    </div>
  );
};

export default ProjectDetailPage;
