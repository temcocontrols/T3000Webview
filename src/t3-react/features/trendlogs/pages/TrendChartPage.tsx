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
import { makeStyles, tokens, Button, Tooltip } from '@fluentui/react-components';
import { FullScreenMinimizeRegular } from '@fluentui/react-icons';
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
    initialTimeBase?: string;
    returnUrl?: string;
  } | null;

  const [urlParams, setUrlParams] = useState<{
    serialNumber?: number;
    panelId?: number;
    trendlogId?: string;
    monitorId?: string;
  }>({});
  const [shouldRedirectToTrendCenter, setShouldRedirectToTrendCenter] = useState(false);

  // Parse URL query params (C++ path — only used when no navState)
  useEffect(() => {
    if (navState) return;
    const searchParams = new URLSearchParams(location.search);
    const legacyMode = searchParams.get('legacy') === '1';
    const fullMode = searchParams.get('mode') === 'full';
    const serialNumber = searchParams.get('serial') || searchParams.get('serial_number');
    const panelId = searchParams.get('panel') || searchParams.get('panel_id');
    const trendlogId = searchParams.get('trendlogId') || searchParams.get('trendlog_id');
    const monitorId = searchParams.get('monitorId') || searchParams.get('monitor_id');
    setUrlParams({
      serialNumber: serialNumber ? parseInt(serialNumber, 10) : undefined,
      panelId: panelId ? parseInt(panelId, 10) : undefined,
      trendlogId: trendlogId || undefined,
      monitorId: monitorId || undefined,
    });

    if (!legacyMode && !fullMode) {
      setShouldRedirectToTrendCenter(true);
    }
  }, [navState, location.search]);

  const params = navState ?? urlParams;
  const fromReact = !!navState;
  const returnUrl = React.useMemo(() => {
    if (navState?.returnUrl) return navState.returnUrl;
    const hasContext =
      params.serialNumber != null ||
      params.panelId != null ||
      !!params.monitorId ||
      !!params.trendlogId;
    if (!hasContext) return undefined;

    const next = new URLSearchParams();
    next.set('tab', 'chart');
    if (params.serialNumber != null) next.set('serial', String(params.serialNumber));
    if (params.panelId != null) next.set('panel', String(params.panelId));
    if (params.monitorId) next.set('monitorId', params.monitorId);
    if (params.trendlogId) next.set('trendlogId', params.trendlogId);
    return `/t3000/trendlogs?${next.toString()}`;
  }, [navState?.returnUrl, params.monitorId, params.panelId, params.serialNumber, params.trendlogId]);

  useEffect(() => {
    if (!shouldRedirectToTrendCenter || navState) return;

    const next = new URLSearchParams();
    next.set('tab', 'chart');
    if (urlParams.serialNumber != null) next.set('serial', String(urlParams.serialNumber));
    if (urlParams.panelId != null) next.set('panel', String(urlParams.panelId));
    if (urlParams.monitorId) next.set('monitorId', urlParams.monitorId);
    if (urlParams.trendlogId) next.set('trendlogId', urlParams.trendlogId);

    navigate(`/t3000/trendlogs?${next.toString()}`, { replace: true });
  }, [shouldRedirectToTrendCenter, navState, urlParams, navigate]);

  if (shouldRedirectToTrendCenter && !navState) {
    return null;
  }

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
          initialTimeBase={navState?.initialTimeBase}
          toolbarActionBeforeBack={
            returnUrl ? (
              <Tooltip content="Back to Embedded View" relationship="label">
                <Button
                  appearance="subtle"
                  icon={<FullScreenMinimizeRegular />}
                  size="small"
                  aria-label="Back to Embedded View"
                  onClick={() => navigate(returnUrl)}
                />
              </Tooltip>
            ) : undefined
          }
          onBack={returnUrl ? () => navigate(returnUrl) : undefined}
        />
      </div>
    </div>
  );
};
