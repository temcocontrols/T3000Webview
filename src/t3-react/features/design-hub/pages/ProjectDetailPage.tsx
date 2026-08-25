/**
 * ProjectDetailPage — full detail view for a drawing.
 * Large preview, metadata, stats, folder, snapshots, compare, and actions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  OpenRegular,
  EditRegular,
  CopyRegular,
  DeleteRegular,
  ArrowSyncRegular,
  ShareRegular,
  LinkSquareRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  CameraRegular,
  ArrowResetRegular,
  DataHistogramRegular,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spinner label="Loading project…" />
      </div>
    );
  }

  const type = getDrawingType(project.typeId);
  const relatedActivity = activity.filter((a) => a.projectId === project.id).slice(0, 8);
  const locationBits = [project.building, project.floor, project.room].filter(Boolean);

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
    <div style={{ padding: '24px 32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Button
          size="small"
          icon={<ArrowLeftRegular />}
          onClick={() => navigate('/t3000/design')}
        >
          Design Hub
        </Button>
        <span style={{ color: '#8b97a8', fontSize: 12 }}>/</span>
        <span style={{ color: '#1c2b3a', fontSize: 13, fontWeight: 600 }}>{project.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start' }}>
        {/* Preview */}
        <div>
          <div
            className={styles.projectThumb}
            style={{
              height: 420,
              background: project.source === 'hvac' ? '#ffffff' : `linear-gradient(135deg, ${type.accent}, ${type.accent}99)`,
              borderRadius: 14,
              border: '1px solid #e6eaf0',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {project.source === 'hvac' ? (
              <DrawingPreview project={project} />
            ) : (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <HubIcon icon={type.icon} size={72} />
              </span>
            )}
            <span className={`${styles.projectStatus} ${project.status === 'synced' ? styles.statusSynced : project.status === 'bound' ? styles.statusBound : styles.statusLocal}`} style={{ position: 'absolute', top: 12, right: 12 }}>
              <CheckmarkCircleRegular style={{ fontSize: 11 }} />
              {project.status}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <Button appearance="primary" icon={<OpenRegular />} onClick={() => (window.location.hash = `#${project.openPath}`)}>
              Open in Editor
            </Button>
            <Button icon={<EditRegular />} onClick={handleRename}>Rename</Button>
            <Button icon={<CopyRegular />} onClick={handleDuplicate}>Duplicate</Button>
            <Button icon={<DeleteRegular />} onClick={handleDelete}>Delete</Button>
            {type.deviceAware && (
              <Button icon={<LinkSquareRegular />} onClick={() => setBindOpen(true)}>Bind</Button>
            )}
            {type.deviceAware && (
              <Button icon={<ArrowSyncRegular />} onClick={handleDeploy} disabled={busy}>
                {busy ? '…' : 'Deploy'}
              </Button>
            )}
            <Button
              icon={<ShareRegular />}
              appearance={project.status === 'synced' ? 'primary' : 'secondary'}
              onClick={handleShare}
            >
              {project.status === 'synced' ? 'Shared' : 'Share'}
            </Button>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.section}>
            <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>Details</div>
            {[
              ['Name', project.name],
              ['Type', type.name],
              ['Status', project.status],
              ['Created', formatDate(project.createdAt)],
              ['Updated', formatDate(project.updatedAt)],
              ['Device', project.serialNumber ? `SN ${project.serialNumber}` : '—'],
              ['Location', locationBits.length ? locationBits.join(' · ') : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid #f0f3f8', fontSize: 13 }}>
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

          {stats && (
            <div className={styles.section}>
              <div className={styles.sectionTitle} style={{ marginBottom: 10 }}>Statistics</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Shapes', String(stats.shapeCount)],
                  ['Layers', String(stats.layers)],
                  ['Bound points', String(stats.boundPoints)],
                  ['Complexity', stats.complexity],
                  ['Size', `${stats.width} × ${stats.height}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#f7fafd', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#8b97a8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#143a5c' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Snapshots */}
          <div className={styles.section}>
            <div className={styles.sectionTitle} style={{ marginBottom: 8 }}>
              <CameraRegular style={{ fontSize: 15 }} /> Snapshots ({snapshots.length})
            </div>
            <Button size="small" icon={<CameraRegular />} onClick={handleCapture} style={{ marginBottom: 8 }}>
              Capture snapshot
            </Button>
            {snapshots.length === 0 ? (
              <div style={{ color: '#8b97a8', fontSize: 12, padding: '8px 0' }}>No snapshots yet. Capture one before major edits.</div>
            ) : (
              snapshots.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f0f3f8', fontSize: 12 }}>
                  <span style={{ flex: 1, color: '#1c2b3a' }}>{s.name}</span>
                  <span style={{ color: '#a5afbf', flexShrink: 0 }}>{formatDate(s.timestamp)}</span>
                  <Button size="small" appearance="subtle" icon={<DataHistogramRegular />} title="Compare with current" onClick={() => setCompareSnap(s)} />
                  <Button size="small" appearance="subtle" icon={<ArrowResetRegular />} title="Restore" onClick={() => handleRestore(s.id)} />
                  <Button size="small" appearance="subtle" icon={<DeleteRegular />} title="Delete" onClick={() => { deleteSnapshot(project.id, s.id); reloadSnapshots(); }} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
