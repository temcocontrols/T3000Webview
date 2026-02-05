/**
 * Trend Logs Widget
 * Shows recent trend log data with sample chart
 */

import React, { useEffect, useRef } from 'react';
import { Text } from '@fluentui/react-components';
import * as echarts from 'echarts';
import styles from './TrendLogs.module.css';

export const TrendLogs: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);

  // Mock data - replace with API call
  const trendLogs = [
    { id: '1', name: 'Temperature - Zone A', lastUpdate: '2 min ago', points: 245 },
    { id: '2', name: 'Humidity - Main Hall', lastUpdate: '5 min ago', points: 180 },
    { id: '3', name: 'Pressure - HVAC System', lastUpdate: '8 min ago', points: 320 },
  ];

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // Generate sample data - 24 hours
    const now = Date.now();
    const tempData: [number, number][] = [];
    const humidityData: [number, number][] = [];

    for (let i = 0; i < 24; i++) {
      const time = now - (24 - i) * 3600000; // Last 24 hours
      tempData.push([time, 20 + Math.random() * 5 + Math.sin(i / 4) * 3]);
      humidityData.push([time, 50 + Math.random() * 10 + Math.cos(i / 3) * 8]);
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        textStyle: {
          fontSize: 11,
        },
      },
      grid: {
        left: '50',
        right: '40',
        top: '30',
        bottom: '30',
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          fontSize: 10,
          formatter: (value: number) => {
            const date = new Date(value);
            return date.getHours() + ':00';
          },
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Temp (°C)',
          nameTextStyle: {
            fontSize: 10,
          },
          axisLabel: {
            fontSize: 10,
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: '#e0e0e0',
            },
          },
        },
        {
          type: 'value',
          name: 'Humidity (%)',
          nameTextStyle: {
            fontSize: 10,
          },
          axisLabel: {
            fontSize: 10,
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: 'Temperature',
          type: 'line',
          data: tempData,
          smooth: true,
          lineStyle: {
            width: 2,
            color: '#0078d4',
          },
          itemStyle: {
            color: '#0078d4',
          },
          showSymbol: false,
          yAxisIndex: 0,
        },
        {
          name: 'Humidity',
          type: 'line',
          data: humidityData,
          smooth: true,
          lineStyle: {
            width: 2,
            color: '#107c10',
          },
          itemStyle: {
            color: '#107c10',
          },
          showSymbol: false,
          yAxisIndex: 1,
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div ref={chartRef} className={styles.chart}></div>
    </div>
  );
};
