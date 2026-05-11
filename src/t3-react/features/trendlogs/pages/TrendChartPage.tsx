/**
 * Trend Chart Page
 *
 * Full-page mode. Opened two ways:
 *  1. From TrendlogsPage (React navigate) — params + monitorInputs passed via location.state
 *  2. From C++ Windows application — params passed as URL query string
 *
 * URL format: /trends/chart?serial_number=237451&panel_id=3&trendlog_id=0&monitor_id=0
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import { TrendChartContent } from '../components/TrendChartContent';

const useStyles = makeStyles({
  pageContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
  chartArea: {
    flex: 1,
    overflow: 'hidden',
  },
});

export const TrendChartPage: React.FC = () => {
  const styles = useStyles();
  const location = useLocation();
  const navigate = useNavigate();

  // State passed from TrendlogsPage via navigate(path, { state: ... })
  const navState = location.state as {
    serialNumber?: number;
    panelId?: number;
    trendlogId?: string;
    monitorId?: string;
    itemData?: any;
    monitorInputs?: any[];
  } | null;

  const [urlParams, setUrlParams] = useState<{
    serialNumber?: number;
    panelId?: number;
    trendlogId?: string;
    monitorId?: string;
  }>({});

  // Parse URL query params (C++ path — only used when no navState)
  useEffect(() => {
    if (navState) return;
    const searchParams = new URLSearchParams(window.location.search);
    const serialNumber = searchParams.get('serial_number');
    const panelId = searchParams.get('panel_id');
    const trendlogId = searchParams.get('trendlog_id');
    const monitorId = searchParams.get('monitor_id');
    setUrlParams({
      serialNumber: serialNumber ? parseInt(serialNumber, 10) : undefined,
      panelId: panelId ? parseInt(panelId, 10) : undefined,
      trendlogId: trendlogId || undefined,
      monitorId: monitorId || undefined,
    });
  }, [navState]);

  const params = navState ?? urlParams;
  const fromReact = !!navState;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.chartArea}>
        <TrendChartContent
          serialNumber={params.serialNumber}
          panelId={params.panelId}
          trendlogId={params.trendlogId}
          monitorId={params.monitorId}
          itemData={navState?.itemData}
          monitorInputs={navState?.monitorInputs}
          isDrawerMode={false}
          onBack={fromReact ? () => navigate(-1) : undefined}
        />
      </div>
    </div>
  );
};
