/**
 * Database Backend Configuration Page
 *
 * Allows administrators to view / configure the server database backend
 * (SQLite, PostgreSQL, MySQL, or MSSQL) used for server/client deployments.
 * Focused on trendlog and device-data storage across multiple PCs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Input,
  Label,
  Badge,
  Divider,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  RadioGroup,
  Radio,
  Tooltip,
  Switch,
  Checkbox,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  ArrowSyncRegular,
  SearchRegular,
  PlugConnectedRegular,
  ArrowUploadRegular,
  InfoRegular,
  ServerRegular,
  DesktopRegular,
  CloudDatabaseRegular,
} from '@fluentui/react-icons';
import type {
  BackendType,
  BackendConfigResponse,
  SaveBackendConfigRequest,
  BackendStatus,
  DiscoveredInstance,
  IniConfig,
  ServerDbStatus,
} from '../services/databaseConfigApi';
import {
  getConfigs,
  saveConfig,
  testConnection,
  scanNetwork,
  getStatus,
  switchBackend,
  initSchema,
  getIniConfig,
  saveIniConfig,
  getServerDbStatus,
} from '../services/databaseConfigApi';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    backgroundColor: '#ffffff',
  },
  /* ── Intro Banner ── */
  introBanner: {
    display: 'flex',
    gap: '16px',
    padding: '16px 20px',
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
  /* ── Section ── */
  section: {
    margin: '0 12px 12px',
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
    gap: '8px',
    padding: '8px 16px',
    borderTop: '1px solid #edebe9',
    flexShrink: 0,
    position: 'sticky',
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 1,
  },
  /* ── Status Row ── */
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 12px',
    flexWrap: 'wrap',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  statusItemLabel: {
    color: '#605e5c',
    fontWeight: 400,
  },
  statusItemValue: {
    color: '#323130',
    fontWeight: 600,
  },
  statusSubtext: {
    color: '#605e5c',
  },
  /* ── Status Details Grid ── */
  statusDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '8px',
    margin: '0 12px',
    padding: '0 0 12px',
  },
  statusDetailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#605e5c',
    padding: '4px 8px',
    backgroundColor: '#fafafa',
    borderRadius: '4px',
  },
  statusDetailLabel: {
    fontWeight: 600,
    color: '#323130',
    minWidth: '80px',
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
    padding: '4px 8px',
    backgroundColor: 'transparent',
    marginBottom: tokens.spacingVerticalM,
    fontSize: '13px',
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
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BACKEND_LABELS: Record<BackendType, string> = {
  sqlite: 'SQLite (Local)',
  postgres: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  mssql: 'Microsoft SQL Server',
};

const DEFAULT_PORTS: Record<BackendType, number> = {
  sqlite: 0,
  postgres: 5432,
  mysql: 3306,
  mssql: 1433,
};

function configToForm(cfg: BackendConfigResponse | undefined): SaveBackendConfigRequest {
  return {
    backend_type: cfg?.backend_type ?? 'sqlite',
    host: cfg?.host ?? '',
    port: cfg?.port || undefined,
    instance: cfg?.instance ?? '',
    database_name: cfg?.database_name ?? '',
    username: cfg?.username ?? '',
    password: undefined, // omit to preserve existing password on backend
    connection_url: cfg?.connection_url ?? '',
    extra_options: cfg?.extra_options != null ? String(cfg.extra_options) : '',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DatabaseConfigPage: React.FC = () => {
  const styles = useStyles();

  // Data
  const [configs, setConfigs] = useState<BackendConfigResponse[]>([]);
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [scanResults, setScanResults] = useState<DiscoveredInstance[]>([]);

  // Server/Client INI config state
  const [iniConfig, setIniConfig] = useState<IniConfig | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerDbStatus | null>(null);
  const [iniForm, setIniForm] = useState({ enabled: false, role: 'client', store_logs: false });
  const [savingIni, setSavingIni] = useState(false);

  // Form state
  const [selectedType, setSelectedType] = useState<BackendType>('sqlite');
  const [form, setForm] = useState<SaveBackendConfigRequest>({ backend_type: 'sqlite' });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [initializingSchema, setInitializingSchema] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

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
        setIniForm({ enabled: ini.enabled, role: ini.role, store_logs: ini.store_logs });
      }
      if (cStatus) setServerStatus(cStatus);
      // Select the active backend by default
      const active = cfgs.find(c => c.is_active) ?? cfgs[0];
      if (active) {
        setSelectedType(active.backend_type);
        setForm(configToForm(active));
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
    setForm(configToForm(existing));
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

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      // Omit password from request if blank so backend preserves existing password
      const payload = { ...form, backend_type: selectedType };
      if (!payload.password) delete payload.password;
      await saveConfig(payload);
      setMessage({ text: 'Configuration saved.', type: 'success' });
      await refresh();
    } catch (err: any) {
      setMessage({ text: `Save failed: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setMessage(null);
      const res = await testConnection({ ...form, backend_type: selectedType });
      setMessage({
        text: res.success
          ? `Connection OK${res.latency_ms != null ? ` (${res.latency_ms} ms)` : ''}`
          : `Connection failed: ${res.error || res.message || 'Unknown error'}`,
        type: res.success ? 'success' : 'error',
      });
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
      const results = await scanNetwork();
      setScanResults(results);
      if (results.length === 0) {
        setMessage({ text: 'No SQL Server instances found on the local network.', type: 'warning' });
      }
    } catch (err: any) {
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

  const handleSwitch = async () => {
    try {
      setSwitching(true);
      setMessage(null);
      const res = await switchBackend(selectedType);
      setMessage({ text: res.message, type: 'success' });
      await refresh();
    } catch (err: any) {
      setMessage({ text: `Switch failed: ${err.message}`, type: 'error' });
    } finally {
      setSwitching(false);
    }
  };

  /** Populate form fields from a scan result */
  const applyScanResult = (inst: DiscoveredInstance) => {
    setForm(prev => ({
      ...prev,
      host: inst.host,
      port: inst.port ?? DEFAULT_PORTS.mssql,
      instance: inst.instance ?? '',
    }));
    setMessage(null);
  };

  /** Save INI [ServerDatabase] config */
  const handleSaveIni = async () => {
    try {
      setSavingIni(true);
      setMessage(null);
      const res = await saveIniConfig(iniForm);
      setMessage({ text: res.message, type: 'success' });
      await refresh();
    } catch (err: any) {
      setMessage({ text: `INI save failed: ${err.message}`, type: 'error' });
    } finally {
      setSavingIni(false);
    }
  };

  // -------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------

  const isRemote = selectedType !== 'sqlite';
  const isBusy = saving || testing || scanning || initializingSchema || switching || savingIni;
  const isActiveBackend = status?.active_backend === selectedType;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBar}>
          <Spinner size="tiny" />
          <Text>Loading database configuration…</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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

      {/* ── Current Status ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Current Status</h3>
        </div>
        <div className={styles.statusRow}>
          <div className={styles.statusItem}>
            <span className={styles.statusItemLabel}>Backend:</span>
            <span className={styles.statusItemValue}>{BACKEND_LABELS[status?.active_backend ?? 'sqlite']}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusItemLabel}>Status:</span>
            <Badge
              appearance="filled"
              color={status?.connected ? 'success' : 'danger'}
              icon={status?.connected ? <CheckmarkCircleRegular /> : <ErrorCircleRegular />}
              size="small"
            >
              {status?.connected ? 'Online' : 'Offline'}
            </Badge>
          </div>
          {status?.connected && status?.table_count != null && (
            <div className={styles.statusItem}>
              <span className={styles.statusItemLabel}>Tables:</span>
              <span className={styles.statusItemValue}>{status.table_count}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Runtime Status Details ── */}
      {serverStatus?.enabled && (
        <div className={styles.statusDetailsGrid}>
          <div className={styles.statusDetailItem}>
            <span className={styles.statusDetailLabel}>Role</span>
            <Badge
              appearance="filled"
              color={serverStatus.role === 'server' ? 'informative' : 'subtle'}
              size="small"
            >
              {serverStatus.role === 'server' ? 'Server' : 'Client'}
            </Badge>
          </div>
          <div className={styles.statusDetailItem}>
            <span className={styles.statusDetailLabel}>Hostname</span>
            <span>{serverStatus.hostname}</span>
          </div>
          <div className={styles.statusDetailItem}>
            <span className={styles.statusDetailLabel}>Server DB</span>
            <Badge
              appearance="filled"
              color={serverStatus.server_connected ? 'success' : 'danger'}
              size="small"
            >
              {serverStatus.server_connected ? 'Connected' : 'Not connected'}
            </Badge>
          </div>
          <div className={styles.statusDetailItem}>
            <span className={styles.statusDetailLabel}>MSSQL Pool</span>
            <span>{serverStatus.mssql_pool_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      )}

      {/* ── Message Bar ── */}
      {message && (
        <div className={styles.padH12}>
          <MessageBar
            intent={message.type === 'success' ? 'success' : message.type === 'warning' ? 'warning' : 'error'}
          >
            <MessageBarBody>
              <MessageBarTitle>{message.type === 'success' ? 'Success' : message.type === 'warning' ? 'Notice' : 'Error'}</MessageBarTitle>
              {message.text}
            </MessageBarBody>
          </MessageBar>
        </div>
      )}

      {/* ── Server / Client Configuration ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Server / Client Configuration</h3>
          <Tooltip content="These settings are stored in the local setting.ini file and take effect after restart." relationship="description">
            <InfoRegular style={{ fontSize: '14px', color: '#605e5c', cursor: 'help' }} />
          </Tooltip>
        </div>
        <p className={styles.sectionDescription}>
          Enable multi-PC mode and assign this computer's role. Changes require a restart to take effect.
        </p>

        {/* Enable toggle */}
        <div className={styles.padH12}>
          <Tooltip content="Turn on to connect this PC to a shared server database for trend data and device info." relationship="description">
            <Switch
              checked={iniForm.enabled}
              onChange={(_, data) => setIniForm(prev => ({ ...prev, enabled: data.checked }))}
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
                onClick={() => setIniForm(prev => ({ ...prev, role: 'server' }))}
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

            {/* Options */}
            <div className={styles.optionsRow}>
              <Tooltip content="When enabled, system log entries (errors, warnings, info) are also written to the server database so all PCs can see a unified log." relationship="description">
                <Checkbox
                  checked={iniForm.store_logs}
                  onChange={(_, data) => setIniForm(prev => ({ ...prev, store_logs: !!data.checked }))}
                  label="Store system logs to server database"
                />
              </Tooltip>
            </div>
          </>
        )}

        {/* Save + INI path */}
        <div className={styles.optionsRow}>
          <Tooltip content="Write settings to setting.ini. Restart T3000 for changes to take effect." relationship="description">
            <Button
              appearance="primary"
              onClick={handleSaveIni}
              disabled={isBusy}
              size="small"
            >
              {savingIni ? 'Saving…' : 'Save Config'}
            </Button>
          </Tooltip>
        </div>
        {iniConfig?.ini_path && (
          <p className={styles.iniPathText}>
            Config file: {iniConfig.ini_path}
          </p>
        )}
      </div>

      <Divider />

      {/* ── Backend Type Selector ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Backend Type</h3>
          <Tooltip content="Choose which database engine stores the shared data. SQLite is the default local engine. For multi-PC setups, select Microsoft SQL Server or another network-accessible database." relationship="description">
            <InfoRegular style={{ fontSize: '14px', color: '#605e5c', cursor: 'help' }} />
          </Tooltip>
        </div>
        <p className={styles.sectionDescription}>
          Select the database engine for the server. For multi-PC deployments, use Microsoft SQL Server or another network database.
        </p>
        <div className={styles.padH12}>
          <RadioGroup
            value={selectedType}
            onChange={(_, data) => handleTypeChange(data.value as BackendType)}
            layout="horizontal"
          >
            {(Object.keys(BACKEND_LABELS) as BackendType[]).map(bt => (
              <Radio key={bt} value={bt} label={BACKEND_LABELS[bt]} />
            ))}
          </RadioGroup>
        </div>
      </div>

      <Divider />

      {/* ── Connection Form (remote backends only) ── */}
      {isRemote && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Connection Settings — {BACKEND_LABELS[selectedType]}</h3>
          </div>
          <p className={styles.sectionDescription}>
            Enter the connection details for the {BACKEND_LABELS[selectedType]} instance. Use "Test Connection" to verify before saving.
          </p>

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
                type="number"
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
                  placeholder="t3000"
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
              <Tooltip content="Leave blank to keep the previously saved password." relationship="description">
                <Input
                  id="db-pass"
                  type="password"
                  value={form.password ?? ''}
                  onChange={(_, d) => setField('password', d.value)}
                />
              </Tooltip>
            </div>

            <div className={styles.formRowFull}>
              <Label className={styles.label} htmlFor="db-url">
                Connection URL <Text size={200} className={styles.statusSubtext}>(optional — overrides the fields above)</Text>
              </Label>
              <Input
                id="db-url"
                value={form.connection_url ?? ''}
                onChange={(_, d) => setField('connection_url', d.value)}
                placeholder={
                  selectedType === 'postgres'
                    ? 'postgres://user:pass@host:5432/dbname'
                    : selectedType === 'mysql'
                      ? 'mysql://user:pass@host:3306/dbname'
                      : ''
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MSSQL Network Scan ── */}
      {selectedType === 'mssql' && (
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
                  <span>
                    <strong>{inst.host}</strong>
                    {inst.instance && `\\${inst.instance}`}
                    {inst.port != null && `:${inst.port}`}
                    {inst.version && (
                      <Text size={200} className={styles.scanVersionText}>
                        v{inst.version}
                      </Text>
                    )}
                  </span>
                  <Tooltip content="Fill in the connection fields with this server's details" relationship="description">
                    <Button size="small" onClick={() => applyScanResult(inst)}>
                      Use
                    </Button>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Divider />

      {/* ── Action Buttons ── */}
      <div className={styles.actions}>
        {isRemote && (
          <>
            <Tooltip content="Verify the connection using the settings above — does not save anything." relationship="description">
              <Button
                icon={testing ? <Spinner size="tiny" /> : <PlugConnectedRegular />}
                onClick={handleTest}
                disabled={isBusy}
              >
                {testing ? 'Testing…' : 'Test Connection'}
              </Button>
            </Tooltip>

            <Tooltip content="Save the connection settings for this backend type to the local database." relationship="description">
              <Button
                appearance="primary"
                onClick={handleSave}
                disabled={isBusy}
              >
                {saving ? 'Saving…' : 'Save Configuration'}
              </Button>
            </Tooltip>

            <Tooltip content="Create all required T3000 tables (inputs, outputs, variables, trend logs, etc.) on the server database. Safe to run multiple times." relationship="description">
              <Button
                icon={initializingSchema ? <Spinner size="tiny" /> : <ArrowUploadRegular />}
                onClick={handleInitSchema}
                disabled={isBusy}
              >
                {initializingSchema ? 'Initializing…' : 'Init Schema'}
              </Button>
            </Tooltip>
          </>
        )}

        <Tooltip
          content={
            isActiveBackend
              ? 'This backend is already the active database engine.'
              : 'Switch T3000 to use this backend. Changes take effect after restart.'
          }
          relationship="description"
        >
          <Button
            icon={switching ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
            onClick={handleSwitch}
            disabled={isBusy || isActiveBackend}
            appearance={isActiveBackend ? 'subtle' : 'secondary'}
          >
            {switching ? 'Switching…' : isActiveBackend ? 'Currently Active' : 'Switch to This Backend'}
          </Button>
        </Tooltip>

        <Button onClick={refresh} disabled={isBusy} appearance="subtle" icon={<ArrowSyncRegular />}>
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default DatabaseConfigPage;
