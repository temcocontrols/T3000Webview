/**
 * Log Settings Tab
 *
 * Read/write per-category log config via GET/PUT /api/logs/settings
 */

import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  Text,
  Button,
  Switch,
  Select,
  Spinner,
  Badge,
  Checkbox,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, SaveRegular, ErrorCircleRegular } from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const SETTINGS_URL = `${API_BASE_URL}/api/logs/settings`;

interface LogCategoryConfig {
  category: string;
  displayName: string;
  description: string;
  group: string;
  enabled: boolean;
  detailMode: string;
  minLevel: string;
  target: string;
  sinkDb: boolean;
  sinkFile: boolean;
}

const DEFAULT_SETTINGS: LogCategoryConfig[] = [
  {
    category: 'STARTUP',
    displayName: 'Service Startup',
    description: 'DLL load, server init, DB connect, sampling state changes',
    group: 'system',
    enabled: true,
    detailMode: 'SUMMARY',
    minLevel: 'INFO',
    target: 'sqlite',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'AUTH',
    displayName: 'Authentication',
    description: 'Login, logout, session events',
    group: 'system',
    enabled: true,
    detailMode: 'SUMMARY',
    minLevel: 'INFO',
    target: 'sqlite',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'CONFIG',
    displayName: 'Config Changes',
    description: 'Operator settings: sync interval, rediscover interval',
    group: 'system',
    enabled: true,
    detailMode: 'SUMMARY',
    minLevel: 'INFO',
    target: 'sqlite',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'MAINTENANCE',
    displayName: 'DB Maintenance',
    description: 'Migration, partition creation, DB size warnings',
    group: 'system',
    enabled: true,
    detailMode: 'SUMMARY',
    minLevel: 'INFO',
    target: 'sqlite',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'POLL',
    displayName: 'Device Poll',
    description: 'Sync cycle: device count, ok/fail totals, policy skips',
    group: 'operational',
    enabled: true,
    detailMode: 'SUMMARY',
    minLevel: 'INFO',
    target: 'mssql',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'DEVICE',
    displayName: 'Device Sync',
    description: 'Per-device: points written, FFI errors, serial=0 skips',
    group: 'operational',
    enabled: true,
    detailMode: 'SUMMARY',
    minLevel: 'INFO',
    target: 'mssql',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'TRENDLOG',
    displayName: 'Trendlog',
    description: 'Trendlog config sync and data write summary',
    group: 'operational',
    enabled: true,
    detailMode: 'SUMMARY',
    minLevel: 'INFO',
    target: 'mssql',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'API_REQ',
    displayName: 'API Requests',
    description: 'HTTP endpoint calls - enable for debugging only',
    group: 'debug',
    enabled: false,
    detailMode: 'SUMMARY',
    minLevel: 'INFO',
    target: 'sqlite',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'WEBSOCKET',
    displayName: 'WebSocket',
    description: 'WS connect/disconnect, message types',
    group: 'debug',
    enabled: false,
    detailMode: 'SUMMARY',
    minLevel: 'INFO',
    target: 'sqlite',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'FFI_CALL',
    displayName: 'C++ FFI Calls',
    description: 'Raw C++ request/response - very high volume',
    group: 'debug',
    enabled: false,
    detailMode: 'FULL',
    minLevel: 'DEBUG',
    target: 'sqlite',
    sinkDb: true,
    sinkFile: false,
  },
  {
    category: 'MESSAGE_ACTION',
    displayName: 'Message Action',
    description: 'Message action processing and command dispatch details',
    group: 'debug',
    enabled: false,
    detailMode: 'FULL',
    minLevel: 'DEBUG',
    target: 'sqlite',
    sinkDb: true,
    sinkFile: false,
  },
];

const normalizeLoadedConfig = (cfg: LogCategoryConfig): LogCategoryConfig => ({
  ...cfg,
  sinkDb: cfg.sinkDb ?? true,
  sinkFile: cfg.sinkFile ?? false,
  target: cfg.target ?? 'sqlite',
});

const GROUP_LABELS: Record<string, string> = {
  system: 'System Events',
  operational: 'Operational (high-volume)',
  debug: 'Debug (off by default)',
};

const GROUP_ORDER = ['system', 'operational', 'debug'];

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '12px',
    gap: '12px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolbarNote: {
    color: '#605e5c',
    marginLeft: 'auto',
  },
  validationBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    margin: '0',
    backgroundColor: '#fff4ce',
    borderBottom: '1px solid #f7d58c',
    flexShrink: 0,
  },
  validationIcon: { fontSize: '14px', color: '#8a6100', flexShrink: 0 },
  validationText: { color: '#8a6100', flex: 1 },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'flex-start',
    flex: '0 0 auto',
    paddingTop: '4px',
  },
  errorBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    margin: '0',
    backgroundColor: '#fde7e9',
    borderBottom: '1px solid #f1a3a8',
    flexShrink: 0,
  },
  errorIcon: { fontSize: '14px', color: '#a4262c', flexShrink: 0 },
  errorText: { color: '#a4262c', flex: 1 },
  retryButton: { flexShrink: 0 },
  groupsWrap: {
    overflow: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  groupTitle: {
    display: 'block',
    marginBottom: '8px',
    color: '#323130',
  },
  groupList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  settingRow: {
    display: 'grid',
    gridTemplateColumns: '140px 44px 1fr 118px 108px 74px 74px',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: '#faf9f8',
    borderRadius: '4px',
    border: '1px solid #edebe9',
  },
  titleCell: {},
  categoryCode: {
    display: 'block',
    color: '#a19f9d',
  },
  switchCell: { margin: 0 },
  descriptionCell: { color: '#605e5c' },
  sinkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sinkHint: {
    color: '#8a8886',
    fontSize: '10px',
    display: 'block',
    marginTop: '2px',
  },
});

export const LogSettingsTab: React.FC = () => {
  const s = useStyles();
  const [settings, setSettings] = useState<LogCategoryConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SETTINGS_URL);
      if (response.ok) {
        const data: LogCategoryConfig[] = await response.json();
        setSettings(data.map(normalizeLoadedConfig));
        setDirty(false);
        setOfflineMode(false);
      } else {
        setSettings(DEFAULT_SETTINGS);
        setDirty(false);
        setOfflineMode(true);
        setError(`Server returned ${response.status}. Showing local defaults (read-only).`);
      }
    } catch (err) {
      console.error('Failed to load log settings:', err);
      setSettings(DEFAULT_SETTINGS);
      setDirty(false);
      setOfflineMode(true);
      setError('Could not reach the T3000 service — showing local defaults (read-only).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (category: string, patch: Partial<LogCategoryConfig>) => {
    setSettings(prev => prev.map(s => s.category === category ? { ...s, ...patch } : s));
    setDirty(true);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(SETTINGS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (response.ok) {
        setSaved(true);
        setDirty(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save log settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const grouped = GROUP_ORDER.map(group => ({
    group,
    label: GROUP_LABELS[group] ?? group,
    items: settings.filter(s => s.group === group),
  })).filter(g => g.items.length > 0);

  const hasInvalidSinkSelection = settings.some(s => s.enabled && !s.sinkDb && !s.sinkFile);

  return (
    <div className={s.root}>
      {/* Toolbar */}
      <div className={s.toolbar}>
        <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={load} disabled={loading} size="small">
          Reload
        </Button>
        <Button
          appearance={dirty ? 'primary' : 'subtle'}
          icon={saving ? <Spinner size="tiny" /> : <SaveRegular />}
          onClick={save}
          disabled={saving || !dirty || offlineMode || hasInvalidSinkSelection}
          size="small"
        >
          Save Changes
        </Button>
        {saved && (
          <Badge appearance="filled" color="success" size="small">Saved</Badge>
        )}
        <Text size={200} className={s.toolbarNote}>
          ERROR logs are always written to DB. Changes apply on next log write.
        </Text>
      </div>

      {hasInvalidSinkSelection && !loading && (
        <div className={s.validationBar}>
          <ErrorCircleRegular className={s.validationIcon} />
          <Text size={200} className={s.validationText}>
            Enabled categories must select at least one sink target (DB or File).
          </Text>
        </div>
      )}

      {loading ? (
        <div className={s.loadingRow}>
          <Spinner size="small" />
          <Text size={200}>Loading settings...</Text>
        </div>
      ) : (
        <>
          {error && (
            <div className={s.errorBar}>
              <ErrorCircleRegular className={s.errorIcon} />
              <Text size={200} className={s.errorText}>{error}</Text>
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowClockwiseRegular />}
                onClick={load}
                className={s.retryButton}
              >
                Retry
              </Button>
            </div>
          )}

          <div className={s.groupsWrap}>
          {grouped.map(({ group, label, items }) => (
            <div key={group}>
              <Text size={300} weight="semibold" className={s.groupTitle}>
                {label}
              </Text>
              <div className={s.groupList}>
                {items.map(cfg => (
                  <div key={cfg.category} className={s.settingRow}>
                    <div className={s.titleCell}>
                      <Text size={200} weight="semibold">{cfg.displayName}</Text>
                      <Text size={100} className={s.categoryCode}>{cfg.category}</Text>
                    </div>

                    <Switch
                      checked={cfg.enabled}
                      onChange={(_, data) => update(cfg.category, { enabled: data.checked })}
                      className={s.switchCell}
                    />

                    <Text size={100} className={s.descriptionCell}>{cfg.description}</Text>

                    <Select
                      value={cfg.detailMode}
                      onChange={(_, data) => update(cfg.category, { detailMode: data.value })}
                      size="small"
                      disabled={!cfg.enabled}
                    >
                      <option value="SUMMARY">SUMMARY</option>
                      <option value="FULL">FULL</option>
                    </Select>

                    <Select
                      value={cfg.minLevel}
                      onChange={(_, data) => update(cfg.category, { minLevel: data.value })}
                      size="small"
                      disabled={!cfg.enabled}
                    >
                      <option value="DEBUG">DEBUG</option>
                      <option value="INFO">INFO</option>
                      <option value="WARN">WARN</option>
                      <option value="ERROR">ERROR</option>
                    </Select>

                    <Checkbox
                      checked={cfg.sinkDb}
                      onChange={(_, data) => update(cfg.category, { sinkDb: data.checked })}
                      label={
                        <span className={s.sinkLabel}>
                          <span>DB</span>
                          {cfg.target === 'mssql' && <span className={s.sinkHint}>auto-center</span>}
                        </span>
                      }
                      disabled={!cfg.enabled}
                    />

                    <Checkbox
                      checked={cfg.sinkFile}
                      onChange={(_, data) => update(cfg.category, { sinkFile: data.checked })}
                      label="File"
                      disabled={!cfg.enabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LogSettingsTab;
