/**
 * Trend Logs Widget
 * Shows real trendlog data for the last 24 hours via /api/database/trendlog/query
 */

import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@fluentui/react-components';
import { ErrorCircleRegular } from '@fluentui/react-icons';
import * as echarts from 'echarts';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TrendLogs.module.css';

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

interface TrendSummary {
  trackedPoints: number;
  sampledPoints: number;
  totalRecords: number;
  recordsLastHour: number;
  lastSampleTs: number | null;
  devices: DeviceSummary[];
}

export const TrendLogs: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<TrendSummary>({
    trackedPoints: 0,
    sampledPoints: 0,
    totalRecords: 0,
    recordsLastHour: 0,
    lastSampleTs: null,
    devices: [],
  });

  useEffect(() => {
    let chart: echarts.ECharts | null = null;

    const fetchAndDraw = async () => {
      if (!chartRef.current) return;

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
        if (!chartRef.current) return;

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

        setSummary({
          trackedPoints,
          sampledPoints,
          totalRecords: parsed.length,
          recordsLastHour,
          lastSampleTs,
          devices,
        });

        if (parsed.length === 0) {
          setError('No trendlog data in the last 24 hours');
          setLoading(false);
          return;
        }

        const colors = ['#0078d4', '#107c10', '#f7630c', '#8764b8', '#00b7c3'];
        const topSeries = Array.from(pointMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        const series: echarts.SeriesOption[] = topSeries.map((s, i) => ({
          name: s.name,
          type: 'line' as const,
          data: s.pts.sort((a, b) => a[0] - b[0]),
          smooth: true,
          lineStyle: { width: 2, color: colors[i % colors.length] },
          itemStyle: { color: colors[i % colors.length] },
          showSymbol: false,
        }));

        if (!chartRef.current) return;
        chart = echarts.init(chartRef.current);

        const option: echarts.EChartsOption = {
          tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
          legend: { top: 2, textStyle: { fontSize: 10 }, data: series.map((s) => s.name) },
          grid: { left: 48, right: 16, top: 28, bottom: 28 },
          xAxis: {
            type: 'time',
            axisLabel: { fontSize: 10, formatter: (v: number) => new Date(v).getHours() + ':00' },
          },
          yAxis: { type: 'value', axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: 'dashed', color: '#e0e0e0' } } },
          series,
        };

        chart.setOption(option);
        setLoading(false);

        const ro = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) ro.observe(chartRef.current);

        return () => {
          ro.disconnect();
          chart?.dispose();
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trendlog data');
        setLoading(false);
      }
    };

    fetchAndDraw();

    return () => { chart?.dispose(); };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Tracked</div>
          <div className={styles.summaryValue}>{summary.trackedPoints}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Sampling Active</div>
          <div className={styles.summaryValue}>{summary.sampledPoints}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Records (24h)</div>
          <div className={styles.summaryValue}>{summary.totalRecords}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Last Sample</div>
          <div className={styles.summaryValueSmall}>{summary.lastSampleTs ? new Date(summary.lastSampleTs).toLocaleTimeString() : 'N/A'}</div>
        </div>
      </div>

      {summary.devices.length > 0 && (
        <div className={styles.deviceRows}>
          {summary.devices.map((d) => (
            <div key={d.serial} className={styles.deviceRow}>
              <span className={styles.deviceName}>SN-{d.serial} (P{d.panel})</span>
              <span className={styles.deviceMeta}>{d.points} pts</span>
              <span className={styles.deviceMeta}>{d.records} rec</span>
              <span className={styles.deviceMeta}>{new Date(d.lastSampleTs).toLocaleTimeString()}</span>
            </div>
          ))}
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
          <span>{error}</span>
        </div>
      )}
      <div ref={chartRef} className={`${styles.chartArea} ${loading || error ? styles.chartHidden : ''}`} />
    </div>
  );
};
