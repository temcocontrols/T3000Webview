/**
 * Design Hub — Project Card
 * Real preview thumbnail, favorite pin, selection, and quick actions.
 */
import React, { useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import {
  OpenRegular,
  ArrowSyncRegular,
  LinkSquareRegular,
  StarRegular,
  StarFilled,
  InfoRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';
import type { HubProject } from '../types';
import { getDrawingType } from '../drawingTypes';
import { HubIcon } from '../icons';
import { DrawingPreview } from './DrawingPreview';
import { useDesignHubStore } from '../store/designHubStore';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import styles from '../pages/DesignHubPage.module.css';

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

export const ProjectCard: React.FC<{
  project: HubProject;
  onBind: (project: HubProject) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (projectId: string) => void;
}> = ({ project, onBind, selectMode = false, selected = false, onToggleSelect }) => {
  const type = getDrawingType(project.typeId);
  const accent = type.accent;
  const deployProject = useDesignHubStore((s) => s.deployProject);
  const favorites = useDesignHubStore((s) => s.favorites);
  const toggleFavorite = useDesignHubStore((s) => s.toggleFavorite);
  const deviceStatuses = useDeviceTreeStore((s) => s.deviceStatuses);
  const setMessage = useStatusBarStore((s) => s.setMessage);
  const [busy, setBusy] = useState(false);

  const isFav = favorites.includes(project.id);
  const hasPreview = project.source === 'hvac';

  // Device-focused status badge — Deployed / SN xxxx / Local (synced retired).
  let statusLabel: string;
  let statusClass: string;
  if (project.status === 'deployed') {
    statusLabel = 'Deployed';
    statusClass = styles.statusDeployed;
  } else if (project.serialNumber) {
    statusLabel = `SN ${project.serialNumber}`;
    statusClass = styles.statusBound;
  } else {
    statusLabel = 'Local';
    statusClass = styles.statusLocal;
  }

  const devStatus: 'online' | 'offline' | 'unknown' = project.serialNumber
    ? deviceStatuses.get(project.serialNumber) ?? 'unknown'
    : 'unknown';
  const devStatusColor =
    devStatus === 'online' ? '#107c10' : devStatus === 'offline' ? '#d13438' : '#a19f9d';

  const openDetail = () => {
    window.location.hash = `#/t3000/design/projects/${project.id}`;
  };

  const open = () => {
    window.location.hash = `#${project.openPath}`;
  };

  const handleDeploy = async () => {
    if (!project.serialNumber) {
      onBind(project);
      return;
    }
    setBusy(true);
    setMessage(`Deploying "${project.name}"…`, 'info');
    const result = await deployProject(project);
    setBusy(false);
    setMessage(result.message, result.success ? 'success' : 'error');
  };

  const locationBits = [project.building, project.floor, project.room].filter(Boolean);

  const cardClick = () => {
    if (selectMode) {
      onToggleSelect?.(project.id);
    } else {
      openDetail();
    }
  };

  return (
    <div
      className={styles.projectCard}
      onClick={cardClick}
      style={selected ? { outline: '2px solid #0078d4' } : undefined}
    >
      {/* Accent strip — type identity */}
      <div className={styles.projectAccent} style={{ background: accent }} />

      <div
        className={styles.projectThumb}
        style={
          hasPreview
            ? { background: '#ffffff' }
            : { background: `linear-gradient(135deg, ${accent}, ${accent}99)` }
        }
      >
        {hasPreview ? (
          <DrawingPreview project={project} />
        ) : (
          <span className={styles.projectThumbIcon}>
            <HubIcon icon={type.icon} size={28} />
          </span>
        )}
        {!hasPreview && <span className={styles.projectThumbOverlay} />}

        {selectMode && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              width: 22,
              height: 22,
              borderRadius: 6,
              background: selected ? '#0078d4' : 'rgba(255,255,255,0.9)',
              border: selected ? '1px solid #0078d4' : '1px solid #c3cfe0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              zIndex: 2,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(project.id);
            }}
          >
            {selected && <CheckmarkRegular style={{ fontSize: 13 }} />}
          </span>
        )}

        <span className={`${styles.projectStatus} ${statusClass}`}>{statusLabel}</span>

        {/* Type pill — bottom-left of the thumbnail */}
        <span className={styles.projectTypePill}>{type.name}</span>
      </div>

      <div className={styles.projectBody}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div className={styles.projectName} style={{ flex: 1, minWidth: 0 }}>
            {project.name}
          </div>
          <button
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(project.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isFav ? '#f59e0b' : '#c3cfe0',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {isFav ? <StarFilled style={{ fontSize: 16 }} /> : <StarRegular style={{ fontSize: 16 }} />}
          </button>
        </div>

        {/* Device row — link icon + SN + location (or Unbound) */}
        <div className={styles.projectDevice}>
          {project.serialNumber ? (
            <>
              <LinkSquareRegular style={{ fontSize: 13, flexShrink: 0 }} />
              <span className={styles.projectDeviceSn}>SN {project.serialNumber}</span>
              {locationBits.length > 0 && (
                <>
                  <span className={styles.projectMetaDot} />
                  <span className={styles.projectDeviceLoc}>{locationBits.join(' · ')}</span>
                </>
              )}
            </>
          ) : (
            <span className={styles.projectUnbound}>Unbound</span>
          )}
        </div>

        {/* Footer — device status dot + updated time */}
        <div className={styles.projectFooter}>
          {project.serialNumber ? (
            <>
              <span className={styles.projectStatusDot} style={{ background: devStatusColor }} />
              <span>{devStatus === 'online' ? 'Online' : devStatus === 'offline' ? 'Offline' : 'Unknown'}</span>
              <span className={styles.projectMetaDot} />
            </>
          ) : null}
          <span>{timeAgo(project.updatedAt)}</span>
        </div>

        <div className={styles.projectActions} onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Details & manage" relationship="label">
            <Button size="small" icon={<InfoRegular />} onClick={openDetail} />
          </Tooltip>
          <Tooltip content="Open in editor" relationship="label">
            <Button size="small" icon={<OpenRegular />} onClick={open}>
              Open
            </Button>
          </Tooltip>
          {type.deviceAware && (
            <Tooltip content={project.serialNumber ? 'Deploy to device' : 'Bind to a device first'} relationship="label">
              <Button size="small" icon={<ArrowSyncRegular />} onClick={handleDeploy} disabled={busy}>
                {busy ? '…' : 'Deploy'}
              </Button>
            </Tooltip>
          )}
          {type.deviceAware && (
            <Tooltip content="Bind to device" relationship="label">
              <Button size="small" icon={<LinkSquareRegular />} onClick={() => onBind(project)} />
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};
