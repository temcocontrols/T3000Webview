/**
 * HubStats — compact dashboard overview strip.
 */
import React, { useMemo } from 'react';
import { useDesignHubStore } from '../store/designHubStore';
import { designHubService } from '../services/designHubService';
import { HubIcon } from '../icons';

export const HubStats: React.FC = () => {
  const projects = useDesignHubStore((s) => s.projects);
  const favorites = useDesignHubStore((s) => s.favorites);
  const activity = useDesignHubStore((s) => s.activity);

  const byEngine = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => map.set(p.engine, (map.get(p.engine) || 0) + 1));
    return [...map.entries()];
  }, [projects]);

  const snapshotCount = useMemo(() => {
    const raw = localStorage.getItem('t3-design-hub');
    try {
      const snapshots = raw ? JSON.parse(raw).snapshots : {};
      return Object.values(snapshots).reduce((n: number, arr: any) => n + (Array.isArray(arr) ? arr.length : 0), 0);
    } catch {
      return 0;
    }
  }, [projects]);

  const stats: { label: string; value: number | string; icon?: string }[] = [
    { label: 'Drawings', value: projects.length, icon: 'DocumentText' },
    { label: 'Favorites', value: favorites.length, icon: 'History' },
    { label: 'Snapshots', value: snapshotCount, icon: 'Clock' },
    { label: 'Events', value: activity.length, icon: 'DataHistogram' },
    { label: 'Bound', value: projects.filter((p) => p.serialNumber).length, icon: 'LinkSquare' },
    { label: 'Shared', value: projects.filter((p) => p.status === 'synced').length, icon: 'People' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: '#fff',
            border: '1px solid #e6eaf0',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: '#143a5c' }}>{s.value}</span>
          <span style={{ fontSize: 11, color: '#7a8699', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {s.label}
          </span>
        </div>
      ))}
      {byEngine.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e6eaf0', borderRadius: 12, padding: '12px 14px', gridColumn: 'span 2' }}>
          <div style={{ fontSize: 11, color: '#7a8699', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
            By engine
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {byEngine.map(([engine, count]) => (
              <span key={engine} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1c2b3a' }}>
                <HubIcon icon={engine === 'eez' ? 'DocumentText' : engine === 'simulator' ? 'DeveloperBoard' : 'Flow'} size={13} />
                {engine} · {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
