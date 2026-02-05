/**
 * System Configuration Page
 *
 * Configure FFI sync, database management, and UI settings
 * Based on APPLICATION_CONFIG table structure
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
  Text,
  Select,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  WarningRegular,
  InfoRegular,
  DatabaseRegular,
  ColorRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '0',
    overflow: 'auto',
  },
  section: {
    padding: '16px',
    borderBottom: '1px solid #edebe9',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#323130',
    margin: 0,
  },
  sectionDescription: {
    fontSize: '13px',
    color: '#605e5c',
    marginBottom: '16px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  infoBox: {
    padding: '12px',
    backgroundColor: '#f3f2f1',
    borderRadius: '4px',
    marginTop: '12px',
    fontSize: '12px',
    color: '#605e5c',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    padding: '16px',
    borderTop: '1px solid #edebe9',
  },
  loadingBar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: '4px 8px',
    backgroundColor: 'transparent',
    marginBottom: tokens.spacingVerticalM,
    fontSize: '13px',
  },
});

interface SystemConfig {
  // FFI Sync Service
  ffiSyncIntervalSecs: number;
  rediscoverIntervalSecs: number;

  // Database Management
  databaseBackupEnabled: boolean;
  databaseCompressionEnabled: boolean;
  databaseMaxFileSizeMB: number;
  databaseVacuumIntervalDays: number;

  // UI Settings
  uiLanguage: string;
  uiTheme: string;
}

export const SyncConfigurationPage: React.FC = () => {
  const styles = useStyles();

  const [config, setConfig] = useState<SystemConfig>({
    // FFI Sync Service
    ffiSyncIntervalSecs: 900,
    rediscoverIntervalSecs: 3600,

    // Database Management
    databaseBackupEnabled: true,
    databaseCompressionEnabled: false,
    databaseMaxFileSizeMB: 2048,
    databaseVacuumIntervalDays: 7,

    // UI Settings
    uiLanguage: 'en',
    uiTheme: 'light',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load current configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);

        // Load all configurations
        const response = await fetch(`${API_BASE_URL}/api/config/all`);
        if (response.ok) {
          const data = await response.json();
          setConfig({
            ffiSyncIntervalSecs: parseInt(data['ffi.sync_interval_secs'] || '900'),
            rediscoverIntervalSecs: parseInt(data['rediscover.interval_secs'] || '3600'),
            databaseBackupEnabled: data['database.backup_enabled'] === 'true',
            databaseCompressionEnabled: data['database.compression_enabled'] === 'true',
            databaseMaxFileSizeMB: parseInt(data['database.max_file_size'] || '2048'),
            databaseVacuumIntervalDays: parseInt(data['database.vacuum_interval'] || '7'),
            uiLanguage: data['ui.language'] || 'en',
            uiTheme: data['ui.theme'] || 'light',
          });
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
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

      const configUpdates = [
        { key: 'ffi.sync_interval_secs', value: config.ffiSyncIntervalSecs.toString() },
        { key: 'rediscover.interval_secs', value: config.rediscoverIntervalSecs.toString() },
        { key: 'database.backup_enabled', value: config.databaseBackupEnabled.toString() },
        { key: 'database.compression_enabled', value: config.databaseCompressionEnabled.toString() },
        { key: 'database.max_file_size', value: config.databaseMaxFileSizeMB.toString() },
        { key: 'database.vacuum_interval', value: config.databaseVacuumIntervalDays.toString() },
        { key: 'ui.language', value: config.uiLanguage },
        { key: 'ui.theme', value: config.uiTheme },
      ];

      for (const update of configUpdates) {
        await fetch(`${API_BASE_URL}/api/config/${update.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: update.value }),
        });
      }

      setMessage({ text: 'Configuration saved successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setMessage({ text: 'Failed to save configuration', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      ffiSyncIntervalSecs: 900,
      rediscoverIntervalSecs: 3600,
      databaseBackupEnabled: true,
      databaseCompressionEnabled: false,
      databaseMaxFileSizeMB: 2048,
      databaseVacuumIntervalDays: 7,
      uiLanguage: 'en',
      uiTheme: 'light',
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBar}>
          <Spinner size="tiny" />
          <Text size={200} weight="regular">Loading system configuration...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Message Bar */}
      {message && (
        <div style={{
          marginBottom: '12px',
          padding: '8px 12px',
          backgroundColor: message.type === 'error' ? '#fef6f6' : '#f0f9ff',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {message.type === 'error' ? (
            <ErrorCircleRegular style={{ color: '#d13438', fontSize: '16px', flexShrink: 0 }} />
          ) : (
            <CheckmarkCircleRegular style={{ color: '#107c10', fontSize: '16px', flexShrink: 0 }} />
          )}
          <Text style={{
            color: message.type === 'error' ? '#d13438' : '#107c10',
            fontWeight: 500,
            fontSize: '13px'
          }}>
            {message.text}
          </Text>
        </div>
      )}

      {/* ========================================
          FFI SYNC SERVICE
          ======================================== */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <ArrowSyncRegular style={{ fontSize: '18px', color: '#0078d4' }} />
          <h3 className={styles.sectionTitle}>FFI Sync Service</h3>
        </div>
        <div className={styles.sectionDescription}>
          Background synchronization with T3000 devices
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="ffi-sync-interval">
              Sync Interval (seconds)
            </label>
            <div className={styles.inputGroup}>
              <Input
                id="ffi-sync-interval"
                type="number"
                value={config.ffiSyncIntervalSecs.toString()}
                onChange={(e) => setConfig({ ...config, ffiSyncIntervalSecs: parseInt(e.target.value) || 60 })}
                min={60}
                max={31536000}
                style={{ width: '150px' }}
              />
              <Badge appearance="outline">
                {config.ffiSyncIntervalSecs < 60 ? `${config.ffiSyncIntervalSecs}s` :
                 config.ffiSyncIntervalSecs < 3600 ? `${Math.floor(config.ffiSyncIntervalSecs / 60)}m` :
                 `${Math.floor(config.ffiSyncIntervalSecs / 3600)}h`}
              </Badge>
            </div>
            <Body1 style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
              How often to sync data from devices (60s - 365 days)
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
              How often to rediscover devices (1 hour - 7 days)
            </Body1>
          </div>

          <div className={styles.infoBox}>
            <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'flex-start' }}>
              <InfoRegular style={{ marginTop: '2px' }} />
              <div>
                <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>FFI Sync Service:</Body1>
                <Body1 style={{ fontSize: '12px', marginTop: tokens.spacingVerticalS }}>
                  Runs automatically in the background, syncing all devices and updating the database.
                  Shorter intervals provide fresher data but increase system load.
                </Body1>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================
          DATABASE MANAGEMENT
          ======================================== */}
      <Card className={styles.card}>
        <div className={styles.section}>
          <div>
            <Title3>
              <DatabaseRegular style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Database Management
            </Title3>
            <Body1>Database backup, compression, and maintenance settings</Body1>
          </div>

          <Divider />

          <div className={styles.formRow}>
            <Switch
              checked={config.databaseBackupEnabled}
              onChange={(e) => setConfig({ ...config, databaseBackupEnabled: e.currentTarget.checked })}
              label="Enable automatic database backups"
            />
          </div>

          <div className={styles.formRow}>
            <Switch
              checked={config.databaseCompressionEnabled}
              onChange={(e) => setConfig({ ...config, databaseCompressionEnabled: e.currentTarget.checked })}
              label="Enable database compression"
            />
          </div>

          <div className={styles.formRow}>
            <Label htmlFor="db-max-size">
              Maximum Database File Size (MB)
            </Label>
            <div className={styles.inputGroup}>
              <Input
                id="db-max-size"
                type="number"
                value={config.databaseMaxFileSizeMB.toString()}
                onChange={(e) => setConfig({ ...config, databaseMaxFileSizeMB: parseInt(e.target.value) || 1024 })}
                min={100}
                max={10240}
                style={{ width: '150px' }}
              />
              <Badge appearance="outline">
                {config.databaseMaxFileSizeMB < 1024
                  ? `${config.databaseMaxFileSizeMB} MB`
                  : `${(config.databaseMaxFileSizeMB / 1024).toFixed(1)} GB`}
              </Badge>
            </div>
            <Body1 style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
              Maximum allowed database size (100 MB - 10 GB)
            </Body1>
          </div>

          <div className={styles.formRow}>
            <Label htmlFor="vacuum-interval">
              Vacuum Interval (days)
            </Label>
            <div className={styles.inputGroup}>
              <Input
                id="vacuum-interval"
                type="number"
                value={config.databaseVacuumIntervalDays.toString()}
                onChange={(e) => setConfig({ ...config, databaseVacuumIntervalDays: parseInt(e.target.value) || 7 })}
                min={1}
                max={365}
                style={{ width: '150px' }}
              />
              <Badge appearance="outline">
                {config.databaseVacuumIntervalDays} days
              </Badge>
            </div>
            <Body1 style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
              How often to optimize database (1 - 365 days)
            </Body1>
          </div>

          <div className={styles.infoBox}>
            <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'flex-start' }}>
              <InfoRegular style={{ marginTop: '2px' }} />
              <div>
                <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>Database Maintenance:</Body1>
                <Body1 style={{ fontSize: '12px', marginTop: tokens.spacingVerticalS }}>
                  • Backups create safety copies before major operations<br />
                  • Compression reduces disk space usage<br />
                  • Vacuum reclaims space and optimizes performance
                </Body1>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================
          UI SETTINGS
          ======================================== */}
      <Card className={styles.card}>
        <div className={styles.section}>
          <div>
            <Title3>
              <ColorRegular style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              UI Settings
            </Title3>
            <Body1>User interface language and theme preferences</Body1>
          </div>

          <Divider />

          <div className={styles.formRow}>
            <Label htmlFor="ui-language">
              Language
            </Label>
            <Select
              id="ui-language"
              value={config.uiLanguage}
              onChange={(e, data) => setConfig({ ...config, uiLanguage: data.value })}
              style={{ width: '200px' }}
            >
              <option value="en">English</option>
              <option value="zh">中文 (Chinese)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </Select>
          </div>

          <div className={styles.formRow}>
            <Label htmlFor="ui-theme">
              Theme
            </Label>
            <Select
              id="ui-theme"
              value={config.uiTheme}
              onChange={(e, data) => setConfig({ ...config, uiTheme: data.value })}
              style={{ width: '200px' }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System Default</option>
            </Select>
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
    </div>
  );
};
