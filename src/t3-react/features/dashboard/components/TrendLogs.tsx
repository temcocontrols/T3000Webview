/**
 * Trend Logs Widget
 * Shows real trendlog data for the last 24 hours via /api/database/trendlog/query
 */

import React, { useEffect, useRef, useState } from 'react';
import { Spinner, Tooltip } from '@fluentui/react-components';
import { ChevronDownRegular, ErrorCircleRegular, InfoRegular } from '@fluentui/react-icons';
import * as echarts from 'echarts';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TrendLogs.module.css';

const CHART_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0f766e'];

interface TrendlogRecord {
  logging_time_fmt: string;
  value: string;
  point_id: string;
  point_type: string;
  serial_number: number;
  panel_id: number;
}

interface DeviceSummary {
  serial: number;
  panel: number;
  records: number;
  points: number;
  lastSampleTs: number;
}

interface StalledPoint {
  pointKey: string;
  pointName: string;
  serial: number;
  panel: number;
  lastSampleTs: number;
  lastSampleTime: string;
  expectedInterval: string;
}

interface TrendSummary {
  trackedPoints: number;
  sampledPoints: number;
  totalRecords: number;
  recordsLastHour: number;
  recordsLastHourRate: number;
  avgRecordsLastHour: number;
  lastSampleTs: number | null;
  devices: DeviceSummary[];
  stalledPoints: StalledPoint[];
}

interface TrendLogsProps {
  isStandalone?: boolean;
}

export const TrendLogs: React.FC<TrendLogsProps> = ({ isStandalone = false }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<TrendSummary>({
    trackedPoints: 0,
    sampledPoints: 0,
    totalRecords: 0,
    recordsLastHour: 0,
    recordsLastHourRate: 0,
    avgRecordsLastHour: 0,
    lastSampleTs: null,
    devices: [],
    stalledPoints: [],
  });
  const [chartLegendItems, setChartLegendItems] = useState<string[]>([]);
  const [legendEnabledMap, setLegendEnabledMap] = useState<Record<string, boolean>>({});
  const [issuesExpanded, setIssuesExpanded] = useState(false);

  const formatAge = (timestamp: number | null): string => {
    if (!timestamp) return 'N/A';
    const ageMs = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(ageMs / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  const formatCompactNumber = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
      const n = value / 1_000_000;
      return `${n.toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
    }
    if (abs >= 1_000) {
      const n = value / 1_000;
      return `${n.toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
    }
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(1).replace(/\.0$/, '');
  };

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const disposeChart = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };

    const waitForChartSize = async (element: HTMLDivElement) => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (disposed) {
          return false;
        }

        const { width, height } = element.getBoundingClientRect();
        if (width > 0 && height > 0) {
          return true;
        }

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }

      return false;
    };

    const fetchAndDraw = async () => {
      if (!chartRef.current) return;
      setLoading(true);
      setError(null);

      const now = new Date();
      const start = new Date(now.getTime() - 24 * 3600 * 1000);
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

      try {
        const resp = await fetch(`${API_BASE_URL}/api/database/trendlog/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start_date: fmt(start), end_date: fmt(now) }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: TrendlogRecord[] = await resp.json();
        if (!chartRef.current || disposed) return;

        const parsed = data
          .map((r) => ({
            ...r,
            ts: new Date(r.logging_time_fmt).getTime(),
            num: Number.parseFloat(r.value),
          }))
          .filter((r) => Number.isFinite(r.ts) && Number.isFinite(r.num));

        const nowTs = Date.now();
        const oneHourAgo = nowTs - 60 * 60 * 1000;
        const activeWindowAgo = nowTs - 2 * 60 * 60 * 1000;

        const pointMap = new Map<string, { count: number; lastTs: number; serial: number; panel: number; pts: [number, number][]; name: string }>();
        const deviceMap = new Map<number, { panel: number; records: number; points: Set<string>; lastTs: number }>();
        let lastSampleTs: number | null = null;
        let recordsLastHour = 0;

        for (const rec of parsed) {
          if (rec.ts >= oneHourAgo) recordsLastHour += 1;
          if (lastSampleTs === null || rec.ts > lastSampleTs) lastSampleTs = rec.ts;

          const pointKey = `${rec.point_type}:${rec.point_id}:${rec.serial_number}`;
          const pointName = `${rec.point_type ?? 'PT'} ${rec.point_id} | SN-${rec.serial_number}`;
          const p = pointMap.get(pointKey) ?? {
            count: 0,
            lastTs: 0,
            serial: rec.serial_number,
            panel: rec.panel_id,
            pts: [],
            name: pointName,
          };
          p.count += 1;
          if (rec.ts > p.lastTs) p.lastTs = rec.ts;
          p.pts.push([rec.ts, rec.num]);
          pointMap.set(pointKey, p);

          const d = deviceMap.get(rec.serial_number) ?? {
            panel: rec.panel_id,
            records: 0,
            points: new Set<string>(),
            lastTs: 0,
          };
          d.records += 1;
          d.points.add(pointKey);
          if (rec.ts > d.lastTs) d.lastTs = rec.ts;
          deviceMap.set(rec.serial_number, d);
        }

        const trackedPoints = pointMap.size;
        const sampledPoints = Array.from(pointMap.values()).filter((p) => p.lastTs >= activeWindowAgo).length;
        const stalledPointsList: StalledPoint[] = Array.from(pointMap.values())
          .filter((p) => p.lastTs < activeWindowAgo)
          .map((p) => ({
            pointKey: `${p.serial}:${p.name}`,
            pointName: p.name,
            serial: p.serial,
            panel: p.panel,
            lastSampleTs: p.lastTs,
            lastSampleTime: new Date(p.lastTs).toLocaleTimeString(),
            expectedInterval: '30s', // Placeholder - could be inferred from data pattern
          }))
          .sort((a, b) => b.lastSampleTs - a.lastSampleTs)
          .slice(0, 10);

        const devices = Array.from(deviceMap.entries())
          .map(([serial, d]) => ({
            serial,
            panel: d.panel,
            records: d.records,
            points: d.points.size,
            lastSampleTs: d.lastTs,
          }))
          .sort((a, b) => b.records - a.records)
          .slice(0, 5);

        // Calculate sample rate (records per minute last hour)
        const recordsLastHourRate = recordsLastHour > 0 ? Math.round((recordsLastHour / 60) * 10) / 10 : 0;
        const avgRecordsLastHour = recordsLastHour > 0 ? Math.round((recordsLastHour / 60) * 10) / 10 : 0;

        setSummary({
          trackedPoints,
          sampledPoints,
          totalRecords: parsed.length,
          recordsLastHour,
          recordsLastHourRate,
          avgRecordsLastHour,
          lastSampleTs,
          devices,
          stalledPoints: stalledPointsList,
        });

        if (parsed.length === 0) {
          disposeChart();
          setChartLegendItems([]);
          setError('No trendlog data in the last 24 hours');
          setLoading(false);
          return;
        }

        const topSeries = Array.from(pointMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        const nextLegendItems = topSeries.map((s) => s.name);
        setChartLegendItems(nextLegendItems);
        setLegendEnabledMap((prev) => {
          const next: Record<string, boolean> = {};
          for (const name of nextLegendItems) {
            next[name] = prev[name] ?? true;
          }
          return next;
        });

        const series: echarts.SeriesOption[] = topSeries.map((s, i) => ({
          name: s.name,
          type: 'line' as const,
          data: s.pts.sort((a, b) => a[0] - b[0]),
          smooth: true,
          lineStyle: { width: 2, color: CHART_COLORS[i % CHART_COLORS.length] },
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
          showSymbol: false,
        }));

        if (!chartRef.current || disposed) return;

        if (!chartRef.current || disposed) return;

        const chartReady = await waitForChartSize(chartRef.current);
        if (!chartReady || !chartRef.current || disposed) {
          return;
        }

        disposeChart();
        chartInstanceRef.current = echarts.init(chartRef.current);

        const option: echarts.EChartsOption = {
          animationDuration: 450,
          tooltip: {
            trigger: 'axis',
            textStyle: { fontSize: 11 },
            backgroundColor: 'rgba(255, 255, 255, 0.97)',
            borderColor: '#d6d6d6',
            borderWidth: 1,
            extraCssText: 'box-shadow: 0 4px 14px rgba(0,0,0,0.12);',
            valueFormatter: (value) => `${formatCompactNumber(Number(value ?? 0))}`,
          },
          legend: {
            show: false,
            selectedMode: true,
            selected: Object.fromEntries(chartLegendItems.map((name) => [name, legendEnabledMap[name] ?? true])),
          },
          grid: { left: 56, right: 14, top: 16, bottom: 46, containLabel: false },
          xAxis: {
            type: 'time',
            boundaryGap: false,
            axisTick: { show: false },
            axisLine: { lineStyle: { color: '#d4d4d8' } },
            splitLine: {
              show: true,
              lineStyle: { color: '#eef0f3', type: 'solid', width: 1 },
            },
            axisLabel: {
              fontSize: 10,
              color: '#71717a',
              interval: 0,
              hideOverlap: false,
              showMinLabel: true,
              showMaxLabel: true,
              formatter: (v: number) => {
                const d = new Date(v);
                return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              },
            },
          },
          yAxis: {
            type: 'value',
            axisTick: { show: false },
            axisLine: { show: false },
            axisLabel: {
              fontSize: 10,
              color: '#71717a',
              formatter: (v: number) => formatCompactNumber(v),
            },
            splitLine: {
              lineStyle: { type: 'solid', color: '#e4e4e7', width: 1 },
            },
          },
          series,
        };

        chartInstanceRef.current.setOption(option);
        setLoading(false);

        resizeObserver = new ResizeObserver(() => chartInstanceRef.current?.resize());
        resizeObserver.observe(chartRef.current);
        chartInstanceRef.current.resize();
      } catch (err) {
        disposeChart();
        setChartLegendItems([]);
        setError(err instanceof Error ? err.message : 'Failed to load trendlog data');
        setLoading(false);
      }
    };

    fetchAndDraw();

    return () => {
      disposed = true;
      disposeChart();
    };
  }, []);

  const samplingStalled = summary.trackedPoints > 0 && summary.sampledPoints === 0;
  const topDevice = summary.devices[0];
  const legendDotClasses = [
    styles.chartLegendDot0,
    styles.chartLegendDot1,
    styles.chartLegendDot2,
    styles.chartLegendDot3,
    styles.chartLegendDot4,
  ];

  const formatSampleRate = (rate: number): string => {
    if (rate === 0) return 'N/A';
    return `${Math.round(rate)} rec/min`;
  };

  const getSampleRateTrend = (): string => {
    if (summary.recordsLastHourRate <= 0) return '—';
    // Simplified trend - in real implementation would compare to longer period
    return summary.recordsLastHourRate > 30 ? '✓' : '↓';
  };

  const toggleSeriesVisibility = (seriesName: string) => {
    chartInstanceRef.current?.dispatchAction({
      type: 'legendToggleSelect',
      name: seriesName,
    });

    setLegendEnabledMap((prev) => ({
      ...prev,
      [seriesName]: !(prev[seriesName] ?? true),
    }));
  };

  return (
    <div className={styles.container}>
      {/* Health Cards Grid - 4 columns */}
      <div className={styles.healthStrip}>
        {/* Card 1: Sampling Health */}
        <div className={styles.healthCard}>
          <div className={styles.healthTitle}>Sampling Health</div>
          <div className={`${styles.healthValue} ${samplingStalled ? styles.stateBad : styles.stateGood}`}>
            {samplingStalled ? (
              <>
                Stalled <span className={styles.healthStatusBadge} aria-hidden="true">!</span>
              </>
            ) : (
              'Active ✓'
            )}
          </div>
          <div className={styles.healthSub}>
            <strong>{summary.trackedPoints}</strong> tracked<br />
            <strong>{summary.sampledPoints}</strong> active (2h)
            {summary.stalledPoints.length > 0 && <><br /><strong style={{ color: '#a4262c' }}>{summary.stalledPoints.length}</strong> stalled</>}
          </div>
        </div>

        {/* Card 2: Sample Rate */}
        <div className={styles.healthCard}>
          <div className={styles.healthTitle}>Sample Rate</div>
          <div className={`${styles.healthValue}`} style={{ color: summary.recordsLastHourRate > 30 ? '#107c10' : '#ffb900' }}>
            {formatSampleRate(summary.recordsLastHourRate)} {getSampleRateTrend()}
          </div>
          <div className={styles.healthSub}>
            <strong>Last Hour:</strong> {summary.recordsLastHourRate > 0 ? `${Math.round(summary.recordsLastHourRate)}/min` : 'N/A'}<br />
            <strong>Trend:</strong> {summary.recordsLastHourRate > 30 ? '✓ Normal' : '↓ Slowing'}
          </div>
        </div>

        {/* Card 3: Last Sample Age */}
        <div className={styles.healthCard}>
          <div className={styles.healthTitle}>Last Sample Age</div>
          <div className={`${styles.healthValue} ${summary.lastSampleTs && Date.now() - summary.lastSampleTs < 60000 ? styles.stateGood : styles.stateBad}`}>
            {formatAge(summary.lastSampleTs)}
          </div>
          <div className={styles.healthSub}>
            <strong>Most Recent:</strong><br />
            {summary.lastSampleTs ? new Date(summary.lastSampleTs).toLocaleTimeString() : 'N/A'}
          </div>
        </div>

        {/* Card 4: Top Device */}
        <div className={styles.healthCard}>
          <div className={styles.healthTitle}>Top Device</div>
          <div className={styles.healthValue}>
            {topDevice ? `SN-${topDevice.serial}` : 'N/A'}
          </div>
          <div className={styles.healthSub}>
            {topDevice ? (
              <>
                <strong>{topDevice.records}</strong> records<br />
                <strong>Panel:</strong> {topDevice.panel}<br />
                <strong>Last:</strong> {formatAge(topDevice.lastSampleTs)}
              </>
            ) : 'No data'}
          </div>
        </div>
      </div>

      {/* Issues Section - Expandable */}
      {summary.stalledPoints.length > 0 && (
        <div className={styles.issuesSection}>
          <div
            className={styles.issuesHeader}
            onClick={() => setIssuesExpanded(!issuesExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIssuesExpanded(!issuesExpanded);
              }
            }}
          >
            <span className={styles.issuesIconBadge} aria-hidden="true">!</span>
            <span className={styles.issuesTitle}>Stalled Points ({summary.stalledPoints.length})</span>
            <ChevronDownRegular className={`${styles.expandIcon} ${issuesExpanded ? styles.expandIconOpen : ''}`} />
          </div>

          {issuesExpanded && (
            <div className={styles.issuesContent}>
              <div className={styles.issuesGrid}>
                {summary.stalledPoints.map((point) => (
                  <div key={point.pointKey} className={styles.issueItem}>
                    <div className={styles.issuePoint}>
                      {point.pointName} | SN-{point.serial}, Panel-{point.panel}
                    </div>
                    <div className={styles.issueDetail}>
                      <div>⏱️ <strong>Last sample:</strong> {formatAge(point.lastSampleTs)} ({new Date(point.lastSampleTs).toLocaleTimeString()})</div>
                      <div>📊 <strong>Expected:</strong> every {point.expectedInterval}</div>
                      <div style={{ color: '#be123c' }}>
                        <strong>Status:</strong> No data since {new Date(point.lastSampleTs).toLocaleTimeString()}
                      </div>
                      <div className={styles.issueFix}>
                        💡 Check if point enabled in config + verify device connectivity
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.diagnosticsBox}>
                <div className={styles.diagnosticsTitle}>Next Steps</div>
                <div className={styles.diagnosticsText}>
                  1. Check trendlog configuration<br />
                  2. Verify sync interval<br />
                  3. Confirm device(s) are online
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <Spinner size="tiny" />
          <span>Loading…</span>
        </div>
      )}
      {error && !loading && (
        <div className={styles.error}>
          <ErrorCircleRegular style={{ fontSize: '14px', flexShrink: 0 }} />
          <span>
            {isStandalone && error === 'No trendlog data in the last 24 hours'
              ? 'No trend log data yet. Enable trend log points in the Trend Logs tab to start recording.'
              : error}
          </span>
        </div>
      )}

      <div className={styles.chartRow}>
        <div className={styles.chartHeader}>
          <div className={styles.chartHeaderMain}>
            <div className={styles.chartTitle}>Trend Value Timeline</div>
            <Tooltip
              relationship="description"
              content="Shows top 3 trend points by record count over the last 24 hours. X-axis is time and Y-axis is raw value (compact units like k, M)."
            >
              <button className={styles.chartInfoButton} aria-label="About trend chart">
                <InfoRegular fontSize={12} />
              </button>
            </Tooltip>
          </div>
          <div className={styles.chartHeaderLegend}>
            {chartLegendItems.map((label, idx) => (
              <button
                key={label}
                type="button"
                className={`${styles.chartLegendItem} ${legendEnabledMap[label] === false ? styles.chartLegendItemDisabled : ''}`}
                onClick={() => toggleSeriesVisibility(label)}
                title={legendEnabledMap[label] === false ? 'Click to enable series' : 'Click to disable series'}
              >
                <span
                  className={`${styles.chartLegendDot} ${legendDotClasses[idx % legendDotClasses.length]}`}
                />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div ref={chartRef} className={`${styles.chartArea} ${loading || error ? styles.chartHidden : ''}`} />
      </div>
    </div>
  );
};
