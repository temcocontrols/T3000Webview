/**
 * TrendLogsPage Component
 *
 * View and analyze trend log data with charts
 */

import React, { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  makeStyles,
  tokens,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import { ChartMultipleRegular, ArrowDownloadRegular } from '@fluentui/react-icons';
import { ChartComponent, ChartDataSeries, LoadingSpinner, EmptyState } from '@t3-react/components';
import { useDeviceData } from '@t3-react/hooks';
import { useTrendStore } from '@t3-react/store';
import type { TrendLog } from '@common/react/types/bacnet';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  toolbar: {
    padding: '16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    width: '300px',
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: '16px',
    overflow: 'auto',
  },
  chart: {
    flex: 1,
    padding: '16px',
  },
  trendList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
});

export const TrendLogsPage: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice } = useDeviceData();
  const trendLogs = useTrendStore((state) => state.trendLogs);
  const [loading, setLoading] = useState(false);
  const [selectedTrends, setSelectedTrends] = useState<Set<number>>(new Set());
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (selectedDevice) {
      loadTrendLogs();
    }
  }, [selectedDevice]);

  const loadTrendLogs = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    try {
      // TODO: Fetch trend logs
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTrend = (trendId: number) => {
    const newSelected = new Set(selectedTrends);
    if (newSelected.has(trendId)) {
      newSelected.delete(trendId);
    } else {
      newSelected.add(trendId);
    }
    setSelectedTrends(newSelected);
  };

  // Generate chart data from selected trends
  const chartSeries: ChartDataSeries[] = trendLogs
    .filter((trend) => selectedTrends.has(trend.id))
    .map((trend) => ({
      name: trend.label,
      data: trend.data || [],
      color: trend.color,
    }));

  if (!selectedDevice) {
    return (
      <div className={styles.container}>
        <EmptyState
          title="No Device Selected"
          message="Please select a device from the tree to view trend logs"
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading trend logs..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <ChartMultipleRegular />
        <span>Trend Logs</span>
        <div style={{ flex: 1 }} />
        <Dropdown
          value={timeRange}
          onOptionSelect={(_, data) => setTimeRange(data.optionValue || '24h')}
        >
          <Option value="1h">Last Hour</Option>
          <Option value="24h">Last 24 Hours</Option>
          <Option value="7d">Last 7 Days</Option>
          <Option value="30d">Last 30 Days</Option>
        </Dropdown>
        <Button icon={<ArrowDownloadRegular />}>Export</Button>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <h3>Available Trends</h3>
          <div className={styles.trendList}>
            {trendLogs.map((trend) => (
              <Checkbox
                key={trend.id}
                label={trend.label}
                checked={selectedTrends.has(trend.id)}
                onChange={() => handleToggleTrend(trend.id)}
              />
            ))}
          </div>
          {trendLogs.length === 0 && (
            <EmptyState
              title="No Trends"
              message="No trend logs configured"
            />
          )}
        </div>

        <div className={styles.chart}>
          {chartSeries.length > 0 ? (
            <ChartComponent
              series={chartSeries}
              title="Trend Data"
              height="100%"
            />
          ) : (
            <EmptyState
              title="No Trends Selected"
              message="Select one or more trends from the sidebar to display"
            />
          )}
        </div>
      </div>
    </div>
  );
};
