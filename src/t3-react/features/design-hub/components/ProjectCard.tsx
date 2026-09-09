/**
 * Design Hub — Project Card
 * Real preview thumbnail, favorite pin, selection, and quick actions.
 */
import React, { useMemo } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import {
  OpenRegular,
  ArrowUploadRegular,
  MoreHorizontalRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';
import type { HubProject } from '../types';
import { getDrawingType } from '../drawingTypes';
import { HubIcon } from '../icons';
import { DrawingPreview } from './DrawingPreview';
import { DeleteProjectPopover } from './DeleteProjectPopover';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { designHubService } from '../services/designHubService';
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
  /** Bound projects open the Deploy drawer from the card action button. */
  onDeploy?: (project: HubProject) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (projectId: string) => void;
  deleteOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirmDelete?: (projectId: string) => void;
}> = ({
  project,
  onBind,
  onDeploy,
  selectMode = false,
  selected = false,
  onToggleSelect,
  deleteOpen = false,
  onOpenChange,
  onConfirmDelete,
}) => {
  const type = getDrawingType(project.typeId);
  const accent = type.accent;
  const deviceStatuses = useDeviceTreeStore((s) => s.deviceStatuses);
  const devices = useDeviceTreeStore((s) => s.devices);

  // Bound/deploy context for the card's dynamic tooltip (device name + last deploy).
  const boundDeviceName = useMemo(() => {
    if (!project.serialNumber) return undefined;
    return devices.find((d) => d.serialNumber === project.serialNumber)?.nameShowOnTree;
  }, [devices, project.serialNumber]);
  const lastDeploy = useMemo(() => {
    if (!project.serialNumber) return undefined;
    const logs = designHubService.listDeployLogs(project.id);
    return logs && logs.length > 0 ? logs[0] : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.serialNumber, project.updatedAt]);

  const hasPreview = project.source === 'hvac';

  // Device status as a small pill (Local / SN xxxx / Deployed).
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

  // One device-action button whose meaning follows the project state:
  //   - unbound           → open the Bind dialog
  //   - bound / deployed  → open the Deploy drawer (deploy / change device)
  const handleDeviceAction = () => {
    if (!project.serialNumber) {
      onBind(project);
      return;
    }
    onDeploy?.(project);
  };

  const locationBits = [project.building, project.floor, project.room].filter(Boolean);

  // Rich, live tooltip once the project is bound to a device.
  const deviceTooltip = !project.serialNumber ? (
    'Bind to device'
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 280, fontSize: 12 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: devStatusColor, flexShrink: 0 }} />
        <span>{project.status === 'deployed' ? 'Deployed' : 'Bound'}</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>{boundDeviceName || `SN ${project.serialNumber}`}</span>
      </span>
      <span style={{ opacity: 0.85 }}>SN {project.serialNumber}</span>
      {locationBits.length > 0 && <span style={{ opacity: 0.85 }}>{locationBits.join(' · ')}</span>}
      <span style={{ opacity: lastDeploy && lastDeploy.status === 'error' ? 0.95 : 0.75 }}>
        {lastDeploy
          ? `Last ${lastDeploy.status === 'error' ? 'deploy failed' : 'deploy'}: ${timeAgo(lastDeploy.timestamp)} · ${
              lastDeploy.screenCount != null ? `${lastDeploy.screenCount} items` : lastDeploy.message
            }`
          : 'Not deployed yet'}
      </span>
      <span style={{ opacity: 0.6, marginTop: 2 }}>
        Click to {project.status === 'deployed' ? 'deploy again / change device' : 'deploy'}
      </span>
    </div>
  );

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
      <div
        className={styles.projectThumb}
        style={
          hasPreview
            ? { background: '#ffffff' }
            : { background: `color-mix(in srgb, ${accent} 12%, #ffffff)` }
        }
      >
        {hasPreview ? (
          <div className={styles.projectThumbMedia}>
            <DrawingPreview project={project} />
          </div>
        ) : (
          <span className={styles.projectThumbIconSm} style={{ color: accent }}>
            <HubIcon icon={type.icon} size={16} />
          </span>
        )}

        <span className={styles.projectThumbType}>{type.name}</span>

        <span style={{ flex: 1 }} />

        <span className={`${styles.projectStatus} ${statusClass}`}>{statusLabel}</span>

        {selectMode && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 20,
              height: 20,
              borderRadius: 5,
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
            {selected && <CheckmarkRegular style={{ fontSize: 12 }} />}
          </span>
        )}
      </div>

      <div className={styles.projectBody}>
        <div className={styles.projectName}>{project.name}</div>

        {/* Single meta line — status · SN · location · updated */}
        <div className={styles.projectMetaLine}>
          {project.serialNumber ? (
            <>
              <span className={styles.projectStatusDot} style={{ background: devStatusColor }} />
              <span>{devStatus === 'online' ? 'Online' : devStatus === 'offline' ? 'Offline' : 'Unknown'}</span>
              <span className={styles.projectMetaDot} />
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
          <span className={styles.projectMetaDot} />
          <span>{timeAgo(project.updatedAt)}</span>
        </div>

        {/* Actions — Open · Deploy · More (always visible, right aligned) */}
        <div className={styles.projectActions} onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Open in editor" relationship="label">
            <Button size="small" appearance="subtle" icon={<OpenRegular />} onClick={open} />
          </Tooltip>
          {type.deviceAware && (
            <Tooltip content={deviceTooltip} relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowUploadRegular />}
                onClick={handleDeviceAction}
              />
            </Tooltip>
          )}
          <Tooltip content="More (details & manage)" relationship="label">
            <Button size="small" appearance="subtle" icon={<MoreHorizontalRegular />} onClick={openDetail} />
          </Tooltip>
          <DeleteProjectPopover
            project={project}
            open={deleteOpen}
            onOpenChange={onOpenChange ?? (() => {})}
            onConfirm={onConfirmDelete ?? (() => {})}
          />
        </div>
      </div>
    </div>
  );
};
