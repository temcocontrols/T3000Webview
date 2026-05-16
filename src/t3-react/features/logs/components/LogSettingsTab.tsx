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
import HvConstant from '../../../../lib/t3-hvac/Data/Constant/HvConstant';

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

const normalizeLoadedConfig = (cfg: LogCategoryConfig): LogCategoryConfig => ({
  ...cfg,
  sinkDb: cfg.sinkDb ?? true,
  sinkFile: cfg.sinkFile ?? false,
  target: cfg.target ?? 'sqlite',
  minLevel: cfg.minLevel ?? 'INFO',
  detailMode: cfg.detailMode ?? 'SUMMARY',
});

const GROUP_LABELS: Record<string, string> = {
  system: 'System Events',
  operational: 'Operational (high-volume)',
  debug: 'Debug (off by default)',
};

const GROUP_ORDER = ['system', 'operational', 'debug'];

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVEL_ORDER: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

const DETAIL_OPTIONS = ['SUMMARY', 'FULL'] as const;

const formatLevelLabel = (level: LogLevel) => level.charAt(0) + level.slice(1).toLowerCase();

const formatDetailLabel = (detailMode: typeof DETAIL_OPTIONS[number]) =>
  detailMode.charAt(0) + detailMode.slice(1).toLowerCase();

const isLogLevel = (value: string): value is LogLevel =>
  (LEVEL_ORDER as readonly string[]).includes(value);

const expandLegacyMinLevel = (rawLevel: string | null | undefined): LogLevel[] => {
  const normalized = (rawLevel ?? '').trim().toUpperCase();

  if (!normalized) {
    return [];
  }

  if (normalized === 'ALL') {
    return [...LEVEL_ORDER];
  }

  if (normalized.includes(',')) {
    const selected = normalized
      .split(',')
      .map(part => part.trim())
      .filter(isLogLevel);

    return LEVEL_ORDER.filter(level => selected.includes(level));
  }

  if (!isLogLevel(normalized)) {
    return [];
  }

  const startIndex = LEVEL_ORDER.indexOf(normalized);
  return startIndex >= 0 ? [...LEVEL_ORDER.slice(startIndex)] : [];
};

const serializeMinLevels = (levels: LogLevel[]): string => {
  const selected = LEVEL_ORDER.filter(level => levels.includes(level));

  if (selected.length === LEVEL_ORDER.length) {
    return 'ALL';
  }

  return selected.join(',');
};

type TraceStepMode = 'summary' | 'full';

interface TraceRuntimeConfig {
  enabled: boolean;
  profile: string;
  featureFilter: string[];
  stepMode: TraceStepMode;
  includePayload: boolean;
  sampleRate: number;
  ttlSec: number;
  traceIdMode: string;
  consoleMirror: boolean;
}

const getDefaultTraceRuntimeConfig = (): TraceRuntimeConfig => {
  const fallback: TraceRuntimeConfig = {
    enabled: false,
    profile: 'baseline',
    featureFilter: [],
    stepMode: 'summary',
    includePayload: false,
    sampleRate: 1,
    ttlSec: 1800,
    traceIdMode: 'page-session',
    consoleMirror: false,
  };

  const defaults = HvConstant.LogConfig?.Trace;
  if (!defaults || typeof defaults !== 'object') {
    return fallback;
  }

  return {
    enabled: defaults.enabled ?? fallback.enabled,
    profile: defaults.profile ?? fallback.profile,
    featureFilter: Array.isArray(defaults.featureFilter) ? defaults.featureFilter : fallback.featureFilter,
    stepMode: defaults.stepMode === 'full' ? 'full' : 'summary',
    includePayload: defaults.includePayload ?? fallback.includePayload,
    sampleRate: Math.max(1, Number(defaults.sampleRate) || fallback.sampleRate),
    ttlSec: Math.max(0, Number(defaults.ttlSec) || fallback.ttlSec),
    traceIdMode: defaults.traceIdMode ?? fallback.traceIdMode,
    consoleMirror: defaults.consoleMirror ?? fallback.consoleMirror,
  };
};

const loadTraceRuntimeConfig = (): TraceRuntimeConfig => {
  const defaults = getDefaultTraceRuntimeConfig();
  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem('t3.config');
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);
    const trace = parsed?.log?.trace;
    if (!trace || typeof trace !== 'object') {
      return defaults;
    }

    return {
      ...defaults,
      ...trace,
      stepMode: trace.stepMode === 'full' ? 'full' : 'summary',
      sampleRate: Math.max(1, Number(trace.sampleRate) || defaults.sampleRate),
      ttlSec: Math.max(0, Number(trace.ttlSec) || defaults.ttlSec),
      featureFilter: Array.isArray(trace.featureFilter)
        ? trace.featureFilter.map((item: unknown) => String(item ?? '').trim().toLowerCase()).filter(Boolean)
        : defaults.featureFilter,
    };
  } catch {
    return defaults;
  }
};

const persistTraceRuntimeConfig = (traceConfig: TraceRuntimeConfig): void => {
  if (typeof window === 'undefined') {
    return;
  }

  let parsed: Record<string, any> = {};

  try {
    const raw = window.localStorage.getItem('t3.config');
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }

  const nextConfig = {
    ...parsed,
    log: {
      ...(parsed.log || {}),
      trace: {
        ...traceConfig,
      },
    },
  };

  window.localStorage.setItem('t3.config', JSON.stringify(nextConfig));
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
    gap: '8px',
  },
  settingRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 10px',
    background: '#faf9f8',
    borderRadius: '4px',
    border: '1px solid #edebe9',
  },
  settingRowActive: {
    background: '#f3f9fd',
    border: '1px solid #c7e0f4',
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
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: '8px',
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
    minWidth: '140px',
  },
  sinksWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    minWidth: 'unset',
    flex: '0 0 auto',
  },
  policyGroups: {
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '0',
  },
  policyGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'nowrap',
  },
  policyGroupOptions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  policyGroupLabel: {
    color: '#605e5c',
    minWidth: '42px',
  },
  emptyState: {
    padding: '12px',
    border: '1px solid #edebe9',
    background: '#faf9f8',
    color: '#605e5c',
  },
  tracePanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 12px',
    background: '#f7fbff',
    border: '1px solid #c7e0f4',
  },
  traceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  traceCheckbox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    userSelect: 'none',
    '& input[type="checkbox"]': {
      width: '14px',
      height: '14px',
      minWidth: '14px',
      margin: 0,
      cursor: 'pointer',
      accentColor: '#0078d4',
    },
  },
  traceNumberInput: {
    width: '72px',
    height: '24px',
    border: '1px solid #d2d0ce',
    borderRadius: '2px',
    padding: '0 6px',
    fontSize: '12px',
  },
  traceStatusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  traceStatusValue: {
    color: '#004578',
    fontWeight: 600,
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
});

export const LogSettingsTab: React.FC = () => {
  const s = useStyles();
  const [settings, setSettings] = useState<LogCategoryConfig[]>([]);
  const [traceConfig, setTraceConfig] = useState<TraceRuntimeConfig>(() => loadTraceRuntimeConfig());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [traceDirty, setTraceDirty] = useState(false);
  const [traceSaved, setTraceSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: LogCategoryConfig[] = await fetchSettingsOnce(SETTINGS_URL);
      const normalized = data.map(normalizeLoadedConfig);
      setSettings(normalized);
      setDirty(false);
      setOfflineMode(false);
    } catch (err) {
      console.error('Failed to load log settings:', err);
      setDirty(false);
      setOfflineMode(true);
      setSettings(prev => prev);
      setError('Could not reach the T3000 service — category settings are unavailable until the service responds.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setTraceConfig(loadTraceRuntimeConfig());
    setTraceDirty(false);
  }, []);

  const update = (category: string, patch: Partial<LogCategoryConfig>) => {
    setSettings(prev => prev.map(s => s.category === category ? { ...s, ...patch } : s));
    setDirty(true);
    setSaved(false);
  };

  const updateMinLevels = (category: string, levels: LogLevel[]) => {
    update(category, { minLevel: serializeMinLevels(levels) });
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

  const updateTraceConfig = (patch: Partial<TraceRuntimeConfig>) => {
    setTraceConfig(prev => ({ ...prev, ...patch }));
    setTraceDirty(true);
    setTraceSaved(false);
  };

  const applyTraceConfig = () => {
    persistTraceRuntimeConfig(traceConfig);
    setTraceDirty(false);
    setTraceSaved(true);
    setTimeout(() => setTraceSaved(false), 3000);
  };

  const grouped = GROUP_ORDER.map(group => ({
    group,
    label: GROUP_LABELS[group] ?? group,
    items: settings.filter(s => s.group === group),
  })).filter(g => g.items.length > 0);

  const hasInvalidLevelSelection = settings.some(cfg => cfg.enabled && expandLegacyMinLevel(cfg.minLevel).length === 0);
  const traceStatusText = [
    traceConfig.enabled ? 'On' : 'Off',
    traceConfig.stepMode === 'full' ? 'Full' : 'Summary',
    `Sample ${traceConfig.sampleRate}`,
    traceConfig.featureFilter.length > 0 ? `Features: ${traceConfig.featureFilter.join(', ')}` : 'Features: all',
  ].join(' | ');

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
            disabled={saving || !dirty || offlineMode || hasInvalidLevelSelection}
            size="small"
          >
            Save Changes
          </Button>
          {saved && (
            <Badge appearance="filled" color="success" size="small">Saved</Badge>
          )}
          <Button
            appearance={traceDirty ? 'primary' : 'subtle'}
            onClick={applyTraceConfig}
            disabled={!traceDirty}
            size="small"
          >
            Apply Trace Runtime
          </Button>
          {traceSaved && (
            <Badge appearance="filled" color="success" size="small">Trace Applied</Badge>
          )}
        </div>

        <div className={s.infoBar}>
          <InfoRegular className={s.infoIcon} />
          <Text size={200} className={s.infoText}>
            ERROR logs are always written to DB. Category switches below are the real runtime policy, and changes apply on the next log write.
          </Text>
        </div>

        <div className={s.tracePanel}>
          <Text size={400} weight="semibold" className={s.globalPolicyTitle}>Trace Runtime (Frontend)</Text>
          <Text size={100} className={s.levelHint}>
            This writes to local browser config only. Use this to turn TrendLog trace on without DevTools.
          </Text>
          <div className={s.traceStatusRow}>
            <Text size={200}>Current</Text>
            <Text size={200} className={s.traceStatusValue}>{traceStatusText}</Text>
          </div>
          <div className={s.traceRow}>
            <label className={s.traceCheckbox}>
              <input
                type="checkbox"
                checked={traceConfig.enabled}
                onChange={e => updateTraceConfig({ enabled: e.target.checked })}
              />
              <Text size={200}>Enable Trace</Text>
            </label>
            <label className={s.traceCheckbox}>
              <input
                type="checkbox"
                checked={traceConfig.stepMode === 'full'}
                onChange={e => updateTraceConfig({ stepMode: e.target.checked ? 'full' : 'summary' })}
              />
              <Text size={200}>Full Steps</Text>
            </label>
            <label className={s.traceCheckbox}>
              <input
                type="checkbox"
                checked={traceConfig.consoleMirror}
                onChange={e => updateTraceConfig({ consoleMirror: e.target.checked })}
              />
              <Text size={200}>Console Mirror</Text>
            </label>
            <label className={s.traceCheckbox}>
              <input
                type="checkbox"
                checked={traceConfig.includePayload}
                onChange={e => updateTraceConfig({ includePayload: e.target.checked })}
              />
              <Text size={200}>Include Payload</Text>
            </label>
            <label className={s.traceCheckbox}>
              <input
                type="checkbox"
                checked={traceConfig.featureFilter.length === 0 || traceConfig.featureFilter.includes('trendlog')}
                onChange={e => updateTraceConfig({ featureFilter: e.target.checked ? ['trendlog'] : [] })}
              />
              <Text size={200}>TrendLog Feature</Text>
            </label>
            <div className={s.traceRow}>
              <Text size={200}>Sample Rate</Text>
              <input
                type="number"
                min={1}
                max={1000}
                value={traceConfig.sampleRate}
                aria-label="Trace sample rate"
                onChange={e => updateTraceConfig({ sampleRate: Math.max(1, Number(e.target.value) || 1) })}
                className={s.traceNumberInput}
              />
            </div>
          </div>
        </div>

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
          {grouped.length === 0 && !loading ? (
            <div className={s.emptyState}>
              <Text size={200}>No category settings available.</Text>
            </div>
          ) : grouped.map(({ group, label, items }) => (
            <div key={group}>
              <Text size={400} weight="semibold" className={s.groupTitle}>
                {label}
              </Text>
              <div className={s.groupList}>
                {items.map(cfg => (
                  <div key={cfg.category} className={`${s.settingRow} ${cfg.enabled ? s.settingRowActive : ''}`}>
                    <div className={s.rowTop}>
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
                    <div className={s.rowBottom}>
                      <div className={s.policyGroups}>
                        <div className={s.policyGroup}>
                          <Text size={100} className={s.policyGroupLabel}>Detail</Text>
                          <div className={s.policyGroupOptions}>
                            {DETAIL_OPTIONS.map(detailMode => (
                              <label
                                key={detailMode}
                                className={`${s.detailPill} ${cfg.detailMode === detailMode ? s.detailPillActive : ''}`}
                              >
                                <input
                                  type="radio"
                                  name={`${cfg.category}-detail-mode`}
                                  checked={cfg.detailMode === detailMode}
                                  onChange={() => update(cfg.category, { detailMode })}
                                  disabled={offlineMode}
                                  className={s.detailRadioInput}
                                />
                                <Text size={100}>{formatDetailLabel(detailMode)}</Text>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className={s.policyGroup}>
                          <Text size={100} className={s.policyGroupLabel}>Levels</Text>
                          {(() => {
                            const selectedLevels = expandLegacyMinLevel(cfg.minLevel);
                            const allSelected = selectedLevels.length === LEVEL_ORDER.length;

                            return (
                              <div className={s.policyGroupOptions}>
                                <label className={s.policyCheckLabel}>
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={e => updateMinLevels(cfg.category, e.target.checked ? [...LEVEL_ORDER] : [])}
                                    disabled={offlineMode}
                                    className={s.policyCheckInput}
                                  />
                                  <Text size={100}>All</Text>
                                </label>
                                {LEVEL_ORDER.map(level => (
                                  <label key={level} className={s.policyCheckLabel}>
                                    <input
                                      type="checkbox"
                                      checked={selectedLevels.includes(level)}
                                      onChange={e => {
                                        const next = new Set(selectedLevels);
                                        if (e.target.checked) {
                                          next.add(level);
                                        } else {
                                          next.delete(level);
                                        }
                                        updateMinLevels(cfg.category, [...next]);
                                      }}
                                      disabled={offlineMode}
                                      className={s.policyCheckInput}
                                    />
                                    <Text size={100}>{formatLevelLabel(level)}</Text>
                                  </label>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
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
