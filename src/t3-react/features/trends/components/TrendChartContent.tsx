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

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Button,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ArrowDownloadRegular,
  PlayRegular,
  PauseRegular,
  ArrowResetRegular,
  ChevronDownRegular,
  DatabaseRegular,
  ImageRegular,
  ArrowUpRegular,
  ArrowDownRegular,
  ArrowLeftRegular,
  ArrowRightRegular,
  DocumentRegular,
} from '@fluentui/react-icons';
import { TrendChart, TrendSeries } from './TrendChart';
import { TrendChartApiService, TrendDataRequest, SpecificPoint } from '../services/trendChartApi';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    gap: '12px',
    padding: '12px',
    overflow: 'hidden',
  },
  leftPanel: {
    flex: '0 0 220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  },
  seriesPanelHeader: {
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: `${tokens.borderRadiusMedium} ${tokens.borderRadiusMedium} 0 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  seriesPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: `0 0 ${tokens.borderRadiusMedium} ${tokens.borderRadiusMedium}`,
    overflowY: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderTop: 'none',
  },
  seriesItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    fontSize: '12px',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  seriesItemContent: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  seriesItemName: {
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: tokens.fontWeightSemibold,
  },
  seriesItemUnit: {
    display: 'block',
    color: tokens.colorNeutralForeground3,
    fontSize: '11px',
  },
  colorBox: {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    flexShrink: 0,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  chartViewerContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    overflow: 'hidden',
  },
  chartViewerHeader: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `2px solid ${tokens.colorNeutralStroke1}`,
  },
  chartTitle: {
    padding: '12px 16px 8px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    flexWrap: 'wrap',
    minHeight: '40px',
  },
  chartContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    padding: '16px',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  controlLabel: {
    fontSize: '11px',
    fontWeight: tokens.fontWeightRegular,
    whiteSpace: 'nowrap',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: tokens.colorNeutralStroke1,
    flexShrink: 0,
  },
  statusTags: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  spacer: {
    flex: 1,
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
  },
  emptyStateCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    flexDirection: 'column',
    gap: '16px',
  },
});

export interface TrendChartContentProps {
  serialNumber?: number;
  panelId?: number;
  trendlogId?: string;
  monitorId?: string; // Currently unused but may be needed for future multi-monitor support
  isDrawerMode?: boolean;
  onToolbarRender?: (toolbar: React.ReactNode) => void;
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
  const isDrawerMode = props.isDrawerMode || false;
  const onToolbarRender = props.onToolbarRender;

  // monitorId may be used in future for multi-monitor support
  // const monitorId = props.monitorId || '0';

  // State
  const [series, setSeries] = useState<TrendSeries[]>([]);
  const [timeBase, setTimeBase] = useState<TimeBase>('5m');
  const [showGrid, setShowGrid] = useState(true);
  const [isRealtime, setIsRealtime] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentView, setCurrentView] = useState<1 | 2 | 3>(1);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);

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
   * Zoom controls
   */
  const timeBaseOrder: TimeBase[] = ['5m', '10m', '30m', '1h', '4h', '12h', '1d', '4d'];
  const canZoomIn = timeBaseOrder.indexOf(timeBase) > 0;
  const canZoomOut = timeBaseOrder.indexOf(timeBase) < timeBaseOrder.length - 1;

  const zoomIn = useCallback(() => {
    const currentIndex = timeBaseOrder.indexOf(timeBase);
    if (currentIndex > 0) {
      setTimeBase(timeBaseOrder[currentIndex - 1]);
    }
  }, [timeBase]);

  const zoomOut = useCallback(() => {
    const currentIndex = timeBaseOrder.indexOf(timeBase);
    if (currentIndex < timeBaseOrder.length - 1) {
      setTimeBase(timeBaseOrder[currentIndex + 1]);
    }
  }, [timeBase]);

  const resetTimeBase = useCallback(() => {
    setTimeBase('5m');
  }, []);

  /**
   * View switching
   */
  const handleViewChange = useCallback((view: 1 | 2 | 3) => {
    setCurrentView(view);
    // View 2 & 3 could show different time ranges or configurations
    // For now, just track the view state
  }, []);

  /**
   * Toggle keyboard shortcuts
   */
  const toggleKeyboard = useCallback(() => {
    setKeyboardEnabled((prev) => !prev);
  }, []);

  /**
   * Export chart as PNG
   */
  const exportToPNG = useCallback(() => {
    // TODO: Implement chart to PNG export
    // This would require accessing the ECharts instance and using its built-in export
    console.log('Export to PNG - Not yet implemented');
  }, []);

  /**
   * Export data to JSON
   */
  const exportToJSON = useCallback(() => {
    const data = series.map((s) => ({
      name: s.name,
      pointType: s.pointType,
      pointIndex: s.pointIndex,
      unit: s.unit,
      data: s.data.map((d) => ({
        timestamp: new Date(d.timestamp).toISOString(),
        value: d.value,
      })),
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trend_data_${serialNumber}_${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [series, serialNumber]);

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

  // Toolbar JSX - memoized for performance
  const toolbar = useMemo(() => (
    <div className={styles.toolbar}>
      {/* Time Base Control Group */}
      <div className={styles.controlGroup}>
        <Text className={styles.controlLabel}>Time Base:</Text>
        <Dropdown
          value={timeBase}
          selectedOptions={[timeBase]}
          onOptionSelect={(_, data) => setTimeBase(data.optionValue as TimeBase)}
          size="small"
          style={{ fontSize: '11px', minWidth: '100px', fontWeight: 'normal' }}
        >
          <Option value="5m">5 minutes</Option>
          <Option value="10m">10 minutes</Option>
          <Option value="30m">30 minutes</Option>
          <Option value="1h">1 hour</Option>
          <Option value="4h">4 hours</Option>
          <Option value="12h">12 hours</Option>
          <Option value="1d">1 day</Option>
          <Option value="4d">4 days</Option>
        </Dropdown>
      </div>

      <div className={styles.divider} />

      {/* Navigation Arrows */}
      <div className={styles.controlGroup}>
        <Button
          appearance="subtle"
          icon={<ArrowLeftRegular fontSize={16} />}
          onClick={() => console.log('Move time left')}
          disabled={isRealtime || loading}
          size="small"
          style={{ minWidth: '20px', padding: '2px', width: '20px' }}
        />
        <Button
          appearance="subtle"
          icon={<ArrowRightRegular fontSize={16} />}
          onClick={() => console.log('Move time right')}
          disabled={isRealtime || loading}
          size="small"
          style={{ minWidth: '20px', padding: '2px', width: '20px' }}
        />
      </div>

      {/* Zoom Controls */}
      <div className={styles.controlGroup}>
        <Button
          appearance="subtle"
          icon={<ArrowUpRegular fontSize={16} />}
          onClick={zoomIn}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 'normal' }}
        >
          Zoom In
        </Button>
        <Button
          appearance="subtle"
          icon={<ArrowDownRegular fontSize={16} />}
          onClick={zoomOut}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 'normal' }}
        >
          Zoom Out
        </Button>
      </div>

      {/* Reset Button */}
      <div className={styles.controlGroup}>
        <Button
          appearance="subtle"
          icon={<ArrowResetRegular fontSize={16} />}
          onClick={resetTimeBase}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 'normal' }}
        >
          Reset
        </Button>
      </div>

      <div className={styles.divider} />

      {/* View Buttons */}
      <div className={styles.controlGroup}>
        <Button
          appearance={currentView === 1 ? 'primary' : 'subtle'}
          onClick={() => setCurrentView(1)}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
        >
          View 1
        </Button>
        <Button
          appearance={currentView === 2 ? 'primary' : 'subtle'}
          onClick={() => setCurrentView(2)}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
        >
          View 2
        </Button>
        <Button
          appearance={currentView === 3 ? 'primary' : 'subtle'}
          onClick={() => setCurrentView(3)}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
        >
          View 3
        </Button>
      </div>

      <div className={styles.divider} />

      {/* Status Tags */}
      <div className={styles.statusTags}>
        <Badge
          appearance="filled"
          color={isRealtime ? 'success' : 'informative'}
          size="small"
        >
          {isRealtime ? 'Live' : 'Historical'}
        </Badge>
        <Badge appearance="outline" size="small">
          {timeBase === '5m' ? '5 minutes' :
           timeBase === '10m' ? '10 minutes' :
           timeBase === '30m' ? '30 minutes' :
           timeBase === '1h' ? '1 hour' :
           timeBase === '4h' ? '4 hours' :
           timeBase === '12h' ? '12 hours' :
           timeBase === '1d' ? '1 day' :
           timeBase === '4d' ? '4 days' : timeBase}
        </Badge>
      </div>

      <div className={styles.divider} />

      {/* Config Button */}
      <div className={styles.controlGroup}>
        <Button
          appearance="subtle"
          icon={<DatabaseRegular />}
          onClick={() => console.log('Config - Not yet implemented')}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
        >
          Config
        </Button>
      </div>

      {/* Export Menu */}
      <div className={styles.controlGroup}>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              icon={<ArrowDownloadRegular />}
              disabled={loading}
              size="small"
              style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
            >
              Export
            </Button>
          </MenuTrigger>

          <MenuPopover>
            <MenuList>
              <MenuItem icon={<ImageRegular />} onClick={exportToPNG}>
                Export as PNG
              </MenuItem>
              <MenuItem icon={<ArrowDownloadRegular />} onClick={exportToCSV}>
                Export as CSV
              </MenuItem>
              <MenuItem icon={<ArrowDownloadRegular />} onClick={exportToJSON}>
                Export as JSON
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>

      {loading && <Spinner size="tiny" />}
    </div>
  ), [
    timeBase,
    currentView,
    isRealtime,
    loading,
    zoomIn,
    zoomOut,
    resetTimeBase,
    exportToPNG,
    exportToCSV,
    exportToJSON,
  ]);

  // Call onToolbarRender when in drawer mode
  useEffect(() => {
    if (isDrawerMode && onToolbarRender) {
      onToolbarRender(toolbar);
    }
    // Cleanup: clear toolbar when component unmounts or mode changes
    return () => {
      if (isDrawerMode && onToolbarRender) {
        onToolbarRender(null);
      }
    };
  }, [toolbar, isDrawerMode, onToolbarRender]);

  return (
    <div className={styles.container}>
      {/* Left Panel - Series List */}
      <div className={styles.leftPanel}>
        <div className={styles.seriesPanelHeader}>
          <Text size={300} weight="semibold">
            Data Series ({series.filter(s => s.visible !== false).length}/{series.length})
          </Text>
        </div>

        <div className={styles.seriesPanel}>
          {series.map((s, index) => (
            <div key={`${s.pointType}-${s.pointIndex}`} className={styles.seriesItem}>
              <div className={styles.colorBox} style={{ backgroundColor: s.color }} />
              <div className={styles.seriesItemContent}>
                <Text size={200} className={styles.seriesItemName}>
                  {s.name}
                </Text>
                <Text size={100} className={styles.seriesItemUnit}>
                  {s.unit || 'N/A'}
                </Text>
              </div>
              <Switch
                checked={s.visible !== false}
                onChange={() => toggleSeriesVisibility(index)}
                aria-label={`Toggle ${s.name}`}
              />
            </div>
          ))}

          {series.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                No data series configured
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Trend Chart Viewer */}
      <div className={styles.chartViewerContainer}>
        {/* Chart Viewer Header - hide in drawer mode */}
        {!isDrawerMode && (
        <div className={styles.chartViewerHeader}>
          {/* Title */}
          <div className={styles.chartTitle}>
            <Text size={400} weight="semibold">
              Trend Chart Viewer
            </Text>
          </div>

          {/* Toolbar - conditionally rendered */}
          {!(isDrawerMode && onToolbarRender) && (
            <div className={styles.toolbar}>
            {/* Time Base */}
            <div className={styles.controlGroup}>
              <Text size={200}>Time:</Text>
              <Dropdown
                value={timeBase}
                onOptionSelect={(_, data) => setTimeBase(data.optionValue as TimeBase)}
                size="small"
                style={{ minWidth: '120px' }}
              >
                <Option value="5m">5 minutes</Option>
                <Option value="10m">10 minutes</Option>
                <Option value="30m">30 minutes</Option>
                <Option value="1h">1 hour</Option>
                <Option value="4h">4 hours</Option>
                <Option value="12h">12 hours</Option>
                <Option value="1d">1 day</Option>
                <Option value="4d">4 days</Option>
              </Dropdown>
            </div>

            <ToolbarDivider />

            {/* Zoom Controls */}
            <div className={styles.controlGroup}>
              <ToolbarButton
                icon={<ZoomOutRegular />}
                onClick={zoomOut}
                disabled={!canZoomOut}
                title="Zoom Out (Longer timebase)"
              >
                Zoom Out
              </ToolbarButton>
              <ToolbarButton
                icon={<ZoomInRegular />}
                onClick={zoomIn}
                disabled={!canZoomIn}
                title="Zoom In (Shorter timebase)"
              >
                Zoom In
              </ToolbarButton>
            </div>

            <ToolbarDivider />

            {/* Reset */}
            <ToolbarButton
              icon={<ArrowResetRegular />}
              onClick={resetTimeBase}
              title="Reset to default 5 minutes timebase"
            >
              Reset
            </ToolbarButton>

            <ToolbarDivider />

            {/* View Buttons */}
            <div className={styles.controlGroup}>
              <Button
                size="small"
                appearance={currentView === 1 ? 'primary' : 'secondary'}
                onClick={() => handleViewChange(1)}
              >
                View 1
              </Button>
              <Button
                size="small"
                appearance={currentView === 2 ? 'primary' : 'secondary'}
                onClick={() => handleViewChange(2)}
              >
                View 2
              </Button>
              <Button
                size="small"
                appearance={currentView === 3 ? 'primary' : 'secondary'}
                onClick={() => handleViewChange(3)}
              >
                View 3
              </Button>
            </div>

            <ToolbarDivider />

            {/* Live Status with timestamp */}
            {isRealtime && lastUpdate && (
              <Badge appearance="filled" color="success" size="small">
                ● Live-{lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/:/g, '')}
              </Badge>
            )}
            {!isRealtime && (
              <Badge appearance="outline" color="informative" size="small">
                Historical
              </Badge>
            )}

            <ToolbarDivider />

            {/* Keyboard Shortcut Toggle */}
            <Button
              size="small"
              appearance={keyboardEnabled ? 'primary' : 'secondary'}
              onClick={toggleKeyboard}
              title={keyboardEnabled ? 'Keyboard shortcuts enabled' : 'Keyboard shortcuts disabled'}
            >
              ⌨️ {keyboardEnabled ? 'KB On' : 'KB Off'}
            </Button>

            <ToolbarDivider />

            {/* Grid Toggle */}
            <div className={styles.controlGroup}>
              <Switch checked={showGrid} onChange={(_, data) => setShowGrid(data.checked)} />
              <Text size={200}>Grid</Text>
            </div>

            <ToolbarDivider />

            {/* Config Button */}
            <ToolbarButton
              icon={<DatabaseRegular />}
              onClick={() => console.log('Config - Not yet implemented')}
              title="Trendlog Configuration"
            >
              Config
            </ToolbarButton>

            {/* Export Menu */}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button
                  size="small"
                  icon={<ArrowDownloadRegular />}
                  iconPosition="before"
                  disabled={series.length === 0}
                >
                  Export <ChevronDownRegular style={{ fontSize: '12px', marginLeft: '2px' }} />
                </Button>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem icon={<ImageRegular />} onClick={exportToPNG}>
                    Export as PNG
                  </MenuItem>
                  <MenuItem icon={<DocumentRegular />} onClick={exportToCSV}>
                    Export Data (CSV)
                  </MenuItem>
                  <MenuItem icon={<DocumentRegular />} onClick={exportToJSON}>
                    Export Data (JSON)
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>

            <ToolbarDivider />

            {/* Live/Pause & Refresh Controls */}
            <ToolbarButton
              icon={isRealtime ? <PauseRegular /> : <PlayRegular />}
              onClick={() => setIsRealtime(!isRealtime)}
            >
              {isRealtime ? 'Pause' : 'Live'}
            </ToolbarButton>

            <ToolbarButton
              icon={<ArrowSyncRegular />}
              onClick={loadHistoricalData}
              disabled={loading}
            >
              Refresh
            </ToolbarButton>

            <div className={styles.spacer} />

            {loading && <Spinner size="tiny" label="Loading..." />}
            </div>
          )}
        </div>
        )}

        {/* Chart Container */}
        <div className={styles.chartContainer}>
          {series.length > 0 ? (
            <TrendChart series={series} timeBase={timeBase} showGrid={showGrid} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
              <Text size={500} weight="semibold">No Data Available</Text>
              <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
                Please select a device and monitor configuration.
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
