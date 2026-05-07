/**
 * TrendlogVerifyDrawer
 *
 * Verification drawer: shows per-point record counts, last-seen times,
 * active/stalled status, expected-vs-actual gap analysis, and a sparkline
 * for the selected point. Opens from TrendlogsPage "Verify Data" button.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Drawer,
  DrawerBody,
  Button,
  Badge,
  Spinner,
  Text,
  Select,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  WarningRegular,
  ErrorCircleRegular,
  DataBarVerticalRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TrendlogVerifyDrawer.module.css';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface DeviceOption {
  serial: number;
  panel: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  serialNumber: number;
  panelId: number;
  devices?: DeviceOption[];    // list of available devices for selection
  trendlogId?: string;         // optional: when absent, queries all data for device/panel
  trendlogLabel?: string;
  intervalSeconds?: number; // sampling interval — used for expected-count math
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

interface RawRecord {
  point_id: string;
  point_type: string;
  timestamp: string;
  value: number;
  units?: string;
}

interface PointStat {
  pointId: string;
  pointType: string;
  units: string;
  totalRecords: number;
  last1hRecords: number;
  latestTime: string | null;
  earliestTime: string | null;
  values: { t: number; v: number }[]; // for sparkline
  status: 'active' | 'stalled' | 'nodata';
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diffMs = now - d.getTime();
  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function timeRangeMs(range: TimeRange): number {
  const map: Record<TimeRange, number> = {
    '1h': 3_600_000,
    '6h': 21_600_000,
    '24h': 86_400_000,
    '7d': 604_800_000,
  };
  return map[range];
}

function toIso(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function expectedCount(intervalSec: number | undefined, rangeMs: number): number {
  if (!intervalSec || intervalSec <= 0) return 0;
  return Math.floor(rangeMs / (intervalSec * 1000));
}

// Simple SVG sparkline for an array of { t, v } points
function Sparkline({ data, width = 200, height = 40 }: { data: { t: number; v: number }[]; width?: number; height?: number }) {
  if (data.length < 2) {
    return <span className={styles.sparklineEmpty}>no data</span>;
  }
  const minT = data[0].t;
  const maxT = data[data.length - 1].t;
  const values = data.map(d => d.v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const rangeV = maxV - minV || 1;
  const rangeT = maxT - minT || 1;
  const pad = 3;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pts = data
    .map(d => {
      const x = pad + ((d.t - minT) / rangeT) * w;
      const y = pad + (1 - (d.v - minV) / rangeV) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className={styles.sparklineSvg}>
      <polyline points={pts} fill="none" stroke="#0078d4" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export const TrendlogVerifyDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  serialNumber: initialSerial,
  panelId: initialPanel,
  devices,
  trendlogId,
  trendlogLabel,
  intervalSeconds,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawRecords, setRawRecords] = useState<RawRecord[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [activeSerial, setActiveSerial] = useState<number>(initialSerial);
  const [activePanel, setActivePanel] = useState<number>(initialPanel);

  // Sync if parent changes the default
  useEffect(() => { setActiveSerial(initialSerial); }, [initialSerial]);
  useEffect(() => { setActivePanel(initialPanel); }, [initialPanel]);

  const serialNumber = activeSerial;
  const panelId = activePanel;

  // ── Fetch history data ──────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!serialNumber) return;
    setLoading(true);
    setError(null);

    const now = new Date();
    const start = new Date(now.getTime() - timeRangeMs(timeRange));

    try {
      let records: RawRecord[];

      if (trendlogId) {
        // Specific trendlog: use per-trendlog history endpoint
        const body = {
          serial_number: serialNumber,
          panel_id: panelId,
          trendlog_id: trendlogId,
          start_time: toIso(start),
          end_time: toIso(now),
          limit: 100_000,
          point_types: ['INPUT', 'OUTPUT', 'VARIABLE', 'MONITOR'],
        };
        const res = await fetch(
          `${API_BASE_URL}/api/t3_device/devices/${serialNumber}/trendlogs/${trendlogId}/history`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        records = (json.data || []).map((r: any) => ({
          point_id: r.point_id || '',
          point_type: r.point_type || '',
          timestamp: r.timestamp || r.time || '',
          value: typeof r.value === 'number' ? r.value : parseFloat(r.value) || 0,
          units: r.units || '',
        }));
      } else {
        // No specific trendlog: use general query filtered by device/panel
        const fmt = (d: Date) => d.toISOString().slice(0, 19).replace('T', 'T');
        const res = await fetch(`${API_BASE_URL}/api/database/trendlog/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_date: fmt(start),
            end_date: fmt(now),
            serial_number: serialNumber,
            panel_id: panelId,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: any[] = await res.json();
        records = data.map((r) => ({
          point_id: String(r.point_id || ''),
          point_type: r.point_type || '',
          timestamp: r.logging_time_fmt || r.timestamp || '',
          value: typeof r.value === 'number' ? r.value : parseFloat(r.value) || 0,
          units: r.units || '',
        }));
      }

      setRawRecords(records);
      setFetchedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [serialNumber, panelId, trendlogId, timeRange]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  // ── Compute per-point stats ─────────────────────────────
  const stats = useMemo<PointStat[]>(() => {
    if (rawRecords.length === 0) return [];

    const now = Date.now();
    const oneHourAgo = now - 3_600_000;

    const map = new Map<string, PointStat>();
    for (const r of rawRecords) {
      const key = r.point_id;
      if (!map.has(key)) {
        map.set(key, {
          pointId: key,
          pointType: r.point_type,
          units: r.units || '',
          totalRecords: 0,
          last1hRecords: 0,
          latestTime: null,
          earliestTime: null,
          values: [],
          status: 'nodata',
        });
      }
      const s = map.get(key)!;
      s.totalRecords++;
      const t = new Date(r.timestamp).getTime();
      if (!isNaN(t)) {
        if (t >= oneHourAgo) s.last1hRecords++;
        if (!s.latestTime || r.timestamp > s.latestTime) s.latestTime = r.timestamp;
        if (!s.earliestTime || r.timestamp < s.earliestTime) s.earliestTime = r.timestamp;
        s.values.push({ t, v: r.value });
      }
    }

    // Sort values by time
    for (const s of map.values()) {
      s.values.sort((a, b) => a.t - b.t);
      const latestMs = s.latestTime ? new Date(s.latestTime).getTime() : 0;
      const ageMs = now - latestMs;
      if (s.last1hRecords > 0) {
        s.status = 'active';
      } else if (s.totalRecords > 0 && ageMs < 86_400_000 * 2) {
        s.status = 'stalled';
      } else {
        s.status = 'nodata';
      }
    }

    return Array.from(map.values()).sort((a, b) => a.pointId.localeCompare(b.pointId));
  }, [rawRecords]);

  // Auto-select first point
  useEffect(() => {
    if (stats.length > 0 && !selectedPointId) {
      setSelectedPointId(stats[0].pointId);
    }
  }, [stats, selectedPointId]);

  const selectedStat = stats.find(s => s.pointId === selectedPointId) ?? null;

  // ── Health summary ──────────────────────────────────────
  const healthSummary = useMemo(() => {
    const total = stats.reduce((sum, s) => sum + s.totalRecords, 0);
    const activeCount = stats.filter(s => s.status === 'active').length;
    const stalledCount = stats.filter(s => s.status === 'stalled').length;
    const nodataCount = stats.filter(s => s.status === 'nodata').length;
    const expected = expectedCount(intervalSeconds, timeRangeMs(timeRange));
    const perPointExpected = stats.length > 0 ? expected : 0;

    // Gap analysis for selected stat
    let largestGapMin = 0;
    if (selectedStat && selectedStat.values.length > 1) {
      for (let i = 1; i < selectedStat.values.length; i++) {
        const gap = (selectedStat.values[i].t - selectedStat.values[i - 1].t) / 60_000;
        if (gap > largestGapMin) largestGapMin = gap;
      }
    }

    return { total, activeCount, stalledCount, nodataCount, expected: perPointExpected, largestGapMin };
  }, [stats, intervalSeconds, timeRange, selectedStat]);

  const statusIcon = (status: PointStat['status']) => {
    if (status === 'active') return <CheckmarkCircleRegular className={styles.iconActive} />;
    if (status === 'stalled') return <WarningRegular className={styles.iconStalled} />;
    return <ErrorCircleRegular className={styles.iconNodata} />;
  };

  const statusBadge = (status: PointStat['status']) => {
    if (status === 'active') return <Badge color="success" appearance="tint">Active</Badge>;
    if (status === 'stalled') return <Badge color="warning" appearance="tint">Stalled</Badge>;
    return <Badge color="danger" appearance="tint">No Data</Badge>;
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <Drawer
      type="overlay"
      open={isOpen}
      position="end"
      size="large"
      className={styles.drawer}
    >
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <DataBarVerticalRegular className={styles.headerIcon} />
          <div>
            <Text weight="semibold" size={400}>Verify Trendlog Data</Text>
            {devices && devices.length > 1 ? (
              <Select
                value={`${activeSerial}:${activePanel}`}
                onChange={(_, d) => {
                  const [s, p] = d.value.split(':').map(Number);
                  setActiveSerial(s);
                  setActivePanel(p);
                  setRawRecords([]);
                  setSelectedPointId(null);
                }}
                className={styles.deviceSelect}
              >
                {devices.map(dev => (
                  <option key={`${dev.serial}:${dev.panel}`} value={`${dev.serial}:${dev.panel}`}>
                    SN-{dev.serial} / Panel:{dev.panel}
                  </option>
                ))}
              </Select>
            ) : (
              <Text size={200} className={styles.headerSub}>
                {trendlogId
                  ? (trendlogLabel ? `${trendlogId} · ${trendlogLabel}` : trendlogId) + ` · SN:${serialNumber} / Panel:${panelId}`
                  : `All points · SN:${serialNumber} / Panel:${panelId}`}
              </Text>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          <Select
            value={timeRange}
            onChange={(_, d) => setTimeRange(d.value as TimeRange)}
            className={styles.rangeSelect}
          >
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </Select>
          <Button
            appearance="subtle"
            icon={<ArrowSyncRegular className={loading ? styles.rotating : undefined} />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} />
        </div>
      </div>

      <DrawerBody className={styles.body}>
        {/* ── Loading / Error ── */}
        {loading && (
          <div className={styles.center}>
            <Spinner size="medium" label="Loading records…" />
          </div>
        )}
        {!loading && error && (
          <div className={styles.errorBar}>
            <ErrorCircleRegular className={styles.iconNodata} />
            <Text size={200}>{error}</Text>
            <Button size="small" onClick={fetchData}>Retry</Button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Overview badges ── */}
            <div className={styles.overviewRow}>
              <div className={styles.overviewCard}>
                <Text size={500} weight="semibold">{rawRecords.length.toLocaleString()}</Text>
                <Text size={200} className={styles.overviewLabel}>Total Records</Text>
              </div>
              <div className={styles.overviewCard}>
                <Text size={500} weight="semibold">{stats.length}</Text>
                <Text size={200} className={styles.overviewLabel}>Points Tracked</Text>
              </div>
              <div className={`${styles.overviewCard} ${healthSummary.activeCount > 0 ? styles.cardGreen : ''}`}>
                <Text size={500} weight="semibold">{healthSummary.activeCount}</Text>
                <Text size={200} className={styles.overviewLabel}>Active (last 1h)</Text>
              </div>
              <div className={`${styles.overviewCard} ${healthSummary.stalledCount > 0 ? styles.cardYellow : ''}`}>
                <Text size={500} weight="semibold">{healthSummary.stalledCount}</Text>
                <Text size={200} className={styles.overviewLabel}>Stalled</Text>
              </div>
              <div className={`${styles.overviewCard} ${healthSummary.nodataCount > 0 ? styles.cardRed : ''}`}>
                <Text size={500} weight="semibold">{healthSummary.nodataCount}</Text>
                <Text size={200} className={styles.overviewLabel}>No Data</Text>
              </div>
              {fetchedAt && (
                <Text size={100} className={styles.fetchedAt}>
                  Fetched at {fetchedAt.toLocaleTimeString()}
                </Text>
              )}
            </div>

            {rawRecords.length === 0 ? (
              <div className={styles.center}>
                <Text size={200} className={styles.muted}>No records found for this time range.</Text>
              </div>
            ) : (
              <div className={styles.mainLayout}>
                {/* ── Left: points table ── */}
                <div className={styles.tablePanel}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Point</th>
                        <th className={styles.th}>Type</th>
                        <th className={styles.th}>Total</th>
                        <th className={styles.th}>Last 1h</th>
                        <th className={styles.th}>Last Seen</th>
                        <th className={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map(s => (
                        <tr
                          key={s.pointId}
                          className={`${styles.tr} ${selectedPointId === s.pointId ? styles.trSelected : ''}`}
                          onClick={() => setSelectedPointId(s.pointId)}
                        >
                          <td className={styles.td}>
                            <div className={styles.pointCell}>
                              {statusIcon(s.status)}
                              <Text size={200} weight="semibold">{s.pointId}</Text>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <Text size={200}>{s.pointType}</Text>
                          </td>
                          <td className={styles.tdNum}>
                            <Text size={200}>{s.totalRecords.toLocaleString()}</Text>
                          </td>
                          <td className={styles.tdNum}>
                            <Text size={200} className={s.last1hRecords > 0 ? styles.numGreen : styles.muted}>
                              {s.last1hRecords}
                            </Text>
                          </td>
                          <td className={styles.td}>
                            <Text size={200} className={styles.muted}>{fmtTime(s.latestTime)}</Text>
                          </td>
                          <td className={styles.td}>{statusBadge(s.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Right: sparkline + health ── */}
                <div className={styles.detailPanel}>
                  {selectedStat ? (
                    <>
                      <div className={styles.detailHeader}>
                        <Text weight="semibold" size={300}>{selectedStat.pointId}</Text>
                        <Text size={200} className={styles.muted}>
                          {selectedStat.pointType}{selectedStat.units ? ` · ${selectedStat.units}` : ''}
                        </Text>
                      </div>

                      {/* Sparkline */}
                      <div className={styles.sparklineBox}>
                        <Sparkline data={selectedStat.values} width={340} height={80} />
                        <div className={styles.sparklineAxis}>
                          <Text size={100} className={styles.muted}>{selectedStat.earliestTime ? new Date(selectedStat.earliestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                          <Text size={100} className={styles.muted}>{selectedStat.latestTime ? new Date(selectedStat.latestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                        </div>
                      </div>

                      {/* Health summary */}
                      <div className={styles.healthBox}>
                        <Text weight="semibold" size={200} className={styles.healthTitle}>Health Summary</Text>
                        <div className={styles.healthGrid}>
                          <div className={styles.healthItem}>
                            <Text size={100} className={styles.muted}>Records (range)</Text>
                            <Text size={300} weight="semibold">{selectedStat.totalRecords.toLocaleString()}</Text>
                          </div>
                          {healthSummary.expected > 0 && (
                            <div className={styles.healthItem}>
                              <Text size={100} className={styles.muted}>Expected ({timeRange})</Text>
                              <Text size={300} weight="semibold">{healthSummary.expected.toLocaleString()}</Text>
                            </div>
                          )}
                          {healthSummary.expected > 0 && (
                            <div className={styles.healthItem}>
                              <Text size={100} className={styles.muted}>Gap (missed)</Text>
                              <Text size={300} weight="semibold"
                                className={selectedStat.totalRecords < healthSummary.expected * 0.9 ? styles.numRed : styles.numGreen}>
                                {Math.max(0, healthSummary.expected - selectedStat.totalRecords).toLocaleString()}
                              </Text>
                            </div>
                          )}
                          <div className={styles.healthItem}>
                            <Text size={100} className={styles.muted}>Largest gap</Text>
                            <Text size={300} weight="semibold"
                              className={healthSummary.largestGapMin > (intervalSeconds || 900) / 60 * 3 ? styles.numRed : ''}>
                              {healthSummary.largestGapMin > 0 ? `${Math.round(healthSummary.largestGapMin)} min` : '—'}
                            </Text>
                          </div>
                          <div className={styles.healthItem}>
                            <Text size={100} className={styles.muted}>First record</Text>
                            <Text size={200}>{selectedStat.earliestTime ? new Date(selectedStat.earliestTime).toLocaleString() : '—'}</Text>
                          </div>
                          <div className={styles.healthItem}>
                            <Text size={100} className={styles.muted}>Last record</Text>
                            <Text size={200}>{selectedStat.latestTime ? new Date(selectedStat.latestTime).toLocaleString() : '—'}</Text>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={styles.center}>
                      <Text size={200} className={styles.muted}>Select a point to see details</Text>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </DrawerBody>
    </Drawer>
  );
};
