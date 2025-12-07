/**
 * TrendChart Component
 *
 * Advanced trend visualization with real-time updates and historical data
 * Supports both analog (line charts) and digital (step charts) data
 *
 * Features:
 * - Multiple time ranges (5m, 10m, 30m, 1h, 4h, 12h, 1d, 4d)
 * - Auto-scaling Y-axis with 3x zoom for small variations
 * - 10 tick marks for precise reading
 * - Real-time updates with database persistence
 * - Automatic gap filling when page visibility changes
 * - Pan/zoom functionality
 */

import React, { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  chartContainer: {
    width: '100%',
    height: '100%',
    minHeight: '400px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

export interface TrendDataPoint {
  timestamp: number; // Unix timestamp in milliseconds
  value: number;
}

export interface TrendSeries {
  name: string;
  pointId: string;
  pointType: string;
  pointIndex: number;
  data: TrendDataPoint[];
  color: string;
  unit?: string;
  digitalAnalog: 'Analog' | 'Digital';
  visible?: boolean;
}

interface TrendChartProps {
  series: TrendSeries[];
  timeBase: '5m' | '10m' | '30m' | '1h' | '4h' | '12h' | '1d' | '4d';
  showGrid?: boolean;
  chartType?: 'analog' | 'digital'; // New prop to distinguish chart types
  onTimeRangeChange?: (startTime: number, endTime: number) => void;
}

// Color palette - Cyan moved to position 20 as per user requirement
const CHART_COLORS = [
  '#FF0000', '#0000FF', '#00AA00', '#FF8000', '#AA00AA', '#CC6600',
  '#AA0000', '#0066AA', '#AA6600', '#6600AA', '#006600', '#FF6600', '#0000AA',
  '#FF00FF', '#008080', '#800080', '#808000', '#FF1493', '#4B0082', '#DC143C',
  '#00AAAA', '#00CED1', '#8B4513', '#2F4F4F', '#B22222'
];

// Time configuration for proper axis divisions (4 or 6 divisions)
const TIME_CONFIGS = {
  '5m': { stepMinutes: 1, divisions: 5, totalMinutes: 5 },
  '10m': { stepMinutes: 2, divisions: 5, totalMinutes: 10 },
  '30m': { stepMinutes: 5, divisions: 6, totalMinutes: 30 },
  '1h': { stepMinutes: 15, divisions: 4, totalMinutes: 60 },      // 0, 15, 30, 45, 60
  '4h': { stepMinutes: 60, divisions: 4, totalMinutes: 240 },     // 0, 1h, 2h, 3h, 4h
  '12h': { stepMinutes: 120, divisions: 6, totalMinutes: 720 },   // 0, 2h, 4h, 6h, 8h, 10h, 12h
  '1d': { stepMinutes: 240, divisions: 6, totalMinutes: 1440 },   // 0, 4h, 8h, 12h, 16h, 20h, 24h
  '4d': { stepMinutes: 960, divisions: 6, totalMinutes: 5760 },   // 0, 16h, 32h, 48h, 64h, 80h, 96h
};

export const TrendChart: React.FC<TrendChartProps> = ({
  series,
  timeBase,
  showGrid = true,
  chartType = 'analog', // Default to analog for backward compatibility
  onTimeRangeChange,
}) => {
  const styles = useStyles();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  // Separate analog and digital series
  const analogSeries = series.filter(s => s.digitalAnalog === 'Analog' && s.visible !== false);
  const digitalSeries = series.filter(s => s.digitalAnalog === 'Digital' && s.visible !== false);

  // Calculate Y-axis range with enhanced auto-scaling
  const calculateYAxisRange = useCallback((seriesData: TrendSeries[]) => {
    const allValues: number[] = [];
    seriesData.forEach(s => {
      s.data.forEach(point => {
        if (isFinite(point.value) && point.value > -99999 && point.value < 999999) {
          allValues.push(point.value);
        }
      });
    });

    if (allValues.length === 0) return { min: 0, max: 100 };

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;

    // Enhanced auto-ranging per user requirements
    if (range === 0) {
      // All values same - show ±10% range
      return {
        min: min * 0.9,
        max: max * 1.1,
      };
    } else if (range < 2) {
      // Small range - expand 3x for better visibility (user requirement)
      const center = (min + max) / 2;
      const expandedRange = Math.max(range * 3, 1);
      return {
        min: center - expandedRange / 2,
        max: center + expandedRange / 2,
      };
    } else {
      // Normal range - add 10% padding
      const padding = range * 0.1;
      return {
        min: min - padding,
        max: max + padding,
      };
    }
  }, []);

  // Format timestamp for X-axis
  const formatTimestamp = useCallback((timestamp: number, timeBase: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    if (timeBase === '5m' || timeBase === '10m' || timeBase === '30m' || timeBase === '1h') {
      return `${hours}:${minutes}`;
    } else {
      return `${month}-${day} ${hours}:${minutes}`;
    }
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize or get existing chart instance
    let chart = chartInstanceRef.current;
    if (!chart) {
      chart = echarts.init(chartRef.current);
      chartInstanceRef.current = chart;
    }

    const timeConfig = TIME_CONFIGS[timeBase];
    const yAxisRange = calculateYAxisRange(analogSeries);

    // Build series for ECharts
    const echartsAnalogSeries = analogSeries.map((s, index) => ({
      name: s.name,
      type: 'line' as const,
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 2, color: s.color || CHART_COLORS[index % CHART_COLORS.length] },
      itemStyle: { color: s.color || CHART_COLORS[index % CHART_COLORS.length] },
      data: s.data.map(point => [point.timestamp, point.value]),
      yAxisIndex: 0,
    }));

    const echartsDigitalSeries = digitalSeries.map((s, index) => ({
      name: s.name,
      type: 'line' as const,
      step: 'end' as const,
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 2, color: s.color || CHART_COLORS[(analogSeries.length + index) % CHART_COLORS.length] },
      itemStyle: { color: s.color || CHART_COLORS[(analogSeries.length + index) % CHART_COLORS.length] },
      data: s.data.map(point => [point.timestamp, point.value]),
      yAxisIndex: 1,
    }));

    // Calculate time range
    const now = Date.now();
    const startTime = now - (timeConfig.totalMinutes * 60 * 1000);

    // Configure chart
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: [
        {
          left: '80px',
          right: '60px',
          top: '60px',
          bottom: digitalSeries.length > 0 ? '35%' : '60px',
          containLabel: false,
        },
        ...(digitalSeries.length > 0 ? [{
          left: '80px',
          right: '60px',
          top: '70%',
          bottom: '60px',
          containLabel: false,
        }] : []),
      ],
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'cross' as const },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const timestamp = params[0].value[0];
          const timeStr = formatTimestamp(timestamp, timeBase);
          let html = `<div style="font-weight: bold; margin-bottom: 8px;">${timeStr}</div>`;
          params.forEach((param: any) => {
            const value = param.value[1];
            const seriesInfo = series.find(s => s.name === param.seriesName);
            const unit = seriesInfo?.unit || '';
            html += `
              <div style="display: flex; align-items: center; margin: 4px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${param.color}; border-radius: 50%; margin-right: 8px;"></span>
                <span style="flex: 1;">${param.seriesName}:</span>
                <span style="font-weight: bold; margin-left: 8px;">${value.toFixed(2)} ${unit}</span>
              </div>
            `;
          });
          return html;
        },
      },
      legend: {
        top: 10,
        left: 'center',
        type: 'scroll' as const,
        data: [...analogSeries, ...digitalSeries].map(s => s.name),
      },
      xAxis: [
        {
          type: 'time' as const,
          gridIndex: 0,
          min: startTime,
          max: now,
          axisLabel: {
            formatter: (value: number) => formatTimestamp(value, timeBase),
            color: '#595959',
            fontSize: 11,
          },
          axisLine: { lineStyle: { color: '#e0e0e0' } },
          splitLine: { show: showGrid, lineStyle: { color: '#e0e0e0' } },
          splitNumber: timeConfig.divisions,
        },
        ...(digitalSeries.length > 0 ? [{
          type: 'time' as const,
          gridIndex: 1,
          min: startTime,
          max: now,
          axisLabel: {
            formatter: (value: number) => formatTimestamp(value, timeBase),
            color: '#595959',
            fontSize: 11,
          },
          axisLine: { lineStyle: { color: '#e0e0e0' } },
          splitLine: { show: showGrid, lineStyle: { color: '#e0e0e0' } },
          splitNumber: timeConfig.divisions,
        }] : []),
      ],
      yAxis: [
        {
          type: 'value' as const,
          gridIndex: 0,
          name: 'Analog',
          nameLocation: 'middle' as const,
          nameGap: 60,
          min: yAxisRange.min,
          max: yAxisRange.max,
          splitNumber: 10, // 10 tick marks for finer granularity (user requirement)
          axisLabel: {
            formatter: (value: number) => value.toFixed(2),
            color: '#595959',
            fontSize: 11,
          },
          axisLine: { lineStyle: { color: '#e0e0e0' } },
          splitLine: { show: showGrid, lineStyle: { color: '#e0e0e0' } },
        },
        ...(digitalSeries.length > 0 ? [{
          type: 'value' as const,
          gridIndex: 1,
          name: 'Digital',
          nameLocation: 'middle' as const,
          nameGap: 60,
          min: 0,
          max: 1,
          splitNumber: 2,
          axisLabel: {
            formatter: (value: number) => value === 0 ? 'OFF' : 'ON',
            color: '#595959',
            fontSize: 11,
          },
          axisLine: { lineStyle: { color: '#e0e0e0' } },
          splitLine: { show: showGrid, lineStyle: { color: '#e0e0e0' } },
        }] : []),
      ],
      dataZoom: [
        {
          type: 'inside' as const,
          xAxisIndex: [0, ...(digitalSeries.length > 0 ? [1] : [])],
          filterMode: 'none' as const,
        },
        {
          type: 'slider' as const,
          xAxisIndex: [0, ...(digitalSeries.length > 0 ? [1] : [])],
          bottom: 10,
          height: 20,
          filterMode: 'none' as const,
        },
      ],
      series: [...echartsAnalogSeries, ...echartsDigitalSeries],
    };

    chart.setOption(option, true);

    // Handle zoom/pan events
    if (onTimeRangeChange) {
      chart.on('datazoom', () => {
        const option = chart.getOption();
        const xAxis = option.xAxis as any[];
        if (xAxis && xAxis[0]) {
          onTimeRangeChange(xAxis[0].min, xAxis[0].max);
        }
      });
    }

    // Handle window resize
    const handleResize = () => {
      chart?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart?.off('datazoom');
    };
  }, [series, timeBase, showGrid, analogSeries, digitalSeries, calculateYAxisRange, formatTimestamp, onTimeRangeChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  return <div ref={chartRef} className={styles.chartContainer} />;
};
