/**
 * SyncStatusBar Component
 *
 * Displays last sync information for a data type (INPUTS, OUTPUTS, VARIABLES, etc.)
 * Shows sync time, method (FFI Backend vs Manual Refresh), and provides action buttons.
 */

import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Spinner,
  Badge,
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowSync20Regular,
  Settings20Regular,
  CheckmarkCircle20Filled,
  ErrorCircle20Filled,
  Clock20Regular,
} from '@fluentui/react-icons';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { SyncSettingsDrawer } from './SyncSettingsDrawer';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '40px',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  syncInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  syncText: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground2,
  },
  syncMethod: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  button: {
    fontSize: tokens.fontSizeBase100,
  },
});

export interface SyncStatusBarProps {
  dataType: string;
  serialNumber: string;
  onRefresh?: () => Promise<void>;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  dataType,
  serialNumber,
  onRefresh,
}) => {
  const styles = useStyles();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { syncStatus, loading, error, refresh: refreshStatus, timeAgo } = useSyncStatus({
    serialNumber,
    dataType,
    autoRefresh: true,
    refreshIntervalMs: 30000, // Refresh status every 30s
  });

  const { config, isRefreshing: isAutoRefreshing } = useAutoRefresh({
    pageName: dataType.toLowerCase(),
    onRefresh: async () => {
      if (onRefresh) {
        await onRefresh();
        await refreshStatus();
      }
    },
  });

  const handleManualRefresh = async () => {
    if (!onRefresh) return;

    setIsManualRefreshing(true);
    try {
      await onRefresh();
      await refreshStatus();
    } catch (err) {
      console.error('Manual refresh failed:', err);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const renderSyncIcon = () => {
    if (loading || isManualRefreshing || isAutoRefreshing) {
      return <Spinner size="tiny" />;
    }

    if (error || syncStatus?.success === false) {
      return (
        <Tooltip content="Last sync failed" relationship="label">
          <ErrorCircle20Filled primaryFill={tokens.colorPaletteRedForeground1} />
        </Tooltip>
      );
    }

    if (syncStatus) {
      return (
        <Tooltip content="Last sync successful" relationship="label">
          <CheckmarkCircle20Filled primaryFill={tokens.colorPaletteGreenForeground1} />
        </Tooltip>
      );
    }

    return <Clock20Regular />;
  };

  const renderSyncMethod = () => {
    if (!syncStatus) return null;

    const methodText =
      syncStatus.syncMethod === 'FFI_BACKEND' ? 'Backend Service' : 'Manual Refresh';
    const badgeColor =
      syncStatus.syncMethod === 'FFI_BACKEND' ? 'informative' : 'success';

    return (
      <Badge appearance="tint" color={badgeColor} size="small">
        {methodText}
      </Badge>
    );
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.leftSection}>
          <div className={styles.syncInfo}>
            {renderSyncIcon()}
            {loading ? (
              <Text className={styles.syncText}>Loading sync status...</Text>
            ) : error ? (
              <Text className={styles.syncText}>Unable to load sync status</Text>
            ) : syncStatus ? (
              <>
                <Text className={styles.syncText}>
                  Last synced: <strong>{timeAgo}</strong>
                  {syncStatus.syncTimeFmt && (
                    <span className={styles.syncMethod}> ({syncStatus.syncTimeFmt})</span>
                  )}
                </Text>
                {renderSyncMethod()}
                {syncStatus.recordsSynced > 0 && (
                  <Text className={styles.syncMethod}>
                    ({syncStatus.recordsSynced} records)
                  </Text>
                )}
              </>
            ) : (
              <Text className={styles.syncText}>No sync data available</Text>
            )}
          </div>
          {config?.autoRefreshEnabled && (
            <Tooltip
              content={`Auto-refreshing every ${config.refreshIntervalSecs} seconds`}
              relationship="label"
            >
              <Badge appearance="tint" color="warning" size="small">
                Auto-refresh ON
              </Badge>
            </Tooltip>
          )}
        </div>

        <div className={styles.rightSection}>
          <Button
            appearance="subtle"
            size="small"
            icon={<ArrowSync20Regular />}
            onClick={handleManualRefresh}
            disabled={isManualRefreshing || loading}
            className={styles.button}
          >
            Refresh Now
          </Button>
          <Button
            appearance="subtle"
            size="small"
            icon={<Settings20Regular />}
            onClick={() => setIsDrawerOpen(true)}
            className={styles.button}
          >
            Settings
          </Button>
        </div>
      </div>

      <SyncSettingsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        dataType={dataType}
        serialNumber={serialNumber}
      />
    </>
  );
};
