/**
 * ProjectDetailPage — full detail view for a drawing.
 * Large preview, metadata, stats, folder, snapshots, compare, and actions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Menu, MenuItem, MenuList, MenuTrigger, Spinner } from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  OpenRegular,
  EditRegular,
  CopyRegular,
  DeleteRegular,
  ArrowSyncRegular,
  ShareRegular,
  LinkSquareRegular,
  ClockRegular,
  CameraRegular,
  ArrowResetRegular,
  DataHistogramRegular,
  MoreHorizontalRegular,
} from '@fluentui/react-icons';
import type { HubProject, RevisionSnapshot } from '../types';
import { getDrawingType } from '../drawingTypes';
import { designHubService } from '../services/designHubService';
import { useDesignHubStore } from '../store/designHubStore';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import { DrawingPreview } from '../components/DrawingPreview';
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

  const renderHero = () => {
    if (isHvac) {
      return (
        <div style={{ height: 420, background: '#ffffff', borderRadius: 14, border: '1px solid #e6eaf0', overflow: 'hidden', position: 'relative' }}>
          <DrawingPreview project={project} />
        </div>
      );
    }
    return (
      <div
        style={{
          height: 420,
          borderRadius: 14,
          border: '1px solid #e6eaf0',
          overflow: 'hidden',
          position: 'relative',
          background: `linear-gradient(135deg, ${type.accent}, ${type.accent}88)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          gap: 12,
          padding: 20,
        }}
      >
        <HubIcon icon={type.icon} size={64} />
        <div style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }}>{project.name}</div>
        {isEez && project.lvglVersion && (
          <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
            LVGL {project.lvglVersion}
          </span>
        )}
        {project.engine === 'simulator' && (
          <div style={{ fontSize: 12, opacity: 0.85 }}>Design &amp; simulate thermostat LCD screens</div>
        )}
      </div>
    );
  };

  const renderStats = () => {
    if (isHvac && stats) {
      const tiles: [string, string][] = [
        ['Shapes', String(stats.shapeCount)],
        ['Layers', String(stats.layers)],
        ['Bound points', String(stats.boundPoints)],
        ['Complexity', stats.complexity],
        ['Size', `${stats.width} × ${stats.height}`],
      ];
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          {tiles.map(([k, v]) => (
            <div key={k} style={{ background: '#f7fafd', border: '1px solid #edf1f7', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#8b97a8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#143a5c' }}>{v}</div>
            </div>
          ))}
        </div>
      );
    }
    if (isEez) {
      const tiles: [string, string][] = [
        ['Pages', project.pages != null ? String(project.pages) : '—'],
        ['LVGL version', project.lvglVersion || '—'],
        ['File size', project.fileSize != null ? formatBytes(project.fileSize) : '—'],
        ['Updated', timeAgo(project.updatedAt)],
      ];
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          {tiles.map(([k, v]) => (
            <div key={k} style={{ background: '#f7fafd', border: '1px solid #edf1f7', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#8b97a8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#143a5c' }}>{v}</div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const aboutRows: [string, React.ReactNode][] = [['Type', type.name]];
  if (isEez) {
    if (project.lvglVersion) aboutRows.push(['LVGL version', project.lvglVersion]);
    if (project.pages != null) aboutRows.push(['Pages', String(project.pages)]);
    if (project.folder) aboutRows.push(['Storage', `project/${project.folder}`]);
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

  return (
    <div style={{ padding: '20px 28px 48px', width: '100%', maxWidth: 1600, margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Button size="small" icon={<ArrowLeftRegular />} onClick={() => navigate('/t3000/design')}>
          Design Hub
        </Button>
        <span style={{ color: '#8b97a8', fontSize: 13 }}>/</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <HubIcon icon={type.icon} size={18} />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1c2b3a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: type.accent }}>{type.name}</span>
        </div>
        <span style={{ flex: 1 }} />
        <Button appearance="primary" icon={<OpenRegular />} onClick={() => (window.location.hash = `#${project.openPath}`)}>
          {project.engine === 'simulator' ? 'Open Simulator' : project.engine === 'eez' ? 'Open in Editor' : 'Open'}
        </Button>
        {type.deviceAware && <Button icon={<LinkSquareRegular />} onClick={() => setBindOpen(true)}>Bind</Button>}
        {type.deviceAware && (
          <Button icon={<ArrowSyncRegular />} onClick={handleDeploy} disabled={busy}>
            {busy ? '…' : 'Deploy'}
          </Button>
        )}
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button size="small" appearance="subtle" icon={<MoreHorizontalRegular />} aria-label="More actions" />
          </MenuTrigger>
          <MenuList>
            <MenuItem icon={<EditRegular />} onClick={handleRename}>Rename</MenuItem>
            <MenuItem icon={<CopyRegular />} onClick={handleDuplicate}>Duplicate</MenuItem>
            <MenuItem icon={<ShareRegular />} onClick={handleShare}>{project.status === 'synced' ? 'Unshare' : 'Share'}</MenuItem>
            <MenuItem icon={<DeleteRegular />} onClick={handleDelete}>Delete</MenuItem>
          </MenuList>
        </Menu>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 24, alignItems: 'start' }}>
        {/* LEFT — preview hero + stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderHero()}
          {renderStats()}
        </div>

        {/* RIGHT — About + History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.section}>
            <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>About</div>
            {aboutRows.map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid #f0f3f8', fontSize: 13 }}>
                <span style={{ color: '#7a8699' }}>{k}</span>
                <span style={{ color: '#1c2b3a', fontWeight: 600, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 13, alignItems: 'center' }}>
              <span style={{ color: '#7a8699' }}>Folder</span>
              <select
                value={folderId ?? ''}
                onChange={(e) => setProjectFolder(project.id, e.target.value || null)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d1d1', fontSize: 12 }}
              >
                <option value="">— None —</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle} style={{ marginBottom: 8 }}>
              <ClockRegular style={{ fontSize: 15 }} /> History
            </div>
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
      </div>

      {/* Snapshots — full width (hidden for simulator) */}
      {project.engine !== 'simulator' && (
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
