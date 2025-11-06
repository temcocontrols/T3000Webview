/**
 * ChartComponent
 * 
 * ECharts wrapper for displaying trend data
 */

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    width: '100%',
    height: '100%',
    minHeight: '400px',
  },
});

export interface ChartDataSeries {
  name: string;
  data: Array<[number, number]>; // [timestamp, value]
  color?: string;
  yAxisIndex?: number;
}

interface ChartComponentProps {
  series: ChartDataSeries[];
  title?: string;
  height?: string | number;
}

export const ChartComponent: React.FC<ChartComponentProps> = ({
  series,
  title,
  height = '400px',
}) => {
  const styles = useStyles();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    // Configure chart options
    const option: echarts.EChartsOption = {
      title: title ? { text: title } : undefined,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
      },
      legend: {
        data: series.map((s) => s.name),
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
      },
      yAxis: [
        {
          type: 'value',
          name: 'Value',
        },
      ],
      series: series.map((s) => ({
        name: s.name,
        type: 'line',
        data: s.data,
        smooth: true,
        itemStyle: {
          color: s.color,
        },
        yAxisIndex: s.yAxisIndex || 0,
      })),
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
        },
      ],
    };

    chart.setOption(option);

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [series, title]);

  return (
    <div
      ref={chartRef}
      className={styles.container}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
};
