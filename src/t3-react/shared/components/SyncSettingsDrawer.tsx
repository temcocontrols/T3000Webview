/**
 * SyncSettingsDrawer Component
 *
 * Drawer panel showing sync history and auto-refresh configuration.
 * Allows users to view past syncs and configure auto-refresh settings.
 */

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  makeStyles,
  tokens,
  Button,
  Switch,
  SpinButton,
  Text,
  Divider,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  CheckmarkCircle20Filled,
  ErrorCircle20Filled,
} from '@fluentui/react-icons';
import { SyncStatus } from '../hooks/useSyncStatus';
import { useAutoRefresh, AutoRefreshConfig } from '../hooks/useAutoRefresh';
import { API_BASE_URL } from '../../config/constants';

/**
 * Convert UTC timestamp to local time string
 * @param utcTimestamp Unix timestamp in seconds (UTC)
 * @returns Formatted local time string "YYYY-MM-DD HH:MM:SS"
 */
const formatUtcToLocalTime = (utcTimestamp: number): string => {
  const date = new Date(utcTimestamp * 1000); // Convert to milliseconds
  return date.toLocaleString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');
};

const useStyles = makeStyles({
  drawer: {
    width: '380px',
  },
  drawerHeader: {
    padding: '8px 12px',
    minHeight: 'auto',
  },
  drawerHeaderTitle: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  drawerBody: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    height: '100%',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },
  sectionHistory: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexGrow: 1,
    minHeight: '100px',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    paddingRight: '2px',
    maxHeight: '400px',
    scrollbarWidth: 'thin',
    scrollbarColor: `${tokens.colorNeutralStroke2} transparent`,
    '&::-webkit-scrollbar': {
      width: '2px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: tokens.colorNeutralStroke2,
      borderRadius: '1px',
      '&:hover': {
        backgroundColor: tokens.colorNeutralStroke1,
      },
    },
  },
  bottomSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    marginBottom: '4px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  historyIcon: {
    flexShrink: 0,
  },
  historyContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  historyTime: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  historyDetails: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  historyError: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorPaletteRedForeground1,
    marginTop: '4px',
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusSmall,
  },
  configLabelContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  configLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  configHint: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-start',
    marginTop: '16px',
  },
  actionButton: {
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase200,
    minWidth: '100px',
    height: '28px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px',
    color: tokens.colorNeutralForeground3,
  },
  errorNotice: {
    padding: '8px 12px',
    backgroundColor: '#fef6f6',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #fde7e9',
  },
  errorIcon: {
    color: '#d13438',
    fontSize: '16px',
    flexShrink: 0,
  },
  errorText: {
    color: '#d13438',
    fontWeight: tokens.fontWeightMedium,
    fontSize: tokens.fontSizeBase200,
  },
});

export interface SyncSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: string;
  serialNumber: string;
}

export const SyncSettingsDrawer: React.FC<SyncSettingsDrawerProps> = ({
  isOpen,
  onClose,
  dataType,
  serialNumber,
}) => {
  const styles = useStyles();
  const [syncHistory, setSyncHistory] = useState<SyncStatus[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [localConfig, setLocalConfig] = useState<AutoRefreshConfig>({
    autoRefreshEnabled: false,
    refreshIntervalSecs: 30,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { config, updateConfig, loading: configLoading } = useAutoRefresh({
    pageName: dataType.toLowerCase(),
    onRefresh: async () => {}, // No-op, we don't auto-refresh in the drawer
    enabled: false,
  });

  // Load config into local state
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  }, [config]);

  // Fetch sync history when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/sync-status/${serialNumber}/${dataType}/history?limit=10`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch sync history');
        }

        const data = await response.json();
        setSyncHistory(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setHistoryError(errorMessage);
        console.error('Error fetching sync history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [isOpen, serialNumber, dataType]);

  const handleConfigChange = (field: keyof AutoRefreshConfig, value: boolean | number) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateConfig(localConfig);
      setHasChanges(false);
      onClose();
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  const handleCancel = () => {
    if (config) {
      setLocalConfig(config);
    }
    setHasChanges(false);
    onClose();
  };

  const renderHistoryIcon = (item: SyncStatus) => {
    if (item.success) {
      return (
        <CheckmarkCircle20Filled
          className={styles.historyIcon}
          primaryFill={tokens.colorPaletteGreenForeground1}
        />
      );
    }
    return (
      <ErrorCircle20Filled
        className={styles.historyIcon}
        primaryFill={tokens.colorPaletteRedForeground1}
      />
    );
  };

  const renderSyncMethod = (method: string) => {
    const isBackend = method === 'FFI_BACKEND';
    return (
      <Badge appearance="tint" color={isBackend ? 'informative' : 'success'} size="small">
        {isBackend ? 'Backend' : 'Manual'}
      </Badge>
    );
  };

  return (
    <Drawer
      type="overlay"
      position="end"
      open={isOpen}
      onOpenChange={(_, { open }) => !open && handleCancel()}
      size="medium"
      className={styles.drawer}
    >
      <DrawerHeader className={styles.drawerHeader}>
        <DrawerHeaderTitle
          className={styles.drawerHeaderTitle}
          action={
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular />}
              onClick={handleCancel}
            />
          }
        >
          Sync Settings - {dataType}
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.drawerBody}>
        {/* Sync History Section */}
        <div className={styles.sectionHistory}>
          <Text className={styles.sectionTitle}>Sync History</Text>
          {loadingHistory ? (
            <div className={styles.emptyState}>
              <Spinner size="small" />
              <Text>Loading history...</Text>
            </div>
          ) : historyError ? (
            <div className={styles.errorNotice}>
              <ErrorCircle20Filled className={styles.errorIcon} />
              <Text className={styles.errorText}>{historyError}</Text>
            </div>
          ) : syncHistory.length === 0 ? (
            <div className={styles.emptyState}>
              <Text>No sync history available</Text>
            </div>
          ) : (
            <div className={styles.historyList}>
              {syncHistory.map((item) => (
                <div key={item.id} className={styles.historyItem}>
                  {renderHistoryIcon(item)}
                  <div className={styles.historyContent}>
                    <Text className={styles.historyTime}>{formatUtcToLocalTime(item.syncTime)}</Text>
                    <div className={styles.historyDetails}>
                      {renderSyncMethod(item.syncMethod)} • {item.recordsSynced} records
                    </div>
                    {item.errorMessage && (
                      <Text className={styles.historyError}>{item.errorMessage}</Text>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Section - Divider, Settings, Actions */}
        <div className={styles.bottomSection}>
          <Divider />

          {/* Auto-Refresh Configuration */}
          <div className={styles.section}>
          <Text className={styles.sectionTitle}>Auto-Refresh Settings</Text>

          <div className={styles.configRow}>
            <div className={styles.configLabelContainer}>
              <Text className={styles.configLabel}>Enable Auto-Refresh</Text>
              <Text className={styles.configHint}>
                Automatically refresh data from device at regular intervals
              </Text>
            </div>
            <Switch
              checked={localConfig.autoRefreshEnabled}
              onChange={(_, data) =>
                handleConfigChange('autoRefreshEnabled', data.checked)
              }
              disabled={configLoading}
            />
          </div>

          <div className={styles.configRow}>
            <div className={styles.configLabelContainer}>
              <Text className={styles.configLabel}>Refresh Interval (seconds)</Text>
              <Text className={styles.configHint}>
                How often to refresh data from the device
              </Text>
            </div>
            <SpinButton
              value={localConfig.refreshIntervalSecs}
              onChange={(_, data) => {
                if (data.value !== undefined && data.value >= 10) {
                  handleConfigChange('refreshIntervalSecs', data.value);
                }
              }}
              min={10}
              max={300}
              step={10}
              disabled={!localConfig.autoRefreshEnabled || configLoading}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Button
            appearance="primary"
            onClick={handleSave}
            disabled={!hasChanges || configLoading}
            className={styles.actionButton}
          >
            Save Changes
          </Button>
          <Button appearance="secondary" onClick={handleCancel} className={styles.actionButton}>
            Cancel
          </Button>
        </div>
        </div>
      </DrawerBody>
    </Drawer>
  );
};
