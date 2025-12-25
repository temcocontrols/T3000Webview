/**
 * Sync Configuration Page
 *
 * Configure backend and frontend sync intervals
 * Uses same layout structure as InputsPage (MainLayout with tree panel)
 */

import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Title1,
  Title3,
  Body1,
  Button,
  Input,
  Label,
  Switch,
  Card,
  Badge,
  Divider,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  WarningRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: tokens.spacingVerticalXXL,
    gap: tokens.spacingVerticalXL,
    overflow: 'auto',
  },
  header: {
    marginBottom: tokens.spacingVerticalL,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  card: {
    padding: tokens.spacingVerticalXL,
    maxWidth: '800px',
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  infoBox: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    marginTop: tokens.spacingVerticalM,
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
  },
});

interface SyncConfig {
  backendIntervalSecs: number;
  rediscoverIntervalSecs: number;
  frontendEnabled: boolean;
  frontendIntervalSecs: number;
}

interface SyncStatus {
  lastBackendSync: string;
  nextBackendSync: string;
  backendStatus: 'success' | 'error' | 'in_progress';
  pointsSynced: number;
}

export const SyncConfigurationPage: React.FC = () => {
  const styles = useStyles();

  const [config, setConfig] = useState<SyncConfig>({
    backendIntervalSecs: 900,
    rediscoverIntervalSecs: 3600,
    frontendEnabled: false,
    frontendIntervalSecs: 300,
  });

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load current configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);

        // Load backend sync interval
        const backendRes = await fetch(`${API_BASE_URL}/api/config/ffi-sync-interval`);
        const backendData = await backendRes.json();

        // Load rediscover interval
        const rediscoverRes = await fetch(`${API_BASE_URL}/api/config/rediscover-interval`);
        const rediscoverData = await rediscoverRes.json();

        // Load frontend config
        const frontendRes = await fetch(`${API_BASE_URL}/api/config/frontend-refresh`);
        const frontendData = frontendRes.ok ? await frontendRes.json() : null;

        setConfig({
          backendIntervalSecs: backendData.interval_secs || 900,
          rediscoverIntervalSecs: rediscoverData.interval_secs || 3600,
          frontendEnabled: frontendData?.enabled || false,
          frontendIntervalSecs: frontendData?.interval_secs || 300,
        });
      } catch (error) {
        console.error('Failed to load sync configuration:', error);
        setMessage({ text: 'Failed to load configuration', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Save configuration
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Update backend interval
      await fetch(`${API_BASE_URL}/api/config/ffi-sync-interval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interval_secs: config.backendIntervalSecs,
          changed_by: 'User',
          change_reason: 'Updated via System Settings',
        }),
      });

      // Update rediscover interval
      await fetch(`${API_BASE_URL}/api/config/rediscover-interval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interval_secs: config.rediscoverIntervalSecs,
          changed_by: 'User',
          change_reason: 'Updated via System Settings',
        }),
      });

      // Update frontend config
      await fetch(`${API_BASE_URL}/api/config/frontend-refresh`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: config.frontendEnabled,
          interval_secs: config.frontendIntervalSecs,
        }),
      });

      setMessage({ text: 'Configuration saved successfully! Changes will take effect on next sync cycle.', type: 'success' });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setMessage({ text: 'Failed to save configuration', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      backendIntervalSecs: 900,
      rediscoverIntervalSecs: 3600,
      frontendEnabled: false,
      frontendIntervalSecs: 300,
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner label="Loading sync configuration..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Title1>Sync Configuration</Title1>
        <Body1>Configure automatic data synchronization between devices and database</Body1>
      </div>

      {/* Message Bar */}
      {message && (
        <MessageBar intent={message.type === 'success' ? 'success' : 'error'}>
          <MessageBarBody>
            <MessageBarTitle>{message.type === 'success' ? 'Success' : 'Error'}</MessageBarTitle>
            {message.text}
          </MessageBarBody>
        </MessageBar>
      )}

      {/* Backend Service Configuration */}
      <Card className={styles.card}>
        <div className={styles.section}>
          <div>
            <Title3>Backend Service Sync</Title3>
            <Body1>Automatic background synchronization for all devices</Body1>
          </div>

          <Divider />

          <div className={styles.formRow}>
            <Label htmlFor="backend-interval">
              Sync Interval (seconds)
            </Label>
            <div className={styles.inputGroup}>
              <Input
                id="backend-interval"
                type="number"
                value={config.backendIntervalSecs.toString()}
                onChange={(e) => setConfig({ ...config, backendIntervalSecs: parseInt(e.target.value) || 60 })}
                min={60}
                max={31536000}
                style={{ width: '150px' }}
              />
              <Badge appearance="outline">
                {Math.floor(config.backendIntervalSecs / 60)} minutes
              </Badge>
            </div>
            <Body1 style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
              How often to sync data from all devices (min: 60s, max: 365 days)
            </Body1>
          </div>

          <div className={styles.formRow}>
            <Label htmlFor="rediscover-interval">
              Rediscovery Interval (seconds)
            </Label>
            <div className={styles.inputGroup}>
              <Input
                id="rediscover-interval"
                type="number"
                value={config.rediscoverIntervalSecs.toString()}
                onChange={(e) => setConfig({ ...config, rediscoverIntervalSecs: parseInt(e.target.value) || 3600 })}
                min={3600}
                max={604800}
                style={{ width: '150px' }}
              />
              <Badge appearance="outline">
                {Math.floor(config.rediscoverIntervalSecs / 3600)} hours
              </Badge>
            </div>
            <Body1 style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
              How often to rediscover all devices (min: 1 hour, max: 7 days)
            </Body1>
          </div>

          <div className={styles.infoBox}>
            <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'flex-start' }}>
              <InfoRegular style={{ marginTop: '2px' }} />
              <div>
                <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>How Backend Sync Works:</Body1>
                <Body1 style={{ fontSize: '12px', marginTop: tokens.spacingVerticalS }}>
                  • Runs automatically in the background<br />
                  • Syncs ALL devices simultaneously<br />
                  • Updates database with fresh device data<br />
                  • Logs all operations to System Logs
                </Body1>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Frontend Auto-Refresh Configuration */}
      <Card className={styles.card}>
        <div className={styles.section}>
          <div>
            <Title3>Frontend Auto-Refresh</Title3>
            <Body1>Automatic refresh for the device currently being viewed</Body1>
          </div>

          <Divider />

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <Switch
                checked={config.frontendEnabled}
                onChange={(e) => setConfig({ ...config, frontendEnabled: e.currentTarget.checked })}
                label="Enable auto-refresh for active device"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <Label htmlFor="frontend-interval">
              Refresh Interval (seconds)
            </Label>
            <div className={styles.inputGroup}>
              <Input
                id="frontend-interval"
                type="number"
                value={config.frontendIntervalSecs.toString()}
                onChange={(e) => setConfig({ ...config, frontendIntervalSecs: parseInt(e.target.value) || 30 })}
                min={30}
                max={3600}
                disabled={!config.frontendEnabled}
                style={{ width: '150px' }}
              />
              <Badge appearance="outline">
                {config.frontendIntervalSecs < 60
                  ? `${config.frontendIntervalSecs} seconds`
                  : `${Math.floor(config.frontendIntervalSecs / 60)} minutes`}
              </Badge>
            </div>
            <Body1 style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
              How often to refresh the currently viewed device (min: 30s, max: 60 min)
            </Body1>
          </div>

          <div className={styles.infoBox}>
            <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'flex-start' }}>
              <WarningRegular style={{ marginTop: '2px', color: tokens.colorPaletteYellowForeground1 }} />
              <div>
                <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>Frontend Refresh Notes:</Body1>
                <Body1 style={{ fontSize: '12px', marginTop: tokens.spacingVerticalS }}>
                  • Only refreshes the device you're currently viewing<br />
                  • Stops when you navigate away from device pages<br />
                  • More frequent than backend sync (for real-time monitoring)<br />
                  • Works together with backend sync (no conflicts)
                </Body1>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className={styles.actions}>
        <Button
          appearance="primary"
          icon={<CheckmarkCircleRegular />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
        <Button
          onClick={handleReset}
          disabled={saving}
        >
          Reset to Defaults
        </Button>
      </div>

      {/* Current Status */}
      <Card className={styles.card}>
        <div className={styles.section}>
          <Title3>Current Sync Status</Title3>
          <Divider />
          <Body1 style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
            Status information will be available in a future update
          </Body1>
        </div>
      </Card>
    </div>
  );
};
