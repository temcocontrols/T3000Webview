/**
 * Database Backend Configuration Page
 *
 * Allows administrators to view / configure the server database backend
 * (SQLite, PostgreSQL, MySQL, or MSSQL) used for server/client deployments.
 * Focused on trendlog and device-data storage across multiple PCs.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  makeStyles,
  mergeClasses,
  tokens,
  Button,
  Input,
  Label,
  Badge,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
  Spinner,
  Text,
  RadioGroup,
  Radio,
  Tooltip,
  Switch,
  Link,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  SearchRegular,
  PlugConnectedRegular,
  ArrowUploadRegular,
  InfoRegular,
  ServerRegular,
  DesktopRegular,
  CloudDatabaseRegular,
  DismissRegular,
  ArrowLeftRegular,
} from '@fluentui/react-icons';
import type {
  BackendType,
  BackendConfigResponse,
  SaveBackendConfigRequest,
  BackendStatus,
  DiscoveredInstance,
  IniConfig,
  ServerDbStatus,
  RegistryEntry,
} from '../services/databaseConfigApi';
import {
  getConfigs,
  saveConfig,
  testConnection,
  scanNetwork,
  getStatus,
  initSchema,
  getIniConfig,
  saveIniConfig,
  getServerDbStatus,
  getRegistry,
} from '../services/databaseConfigApi';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100% + 20px)',
    margin: '-10px',
    backgroundColor: '#ffffff',
  },
  messageBar: {
    margin: '0 12px 8px',
    paddingTop: '6px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#ffffff',
    fontSize: '12px',
  },
  scrollArea: {
    flex: 1,
    overflow: 'auto',
    padding: '0 6px 10px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c1c1c1 transparent',
  },
  backButtonBar: {
    paddingTop: '10px',
    paddingBottom: '4px',
    paddingLeft: '12px',
    paddingRight: '12px',
  },
  /* ── Intro Banner ── */
  introBanner: {
    display: 'flex',
    gap: '16px',
    padding: '10px 20px 16px',
    margin: '12px',
    backgroundColor: '#f0f6ff',
    borderRadius: '8px',
    border: '1px solid #c7dff7',
  },
  introBannerIcon: {
    fontSize: '28px',
    color: '#0f6cbd',
    flexShrink: 0,
    marginTop: '2px',
  },
  introBannerBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  introBannerTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f6cbd',
    margin: 0,
  },
  introBannerText: {
    fontSize: '13px',
    color: '#323130',
    lineHeight: '1.5',
    margin: 0,
  },
  infoBanner: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    margin: '8px 12px',
    backgroundColor: '#f0f6ff',
    borderRadius: '6px',
    border: '1px solid #c7dff7',
  },
  infoBannerIcon: {
    fontSize: '20px',
    color: '#0f6cbd',
    flexShrink: 0,
    marginTop: '1px',
  },
  infoBannerBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoBannerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  infoBannerTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f6cbd',
    margin: 0,
  },
  infoBannerText: {
    fontSize: '12.5px',
    color: '#323130',
    lineHeight: '1.5',
    margin: 0,
  },
  infoBannerLinks: {
    fontSize: '12.5px',
    margin: 0,
  },
  infoBannerDivider: {
    margin: '0 6px',
    color: '#c7dff7',
  },
  /* ── Section ── */
  section: {
    margin: '0 12px 12px',
    border: '1px solid #edebe9',
    borderRadius: '4px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '0px',
    padding: '0 12px',
    borderTop: '1px solid #edebe9',
    borderBottom: '1px solid #edebe9',
    backgroundColor: '#f5f5f5',
    minHeight: '32px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
    margin: 0,
  },
  sectionDescription: {
    fontSize: '12px',
    color: '#605e5c',
    padding: '6px 12px 0',
    lineHeight: '1.4',
    margin: 0,
  },
  /* ── Forms ── */
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '12px',
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
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 22px',
    borderTop: '1px solid #edebe9',
    flexShrink: 0,
    backgroundColor: '#ffffff',
  },
  /* ── Server / Client Status Card ── */
  networkStatusWrapper: {
    padding: '12px',
  },
  serverCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f0f6ff',
    border: '1px solid #c7dff7',
    borderRadius: '8px',
  },
  serverCardIcon: {
    fontSize: '22px',
    color: '#0f6cbd',
    flexShrink: 0,
  },
  serverCardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flexGrow: 1,
    minWidth: 0,
  },
  serverCardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#323130',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  serverCardMeta: {
    fontSize: '12px',
    color: '#605e5c',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  serverCardMetaSep: {
    color: '#c8c6c4',
  },
  /* ── Client tree ── */
  clientTreeWrapper: {
    padding: '4px 0 0 20px',
  },
  clientTreeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '3px 0',
    fontSize: '13px',
    color: '#323130',
  },
  clientTreeConnector: {
    color: '#c8c6c4',
    fontFamily: 'monospace',
    fontSize: '14px',
    width: '24px',
    flexShrink: 0,
    userSelect: 'none',
  },
  clientTreeIcon: {
    fontSize: '14px',
    color: '#605e5c',
    flexShrink: 0,
  },
  clientTreeHostname: {
    fontWeight: 600,
    minWidth: '140px',
  },
  clientTreeIp: {
    color: '#605e5c',
    minWidth: '120px',
  },
  clientTreeStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    minWidth: '80px',
  },
  statusDotOnline: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#107c10',
    flexShrink: 0,
  },
  statusDotOffline: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#d13438',
    flexShrink: 0,
  },
  clientTreeLastSeen: {
    color: '#a19f9d',
    fontSize: '12px',
  },
  clientTreeEmpty: {
    padding: '8px 0 0 44px',
    color: '#a19f9d',
    fontSize: '12px',
    fontStyle: 'italic',
  },
  /* ── Client scenario: connected-to-server card ── */
  connectedServerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fafafa',
    border: '1px solid #edebe9',
    borderRadius: '8px',
  },
  /* ── Standalone card ── */
  standaloneCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fafafa',
    border: '1px solid #edebe9',
    borderRadius: '8px',
  },
  standaloneCardIcon: {
    fontSize: '22px',
    color: '#605e5c',
    flexShrink: 0,
  },
  /* ── Info hint below card ── */
  statusInfoHint: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '10px 12px',
    marginTop: '8px',
    backgroundColor: '#f0f6ff',
    borderRadius: '6px',
    border: '1px solid #c7dff7',
    fontSize: '12px',
    color: '#323130',
    lineHeight: '1.5',
  },
  statusInfoHintDanger: {
    backgroundColor: '#fde7e9',
    border: '1px solid #f5c2c2',
    color: '#8e1c1c',
  },
  statusInfoHintIcon: {
    fontSize: '14px',
    color: '#0f6cbd',
    flexShrink: 0,
    marginTop: '1px',
  },
  statusInfoHintIconDanger: {
    color: '#a4262c',
  },
  /* ── Role Cards ── */
  roleCardsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    padding: '12px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    border: '2px solid #edebe9',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  roleCardSelected: {
    ...{borderColor: '#0f6cbd'} as any,
    backgroundColor: '#f0f6ff',
  },
  roleCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  roleCardIcon: {
    fontSize: '24px',
    color: '#0f6cbd',
  },
  roleCardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#323130',
    margin: 0,
  },
  roleCardDesc: {
    fontSize: '12px',
    color: '#605e5c',
    lineHeight: '1.5',
    margin: 0,
  },
  /* ── Misc ── */
  scanResults: {
    padding: '4px 12px 8px',
  },
  scanRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '13px',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  padH12: {
    padding: '0 12px',
  },
  formRowFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    gridColumn: '1 / -1',
  },
  scanVersionText: {
    color: '#605e5c',
    marginLeft: '8px',
  },
  loadingBar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: '12px 8px 4px',
    backgroundColor: 'transparent',
    marginBottom: tokens.spacingVerticalM,
    fontSize: '13px',
    color: '#605e5c',
  },
  optionsRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    padding: '0 12px 12px',
  },
  iniPathText: {
    fontSize: '11px',
    color: '#a19f9d',
    padding: '0 12px 8px',
  },
  /* ── Scan Status Bar ── */
  scanStatusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    margin: '0',
    backgroundColor: '#f7f9fc',
    borderTop: '1px solid #edebe9',
    fontSize: '12.5px',
    color: '#323130',
    lineHeight: '1.4',
    animationName: {
      from: { opacity: 0.6 },
      to: { opacity: 1 },
    },
    animationDuration: '0.3s',
    animationFillMode: 'both',
  },
  scanStatusIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  scanStatusText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  scanStatusPhase: {
    fontWeight: 600,
    color: '#0f6cbd',
    fontSize: '12.5px',
  },
  scanStatusDetail: {
    fontSize: '11.5px',
    color: '#605e5c',
  },
  scanStatusDone: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    margin: '0',
    backgroundColor: '#f0fff0',
    borderTop: '1px solid #c6ecc6',
    fontSize: '12.5px',
    color: '#107c10',
    fontWeight: 600,
  },
  scanStatusError: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    margin: '0',
    backgroundColor: '#fef0f1',
    borderTop: '1px solid #f3d6d8',
    fontSize: '12.5px',
    color: '#d13438',
    fontWeight: 600,
  },
  scanStepList: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  scanStepDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#c8c6c4',
    transition: 'background-color 0.3s, transform 0.3s',
  },
  scanStepDotActive: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#0f6cbd',
    transform: 'scale(1.3)',
    transition: 'background-color 0.3s, transform 0.3s',
  },
  scanStepDotDone: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#107c10',
    transition: 'background-color 0.3s, transform 0.3s',
  },
  scanStatusIdle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    margin: '0',
    backgroundColor: '#fafafa',
    borderTop: '1px solid #edebe9',
    fontSize: '12.5px',
    color: '#a19f9d',
  },
  scanStatusIdleIcon: {
    fontSize: '14px',
    color: '#c8c6c4',
    flexShrink: 0,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BACKEND_LABELS: Record<BackendType, string> = {
  mssql: 'Microsoft SQL Server',
  postgres: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  sqlite: 'SQLite (Local)',
};

const DEFAULT_PORTS: Record<BackendType, number> = {
  sqlite: 0,
  postgres: 5432,
  mysql: 3306,
  mssql: 1433,
};
function getCenterDbStatusPresentation(status?: string, connected?: boolean) {
  switch (status) {
    case 'healthy':
      return { label: 'Connected', color: 'success' as const };
    case 'server_unreachable':
      return { label: 'SQL Server Down', color: 'danger' as const };
    case 'db_missing':
      return { label: 'Database Missing', color: 'warning' as const };
    case 'schema_missing':
      return { label: 'Needs Init', color: 'warning' as const };
    case 'misconfigured_backend':
      return { label: 'Misconfigured', color: 'warning' as const };
    default:
      return {
        label: connected ? 'Connected' : 'Disconnected',
        color: connected ? ('success' as const) : ('danger' as const),
      };
  }
}

function configToForm(cfg: BackendConfigResponse | undefined, backendType?: BackendType): SaveBackendConfigRequest {
  const isMssql = (cfg?.backend_type ?? backendType) === 'mssql';
  return {
    backend_type: cfg?.backend_type ?? backendType ?? 'sqlite',
    host: cfg?.host ?? '',
    port: cfg?.port || undefined,
    instance: cfg?.instance ?? '',
    database_name: cfg?.database_name ?? (isMssql ? 'T3000' : ''),
    username: cfg?.username ?? (isMssql ? 'sa' : ''),
    password: undefined, // omit to preserve existing password on backend
    connection_url: undefined, // omit to preserve existing encrypted URL on backend
    extra_options: cfg?.extra_options != null ? (typeof cfg.extra_options === 'string' ? cfg.extra_options : JSON.stringify(cfg.extra_options)) : '',
  };
}

/** Format a UTC timestamp string as relative time, e.g. "2s ago", "5m ago", "3h ago" */
function formatLastSeen(utcStr: string): string {
  try {
    const then = new Date(utcStr + 'Z'); // append Z to treat as UTC
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - then.getTime()) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  } catch {
    return utcStr;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DatabaseConfigPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const fromDashboard = new URLSearchParams(location.search).get('from') === 'dashboard';

  // Data
  const [configs, setConfigs] = useState<BackendConfigResponse[]>([]);
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [scanResults, setScanResults] = useState<DiscoveredInstance[]>([]);

  // Server/Client INI config state
  const [iniConfig, setIniConfig] = useState<IniConfig | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerDbStatus | null>(null);
  const [iniForm, setIniForm] = useState({ enabled: false, role: 'client' });
  const [savingIni, setSavingIni] = useState(false);

  // Registry state
  const [registryEntries, setRegistryEntries] = useState<RegistryEntry[]>([]);

  // Form state
  const [selectedType, setSelectedType] = useState<BackendType>('sqlite');
  const [form, setForm] = useState<SaveBackendConfigRequest>({ backend_type: 'sqlite' });

  // UI state
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [initializingSchema, setInitializingSchema] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Scan status bar phases
  const [scanPhase, setScanPhase] = useState(0);
  const [scanDone, setScanDone] = useState<{ count: number } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanStatusRef = useRef<HTMLDivElement>(null);
  const serverStatusUi = getCenterDbStatusPresentation(serverStatus?.center_db_status, serverStatus?.server_connected);

  const SCAN_PHASES = [
    { label: 'Preparing scan…', detail: 'Detecting local subnet for TCP sweep' },
    { label: 'Scanning port 1433…', detail: 'Probing each IP on default SQL Server port' },
    { label: 'Checking named instances…', detail: 'UDP 1434 broadcast for SQL Server Browser' },
    { label: 'Processing results…', detail: 'Merging and deduplicating discovered instances' },
  ];

  // Cycle through scan phases while scanning is active
  useEffect(() => {
    if (!scanning) return;
    setScanPhase(0);
    setScanDone(null);
    setScanError(null);
    // Auto-scroll to the status bar when scanning starts
    requestAnimationFrame(() => {
      scanStatusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    const delays = [0, 400, 1200, 2800]; // ms offsets for each phase
    const timers = delays.map((ms, idx) =>
      setTimeout(() => setScanPhase(idx), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [scanning]);

  // Auto-scroll to status bar when scan completes or errors
  useEffect(() => {
    if (scanDone || scanError) {
      requestAnimationFrame(() => {
        scanStatusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [scanDone, scanError]);

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  // -------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [cfgs, sts, ini, cStatus] = await Promise.all([
        getConfigs(),
        getStatus(),
        getIniConfig().catch(() => null),
        getServerDbStatus().catch(() => null),
      ]);
      setConfigs(cfgs);
      setStatus(sts);
      if (ini) {
        setIniConfig(ini);
        setIniForm({ enabled: ini.enabled, role: ini.role });
      }
      if (cStatus) setServerStatus(cStatus);

      // Only fetch registry when server DB is enabled (avoids 404)
      if (ini?.enabled) {
        const reg = await getRegistry().catch(() => [] as RegistryEntry[]);
        setRegistryEntries(reg);
      } else {
        setRegistryEntries([]);
      }
      // Select the active backend by default
      const active = cfgs.find(c => c.is_active) ?? cfgs[0];
      if (active) {
        const backendType = active.backend_type;
        // If server DB is enabled, default to mssql when active backend is sqlite
        const effectiveType = (ini?.enabled && backendType === 'sqlite') ? 'mssql' : backendType;
        setSelectedType(effectiveType);
        const existing = cfgs.find(c => c.backend_type === effectiveType);
        setForm(configToForm(existing ?? active, effectiveType));
      }
    } catch (err) {
      console.error('Failed to load database config:', err);
      setMessage({ text: 'Failed to load database configuration', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // When the user picks a different backend type in the radio group,
  // populate the form with the saved config for that type (if any).
  const handleTypeChange = (type: BackendType) => {
    setSelectedType(type);
    const existing = configs.find(c => c.backend_type === type);
    setForm(configToForm(existing, type));
    setMessage(null);
  };

  // -------------------------------------------------------------------
  // Field changes
  // -------------------------------------------------------------------

  const setField = <K extends keyof SaveBackendConfigRequest>(key: K, value: SaveBackendConfigRequest[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // -------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------

  const handleTest = async () => {
    try {
      setTesting(true);
      setMessage(null);
      const payload: Record<string, unknown> = { ...form, backend_type: selectedType };
      // Parse extra_options string into a JSON object for the backend
      if (typeof payload.extra_options === 'string') {
        const trimmed = (payload.extra_options as string).trim();
        if (trimmed) {
          try { payload.extra_options = JSON.parse(trimmed); } catch { /* keep as string */ }
        } else {
          delete payload.extra_options;
        }
      }
      const res = await testConnection(payload as any);
      if (res.success) {
        // Use backend message if available (includes DB existence details)
        const text = res.message || `Connection OK${res.latency_ms != null ? ` (${res.latency_ms} ms)` : ''}`;
        // Show warning when auth works but target DB doesn't exist yet
        const msgType: 'success' | 'warning' = res.db_exists === false ? 'warning' : 'success';
        setMessage({ text, type: msgType });
      } else {
        setMessage({
          text: `Connection failed: ${res.error || res.message || 'Unknown error'}`,
          type: 'error',
        });
      }
    } catch (err: any) {
      setMessage({ text: `Test failed: ${err.message}`, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      setScanResults([]);
      setScanDone(null);
      setScanError(null);
      const results = await scanNetwork();
      setScanResults(results);
      setScanDone({ count: results.length });
      if (results.length === 0) {
        setMessage({ text: 'No SQL Server instances found. Check: (1) SQL Server service is running, (2) TCP port 1433 is open in Windows Firewall, (3) server is on the same network subnet. You can also enter the host and port manually.', type: 'warning' });
      }
    } catch (err: any) {
      setScanError(err.message);
      setMessage({ text: `Scan failed: ${err.message}`, type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const handleInitSchema = async () => {
    try {
      setInitializingSchema(true);
      setMessage(null);
      const res = await initSchema(selectedType);
      setMessage({
        text: res.success
          ? `Schema initialized — ${res.executed} statements executed.`
          : `Schema init failed: ${res.message}`,
        type: res.success ? 'success' : 'error',
      });
    } catch (err: any) {
      setMessage({ text: `Init schema failed: ${err.message}`, type: 'error' });
    } finally {
      setInitializingSchema(false);
    }
  };

  /** Populate form fields from a scan result */
  const applyScanResult = (inst: DiscoveredInstance) => {
    setForm(prev => ({
      ...prev,
      host: inst.host,
      port: inst.port ?? DEFAULT_PORTS.mssql,
      instance: inst.instance ?? prev.instance ?? '',
      username: prev.username || 'sa',
      database_name: prev.database_name || 'T3000',
    }));
    setMessage(null);
  };

  /** Save INI [ServerDatabase] config + DB connection settings */
  const handleSaveIni = async () => {
    try {
      setSavingIni(true);
      setMessage(null);

      // 1. Validate form before persisting anything
      if (iniForm.enabled && selectedType !== 'sqlite') {
        if (!form.host?.trim()) {
          setMessage({ text: 'Host / Server is required.', type: 'error' });
          return;
        }
        if (!form.database_name?.trim() && !form.connection_url?.trim()) {
          setMessage({ text: 'Database name (or Connection URL) is required.', type: 'error' });
          return;
        }
        // Password required on first save (no existing password stored)
        const existingCfgForType = configs.find(c => c.backend_type === selectedType);
        if (!existingCfgForType?.password_set && !form.password?.trim() && !form.connection_url?.trim()) {
          setMessage({ text: 'Password is required for the first configuration.', type: 'error' });
          return;
        }
      }

      // 2. Save INI (enabled + role)
      await saveIniConfig(iniForm);

      // 3. If enabled with a remote backend, also save DB connection settings
      if (iniForm.enabled && selectedType !== 'sqlite') {
        const payload: Record<string, unknown> = { ...form, backend_type: selectedType, role: iniForm.role };
        if (!payload.password) delete payload.password;
        // Parse extra_options string into a JSON object for the backend
        if (typeof payload.extra_options === 'string') {
          const trimmed = (payload.extra_options as string).trim();
          if (trimmed) {
            try { payload.extra_options = JSON.parse(trimmed); } catch { /* keep as string */ }
          } else {
            delete payload.extra_options;
          }
        }
        await saveConfig(payload as any);
      }

      const summary = iniForm.enabled
        ? `Server Database ${iniForm.role} mode + ${BACKEND_LABELS[selectedType]} settings saved. Restart T3000 to apply.`
        : 'Server Database disabled. Restart T3000 to apply.';
      setMessage({ text: summary, type: 'success' });
      await refresh();
    } catch (err: any) {
      setMessage({ text: `Save failed: ${err.message}`, type: 'error' });
    } finally {
      setSavingIni(false);
    }
  };

  // -------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------

  const isRemote = selectedType !== 'sqlite';
  const isBusy = testing || scanning || initializingSchema || savingIni;
  const activeConfig = configs.find(c => c.is_active);
  const existingCfg = configs.find(c => c.backend_type === selectedType);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBar}>
          <Spinner size="tiny" />
          <span>Loading database configuration…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
      {/* ── Back to Dashboard ── */}
      {fromDashboard && (
        <div className={styles.backButtonBar}>
          <Button
            appearance="subtle"
            icon={<ArrowLeftRegular />}
            onClick={() => navigate('/t3000/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      )}
      {/* ── Message Bar ── */}
      {message && (
        <div className={styles.messageBar}>
          <MessageBar
            intent={message.type === 'success' ? 'success' : message.type === 'warning' ? 'warning' : 'error'}
            shape="square"
          >
            <MessageBarBody style={{ fontSize: '12px' }}>
              <MessageBarTitle style={{ fontSize: '12px' }}>{message.type === 'success' ? 'Success' : message.type === 'warning' ? 'Notice' : 'Error'}</MessageBarTitle>
              {message.text}
            </MessageBarBody>
            <MessageBarActions containerAction={<Button appearance="transparent" icon={<DismissRegular />} onClick={() => setMessage(null)} />} />
          </MessageBar>
        </div>
      )}
      {/* ── Intro Banner ── */}
      <div className={styles.introBanner}>
        <CloudDatabaseRegular className={styles.introBannerIcon} />
        <div className={styles.introBannerBody}>
          <h3 className={styles.introBannerTitle}>Centralized Trendlog &amp; Data Storage</h3>
          <p className={styles.introBannerText}>
            If you have multiple PCs running T3000 and polling different controllers,
            this feature collects all trend logs and device data into a single shared database.
            Designate one PC as the <strong>Server</strong> to log and store the data centrally,
            and configure the remaining PCs as <strong>Clients</strong> to access and view the shared data.
          </p>
        </div>
      </div>

      {/* ── Database Status ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Database Status</h3>
        </div>

        {/* ── Scenario A: This PC is the Server ── */}
        {iniForm.enabled && iniForm.role === 'server' && (() => {
          const selfEntry = registryEntries.find(e => e.is_self);
          const clients = registryEntries.filter(e => !e.is_self);
          const hostname = selfEntry?.hostname ?? serverStatus?.hostname ?? '—';
          return (
            <div className={styles.networkStatusWrapper}>
              {/* Server card */}
              <div className={styles.serverCard}>
                <ServerRegular className={styles.serverCardIcon} />
                <div className={styles.serverCardInfo}>
                  <div className={styles.serverCardTitle}>
                    Server (This PC)
                  </div>
                  <div className={styles.serverCardMeta}>
                    <span>{hostname}</span>
                    {selfEntry?.ip_address && (
                      <>
                        <span className={styles.serverCardMetaSep}>·</span>
                        <span>{selfEntry.ip_address}</span>
                      </>
                    )}
                    <span className={styles.serverCardMetaSep}>·</span>
                    <span>{BACKEND_LABELS[status?.active_backend ?? 'sqlite']}</span>
                    {status?.table_count != null && (
                      <>
                        <span className={styles.serverCardMetaSep}>·</span>
                        <span>{status.table_count} tables</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge
                  appearance="filled"
                  color={status?.connected ? 'success' : 'danger'}
                  size="small"
                >
                  {status?.connected ? '● Online' : '○ Offline'}
                </Badge>
              </div>

              {/* Client tree */}
              {clients.length > 0 ? (
                <div className={styles.clientTreeWrapper}>
                  {clients.map((entry, i) => (
                    <div key={entry.id} className={styles.clientTreeRow}>
                      <span className={styles.clientTreeConnector}>
                        {i < clients.length - 1 ? '├──' : '└──'}
                      </span>
                      <DesktopRegular className={styles.clientTreeIcon} />
                      <span className={styles.clientTreeHostname}>{entry.hostname}</span>
                      <span className={styles.clientTreeIp}>{entry.ip_address}</span>
                      <span className={styles.clientTreeStatus}>
                        <span className={entry.status === 'online' ? styles.statusDotOnline : styles.statusDotOffline} />
                        {entry.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                      <span className={styles.clientTreeLastSeen}>Last: {formatLastSeen(entry.last_seen)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.clientTreeEmpty}>
                  No client PCs connected yet. Clients will appear once they start sending heartbeats.
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Scenario B: This PC is a Client ── */}
        {iniForm.enabled && iniForm.role === 'client' && (
          <div className={styles.networkStatusWrapper}>
            <div className={styles.connectedServerCard}>
              <DesktopRegular className={styles.serverCardIcon} />
              <div className={styles.serverCardInfo}>
                <div className={styles.serverCardTitle}>
                  Client (This PC)
                </div>
                <div className={styles.serverCardMeta}>
                  <span>{serverStatus?.hostname ?? '—'}</span>
                  {(() => {
                    const selfIp = registryEntries.find(e => e.is_self)?.ip_address;
                    return selfIp ? (
                      <>
                        <span className={styles.serverCardMetaSep}>·</span>
                        <span>{selfIp}</span>
                      </>
                    ) : null;
                  })()}
                  {activeConfig?.host && (
                    <>
                      <span className={styles.serverCardMetaSep}>·</span>
                      <span>Server: {activeConfig.host}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge
                appearance="filled"
                color={serverStatusUi.color}
                size="small"
              >
                {serverStatusUi.label}
              </Badge>
            </div>
            <div
              className={mergeClasses(
                styles.statusInfoHint,
                serverStatus?.center_db_status === 'server_unreachable' ? styles.statusInfoHintDanger : undefined,
              )}
            >
              <InfoRegular
                className={mergeClasses(
                  styles.statusInfoHintIcon,
                  serverStatus?.center_db_status === 'server_unreachable' ? styles.statusInfoHintIconDanger : undefined,
                )}
              />
              <span>
                {serverStatus?.center_db_message
                  ?? (serverStatus?.server_connected
                    ? `Connected to server at ${activeConfig?.host ?? '—'}. Reading trend logs and device data from the shared database.`
                    : `Configured to connect to server${activeConfig?.host ? ` at ${activeConfig.host}` : ''}. Server status will appear once the connection is active.`)
                }
                {serverStatus?.fallback_active ? ' Running on local SQLite fallback.' : ''}
              </span>
            </div>
          </div>
        )}

        {/* ── Scenario C: Standalone (not enabled) ── */}
        {!iniForm.enabled && (
          <div className={styles.networkStatusWrapper}>
            <div className={styles.standaloneCard}>
              <DesktopRegular className={styles.standaloneCardIcon} />
              <div className={styles.serverCardInfo}>
                <div className={styles.serverCardTitle}>
                  Standalone
                </div>
                <div className={styles.serverCardMeta}>
                  <span>{serverStatus?.hostname ?? '—'}</span>
                  {(() => {
                    const selfIp = registryEntries.find(e => e.is_self)?.ip_address;
                    return selfIp ? (
                      <>
                        <span className={styles.serverCardMetaSep}>·</span>
                        <span>{selfIp}</span>
                      </>
                    ) : null;
                  })()}
                  <span className={styles.serverCardMetaSep}>·</span>
                  <span>{BACKEND_LABELS[status?.active_backend ?? 'sqlite']}</span>
                  {status?.table_count != null && (
                    <>
                      <span className={styles.serverCardMetaSep}>·</span>
                      <span>{status.table_count} tables</span>
                    </>
                  )}
                </div>
              </div>
              <Badge
                appearance="filled"
                color={status?.connected ? 'success' : 'danger'}
                size="small"
              >
                {status?.connected ? '● Online' : '○ Offline'}
              </Badge>
            </div>
            <div className={styles.statusInfoHint}>
              <InfoRegular className={styles.statusInfoHintIcon} />
              <span>Running in standalone mode. Enable centralized database below to share data with other PCs.</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Server / Client Configuration ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Server / Client Configuration</h3>
          <Tooltip content="These settings are stored in the local setting.ini file and take effect after restart." relationship="description">
            <InfoRegular style={{ fontSize: '14px', color: '#605e5c', cursor: 'help' }} />
          </Tooltip>
        </div>
        <p className={styles.sectionDescription}>
          Allow multiple T3000 PCs to share one central database. Set this PC as the Server (hosts the database) or a Client (connects to it). A restart is required after changes.
        </p>

        {/* Enable toggle */}
        <div className={styles.padH12}>
          <Tooltip content="Turn on to connect this PC to a shared server database for trend data and device info." relationship="description">
            <Switch
              checked={iniForm.enabled}
              onChange={(_, data) => {
                setIniForm(prev => ({ ...prev, enabled: data.checked }));
                if (data.checked) {
                  // Auto-select mssql when enabling
                  setSelectedType('mssql');
                  const existing = configs.find(c => c.backend_type === 'mssql');
                  setForm(configToForm(existing, 'mssql'));
                } else {
                  // Clear selection back to sqlite when disabling
                  setSelectedType('sqlite');
                }
              }}
              label={iniForm.enabled ? 'Server Database: Enabled' : 'Server Database: Disabled'}
            />
          </Tooltip>
        </div>

        {iniForm.enabled && (
          <>
            {/* Role selection as cards */}
            <div className={styles.roleCardsRow}>
              <div
                className={`${styles.roleCard} ${iniForm.role === 'server' ? styles.roleCardSelected : ''}`}
                onClick={() => {
                  setIniForm(prev => ({ ...prev, role: 'server' }));
                  if (selectedType === 'sqlite') {
                    setSelectedType('mssql');
                    const existing = configs.find(c => c.backend_type === 'mssql');
                    setForm(configToForm(existing, 'mssql'));
                  }
                }}
              >
                <div className={styles.roleCardHeader}>
                  <ServerRegular className={styles.roleCardIcon} />
                  <h4 className={styles.roleCardTitle}>Server</h4>
                  {iniForm.role === 'server' && <Badge appearance="filled" color="brand" size="small">Selected</Badge>}
                </div>
                <p className={styles.roleCardDesc}>
                  This PC writes trend logs and device data to the shared database.
                  Typically the main PC that hosts the SQL Server instance.
                  Data is written to both the local SQLite and the server database for redundancy.
                </p>
              </div>
              <div
                className={`${styles.roleCard} ${iniForm.role === 'client' ? styles.roleCardSelected : ''}`}
                onClick={() => setIniForm(prev => ({ ...prev, role: 'client' }))}
              >
                <div className={styles.roleCardHeader}>
                  <DesktopRegular className={styles.roleCardIcon} />
                  <h4 className={styles.roleCardTitle}>Client</h4>
                  {iniForm.role === 'client' && <Badge appearance="filled" color="brand" size="small">Selected</Badge>}
                </div>
                <p className={styles.roleCardDesc}>
                  This PC reads trend logs and device data from the shared database.
                  It continues to write its own local data to SQLite for offline use,
                  and can view data from all other PCs via the server.
                </p>
              </div>
            </div>


          </>
        )}

        {/* Save + INI path */}
        {iniConfig?.ini_path && (
          <p className={styles.iniPathText}>
            Config file: {iniConfig.ini_path}
          </p>
        )}
      </div>

      {/* ── Backend Type Selector (server or client) ── */}
      {iniForm.enabled && <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Backend Type</h3>
          <Tooltip content="Choose which database engine stores the shared data. SQLite is the default local engine. For multi-PC setups, select Microsoft SQL Server." relationship="description">
            <InfoRegular style={{ fontSize: '14px', color: '#605e5c', cursor: 'help' }} />
          </Tooltip>
        </div>
        <p className={styles.sectionDescription}>
          Select the database engine for the server. For multi-PC deployments, use Microsoft SQL Server.
        </p>
        <div className={styles.padH12}>
          <RadioGroup
            value={selectedType}
            onChange={(_, data) => handleTypeChange(data.value as BackendType)}
            layout="horizontal"
          >
            {(Object.keys(BACKEND_LABELS) as BackendType[]).filter(bt => bt !== 'sqlite' && bt !== 'postgres' && bt !== 'mysql').map(bt => (
              <Radio key={bt} value={bt} label={BACKEND_LABELS[bt]} />
            ))}
          </RadioGroup>
        </div>
      </div>}

      {/* ── Connection Form (remote backends only) ── */}
      {iniForm.enabled && isRemote && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Connection Settings — {BACKEND_LABELS[selectedType]}</h3>
          </div>
          <div className={styles.infoBanner}>
            <div className={styles.infoBannerBody}>
              <div className={styles.infoBannerHeader}>
                <InfoRegular className={styles.infoBannerIcon} />
                <p className={styles.infoBannerText}>
                  Enter the connection details for the <strong>{BACKEND_LABELS[selectedType]}</strong> instance manually.{selectedType === 'mssql' ? ' You can also use Scan LAN below to discover SQL Server instances on your network.' : ''} Use "Test Connection" to verify before saving.
                </p>
              </div>
            </div>
          </div>

          {selectedType === 'mssql' && (
            <div className={styles.infoBanner}>
              <div className={styles.infoBannerBody}>
                <div className={styles.infoBannerHeader}>
                  <InfoRegular className={styles.infoBannerIcon} />
                  <h4 className={styles.infoBannerTitle}>Prerequisites</h4>
                </div>
                <p className={styles.infoBannerText}>
                  SQL Server must be installed and running. Supported: <strong>SQL Server 2022 Express</strong>.
                  Enable TCP/IP in SQL Server Configuration Manager and start the SQL Browser service.
                </p>
                <p className={styles.infoBannerLinks}>
                  <Link href="https://www.microsoft.com/en-us/sql-server/sql-server-downloads" target="_blank">
                    Download SQL Server Express (Free)
                  </Link>
                  <span className={styles.infoBannerDivider}>|</span>
                  <Link href="https://learn.microsoft.com/en-us/sql/database-engine/install-windows/install-sql-server" target="_blank">
                    Installation guide
                  </Link>
                  <span className={styles.infoBannerDivider}>|</span>
                  <Link href="https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/configure-a-server-to-listen-on-a-specific-tcp-port" target="_blank">
                    Enable TCP/IP &amp; ports
                  </Link>
                </p>
              </div>
            </div>
          )}

          <div className={styles.formGrid}>
            <div className={styles.formRow}>
              <Label className={styles.label} htmlFor="db-host">Host / IP</Label>
              <Tooltip content="The hostname or IP address of the database server, e.g. 192.168.1.100 or db-server.local" relationship="description">
                <Input
                  id="db-host"
                  value={form.host ?? ''}
                  onChange={(_, d) => setField('host', d.value)}
                  placeholder="192.168.1.100"
                />
              </Tooltip>
            </div>

            <div className={styles.formRow}>
              <Label className={styles.label} htmlFor="db-port">Port</Label>
              <Input
                id="db-port"
                value={String(form.port ?? DEFAULT_PORTS[selectedType])}
                onChange={(_, d) => setField('port', Number(d.value) || DEFAULT_PORTS[selectedType])}
              />
            </div>

            {selectedType === 'mssql' && (
              <div className={styles.formRow}>
                <Label className={styles.label} htmlFor="db-instance">Instance Name</Label>
                <Tooltip content="Named SQL Server instance (e.g. SQLEXPRESS). Leave blank for the default instance." relationship="description">
                  <Input
                    id="db-instance"
                    value={form.instance ?? ''}
                    onChange={(_, d) => setField('instance', d.value)}
                    placeholder="SQLEXPRESS"
                  />
                </Tooltip>
              </div>
            )}

            <div className={styles.formRow}>
              <Label className={styles.label} htmlFor="db-name">Database Name</Label>
              <Tooltip content="The name of the database to connect to. It will be created if it doesn't exist when you run Init Schema." relationship="description">
                <Input
                  id="db-name"
                  value={form.database_name ?? ''}
                  onChange={(_, d) => setField('database_name', d.value)}
                  placeholder="T3000"
                />
              </Tooltip>
            </div>

            <div className={styles.formRow}>
              <Label className={styles.label} htmlFor="db-user">Username</Label>
              <Input
                id="db-user"
                value={form.username ?? ''}
                onChange={(_, d) => setField('username', d.value)}
              />
            </div>

            <div className={styles.formRow}>
              <Label className={styles.label} htmlFor="db-pass">Password</Label>
              <Tooltip content={existingCfg?.password_set ? 'Password is saved. Leave blank to keep it, or type a new one to replace it.' : 'Enter the database password.'} relationship="description">
                <Input
                  id="db-pass"
                  type="password"
                  placeholder={existingCfg?.password_set ? '••••••••' : ''}
                  value={form.password ?? ''}
                  onChange={(_, d) => setField('password', d.value)}
                />
              </Tooltip>
            </div>

            <div className={styles.formRowFull}>
              <Label className={styles.label} htmlFor="db-url">
                Connection URL <Text size={200} style={{ color: '#605e5c' }}>(optional — overrides the fields above)</Text>
              </Label>
              <Tooltip content="Leave blank to keep the previously saved URL. Enter a new URL to replace it." relationship="description">
                <Input
                  id="db-url"
                  value={form.connection_url ?? ''}
                  onChange={(_, d) => setField('connection_url', d.value)}
                  placeholder={
                  selectedType === 'mssql'
                    ? 'mssql://user:pass@host:1433/dbname'
                    : selectedType === 'postgres'
                      ? 'postgres://user:pass@host:5432/dbname'
                      : selectedType === 'mysql'
                        ? 'mysql://user:pass@host:3306/dbname'
                        : ''
                }
              />
              </Tooltip>
            </div>
          </div>
        </div>
      )}

      {/* ── MSSQL Network Scan ── */}
      {iniForm.enabled && selectedType === 'mssql' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Network Scan — SQL Server Discovery</h3>
            <Tooltip content="Broadcasts a UDP probe on port 1434 to find SQL Server instances on your local network." relationship="description">
              <Button
                size="small"
                icon={scanning ? <Spinner size="tiny" /> : <SearchRegular />}
                onClick={handleScan}
                disabled={isBusy}
              >
                {scanning ? 'Scanning…' : 'Scan LAN'}
              </Button>
            </Tooltip>
          </div>

          {scanResults.length > 0 && (
            <div className={styles.scanResults}>
              {scanResults.map((inst, i) => (
                <div key={i} className={styles.scanRow}>
                  {(() => {
                    const displayInstance = inst.instance?.trim() || '';
                    const displayPort = inst.port ?? DEFAULT_PORTS.mssql;
                    const isTcpOnly = !inst.instance && !inst.version;

                    return (
                  <span>
                    <strong>{inst.host}</strong>
                    {displayInstance ? `\\${displayInstance}` : ''}
                    {`:${displayPort}`}
                    {inst.version && (
                      <Text size={200} className={styles.scanVersionText}>
                        v{inst.version}
                      </Text>
                    )}
                    {isTcpOnly && (
                      <Text size={200} className={styles.scanVersionText}>
                        {' '}TCP 1433 check only
                      </Text>
                    )}
                  </span>
                    );
                  })()}
                  <Tooltip content="Fill in the connection fields with this server's details" relationship="description">
                    <Button size="small" onClick={() => applyScanResult(inst)}>
                      Use
                    </Button>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}

          {/* ── Scan Status Bar ── */}
          <div ref={scanStatusRef} />
          {scanning && (
            <div className={styles.scanStatusBar}>
              <span className={styles.scanStatusIcon}>
                <Spinner size="tiny" />
              </span>
              <span className={styles.scanStatusText}>
                <span className={styles.scanStatusPhase}>{SCAN_PHASES[scanPhase].label}</span>
                <span className={styles.scanStatusDetail}>{SCAN_PHASES[scanPhase].detail}</span>
              </span>
              <span className={styles.scanStepList}>
                {SCAN_PHASES.map((_, idx) => (
                  <span
                    key={idx}
                    className={
                      idx < scanPhase
                        ? styles.scanStepDotDone
                        : idx === scanPhase
                          ? styles.scanStepDotActive
                          : styles.scanStepDot
                    }
                  />
                ))}
              </span>
            </div>
          )}
          {!scanning && scanDone && (
            <div className={scanDone.count > 0 ? styles.scanStatusDone : styles.scanStatusBar}>
              <span className={styles.scanStatusIcon}>
                {scanDone.count > 0 ? '✓' : '⚠'}
              </span>
              <span>
                {scanDone.count > 0
                  ? `Scan complete — found ${scanDone.count} instance${scanDone.count > 1 ? 's' : ''}`
                  : 'Scan complete — no instances found. Verify SQL Server is running and TCP 1433 is not blocked by firewall.'}
              </span>
              <span className={styles.scanStepList}>
                {SCAN_PHASES.map((_, idx) => (
                  <span key={idx} className={styles.scanStepDotDone} />
                ))}
              </span>
            </div>
          )}
          {!scanning && scanError && (
            <div className={styles.scanStatusError}>
              <span>✕</span>
              <span>Scan failed — {scanError}</span>
            </div>
          )}
          {!scanning && !scanDone && !scanError && (
            <div className={styles.scanStatusIdle}>
              <span className={styles.scanStatusIdleIcon}>○</span>
              <span>Not started — click <strong>Scan LAN</strong> to discover SQL Server instances on your network</span>
            </div>
          )}
        </div>
      )}
      </div>

      {/* ── Action Buttons ── */}
      <div className={styles.actions}>
        {isRemote && iniForm.enabled && (
          <>
            <Tooltip content="Verify the connection using the settings above — does not save anything." relationship="description">
              <Button
                size="small"
                icon={testing ? <Spinner size="tiny" /> : <PlugConnectedRegular />}
                onClick={handleTest}
                disabled={isBusy}
              >
                {testing ? 'Testing…' : 'Test Connection'}
              </Button>
            </Tooltip>

            <Tooltip content="Create all required T3000 tables (inputs, outputs, variables, trend logs, etc.) on the server database. Safe to run multiple times." relationship="description">
              <Button
                size="small"
                icon={initializingSchema ? <Spinner size="tiny" /> : <ArrowUploadRegular />}
                onClick={handleInitSchema}
                disabled={isBusy}
              >
                {initializingSchema ? 'Initializing…' : 'Init Schema'}
              </Button>
            </Tooltip>
          </>
        )}

        <Button onClick={refresh} disabled={isBusy} size="small" icon={<ArrowSyncRegular />}>
          Refresh
        </Button>

        <Tooltip content="Save all settings (INI config + database connection). Restart T3000 to apply." relationship="description">
          <Button
            size="small"
            appearance="primary"
            onClick={handleSaveIni}
            disabled={isBusy}
          >
            {savingIni ? 'Saving…' : 'Save Configuration'}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default DatabaseConfigPage;
