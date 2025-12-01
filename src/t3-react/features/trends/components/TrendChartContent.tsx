/**
 * Trend Chart Content
 *
 * Shared content component used by both:
 * - TrendChartPage (full page mode from C++)
 * - TrendChartDrawer (popup mode from React)
 *
 * Features:
 * - Real-time data updates (every 5 seconds)
 * - Historical data from database
 * - Multiple time ranges with proper divisions (4 or 6)
 * - Auto-scaling with 3x zoom for small variations
 * - 10 Y-axis tick marks for precise reading
 * - Automatic gap filling on page visibility change
 * - Color scheme with cyan at position 20
 * - Series visibility toggle
 * - Pan/zoom functionality
 * - Export to CSV
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dropdown,
  Option,
  Switch,
  Text,
  Spinner,
  Badge,
  makeStyles,
  tokens,
  ToolbarButton,
  ToolbarDivider,
  Card,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ArrowDownloadRegular,
  PlayRegular,
  PauseRegular,
} from '@fluentui/react-icons';
import { TrendChart, TrendSeries } from './TrendChart';
import { TrendChartApiService, TrendDataRequest, SpecificPoint } from '../services/trendChartApi';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '16px',
    gap: '16px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    flexWrap: 'wrap',
  },
  chartCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    padding: '16px',
  },
  seriesPanel: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    maxHeight: '200px',
    overflowY: 'auto',
  },
  seriesItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  colorBox: {
    width: '16px',
    height: '16px',
    borderRadius: '2px',
  },
  spacer: {
    flex: 1,
  },
});

export interface TrendChartContentProps {
  serialNumber?: number;
  panelId?: number;
  trendlogId?: string;
  monitorId?: string; // Currently unused but may be needed for future multi-monitor support
  isDrawerMode?: boolean;
}

type TimeBase = '5m' | '10m' | '30m' | '1h' | '4h' | '12h' | '1d' | '4d';

// Color palette - Cyan at position 20 per user requirement
const CHART_COLORS = [
  '#FF0000',
  '#0000FF',
  '#00AA00',
  '#FF8000',
  '#AA00AA',
  '#CC6600',
  '#AA0000',
  '#0066AA',
  '#AA6600',
  '#6600AA',
  '#006600',
  '#FF6600',
  '#0000AA',
  '#FF00FF',
  '#008080',
  '#800080',
  '#808000',
  '#FF1493',
  '#4B0082',
  '#DC143C',
  '#00AAAA',
  '#00CED1',
  '#8B4513',
  '#2F4F4F',
  '#B22222',
];

export const TrendChartContent: React.FC<TrendChartContentProps> = (props) => {
  const styles = useStyles();
  const { selectedDevice } = useDeviceTreeStore();

  // Use props or selected device
  const serialNumber = props.serialNumber || selectedDevice?.serialNumber;
  const panelId = props.panelId || selectedDevice?.panelId || 1;
  const trendlogId = props.trendlogId || '0';
  // monitorId may be used in future for multi-monitor support
  // const monitorId = props.monitorId || '0';

  // State
  const [series, setSeries] = useState<TrendSeries[]>([]);
  const [timeBase, setTimeBase] = useState<TimeBase>('1h');
  const [showGrid, setShowGrid] = useState(true);
  const [isRealtime, setIsRealtime] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataTimestampRef = useRef<number>(0);

  /**
   * Load historical data from database
   */
  const loadHistoricalData = useCallback(async () => {
    if (!serialNumber || !panelId) {
      console.warn('⚠️ TrendChartContent: Missing serialNumber or panelId');
      return;
    }

    setLoading(true);
    try {
      // Calculate time range based on timeBase
      const now = Date.now();
      const timeRanges: Record<TimeBase, number> = {
        '5m': 5 * 60 * 1000,
        '10m': 10 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '4d': 4 * 24 * 60 * 60 * 1000,
      };
      const startTime = now - timeRanges[timeBase];

      // Format timestamps for API (backend expects "YYYY-MM-DD HH:mm:ss")
      const formatDateTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // Build request
      const request: TrendDataRequest = {
        serial_number: serialNumber,
        panel_id: panelId,
        trendlog_id: trendlogId,
        start_time: formatDateTime(startTime),
        end_time: formatDateTime(now),
        limit: 10000,
        point_types: ['INPUT', 'OUTPUT', 'VARIABLE', 'MONITOR'],
        specific_points: series.map((s) => ({
          point_id: s.pointId,
          point_type: s.pointType,
          point_index: s.pointIndex, // Already 1-based from monitor config
          panel_id: panelId,
        })),
      };

      console.log('📥 TrendChartContent: Fetching historical data', request);

      const response = await TrendChartApiService.getTrendHistory(request);

      console.log('✅ TrendChartContent: Historical data received', {
        totalRecords: response.total_records,
        dataPoints: response.data.length,
      });

      // Process and merge data into series
      const updatedSeries = [...series];
      response.data.forEach((point) => {
        const seriesIndex = updatedSeries.findIndex((s) => s.pointId === point.point_id && s.pointType === point.point_type);
        if (seriesIndex !== -1) {
          const timestamp = new Date(point.timestamp).getTime();
          updatedSeries[seriesIndex].data.push({
            timestamp,
            value: point.value,
          });

          // Track latest timestamp
          if (timestamp > lastDataTimestampRef.current) {
            lastDataTimestampRef.current = timestamp;
          }
        }
      });

      // Sort data by timestamp
      updatedSeries.forEach((s) => {
        s.data.sort((a, b) => a.timestamp - b.timestamp);
      });

      setSeries(updatedSeries);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ TrendChartContent: Failed to load historical data', error);
    } finally {
      setLoading(false);
    }
  }, [serialNumber, panelId, trendlogId, timeBase, series]);

  /**
   * Initialize series from monitor configuration
   */
  const initializeSeries = useCallback(async () => {
    if (!serialNumber || !panelId) return;

    try {
      // Fetch monitor configuration to know which points to display
      // For now, create sample series - in production, fetch from monitor config
      const sampleSeries: TrendSeries[] = [
        {
          name: 'IN1',
          pointId: 'IN1',
          pointType: 'INPUT',
          pointIndex: 1, // 1-based
          data: [],
          color: CHART_COLORS[0],
          unit: '°C',
          digitalAnalog: 'Analog',
          visible: true,
        },
        {
          name: 'IN2',
          pointId: 'IN2',
          pointType: 'INPUT',
          pointIndex: 2,
          data: [],
          color: CHART_COLORS[1],
          unit: '°C',
          digitalAnalog: 'Analog',
          visible: true,
        },
        {
          name: 'OUT1',
          pointId: 'OUT1',
          pointType: 'OUTPUT',
          pointIndex: 1,
          data: [],
          color: CHART_COLORS[2],
          unit: '%',
          digitalAnalog: 'Analog',
          visible: true,
        },
      ];

      setSeries(sampleSeries);

      console.log('✅ TrendChartContent: Series initialized', {
        count: sampleSeries.length,
        serialNumber,
        panelId,
      });
    } catch (error) {
      console.error('❌ TrendChartContent: Failed to initialize series', error);
    }
  }, [serialNumber, panelId]);

  /**
   * Handle realtime updates
   */
  const updateRealtimeData = useCallback(async () => {
    if (!isRealtime || !serialNumber || !panelId || series.length === 0) return;

    try {
      const points: SpecificPoint[] = series.map((s) => ({
        point_id: s.pointId,
        point_type: s.pointType,
        point_index: s.pointIndex,
        panel_id: panelId,
      }));

      const newData = await TrendChartApiService.getRealtimeData(serialNumber, panelId, points);

      if (newData.length > 0) {
        const updatedSeries = [...series];
        newData.forEach((point) => {
          const seriesIndex = updatedSeries.findIndex((s) => s.pointId === point.point_id && s.pointType === point.point_type);
          if (seriesIndex !== -1) {
            const timestamp = new Date(point.timestamp).getTime();
            updatedSeries[seriesIndex].data.push({
              timestamp,
              value: point.value,
            });

            // Keep only data within time range
            const timeRanges: Record<TimeBase, number> = {
              '5m': 5 * 60 * 1000,
              '10m': 10 * 60 * 1000,
              '30m': 30 * 60 * 1000,
              '1h': 60 * 60 * 1000,
              '4h': 4 * 60 * 60 * 1000,
              '12h': 12 * 60 * 60 * 1000,
              '1d': 24 * 60 * 60 * 1000,
              '4d': 4 * 24 * 60 * 60 * 1000,
            };
            const cutoffTime = Date.now() - timeRanges[timeBase];
            updatedSeries[seriesIndex].data = updatedSeries[seriesIndex].data.filter((d) => d.timestamp >= cutoffTime);
          }
        });

        setSeries(updatedSeries);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('❌ TrendChartContent: Realtime update failed', error);
    }
  }, [isRealtime, serialNumber, panelId, series, timeBase]);

  /**
   * Handle visibility change - backfill missing data
   */
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && isRealtime && lastDataTimestampRef.current > 0) {
        const now = Date.now();
        const gapSeconds = Math.floor((now - lastDataTimestampRef.current) / 1000);

        if (gapSeconds >= 10) {
          console.log('🔄 TrendChartContent: Backfilling data gap', {
            gapSeconds,
            lastTimestamp: new Date(lastDataTimestampRef.current).toISOString(),
          });
          await loadHistoricalData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRealtime, loadHistoricalData]);

  /**
   * Initialize page
   */
  useEffect(() => {
    initializeSeries();
  }, [initializeSeries]);

  /**
   * Load historical data when series or timebase changes
   */
  useEffect(() => {
    if (series.length > 0) {
      loadHistoricalData();
    }
  }, [series.length, timeBase]); // Only trigger on length change, not full series

  /**
   * Start/stop realtime updates
   */
  useEffect(() => {
    if (isRealtime) {
      realtimeIntervalRef.current = setInterval(updateRealtimeData, 5000);
    } else {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
    }

    return () => {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
      }
    };
  }, [isRealtime, updateRealtimeData]);

  /**
   * Toggle series visibility
   */
  const toggleSeriesVisibility = useCallback((index: number) => {
    setSeries((prev) => {
      const updated = [...prev];
      updated[index].visible = !updated[index].visible;
      return updated;
    });
  }, []);

  /**
   * Export data to CSV
   */
  const exportToCSV = useCallback(() => {
    const csv: string[] = [];
    const headers = ['Timestamp', ...series.map((s) => `${s.name} (${s.unit || ''})`)];
    csv.push(headers.join(','));

    // Get all unique timestamps
    const timestamps = new Set<number>();
    series.forEach((s) => {
      s.data.forEach((point) => timestamps.add(point.timestamp));
    });

    // Sort timestamps
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    // Build rows
    sortedTimestamps.forEach((timestamp) => {
      const row = [new Date(timestamp).toISOString()];
      series.forEach((s) => {
        const point = s.data.find((p) => p.timestamp === timestamp);
        row.push(point ? point.value.toFixed(2) : '');
      });
      csv.push(row.join(','));
    });

    // Download
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trend_data_${serialNumber}_${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [series, serialNumber]);

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <Card className={styles.toolbar}>
        <Text size={500} weight="semibold">
          Device {serialNumber} | Panel {panelId}
        </Text>

        <div className={styles.spacer} />

        <Dropdown value={timeBase} onOptionSelect={(_, data) => setTimeBase(data.optionValue as TimeBase)} style={{ minWidth: '100px' }}>
          <Option value="5m">5 minutes</Option>
          <Option value="10m">10 minutes</Option>
          <Option value="30m">30 minutes</Option>
          <Option value="1h">1 hour</Option>
          <Option value="4h">4 hours</Option>
          <Option value="12h">12 hours</Option>
          <Option value="1d">1 day</Option>
          <Option value="4d">4 days</Option>
        </Dropdown>

        <ToolbarDivider />

        <Switch checked={showGrid} onChange={(_, data) => setShowGrid(data.checked)} label="Grid" />

        <ToolbarDivider />

        <ToolbarButton icon={isRealtime ? <PauseRegular /> : <PlayRegular />} onClick={() => setIsRealtime(!isRealtime)}>
          {isRealtime ? 'Pause' : 'Play'}
        </ToolbarButton>

        <ToolbarButton icon={<ArrowSyncRegular />} onClick={loadHistoricalData} disabled={loading}>
          Refresh
        </ToolbarButton>

        <ToolbarButton icon={<ArrowDownloadRegular />} onClick={exportToCSV} disabled={series.length === 0}>
          Export CSV
        </ToolbarButton>

        {lastUpdate && (
          <Badge appearance="outline" size="small">
            Last update: {lastUpdate.toLocaleTimeString()}
          </Badge>
        )}

        {loading && <Spinner size="tiny" />}
      </Card>

      {/* Series Panel */}
      <div className={styles.seriesPanel}>
        {series.map((s, index) => (
          <div key={`${s.pointType}-${s.pointIndex}`} className={styles.seriesItem}>
            <div className={styles.colorBox} style={{ backgroundColor: s.color }} />
            <Text size={300}>{s.name}</Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {s.unit}
            </Text>
            <Switch checked={s.visible !== false} onChange={() => toggleSeriesVisibility(index)} />
          </div>
        ))}
      </div>

      {/* Chart */}
      <Card className={styles.chartCard}>
        {series.length > 0 ? (
          <TrendChart series={series} timeBase={timeBase} showGrid={showGrid} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Text>No data available. Please select a device and monitor configuration.</Text>
          </div>
        )}
      </Card>
    </div>
  );
};
