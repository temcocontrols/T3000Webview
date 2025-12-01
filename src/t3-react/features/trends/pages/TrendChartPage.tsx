/**
 * Trend Chart Page
 *
 * Full-page mode opened from C++ Windows application (Graphic Beta button)
 * Parses URL parameters and displays TrendChartContent
 *
 * URL format: /trends/chart?serial_number=237451&panel_id=3&trendlog_id=0&monitor_id=0
 */

import React, { useEffect, useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { TrendChartContent } from '../components/TrendChartContent';

const useStyles = makeStyles({
  pageContainer: {
    width: '100vw',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
});

export const TrendChartPage: React.FC = () => {
  const styles = useStyles();
  const [params, setParams] = useState<{
    serialNumber?: number;
    panelId?: number;
    trendlogId?: string;
    monitorId?: string;
  }>({});

  /**
   * Parse URL parameters from C++ application
   * Example: ?serial_number=237451&panel_id=3&trendlog_id=0&monitor_id=0
   */
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const serialNumber = searchParams.get('serial_number');
    const panelId = searchParams.get('panel_id');
    const trendlogId = searchParams.get('trendlog_id');
    const monitorId = searchParams.get('monitor_id');

    console.log('📊 TrendChartPage: URL params parsed', {
      serialNumber,
      panelId,
      trendlogId,
      monitorId,
    });

    setParams({
      serialNumber: serialNumber ? parseInt(serialNumber, 10) : undefined,
      panelId: panelId ? parseInt(panelId, 10) : undefined,
      trendlogId: trendlogId || undefined,
      monitorId: monitorId || undefined,
    });
  }, []);

  return (
    <div className={styles.pageContainer}>
      <TrendChartContent
        serialNumber={params.serialNumber}
        panelId={params.panelId}
        trendlogId={params.trendlogId}
        monitorId={params.monitorId}
        isDrawerMode={false}
      />
    </div>
  );
};
