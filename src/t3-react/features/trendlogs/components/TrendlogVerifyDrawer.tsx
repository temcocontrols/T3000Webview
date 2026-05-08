/**
 * TrendlogVerifyDrawer
 *
 * Verification drawer: shows per-point record counts, last-seen times,
 * active/stalled status, expected-vs-actual gap analysis, and a sparkline
 * for the selected point. Opens from TrendlogsPage "Verify Data" button.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Drawer,
  DrawerBody,
  Button,
  Badge,
  Spinner,
  Text,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  WarningRegular,
  ErrorCircleRegular,
  DataBarVerticalRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TrendlogVerifyDrawer.module.css';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface DeviceOption {
  serial: number;
  panel: number;
  name?: string;
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

type TimeRange = '1h' | '6h' | '24h' | '3d' | '7d' | '14d' | '30d' | 'all';
type PointTypeFilter = 'ALL' | 'INPUT' | 'OUTPUT' | 'VARIABLE';

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

// Smart value formatter: keeps integers clean, rounds decimals appropriately
function fmtVal(v: number): string {
  if (!isFinite(v)) return '—';
  if (Number.isInteger(v)) return v.toLocaleString();
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (Math.abs(v) >= 1)    return v.toFixed(2);
  if (Math.abs(v) >= 0.001) return v.toFixed(4);
  return v.toPrecision(3);
}

function timeRangeMs(range: TimeRange): number | null {
  const map: Record<string, number> = {
    '1h':  3_600_000,
    '6h':  21_600_000,
    '24h': 86_400_000,
    '3d':  3 * 86_400_000,
    '7d':  7 * 86_400_000,
    '14d': 14 * 86_400_000,
    '30d': 30 * 86_400_000,
  };
  return map[range] ?? null; // null = all
}

function toIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function expectedCount(intervalSec: number | undefined, rangeMs: number): number {
  if (!intervalSec || intervalSec <= 0) return 0;
  return Math.floor(rangeMs / (intervalSec * 1000));
}

// ── Full SVG chart with Y-axis, X-axis, gridlines, and hover tooltip ──
function PointChart({ data, height = 160 }: { data: { t: number; v: number }[]; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  if (data.length < 2) return <span className={styles.sparklineEmpty}>Not enough data</span>;

  const padL = 46; const padR = 10; const padT = 8; const padB = 28;
  const W = 600; const H = height;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const minT = data[0].t; const maxT = data[data.length - 1].t;
  const vals = data.map(d => d.v);
  const rawMin = Math.min(...vals); const rawMax = Math.max(...vals);
  // Pad range: if flat use ±5% of value (min 1), then add 10% margin
  const rawRange = rawMax - rawMin;
  const pad = rawRange < 1e-9 ? Math.max(Math.abs(rawMax) * 0.05, 1) : rawRange * 0.1;
  const minV = rawMin - pad; const maxV = rawMax + pad;
  const rangeV = maxV - minV; const rangeT = maxT - minT || 1;

  const cx = (t: number) => padL + ((t - minT) / rangeT) * cW;
  const cy = (v: number) => padT + (1 - (v - minV) / rangeV) * cH;

  const pts = data.map(d => `${cx(d.t).toFixed(1)},${cy(d.v).toFixed(1)}`).join(' ');

  // Smart Y label formatter: pick decimal places based on tick step size
  const fmtY = (v: number): string => {
    const step = rangeV / 4;
    if (step >= 100) return Math.round(v).toLocaleString();
    if (step >= 10) return v.toFixed(0);
    if (step >= 1) return v.toFixed(1);
    if (step >= 0.1) return v.toFixed(2);
    return v.toPrecision(3);
  };

  // Y-axis ticks (5)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = minV + (rangeV / 4) * i;
    return { y: cy(v), label: fmtY(v) };
  });

  // X-axis ticks (5)
  const xTicks = Array.from({ length: 5 }, (_, i) => {
    const t = minT + (rangeT / 4) * i;
    const d = new Date(t);
    const label = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return { x: cx(t), label };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const relX = mx - padL;
    if (relX < 0 || relX > cW) { setTooltip(null); return; }
    const tAtX = minT + (relX / cW) * rangeT;
    // Find nearest point
    let best = data[0]; let bestDist = Math.abs(data[0].t - tAtX);
    for (const d of data) {
      const dist = Math.abs(d.t - tAtX);
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    const px = cx(best.t); const py = cy(best.v);
    const time = new Date(best.t).toLocaleTimeString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    setTooltip({ x: px, y: py, label: time, value: fmtY(best.v) });
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={styles.chartSvg}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
    >
      {/* Gridlines */}
      {yTicks.map((t, i) => (
        <line key={i} x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="#edebe9" strokeWidth="1" />
      ))}
      {/* Y-axis labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={padL - 4} y={t.y + 4} textAnchor="end" fontSize="9" fill="#605e5c">{t.label}</text>
      ))}
      {/* X-axis labels */}
      {xTicks.map((t, i) => (
        <text key={i} x={t.x} y={H - 6} textAnchor="middle" fontSize="9" fill="#605e5c">{t.label}</text>
      ))}
      {/* Axes */}
      <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="#c8c6c4" strokeWidth="1" />
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="#c8c6c4" strokeWidth="1" />
      {/* Line */}
      <polyline points={pts} fill="none" stroke="#0078d4" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Dot markers — show individual points when data is sparse enough */}
      {data.length <= 150 && data.map((d, i) => (
        <circle key={i} cx={cx(d.t).toFixed(1)} cy={cy(d.v).toFixed(1)} r="2.5" fill="#0078d4" opacity="0.6" />
      ))}
      {/* Tooltip */}
      {tooltip && (
        <>
          <line x1={tooltip.x} x2={tooltip.x} y1={padT} y2={H - padB} stroke="#0078d4" strokeWidth="1" strokeDasharray="3,2" />
          <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#0078d4" />
          <rect
            x={tooltip.x > W - 120 ? tooltip.x - 112 : tooltip.x + 8}
            y={tooltip.y - 24}
            width="104" height="36" rx="3"
            fill="#323130" opacity="0.92"
          />
          <text
            x={tooltip.x > W - 120 ? tooltip.x - 60 : tooltip.x + 60}
            y={tooltip.y - 11}
            textAnchor="middle" fontSize="9" fill="#ffffff"
          >{tooltip.label}</text>
          <text
            x={tooltip.x > W - 120 ? tooltip.x - 60 : tooltip.x + 60}
            y={tooltip.y + 3}
            textAnchor="middle" fontSize="10" fontWeight="600" fill="#ffffff"
          >{tooltip.value}</text>
        </>
      )}
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
  const [typeFilter, setTypeFilter] = useState<PointTypeFilter>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawRecords, setRawRecords] = useState<RawRecord[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [activeSerial, setActiveSerial] = useState<number>(initialSerial);
  const [activePanel, setActivePanel] = useState<number>(initialPanel);
  // Offset (ms) = serverLocalTime - clientLocalTime. Applied when building query dates
  // so that clients in different timezones send the correct window to the server.
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);

  // Sync if parent changes the default
  useEffect(() => { setActiveSerial(initialSerial); }, [initialSerial]);
  useEffect(() => { setActivePanel(initialPanel); }, [initialPanel]);

  // Fetch server time once on mount to detect timezone mismatch
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/server/time`)
      .then(r => r.json())
      .then((d: { server_time: string; utc_offset_seconds: number }) => {
        const serverNow = new Date(d.server_time).getTime(); // parsed as local (no tz suffix)
        const clientNow = Date.now();
        // server_time has no tz info so JS parses it as local — we need UTC equivalent
        const serverUtc = clientNow - d.utc_offset_seconds * 1000 + new Date().getTimezoneOffset() * -60000;
        // Actually: compute offset as difference between server's local epoch and client's local epoch
        // server_time string is server-local; interpret via utc_offset to get true UTC
        const serverUtcMs = serverNow - new Date().getTimezoneOffset() * 60000 + d.utc_offset_seconds * 1000;
        const diff = serverUtcMs - clientNow;
        // Only apply if meaningful (> 1 minute difference)
        if (Math.abs(diff) > 60_000) {
          setServerOffsetMs(diff);
          console.info(`[TrendlogVerify] Server timezone offset vs client: ${Math.round(diff / 60000)} min`);
        }
        void serverUtc; // suppress unused warning
      })
      .catch(() => { /* ignore — fall back to client local time */ });
  }, []);

  const serialNumber = activeSerial;
  const panelId = activePanel;

  // ── Fetch history data ──────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!serialNumber) return;
    setLoading(true);
    setError(null);

    // Use server-adjusted "now" so the query window aligns with server local time
    const now = new Date(Date.now() + serverOffsetMs);
    const rangeMs = timeRangeMs(timeRange);
    const start = rangeMs !== null ? new Date(now.getTime() - rangeMs) : new Date(0);

    try {
      let records: RawRecord[];

      if (trendlogId) {
        const body = {
          serial_number: serialNumber,
          panel_id: panelId,
          trendlog_id: trendlogId,
          start_time: toIso(start),
          end_time: toIso(now),
          limit: 500_000,
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
        const fmt = (d: Date) => {
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };
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
  }, [serialNumber, panelId, trendlogId, timeRange, serverOffsetMs]);

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

    return Array.from(map.values()).sort((a, b) => {
      // Natural / numeric sort: extract trailing number so IN2 < IN10
      const parse = (id: string) => {
        const m = id.match(/^([A-Za-z_]+)(\d+)$/);
        return m ? { prefix: m[1], num: parseInt(m[2], 10) } : { prefix: id, num: 0 };
      };
      const pa = parse(a.pointId);
      const pb = parse(b.pointId);
      const pc = pa.prefix.localeCompare(pb.prefix);
      return pc !== 0 ? pc : pa.num - pb.num;
    });
  }, [rawRecords]);

  // Auto-select first point
  useEffect(() => {
    if (stats.length > 0 && !selectedPointId) {
      setSelectedPointId(stats[0].pointId);
    }
  }, [stats, selectedPointId]);

  const selectedStat = stats.find(s => s.pointId === selectedPointId) ?? null;

  // ── Filter by type ──────────────────────────────────────
  const filteredStats = useMemo(() =>
    typeFilter === 'ALL' ? stats : stats.filter(s => s.pointType.toUpperCase() === typeFilter)
  , [stats, typeFilter]);

  // ── Health summary ──────────────────────────────────────
  const healthSummary = useMemo(() => {
    const total = stats.reduce((sum, s) => sum + s.totalRecords, 0);
    const activeCount = stats.filter(s => s.status === 'active').length;
    const stalledCount = stats.filter(s => s.status === 'stalled').length;
    const nodataCount = stats.filter(s => s.status === 'nodata').length;
    const rangeMs = timeRangeMs(timeRange);
    const expected = rangeMs !== null ? expectedCount(intervalSeconds, rangeMs) : 0;
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
            {(!devices || devices.length <= 1) && (
              <Text size={200} className={styles.headerSub}>
                {trendlogId
                  ? (trendlogLabel ? `${trendlogId} · ${trendlogLabel}` : trendlogId) + ` · SN:${serialNumber} / Panel:${panelId}`
                  : `All points · SN:${serialNumber} / Panel:${panelId}`}
              </Text>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          {devices && devices.length > 1 && (() => {
            const activeDev = devices.find(d => d.serial === activeSerial && d.panel === activePanel) ?? devices[0];
            return (
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <button className={styles.deviceMenuBtn}>
                    <div className={styles.deviceMenuLabel}>
                      <span className={styles.deviceMenuName}>{activeDev.name ?? `SN-${activeDev.serial}`}</span>
                      <span className={styles.deviceMenuSub}>SN-{activeDev.serial} · Panel {activeDev.panel}</span>
                    </div>
                    <ChevronDownRegular className={styles.deviceMenuChevron} />
                  </button>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    {devices.map(dev => (
                      <MenuItem
                        key={`${dev.serial}:${dev.panel}`}
                        onClick={() => {
                          setActiveSerial(dev.serial);
                          setActivePanel(dev.panel);
                          setRawRecords([]);
                          setSelectedPointId(null);
                        }}
                      >
                        <div className={styles.deviceMenuItem}>
                          <span className={styles.deviceMenuItemName}>{dev.name ?? `SN-${dev.serial}`}</span>
                          <span className={styles.deviceMenuItemSub}>SN-{dev.serial} · Panel {dev.panel}</span>
                        </div>
                      </MenuItem>
                    ))}
                  </MenuList>
                </MenuPopover>
              </Menu>
            );
          })()}
          {(() => {
            const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
              { value: '1h',  label: 'Last 1 hour' },
              { value: '6h',  label: 'Last 6 hours' },
              { value: '24h', label: 'Last 24 hours' },
              { value: '3d',  label: 'Last 3 days' },
              { value: '7d',  label: 'Last 7 days' },
              { value: '14d', label: 'Last 14 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: 'all', label: 'All data' },
            ];
            const current = RANGE_OPTIONS.find(o => o.value === timeRange)?.label ?? timeRange;
            return (
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <button className={styles.rangeMenuBtn}>
                    <span className={styles.rangeMenuLabel}>{current}</span>
                    <ChevronDownRegular className={styles.rangeMenuChevron} />
                  </button>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    {RANGE_OPTIONS.map(o => (
                      <MenuItem
                        key={o.value}
                        className={`${styles.rangeMenuItem} ${timeRange === o.value ? styles.rangeMenuItemActive : ''}`}
                        onClick={() => setTimeRange(o.value)}
                      >
                        {o.label}
                      </MenuItem>
                    ))}
                  </MenuList>
                </MenuPopover>
              </Menu>
            );
          })()}
          <button
            className={styles.refreshBtn}
            onClick={fetchData}
            disabled={loading}
          >
            <ArrowSyncRegular className={`${styles.refreshIcon} ${loading ? styles.rotating : ''}`} />
            Refresh
          </button>
          <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} />
        </div>
      </div>

      {/* ── Combined filter + stats bar ── */}
      <div className={styles.statsBar}>
        <div className={styles.filterGroup}>
          {(['ALL', 'INPUT', 'OUTPUT', 'VARIABLE'] as PointTypeFilter[]).map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${typeFilter === f ? styles.filterBtnActive : ''}`}
              onClick={() => setTypeFilter(f)}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              {f !== 'ALL' && (
                <span className={styles.filterCount}>
                  {stats.filter(s => s.pointType.toUpperCase() === f).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className={styles.statsDivider} />
        <div className={styles.statsCards}>
          <div className={styles.overviewCard}>
            <Text size={400} weight="semibold">{rawRecords.length.toLocaleString()}</Text>
            <Text size={100} className={styles.overviewLabel}>Total Records</Text>
          </div>
          <div className={styles.overviewCard}>
            <Text size={400} weight="semibold">{stats.length}</Text>
            <Text size={100} className={styles.overviewLabel}>Points</Text>
          </div>
          <div className={`${styles.overviewCard} ${healthSummary.activeCount > 0 ? styles.cardGreen : ''}`}>
            <Text size={400} weight="semibold">{healthSummary.activeCount}</Text>
            <Text size={100} className={styles.overviewLabel}>Active</Text>
          </div>
          <div className={`${styles.overviewCard} ${healthSummary.stalledCount > 0 ? styles.cardYellow : ''}`}>
            <Text size={400} weight="semibold">{healthSummary.stalledCount}</Text>
            <Text size={100} className={styles.overviewLabel}>Stalled</Text>
          </div>
          <div className={`${styles.overviewCard} ${healthSummary.nodataCount > 0 ? styles.cardRed : ''}`}>
            <Text size={400} weight="semibold">{healthSummary.nodataCount}</Text>
            <Text size={100} className={styles.overviewLabel}>No Data</Text>
          </div>
          {fetchedAt && (
            <Text size={100} className={styles.fetchedAt}>
              {fetchedAt.toLocaleTimeString()}
            </Text>
          )}
        </div>
      </div>

      <DrawerBody className={styles.body}>
        {/* ── Loading / Error ── */}
        {loading && (
          <div className={styles.center}>
            <Spinner size="tiny" label="Loading records…" />
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
                      {filteredStats.map(s => (
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

                {/* ── Right: chart + health ── */}
                <div className={styles.detailPanel}>
                  {selectedStat ? (
                    <>
                      <div className={styles.detailHeader}>
                        <Text weight="semibold" size={300}>{selectedStat.pointId}</Text>
                        <Text size={200} className={styles.muted}>
                          {selectedStat.pointType}{selectedStat.units ? ` · ${selectedStat.units}` : ' · Unknown'}
                        </Text>
                      </div>

                      {/* Chart with axes + tooltip */}
                      <div className={styles.chartBox}>
                        <PointChart data={selectedStat.values} height={180} />
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

                      {/* ── Raw data log table ── */}
                      <div className={styles.dataLogBox}>
                        <div className={styles.dataLogHeader}>
                          <Text weight="semibold" size={200}>Logged Values</Text>
                          <Text size={100} className={styles.muted}>
                            {selectedStat.values.length.toLocaleString()} records
                            {selectedStat.values.length > 200 ? ' · showing latest 200' : ''}
                          </Text>
                        </div>
                        <div className={styles.dataLogScroll}>
                          <table className={styles.dataLogTable}>
                            <thead>
                              <tr>
                                <th className={styles.dataLogThIdx}>#</th>
                                <th className={styles.dataLogTh}>Time</th>
                                <th className={styles.dataLogThRight}>Value</th>
                                <th className={styles.dataLogThGap}>Gap</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const sorted = [...selectedStat.values].reverse(); // newest first
                                return sorted.slice(0, 200).map((rec, idx) => {
                                  const prev = sorted[idx + 1];
                                  const gapMin = prev ? (rec.t - prev.t) / 60_000 : null;
                                  const isLargeGap = gapMin !== null && intervalSeconds
                                    ? gapMin > (intervalSeconds / 60) * 2.5
                                    : false;
                                  const rowNum = selectedStat.values.length - idx;
                                  return (
                                    <tr
                                      key={rec.t}
                                      className={`${styles.dataLogTr} ${isLargeGap ? styles.dataLogTrGap : ''}`}
                                    >
                                      <td className={styles.dataLogTdNum}>{rowNum}</td>
                                      <td className={styles.dataLogTd}>
                                        {new Date(rec.t).toLocaleString([], {
                                          month: 'short', day: 'numeric',
                                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                                        })}
                                      </td>
                                      <td className={styles.dataLogTdNum}>
                                        <span className={styles.dataLogValue}>{fmtVal(rec.v)}</span>
                                        {selectedStat.units && (
                                          <span className={styles.dataLogUnit}> {selectedStat.units}</span>
                                        )}
                                      </td>
                                      <td className={styles.dataLogTd}>
                                        {gapMin !== null ? (
                                          <span className={isLargeGap ? styles.numRed : styles.muted}>
                                            {gapMin < 1 ? '<1m' : `${Math.round(gapMin)}m`}
                                          </span>
                                        ) : '—'}
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
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
