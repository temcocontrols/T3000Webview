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
  Tooltip,
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
import cssStyles from './SyncConfigurationPage.module.css';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  section: {
    marginBottom: '12px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    padding: '0 12px',
    borderTop: '1px solid #edebe9',
    borderBottom: '1px solid #edebe9',
    backgroundColor: '#f5f5f5',
    minHeight: '32px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#323130',
    margin: 0,
  },
  sectionDescription: {
    fontSize: '13px',
    color: '#605e5c',
    marginBottom: '12px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '12px',
    borderRadius: '4px',
    '@media (max-width: 1200px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 400,
    color: '#323130',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  infoBox: {
    padding: '8px 12px',
    backgroundColor: '#f3f2f1',
    borderRadius: '2px',
    marginTop: '8px',
    fontSize: '12px',
    color: '#605e5c',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    padding: '8px 16px',
    borderTop: '1px solid #edebe9',
    flexShrink: 0,
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
      <div className={cssStyles.scrollContent}>
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
          <span style={{ fontSize: '12px', color: '#605e5c', marginLeft: '8px' }}>
            Background sync with T3000 devices
          </span>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label className={styles.label} htmlFor="ffi-sync-interval">
                Sync Interval (seconds)
              </label>
              <Tooltip content="How often to sync data from devices (60s - 365 days)" relationship="description">
                <InfoRegular style={{ fontSize: '14px', color: '#605e5c', cursor: 'help' }} />
              </Tooltip>
            </div>
            <div className={styles.inputGroup}>
              <Input
                id="ffi-sync-interval"
                type="number"
                value={config.ffiSyncIntervalSecs.toString()}
                onChange={(e) => setConfig({ ...config, ffiSyncIntervalSecs: parseInt(e.target.value) || 60 })}
                min={60}
                max={31536000}
                style={{ width: '150px', fontSize: '13px' }}
              />
              <Badge appearance="outline" style={{ borderRadius: 0 }}>
                {config.ffiSyncIntervalSecs < 60 ? `${config.ffiSyncIntervalSecs}s` :
                 config.ffiSyncIntervalSecs < 3600 ? `${Math.floor(config.ffiSyncIntervalSecs / 60)}m` :
                 `${Math.floor(config.ffiSyncIntervalSecs / 3600)}h`}
              </Badge>
            </div>
          </div>

          <div className={styles.formRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Label htmlFor="rediscover-interval">
                Rediscovery Interval (seconds)
              </Label>
              <Tooltip content="How often to rediscover devices (1 hour - 7 days)" relationship="description">
                <InfoRegular style={{ fontSize: '14px', color: '#605e5c', cursor: 'help' }} />
              </Tooltip>
            </div>
            <div className={styles.inputGroup}>
              <Input
                id="rediscover-interval"
                type="number"
                value={config.rediscoverIntervalSecs.toString()}
                onChange={(e) => setConfig({ ...config, rediscoverIntervalSecs: parseInt(e.target.value) || 3600 })}
                min={3600}
                max={604800}
                style={{ width: '150px', fontSize: '13px' }}
              />
              <Badge appearance="outline" style={{ borderRadius: 0 }}>
                {Math.floor(config.rediscoverIntervalSecs / 3600)} hours
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          DATABASE MANAGEMENT
          ======================================== */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <DatabaseRegular style={{ fontSize: '18px', color: '#0078d4' }} />
          <h3 className={styles.sectionTitle}>Database Management</h3>
          <span style={{ fontSize: '12px', color: '#605e5c', marginLeft: '8px' }}>
            Backup, compression, and maintenance settings
          </span>
        </div>

        <div className={styles.formGrid}>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Label htmlFor="db-max-size">
                Maximum Database File Size (MB)
              </Label>
              <Tooltip content="Maximum allowed database size (100 MB - 10 GB)" relationship="description">
                <InfoRegular style={{ fontSize: '14px', color: '#605e5c', cursor: 'help' }} />
              </Tooltip>
            </div>
            <div className={styles.inputGroup}>
              <Input
                id="db-max-size"
                type="number"
                value={config.databaseMaxFileSizeMB.toString()}
                onChange={(e) => setConfig({ ...config, databaseMaxFileSizeMB: parseInt(e.target.value) || 1024 })}
                min={100}
                max={10240}
                style={{ width: '150px', fontSize: '13px' }}
              />
              <Badge appearance="outline" style={{ borderRadius: 0 }}>
                {config.databaseMaxFileSizeMB < 1024
                  ? `${config.databaseMaxFileSizeMB} MB`
                  : `${(config.databaseMaxFileSizeMB / 1024).toFixed(1)} GB`}
              </Badge>
            </div>
          </div>

          <div className={styles.formRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Label htmlFor="vacuum-interval">
                Vacuum Interval (days)
              </Label>
              <Tooltip content="How often to optimize database (1 - 365 days)" relationship="description">
                <InfoRegular style={{ fontSize: '14px', color: '#605e5c', cursor: 'help' }} />
              </Tooltip>
            </div>
            <div className={styles.inputGroup}>
              <Input
                id="vacuum-interval"
                type="number"
                value={config.databaseVacuumIntervalDays.toString()}
                onChange={(e) => setConfig({ ...config, databaseVacuumIntervalDays: parseInt(e.target.value) || 7 })}
                min={1}
                max={365}
                style={{ width: '150px', fontSize: '13px' }}
              />
              <Badge appearance="outline" style={{ borderRadius: 0 }}>
                {config.databaseVacuumIntervalDays} days
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          UI SETTINGS
          ======================================== */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <ColorRegular style={{ fontSize: '18px', color: '#0078d4' }} />
          <h3 className={styles.sectionTitle}>UI Settings</h3>
          <span style={{ fontSize: '12px', color: '#605e5c', marginLeft: '8px' }}>
            Language and theme preferences
          </span>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="ui-language">
              Language
            </label>
            <Select
              id="ui-language"
              value={config.uiLanguage}
              onChange={(e, data) => setConfig({ ...config, uiLanguage: data.value })}
              className={cssStyles.smallSelect}
              style={{ width: '150px', fontSize: '13px', lineHeight: '20px' }}
            >
              <option value="en" style={{ fontSize: '13px' }}>English</option>
              <option value="zh" style={{ fontSize: '13px' }}>中文 (Chinese)</option>
              <option value="es" style={{ fontSize: '13px' }}>Español</option>
              <option value="fr" style={{ fontSize: '13px' }}>Français</option>
            </Select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="ui-theme">
              Theme
            </label>
            <Select
              id="ui-theme"
              value={config.uiTheme}
              onChange={(e, data) => setConfig({ ...config, uiTheme: data.value })}
              className={cssStyles.smallSelect}
              style={{ width: '150px', fontSize: '13px', lineHeight: '20px' }}
            >
              <option value="light" style={{ fontSize: '13px' }}>Light</option>
              <option value="dark" style={{ fontSize: '13px' }}>Dark</option>
              <option value="system" style={{ fontSize: '13px' }}>System Default</option>
            </Select>
          </div>
        </div>
      </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Button
          appearance="primary"
          onClick={handleSave}
          disabled={saving}
          style={{ borderRadius: 0, fontWeight: 400, fontSize: '13px' }}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
        <Button
          onClick={handleReset}
          disabled={saving}
          style={{ borderRadius: 0, fontWeight: 400, fontSize: '13px' }}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
};
