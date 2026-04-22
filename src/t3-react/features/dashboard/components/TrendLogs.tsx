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

export const TrendLogs: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        chart = echarts.init(chartRef.current);

        if (data.length === 0) {
          setError('No trendlog data in the last 24 hours');
          setLoading(false);
          return;
        }

        // Group by point_id — take first 3 series
        const groups = new Map<string, [number, number][]>();
        for (const rec of data) {
          const key = `${rec.point_type ?? 'PT'} ${rec.point_id}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push([new Date(rec.logging_time_fmt).getTime(), parseFloat(rec.value)]);
        }

        const colors = ['#0078d4', '#107c10', '#f7630c', '#8764b8', '#00b7c3'];
        const series = Array.from(groups.entries())
          .slice(0, 3)
          .map(([name, pts], i) => ({
            name,
            type: 'line' as const,
            data: pts.sort((a, b) => a[0] - b[0]),
            smooth: true,
            lineStyle: { width: 2, color: colors[i % colors.length] },
            itemStyle: { color: colors[i % colors.length] },
            showSymbol: false,
          }));

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

        const handleResize = () => chart?.resize();
        window.addEventListener('resize', handleResize);
        setLoading(false);

        return () => {
          window.removeEventListener('resize', handleResize);
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
      <div ref={chartRef} className={`${styles.chart}${loading || error ? ` ${styles.chartHidden}` : ''}`} />
    </div>
  );
};
