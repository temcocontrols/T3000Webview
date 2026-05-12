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
  Spinner,
  Badge,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, SaveRegular, ErrorCircleRegular, InfoRegular } from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const SETTINGS_URL = `${API_BASE_URL}/api/logs/settings`;

const settingsRequestCache = new Map<string, Promise<LogCategoryConfig[]>>();

async function fetchSettingsOnce(url: string): Promise<LogCategoryConfig[]> {
  const cached = settingsRequestCache.get(url);
  if (cached) {
    return cached;
  }

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`logs/settings: HTTP ${response.status}`);
      }
      return response.json() as Promise<LogCategoryConfig[]>;
    })
    .finally(() => {
      settingsRequestCache.delete(url);
    });

  settingsRequestCache.set(url, request);
  return request;
}

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

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LevelSelection {
  DEBUG: boolean;
  INFO: boolean;
  WARN: boolean;
  ERROR: boolean;
}

const LEVEL_ORDER: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

const levelSelectionFromMinLevel = (minLevel: string): LevelSelection => {
  const startIndex = Math.max(0, LEVEL_ORDER.indexOf(minLevel as LogLevel));
  return {
    DEBUG: startIndex <= 0,
    INFO: startIndex <= 1,
    WARN: startIndex <= 2,
    ERROR: true,
  };
};

const minLevelFromSelection = (selection: LevelSelection): LogLevel | null => {
  for (const level of LEVEL_ORDER) {
    if (selection[level]) {
      return level;
    }
  }
  return null;
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '12px',
    gap: '12px',
  },
  topSection: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#ffffff',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    margin: '0',
    backgroundColor: '#f3f9fd',
    border: '1px solid #c7e0f4',
    borderLeft: '3px solid #0078d4',
    flexShrink: 0,
  },
  infoIcon: { fontSize: '14px', color: '#005a9e', flexShrink: 0 },
  infoText: { color: '#004578', flex: 1 },
  globalPolicyBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 12px',
    background: '#faf9f8',
    border: '1px solid #edebe9',
  },
  globalPolicyTitle: {
    color: '#323130',
    fontSize: '12px',
    lineHeight: '18px',
  },
  globalRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  globalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },
  globalRowLabel: {
    width: '72px',
    flexShrink: 0,
    color: '#605e5c',
    fontWeight: 600,
  },
  globalLabel: {
    color: '#605e5c',
    marginRight: '4px',
  },
  detailPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 'unset',
    height: 'auto',
    padding: 0,
    border: 'none',
    borderRadius: 0,
    background: 'transparent',
    color: '#323130',
    cursor: 'pointer',
    userSelect: 'none',
  },
  detailPillActive: {
    color: '#323130',
    fontWeight: 400,
  },
  levelChecksWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    rowGap: '0',
    flexWrap: 'wrap',
  },
  policyCheckLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    height: 'auto',
    padding: 0,
    border: 'none',
    borderRadius: 0,
    background: 'transparent',
    color: '#323130',
    cursor: 'pointer',
    userSelect: 'none',
  },
  policyCheckActive: {
    color: '#323130',
    fontWeight: 400,
  },
  policyCheckDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  policyCheckInput: {
    width: '14px',
    height: '14px',
    minWidth: '14px',
    margin: 0,
    cursor: 'pointer',
    accentColor: '#0078d4',
  },
  detailRadioInput: {
    width: '14px',
    height: '14px',
    minWidth: '14px',
    margin: 0,
    cursor: 'pointer',
    accentColor: '#0078d4',
  },
  detailHint: {
    color: '#8a8886',
    marginLeft: '10px',
  },
  levelHint: {
    color: '#8a8886',
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
    scrollbarWidth: 'thin',
    scrollbarColor: '#c8c6c4 transparent',
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#c8c6c4',
      borderRadius: '6px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
  },
  groupTitle: {
    display: 'block',
    marginBottom: '8px',
    color: '#323130',
    fontSize: '12px',
    lineHeight: '18px',
  },
  groupList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '6px',
  },
  settingRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px 12px',
    background: '#faf9f8',
    borderRadius: '4px',
    border: '1px solid #edebe9',
  },
  settingRowActive: {
    background: '#f3f9fd',
    borderColor: '#c7e0f4',
  },
  categoryLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  categoryCheckbox: {
    width: '16px',
    height: '16px',
    minWidth: '16px',
    marginTop: '2px',
    margin: 0,
    accentColor: '#0078d4',
    cursor: 'pointer',
  },
  categoryText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  rowBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  titleCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  titleText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  controlsWrap: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'nowrap',
    justifyContent: 'flex-end',
    gap: '6px',
    flexShrink: 0,
  },
  categoryCode: {
    display: 'block',
    color: '#a19f9d',
  },
  switchCell: { margin: 0, flexShrink: 0 },
  sinkCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
    userSelect: 'none',
    opacity: 1,
    '& input[type="checkbox"]': {
      width: '14px',
      height: '14px',
      minWidth: '14px',
      margin: 0,
      cursor: 'pointer',
      accentColor: '#0078d4',
    },
    '&.disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      '& input[type="checkbox"]': { cursor: 'not-allowed' },
    },
  },
  sinkCheckboxDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    '& input[type="checkbox"]': { cursor: 'not-allowed' },
  },
  descriptionCell: {
    color: '#605e5c',
    lineHeight: '1.35',
    flex: 1,
    minWidth: '180px',
  },
  sinksWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    minWidth: '170px',
  },
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
  '@media (max-width: 920px)': {
    globalRow: {
      alignItems: 'flex-start',
      flexDirection: 'column',
      gap: '6px',
    },
    globalRowLabel: {
      width: '100%',
    },
    groupList: {
      gridTemplateColumns: '1fr',
    },
    rowTop: {
      flexWrap: 'wrap',
      gap: '6px',
    },
    controlsWrap: {
      justifyContent: 'flex-start',
      flexWrap: 'wrap',
    },
    rowBottom: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '8px',
    },
    sinksWrap: {
      justifyContent: 'flex-start',
      minWidth: 'unset',
    },
  },
});

export const LogSettingsTab: React.FC = () => {
  const s = useStyles();
  const [settings, setSettings] = useState<LogCategoryConfig[]>([]);
  const [globalDetailMode, setGlobalDetailMode] = useState('SUMMARY');
  const [globalLevelSelection, setGlobalLevelSelection] = useState<LevelSelection>(
    levelSelectionFromMinLevel('INFO')
  );
  const [globalSinkDb, setGlobalSinkDb] = useState(true);
  const [globalSinkFile, setGlobalSinkFile] = useState(false);
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
      const data: LogCategoryConfig[] = await fetchSettingsOnce(SETTINGS_URL);
      const normalized = data.map(normalizeLoadedConfig);
      setSettings(normalized);
      if (normalized.length > 0) {
        setGlobalDetailMode(normalized[0].detailMode);
        setGlobalLevelSelection(levelSelectionFromMinLevel(normalized[0].minLevel));
        setGlobalSinkDb(normalized[0].sinkDb);
        setGlobalSinkFile(normalized[0].sinkFile);
      }
      setDirty(false);
      setOfflineMode(false);
    } catch (err) {
      console.error('Failed to load log settings:', err);
      setSettings(DEFAULT_SETTINGS);
      setGlobalDetailMode(DEFAULT_SETTINGS[0].detailMode);
      setGlobalLevelSelection(levelSelectionFromMinLevel(DEFAULT_SETTINGS[0].minLevel));
      setGlobalSinkDb(DEFAULT_SETTINGS[0].sinkDb);
      setGlobalSinkFile(DEFAULT_SETTINGS[0].sinkFile);
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

  const applyGlobalPolicy = (patch: Pick<LogCategoryConfig, 'detailMode' | 'minLevel' | 'sinkDb' | 'sinkFile'> | Partial<Pick<LogCategoryConfig, 'detailMode' | 'minLevel' | 'sinkDb' | 'sinkFile'>>) => {
    setSettings(prev => prev.map(item => ({ ...item, ...patch })));
    setDirty(true);
    setSaved(false);
  };

  const updateGlobalLevel = (level: LogLevel, checked: boolean) => {
    setGlobalLevelSelection(prev => {
      const next = { ...prev, [level]: checked };
      const nextMinLevel = minLevelFromSelection(next);
      if (nextMinLevel) {
        applyGlobalPolicy({ minLevel: nextMinLevel });
      } else {
        setDirty(true);
        setSaved(false);
      }
      return next;
    });
  };

  const setAllLevels = (checked: boolean) => {
    const nextSelection: LevelSelection = {
      DEBUG: checked,
      INFO: checked,
      WARN: checked,
      ERROR: checked,
    };
    setGlobalLevelSelection(nextSelection);
    if (checked) {
      applyGlobalPolicy({ minLevel: 'DEBUG' });
    } else {
      setDirty(true);
      setSaved(false);
    }
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

  const hasInvalidSinkSelection = settings.some(s => s.enabled) && !globalSinkDb && !globalSinkFile;
  const hasInvalidLevelSelection = settings.some(s => s.enabled) && !Object.values(globalLevelSelection).some(Boolean);
  const areAllLevelsSelected = Object.values(globalLevelSelection).every(Boolean);

  return (
    <div className={s.root}>
      <div className={s.topSection}>
        {/* Toolbar */}
        <div className={s.toolbar}>
          <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={load} disabled={loading} size="small">
            Reload
          </Button>
          <Button
            appearance={dirty ? 'primary' : 'subtle'}
            icon={saving ? <Spinner size="tiny" /> : <SaveRegular />}
            onClick={save}
            disabled={saving || !dirty || offlineMode || hasInvalidSinkSelection || hasInvalidLevelSelection}
            size="small"
          >
            Save Changes
          </Button>
          {saved && (
            <Badge appearance="filled" color="success" size="small">Saved</Badge>
          )}
        </div>

        <div className={s.infoBar}>
          <InfoRegular className={s.infoIcon} />
          <Text size={200} className={s.infoText}>
            ERROR logs are always written to DB. Changes apply on next log write.
          </Text>
        </div>

        <div className={s.globalPolicyBar}>
          <Text size={400} weight="semibold" className={s.globalPolicyTitle}>Default Logging Settings</Text>
          <div className={s.globalRows}>
            <div className={s.globalRow}>
              <Text size={200} className={s.globalRowLabel}>Detail</Text>
              <label className={`${s.detailPill} ${globalDetailMode === 'SUMMARY' ? s.detailPillActive : ''}`}>
                <input
                  type="radio"
                  name="global-detail-mode"
                  checked={globalDetailMode === 'SUMMARY'}
                  onChange={() => {
                    setGlobalDetailMode('SUMMARY');
                    applyGlobalPolicy({ detailMode: 'SUMMARY' });
                  }}
                  disabled={offlineMode}
                  className={s.detailRadioInput}
                />
                Summary
              </label>
              <label className={`${s.detailPill} ${globalDetailMode === 'FULL' ? s.detailPillActive : ''}`}>
                <input
                  type="radio"
                  name="global-detail-mode"
                  checked={globalDetailMode === 'FULL'}
                  onChange={() => {
                    setGlobalDetailMode('FULL');
                    applyGlobalPolicy({ detailMode: 'FULL' });
                  }}
                  disabled={offlineMode}
                  className={s.detailRadioInput}
                />
                Full
              </label>
              <Text size={100} className={s.detailHint}>Summary = compact totals, Full = every event line.</Text>
            </div>

            <div className={s.globalRow}>
              <Text size={200} className={s.globalRowLabel}>Levels</Text>
              <div className={s.levelChecksWrap}>
                <label className={`${s.policyCheckLabel} ${areAllLevelsSelected ? s.policyCheckActive : ''} ${offlineMode ? s.policyCheckDisabled : ''}`}>
                  <input
                    type="checkbox"
                    checked={areAllLevelsSelected}
                    onChange={e => setAllLevels(e.target.checked)}
                    disabled={offlineMode}
                    className={s.policyCheckInput}
                  />
                  All
                </label>
                {LEVEL_ORDER.map(level => (
                  <label
                    key={level}
                    className={`${s.policyCheckLabel} ${globalLevelSelection[level] ? s.policyCheckActive : ''} ${offlineMode ? s.policyCheckDisabled : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={globalLevelSelection[level]}
                      onChange={e => updateGlobalLevel(level, e.target.checked)}
                      disabled={offlineMode}
                      className={s.policyCheckInput}
                    />
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>

            <div className={s.globalRow}>
              <Text size={200} className={s.globalRowLabel}>Sinks</Text>
              <label className={`${s.policyCheckLabel} ${globalSinkDb ? s.policyCheckActive : ''} ${offlineMode ? s.policyCheckDisabled : ''}`}>
                <input
                  type="checkbox"
                  checked={globalSinkDb}
                  onChange={e => {
                    setGlobalSinkDb(e.target.checked);
                    applyGlobalPolicy({ sinkDb: e.target.checked });
                  }}
                  disabled={offlineMode}
                  className={s.policyCheckInput}
                />
                Db
              </label>

              <label className={`${s.policyCheckLabel} ${globalSinkFile ? s.policyCheckActive : ''} ${offlineMode ? s.policyCheckDisabled : ''}`}>
                <input
                  type="checkbox"
                  checked={globalSinkFile}
                  onChange={e => {
                    setGlobalSinkFile(e.target.checked);
                    applyGlobalPolicy({ sinkFile: e.target.checked });
                  }}
                  disabled={offlineMode}
                  className={s.policyCheckInput}
                />
                File
              </label>
            </div>
          </div>
          <Text size={100} className={s.levelHint}>Levels are cumulative. Selecting Debug includes Info, Warn, and Error logs.</Text>
        </div>

        {hasInvalidSinkSelection && !loading && (
          <div className={s.validationBar}>
            <ErrorCircleRegular className={s.validationIcon} />
            <Text size={200} className={s.validationText}>
              Select at least one global sink target (DB or File) when any category is enabled.
            </Text>
          </div>
        )}

        {hasInvalidLevelSelection && !loading && (
          <div className={s.validationBar}>
            <ErrorCircleRegular className={s.validationIcon} />
            <Text size={200} className={s.validationText}>
              Select at least one log level when any category is enabled.
            </Text>
          </div>
        )}
      </div>

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
              <Text size={400} weight="semibold" className={s.groupTitle}>
                {label}
              </Text>
              <div className={s.groupList}>
                {items.map(cfg => (
                  <div key={cfg.category} className={`${s.settingRow} ${cfg.enabled ? s.settingRowActive : ''}`}>
                    <label className={s.categoryLabel}>
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={e => update(cfg.category, { enabled: e.target.checked })}
                        disabled={offlineMode}
                        className={s.categoryCheckbox}
                      />
                      <div className={s.categoryText}>
                        <Text size={200} weight="semibold">{cfg.displayName}</Text>
                        <Text size={100} className={s.categoryCode}>{cfg.category}</Text>
                        <Text size={100} className={s.descriptionCell}>{cfg.description}</Text>
                      </div>
                    </label>
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
