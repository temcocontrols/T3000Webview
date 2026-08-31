/**
 * Design Hub — Recent & History
 * Recently opened projects + activity timeline.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@fluentui/react-components';
import { HistoryRegular, ClockRegular } from '@fluentui/react-icons';
import { useDesignHubStore } from '../store/designHubStore';
import { HubIcon } from '../icons';
import type { ActivityItem, ActivityKind } from '../types';
import styles from '../pages/DesignHubPage.module.css';

const KIND_ICON: Record<ActivityKind, { icon: string; color: string }> = {
  created: { icon: 'DocumentAdd', color: '#498205' },
  edited: { icon: 'Edit', color: '#0078d4' },
  opened: { icon: 'Open', color: '#038387' },
  deployed: { icon: 'ArrowSync', color: '#ca5010' },
  imported: { icon: 'ArrowUpload', color: '#8764b8' },
  shared: { icon: 'People', color: '#006f6f' },
};

function timeAgo(iso: string): string {
  try {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
}

const ActivityRow: React.FC<{ item: ActivityItem }> = ({ item }) => {
  const meta = KIND_ICON[item.kind] ?? KIND_ICON.opened;
  return (
    <div className={styles.activityItem}>
      <span className={styles.activityIcon} style={{ background: meta.color }}>
        <HubIcon icon={meta.icon} size={15} />
      </span>
      <span className={styles.activityBody}>
        <div className={styles.activityLabel}>{item.label}</div>
        {item.detail && <div className={styles.activityDetail}>{item.detail}</div>}
      </span>
      <span className={styles.activityTime}>{timeAgo(item.timestamp)}</span>
    </div>
  );
};

export const ActivityPanel: React.FC = () => {
  const navigate = useNavigate();
  const activity = useDesignHubStore((s) => s.activity);
  const recentProjects = useDesignHubStore((s) => s.recentProjects);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <HubIcon icon="History" size={18} />
          Recent & History
        </div>
        <span className={styles.sectionHint}>{activity.length} events</span>
      </div>

      {recentProjects.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {recentProjects.slice(0, 4).map((p) => (
            <button
              key={p.id}
              className={styles.tab}
              onClick={() => {
                window.location.hash = `#${p.openPath}`;
              }}
            >
              <ClockRegular style={{ fontSize: 12, marginRight: 4 }} />
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className={styles.activityList}>
        {activity.length === 0 ? (
          <div className={styles.activityEmpty}>
            <HistoryRegular style={{ fontSize: 26, marginBottom: 6 }} />
            <div>No activity yet — create or open a drawing to get started.</div>
          </div>
        ) : (
          activity.slice(0, 12).map((item) => <ActivityRow key={item.id} item={item} />)
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <Button
          size="small"
          appearance="transparent"
          onClick={() => navigate('/t3000/develop/logs')}
        >
          View system logs →
        </Button>
      </div>
    </div>
  );
};
