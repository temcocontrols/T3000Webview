/**
 * Database Backend Configuration Page
 *
 * Allows administrators to view / configure the centralized database backend
 * (SQLite, PostgreSQL, MySQL, or MSSQL) used for multi-PC deployments.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Title3,
  Body1,
  Button,
  Input,
  Label,
  Card,
  Badge,
  Divider,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  Select,
  RadioGroup,
  Radio,
  Field,
  Tooltip,
  Switch,
  Checkbox,
} from '@fluentui/react-components';
import {
  DatabaseRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  ArrowSyncRegular,
  SearchRegular,
  PlugConnectedRegular,
  ArrowUploadRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';
import type {
  BackendType,
  BackendConfigResponse,
  SaveBackendConfigRequest,
  BackendStatus,
  DiscoveredInstance,
  IniConfig,
  CentralDbStatus,
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
  getCentralDbStatus,
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
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
    margin: 0,
  },
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
  statusCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    margin: '12px',
  },
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
  statusCardBody: {
    flex: 1,
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
  statusTitle: {
    fontWeight: 600,
  },
  statusSubtext: {
    color: '#605e5c',
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

  // Multi-PC INI config state
  const [iniConfig, setIniConfig] = useState<IniConfig | null>(null);
  const [centralStatus, setCentralStatus] = useState<CentralDbStatus | null>(null);
  const [iniForm, setIniForm] = useState({ enabled: false, role: 'reader', store_logs: false });
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
        getCentralDbStatus().catch(() => null),
      ]);
      setConfigs(cfgs);
      setStatus(sts);
      if (ini) {
        setIniConfig(ini);
        setIniForm({ enabled: ini.enabled, role: ini.role, store_logs: ini.store_logs });
      }
      if (cStatus) setCentralStatus(cStatus);
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

  /** Save INI [CentralDatabase] config */
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
      {/* ── Status Card ── */}
      <Card className={styles.statusCard}>
        <DatabaseRegular fontSize={24} />
        <div className={styles.statusCardBody}>
          <Body1 className={styles.statusTitle}>
            Active Backend: {BACKEND_LABELS[status?.active_backend ?? 'sqlite']}
          </Body1>
          <Text size={200} className={styles.statusSubtext}>
            {status?.connected ? 'Connected' : 'Disconnected'}
            {status?.connected && status?.table_count != null && ` · ${status.table_count} tables`}
            {centralStatus?.enabled && ` · ${centralStatus.role === 'main' ? 'Server' : 'Client'} (${centralStatus.hostname})`}
          </Text>
        </div>
        <Badge
          appearance="filled"
          color={status?.connected ? 'success' : 'danger'}
          icon={status?.connected ? <CheckmarkCircleRegular /> : <ErrorCircleRegular />}
        >
          {status?.connected ? 'Online' : 'Offline'}
        </Badge>
      </Card>

      {/* ── Multi-PC Configuration ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Server / Client Configuration</h3>
          {centralStatus?.enabled && (
            <Badge
              appearance="filled"
              color={centralStatus.central_connected ? 'success' : 'warning'}
              size="small"
            >
              {centralStatus.role === 'main' ? 'Server' : 'Client'}
            </Badge>
          )}
        </div>
        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <Label className={styles.label}>Server Database</Label>
            <Switch
              checked={iniForm.enabled}
              onChange={(_, data) => setIniForm(prev => ({ ...prev, enabled: data.checked }))}
              label={iniForm.enabled ? 'Enabled' : 'Disabled'}
            />
          </div>

          {iniForm.enabled && (
            <>
              <div className={styles.formRow}>
                <Label className={styles.label}>PC Role</Label>
                <RadioGroup
                  value={iniForm.role}
                  onChange={(_, data) => setIniForm(prev => ({ ...prev, role: data.value }))}
                  layout="horizontal"
                >
                  <Radio value="main" label="Server (writes to server database)" />
                  <Radio value="reader" label="Client (reads from server database)" />
                </RadioGroup>
              </div>

              <div className={styles.formRow}>
                <Label className={styles.label}>Options</Label>
                <Checkbox
                  checked={iniForm.store_logs}
                  onChange={(_, data) => setIniForm(prev => ({ ...prev, store_logs: !!data.checked }))}
                  label="Store system logs to server database"
                />
              </div>
            </>
          )}

          <div className={styles.formRow}>
            <Button
              appearance="primary"
              onClick={handleSaveIni}
              disabled={isBusy}
              size="small"
            >
              {savingIni ? 'Saving…' : 'Save Config'}
            </Button>
            {iniConfig?.ini_path && (
              <Text size={200} className={styles.statusSubtext}>
                INI: {iniConfig.ini_path}
              </Text>
            )}
          </div>
        </div>
      </div>

      <Divider />

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

      {/* ── Backend Type Selector ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Backend Type</h3>
        </div>
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

          <div className={styles.formGrid}>
            <div className={styles.formRow}>
              <Label className={styles.label} htmlFor="db-host">Host / IP</Label>
              <Input
                id="db-host"
                value={form.host ?? ''}
                onChange={(_, d) => setField('host', d.value)}
                placeholder="192.168.1.100"
              />
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
                <Input
                  id="db-instance"
                  value={form.instance ?? ''}
                  onChange={(_, d) => setField('instance', d.value)}
                  placeholder="SQLEXPRESS"
                />
              </div>
            )}

            <div className={styles.formRow}>
              <Label className={styles.label} htmlFor="db-name">Database Name</Label>
              <Input
                id="db-name"
                value={form.database_name ?? ''}
                onChange={(_, d) => setField('database_name', d.value)}
                placeholder="t3000"
              />
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
              <Input
                id="db-pass"
                type="password"
                value={form.password ?? ''}
                onChange={(_, d) => setField('password', d.value)}
              />
            </div>

            <div className={styles.formRowFull}>
              <Label className={styles.label} htmlFor="db-url">
                Connection URL (optional — overrides fields above)
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
            <Button
              size="small"
              icon={scanning ? <Spinner size="tiny" /> : <SearchRegular />}
              onClick={handleScan}
              disabled={isBusy}
            >
              {scanning ? 'Scanning…' : 'Scan LAN'}
            </Button>
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
                  <Button size="small" onClick={() => applyScanResult(inst)}>
                    Use
                  </Button>
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
            <Tooltip content="Test the connection without saving" relationship="label">
              <Button
                icon={testing ? <Spinner size="tiny" /> : <PlugConnectedRegular />}
                onClick={handleTest}
                disabled={isBusy}
              >
                {testing ? 'Testing…' : 'Test Connection'}
              </Button>
            </Tooltip>

            <Button
              appearance="primary"
              onClick={handleSave}
              disabled={isBusy}
            >
              {saving ? 'Saving…' : 'Save Configuration'}
            </Button>

            <Tooltip content="Create all T3000 tables on the server database" relationship="label">
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
              ? 'This backend is already active'
              : 'Activate this backend (requires restart)'
          }
          relationship="label"
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
