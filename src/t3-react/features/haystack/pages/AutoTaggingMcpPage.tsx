import React, { useState, useEffect, useCallback } from 'react';
import {
  Spinner, Button, Input, Field, Switch, Tooltip,
  Tab, TabList, Dialog, DialogSurface, DialogBody, DialogTitle,
  DialogContent, DialogActions, Badge, Select,
  DataGrid, DataGridHeader, DataGridRow, DataGridCell, DataGridBody,
  createTableColumn,
  Popover, PopoverSurface, PopoverTrigger,
  Dropdown, Option,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular, AddRegular, DismissRegular,
  PlayRegular, EyeRegular, CheckmarkCircleRegular,
  WarningRegular, InfoRegular, DeleteRegular,
  TagRegular, FlashRegular, SettingsRegular,
  SparkleRegular, CopyRegular, LightbulbRegular,
  CodeRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './AutoTaggingMcpPage.module.css';

// ── Types ──

interface AutoTaggingRule {
  id: number;
  rule_name: string;
  category: 'haystack' | 'brick';
  pattern: string;
  units?: string;
  object_types?: string;
  haystack_tags?: string;
  brick_class?: string;
  haystack_kind?: string;
  haystack_unit?: string;
  enabled: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
}

interface PointInfo {
  serial_number: number;
  point_type: string;
  point_index: number;
  label?: string;
  full_label?: string;
  units?: string;
  digital_analog?: number;
  object_type?: string;
}

interface TagMatch {
  point: PointInfo;
  matched_rule: string;
  haystack_tags: string[];
  brick_class?: string;
  haystack_kind?: string;
  haystack_unit?: string;
}

// ── Page Component ──

const AutoTaggingMcpPage: React.FC = () => {
  const { selectedDevice, devices } = useDeviceTreeStore();
  const [activeTab, setActiveTab] = useState('rules');

  return (
    <div className={styles.container}>
      <style>{'[role="tooltip"],[role="tooltip"] *{max-width:none!important;white-space:nowrap!important;width:auto!important}'}</style>
      {/* ── Info Bar ── */}
      <div className={styles.infoBar}>
        <div className={styles.infoBarLeft}>
          <FlashRegular className={styles.infoIcon} />
          <div className={styles.infoText}>
            <div className={styles.infoTitle}>Auto-Tagging &amp; MCP</div>
            <div className={styles.infoDesc}>
              Manage regex-based rules for automatic Haystack tagging and Brick classification. Includes an MCP server for LLM agent integration.
            </div>
          </div>
        </div>
      </div>

      <TabList selectedValue={activeTab} onTabSelect={(_, d) => setActiveTab(d.value as string)}>
        <Tab value="rules" icon={<SettingsRegular />}><span style={{fontSize:13}}>Rules</span></Tab>
        <Tab value="run" icon={<PlayRegular />}><span style={{fontSize:13}}>Run Auto-Tag</span></Tab>
        <Tab value="mcp" icon={<SparkleRegular />}><span style={{fontSize:13}}>MCP Server</span></Tab>
        <Tab value="examples" icon={<LightbulbRegular />}><span style={{fontSize:13}}>Examples</span></Tab>
      </TabList>

      <div className={styles.tabContent}>
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'run' && <RunTab />}
        {activeTab === 'mcp' && <McpTab />}
        {activeTab === 'examples' && <ExamplesTab />}
      </div>
    </div>
  );
};

// ═══ Rules Tab ═══

const RulesTab: React.FC = () => {
  const [rules, setRules] = useState<AutoTaggingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<AutoTaggingRule | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRules(data.rules || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleToggle = async (rule: AutoTaggingRule) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules/${rule.id}/toggle`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchRules();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules/${id}`, { method: 'DELETE' });
      await fetchRules();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filtered = rules.filter(r =>
    !filter || r.rule_name.toLowerCase().includes(filter.toLowerCase()) ||
    r.category.includes(filter) || (r.brick_class || '').toLowerCase().includes(filter.toLowerCase())
  );

  const columns: TableColumnDefinition<AutoTaggingRule>[] = [
    createTableColumn({ columnId: 'name', renderHeaderCell: () => 'Rule', renderCell: (r) => (
      <div className={styles.ruleCell}>
        <Badge appearance="filled" color={r.category === 'brick' ? 'important' : 'informative'} size="small">
          {r.category}
        </Badge>
        <span className={styles.ruleName}>{r.rule_name}</span>
      </div>
    ) }),
    createTableColumn({ columnId: 'pattern', renderHeaderCell: () => 'Pattern', renderCell: (r) => (
      <Tooltip content={r.pattern} relationship="description" positioning="above-end">
        <code className={styles.patternCode}>{r.pattern}</code>
      </Tooltip>
    ) }),
    createTableColumn({ columnId: 'brick_class', renderHeaderCell: () => 'Brick Class', renderCell: (r) => (
      <span className={styles.targetCell}>{r.brick_class || r.haystack_tags || '—'}</span>
    ) }),
    createTableColumn({ columnId: 'status', renderHeaderCell: () => 'Status', renderCell: (r) => (
      <Switch checked={r.enabled} onChange={() => handleToggle(r)} className={styles.switchScale} />
    ) }),
    createTableColumn({ columnId: 'actions', renderHeaderCell: () => '', renderCell: (r) => {
      const [open, setOpen] = useState(false);
      return (
      <Popover open={open} onOpenChange={(_, d) => setOpen(d.open)} withArrow>
        <PopoverTrigger disableButtonEnhancement>
          <Button size="small" icon={<DeleteRegular />} appearance="subtle" />
        </PopoverTrigger>
        <PopoverSurface style={{ padding: 12 }}>
          <div style={{ fontSize: 12, marginBottom: 8 }}>Delete <strong>{r.rule_name}</strong>?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="small" appearance="primary" style={{ background: '#d32f2f' }} onClick={() => { handleDelete(r.id); setOpen(false); }}>Delete</Button>
          </div>
        </PopoverSurface>
      </Popover>
    )}}),
  ];

  return (
    <div className={styles.rulesLayout}>
      <div className={styles.rulesTop}>
        <Input
          size="small"
          placeholder="Filter rules…"
          value={filter}
          onChange={(_, d) => setFilter(d.value)}
          contentAfter={filter ? <DismissRegular style={{ fontSize: 12, cursor: 'pointer', color: '#888' }} onClick={() => setFilter('')} /> : undefined}
          className={styles.filterInput}
        />
        <Button icon={<ArrowClockwiseRegular style={{ fontSize: 14 }} />} onClick={fetchRules} size="small">Refresh</Button>
        <Button icon={<AddRegular style={{ fontSize: 14 }} />} onClick={() => setCreating(true)} size="small" appearance="primary">New Rule</Button>
        <span className={styles.ruleInfo}>
          <InfoRegular />
          Default rules sourced from{' '}
          <a href="https://github.com/qnst/brick-bacnet-mcp" target="_blank" rel="noopener noreferrer">brick-bacnet-mcp ↗</a>
          {' '}(regex patterns) &amp;{' '}
          <a href="https://github.com/qnst/Brick" target="_blank" rel="noopener noreferrer">Brick Schema ↗</a>
          {' '}(ontology).
        </span>
        <span className={styles.count}>{filtered.length} rules</span>
      </div>

      {error && <div className={styles.errorBanner}><WarningRegular /> {error}</div>}

      <div className={styles.rulesBottom}>
        {loading ? (
          <Spinner size="extra-small" label="Loading rules…" className={styles.loadingSpinner} />
        ) : (
          <DataGrid items={filtered} columns={columns} sortable className={styles.dataGrid}>
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridCell>{renderHeaderCell()}</DataGridCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<AutoTaggingRule>>
              {({ item, rowId }) => (
                <DataGridRow<AutoTaggingRule> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        )}
      </div>

      {creating && <RuleDialog mode="create" onClose={() => { setCreating(false); fetchRules(); }} />}
    </div>
  );
};

// ── Rule Dialog ──

const RuleDialog: React.FC<{ mode: 'create'; onClose: () => void }> = ({ mode, onClose }) => {
  const [form, setForm] = useState({
    rule_name: '', category: 'haystack' as string, pattern: '',
    units: '', object_types: '', haystack_tags: '', brick_class: '',
    haystack_kind: '', haystack_unit: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = { ...form, pattern: form.pattern || '.*' };
      if (!body.units) delete body.units;
      if (!body.object_types) delete body.object_types;
      if (!body.haystack_tags) delete body.haystack_tags;
      if (!body.brick_class) delete body.brick_class;
      if (!body.haystack_kind) delete body.haystack_kind;
      if (!body.haystack_unit) delete body.haystack_unit;

      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onClose();
    } catch (e: any) {
      alert('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogSurface style={{ maxWidth: 620 }}>
        <DialogBody>
          <DialogTitle style={{ fontSize: 14 }}>Create Rule</DialogTitle>
          <DialogContent>
            <div className={styles.dialogInfo}>
              <InfoRegular />
              Learn how regex patterns and Brick classes work:{' '}
              <a href="https://github.com/qnst/brick-bacnet-mcp" target="_blank" rel="noopener noreferrer">brick-bacnet-mcp ↗</a>
              {' '}(patterns) &amp;{' '}
              <a href="https://github.com/qnst/Brick" target="_blank" rel="noopener noreferrer">Brick Schema ↗</a>
              {' '}(ontology).
            </div>
            <div className={styles.formGrid}>
              <Field label="Rule Name" required size="small">
                <Input size="small" value={form.rule_name} onChange={(_, d) => setForm(prev => ({ ...prev, rule_name: d.value }))} />
              </Field>
              <Field label="Category" size="small">
                <Select size="small" value={form.category} onChange={(_, d) => setForm(prev => ({ ...prev, category: d.value }))}>
                  <option value="haystack">Haystack</option>
                  <option value="brick">Brick</option>
                </Select>
              </Field>
              <Field label="Pattern (regex)" size="small">
                <Input size="small" value={form.pattern} onChange={(_, d) => setForm(prev => ({ ...prev, pattern: d.value }))} placeholder="(?i)(?<![A-Za-z])(oat|outside...)(?![A-Za-z])" />
              </Field>
              <Field label="Brick Class" size="small">
                <Input size="small" value={form.brick_class} onChange={(_, d) => setForm(prev => ({ ...prev, brick_class: d.value }))} placeholder="Supply_Air_Temperature_Sensor" />
              </Field>
              <Field label="Haystack Tags" size="small">
                <Input size="small" value={form.haystack_tags} onChange={(_, d) => setForm(prev => ({ ...prev, haystack_tags: d.value }))} placeholder="point,sensor,outside,air,temp" />
              </Field>
              <Field label="Units filter" size="small">
                <Input size="small" value={form.units} onChange={(_, d) => setForm(prev => ({ ...prev, units: d.value }))} placeholder="degF,degC" />
              </Field>
              <Field label="Haystack Kind" size="small">
                <Select size="small" value={form.haystack_kind} onChange={(_, d) => setForm(prev => ({ ...prev, haystack_kind: d.value }))}>
                  <option value="">—</option>
                  <option value="Number">Number</option>
                  <option value="Bool">Bool</option>
                  <option value="Marker">Marker</option>
                  <option value="Str">Str</option>
                </Select>
              </Field>
              <Field label="Haystack Unit" size="small">
                <Input size="small" value={form.haystack_unit} onChange={(_, d) => setForm(prev => ({ ...prev, haystack_unit: d.value }))} placeholder="°F" />
              </Field>
            </div>
          </DialogContent>
          <DialogActions style={{ marginTop: 8 }}>
            <Button appearance="secondary" onClick={onClose} size="small" style={{ fontSize: 12 }}>Cancel</Button>
            <Button appearance="primary" onClick={handleSave} disabled={saving || !form.rule_name} size="small" style={{ fontSize: 12 }}>
              {saving ? <Spinner size="tiny" /> : 'Create'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

// ═══ Run Tab ═══

const RunTab: React.FC = () => {
  const { devices } = useDeviceTreeStore();
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [running, setRunning] = useState(false);
  const [previewData, setPreviewData] = useState<TagMatch[] | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [runConfirmOpen, setRunConfirmOpen] = useState(false);
  const [rulesCount, setRulesCount] = useState(0);

  const allDevices = devices.filter(d => d.productName && d.productName !== 'Unknown' && d.productName !== '(Unknown)');
  const allSerials = allDevices.map(d => String(d.serialNumber));
  const effectiveSerials = selectAll ? allSerials : selectedSerials;
  const serials = effectiveSerials.map(Number).filter(n => !isNaN(n));

  const handlePreview = async () => {
    if (serials.length === 0) { setError('No devices available'); return; }
    setRunning(true); setError(null); setPreviewData(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumbers: serials }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPreviewData(data.matches || []);
      setResult(`Found ${data.matches?.length || 0} matches across ${serials.length} device(s).`);
    } catch (e: any) { setError(e.message); } finally { setRunning(false); }
  };

  const handleRun = async () => {
    if (serials.length === 0) { setError('No devices available'); return; }
    setRunning(true); setError(null); setPreviewData(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumbers: serials }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(`Successfully tagged ${data.tagged || 0} points.`);
      setPreviewData(data.matches || []);
    } catch (e: any) { setError(e.message); } finally { setRunning(false); }
  };

  const handleReset = async () => {
    setResetOpen(false);
    if (serials.length === 0) { setError('No devices available'); return; }
    setRunning(true); setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumbers: serials }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({ error: `HTTP ${res.status}` })); throw new Error(d.error); }
      setResult('Tags reset. All auto-assigned tags cleared.');
    } catch (e: any) { setError(e.message); } finally { setRunning(false); }
  };

  useEffect(() => { handlePreview(); }, []);
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules`)
      .then(r => r.json()).then(d => setRulesCount((d.rules || []).filter((r: AutoTaggingRule) => r.enabled).length))
      .catch(() => {});
  }, []);

  const getDeviceName = (sn: number) => {
    const d = allDevices.find(d => d.serialNumber === sn);
    return d?.productName || '';
  };

  return (
    <div>
      <div className={styles.runHint}>
        <InfoRegular style={{ fontSize: 13 }} /> Select devices and preview auto-tagging results before applying. No changes are made until you run.
      </div>

      <div className={styles.runRow}>
        <Dropdown
          size="small"
          multiselect
          className={styles.runDropdown}
          placeholder={selectAll ? `${allSerials.length} devices selected` : selectedSerials.length === 0 ? 'No devices selected' : `${selectedSerials.length} device${selectedSerials.length > 1 ? 's' : ''} selected`}
          selectedOptions={selectAll ? allSerials : selectedSerials}
          onOptionSelect={(_, d) => { setSelectedSerials(d.selectedOptions); setSelectAll(false); }}
          value=""
        >
          <div onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelectAll(!selectAll); if (selectAll) setSelectedSerials([]); }} style={{ padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#0078d4' }}>
            {selectAll ? 'Deselect All' : 'Select All'}
          </div>
          {allDevices.map(d => (
            <Option key={String(d.serialNumber)} value={String(d.serialNumber)} style={{ fontSize: 12 }}>
              {d.serialNumber} — {d.productName || `Device ${d.serialNumber}`}
            </Option>
          ))}
        </Dropdown>
      <div className={styles.runActions}>
        <Button icon={<EyeRegular style={{ fontSize: 14 }} />} onClick={handlePreview} disabled={running} size="small" appearance="primary">Preview</Button>
        <Popover open={runConfirmOpen} onOpenChange={(_, d) => setRunConfirmOpen(d.open)} withArrow>
          <PopoverTrigger disableButtonEnhancement>
            <Button icon={<PlayRegular style={{ fontSize: 14 }} />} disabled={running} size="small">Run Auto-Tag</Button>
          </PopoverTrigger>
          <PopoverSurface style={{ padding: 12, maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
              <InfoRegular style={{ color: '#0078d4', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <strong>Run auto-tagging</strong> using {rulesCount} active rule{rulesCount !== 1 ? 's' : ''} on{' '}
                {serials.length === 1 ? (
                  <><strong>{getDeviceName(serials[0]) || `Device ${serials[0]}`}</strong></>
                ) : (
                  <>{serials.length} devices:</>
                )}
              </div>
            </div>
            {serials.length > 1 && (
              <div style={{ fontSize: 11, color: '#555', marginBottom: 12, maxHeight: 120, overflowY: 'auto', lineHeight: 1.6 }}>
                {serials.map(s => (
                  <div key={s}>{s} — {getDeviceName(s) || `Device ${s}`}</div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => setRunConfirmOpen(false)}>Cancel</Button>
              <Button size="small" appearance="primary" onClick={() => { setRunConfirmOpen(false); handleRun(); }}>Run</Button>
            </div>
          </PopoverSurface>
        </Popover>
        <Popover open={resetOpen} onOpenChange={(_, d) => setResetOpen(d.open)} withArrow>
          <PopoverTrigger disableButtonEnhancement>
              <Button icon={<DeleteRegular style={{ fontSize: 14 }} />} disabled={running} size="small">Reset Tags</Button>
          </PopoverTrigger>
          <PopoverSurface style={{ padding: 12, maxWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <WarningRegular style={{ color: '#d32f2f', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 12 }}>
                <strong>Warning:</strong> This will permanently delete all auto-assigned Haystack tags and Brick classes for {serials.length} device(s). Manual tags are preserved.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button size="small" appearance="primary" style={{ background: '#d32f2f' }} onClick={handleReset}>Reset</Button>
            </div>
          </PopoverSurface>
        </Popover>
      </div>
      </div>

      {error && <div className={styles.errorBanner}><WarningRegular /> {error}</div>}
      {result && <div className={styles.successBanner}><CheckmarkCircleRegular /> {result}</div>}
      {running && <Spinner size="extra-small" label="Processing..." className={styles.loadingSpinner} />}

      {previewData && (
        <div className={styles.previewSection}>
          <div className={styles.sectionTitle}>Preview Results ({previewData.length} matches)</div>
          <table className={styles.previewTable}>
            <thead>
              <tr>
                <th>Device</th>
                <th>Point</th>
                <th>Label</th>
                <th>Matched Rule</th>
                <th>Tags</th>
                <th>Brick Class</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((m, i) => (
                <tr key={i}>
                  <td>{m.point.serial_number}{getDeviceName(m.point.serial_number) ? ` — ${getDeviceName(m.point.serial_number)}` : ''}</td>
                  <td>{m.point.point_type} #{m.point.point_index}</td>
                  <td>{m.point.full_label || m.point.label || '—'}</td>
                  <td><Badge size="small">{m.matched_rule}</Badge></td>
                  <td>
                    {m.haystack_tags.map(t => <Badge key={t} size="small" style={{ marginRight: 2 }}>{t}</Badge>)}
                  </td>
                  <td>{m.brick_class || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══ MCP Tab ═══

const MCP_CONFIG_JSON = `{
  "mcpServers": {
    "t3000": {
      "url": "http://<host>:9103/api/mcp",
      "transport": "http"
    }
  }
}`;

const McpTab: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      {/* ── What is MCP ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <SparkleRegular style={{ color: '#0078d4', fontSize: 20, marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--colorNeutralForeground2)' }}>
          <strong style={{ fontSize: 13, color: 'var(--colorNeutralForeground1)' }}>Model Context Protocol (MCP) Server</strong>
          <br />
          The T3000 MCP server lets LLM agents (Claude Desktop, VS Code Copilot, etc.) query and manage Haystack tags programmatically via JSON-RPC 2.0 over HTTP on port 9103.
          Runs <strong>inside the T3000 API</strong> — no separate process needed.
        </div>
      </div>

      {/* ── How to Connect ── */}
      <div className={styles.mcpSection}>
        <div className={styles.sectionTitle}>
          <SettingsRegular style={{ fontSize: 14 }} /> How to Connect
        </div>
        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground2)', marginBottom: 10, lineHeight: 1.6 }}>
          The MCP server is exposed as an HTTP endpoint on the T3000 API. Replace <code>&lt;host&gt;</code> with <code>localhost</code> or the machine's IP. Paste into your client config:
        </div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <pre style={{
            background: 'var(--colorNeutralBackground2, #f5f5f5)',
            border: '1px solid var(--colorNeutralStroke1)',
            borderRadius: 4,
            padding: '12px 40px 12px 12px',
            fontSize: 12,
            overflowX: 'auto',
            margin: 0,
            lineHeight: 1.5,
          }}>
            <code>{MCP_CONFIG_JSON}</code>
          </pre>
          <Button
            size="small" appearance="subtle"
            icon={copied === 'config' ? <CheckmarkCircleRegular style={{ color: '#1e7e34' }} /> : <CopyRegular />}
            style={{ position: 'absolute', top: 6, right: 6, minHeight: 24, height: 24 }}
            onClick={() => handleCopy(MCP_CONFIG_JSON, 'config')}
          >{copied === 'config' ? 'Copied' : 'Copy'}</Button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)', lineHeight: 1.5 }}>
          <strong>Claude Desktop</strong> → paste into <code>claude_desktop_config.json</code> and restart.<br />
          <strong>VS Code Copilot</strong> → add to <code>.vscode/mcp.json</code> in your workspace.<br />
          The T3000 API must be running (default port <code>9103</code>). Use <code>localhost</code> for local, or the machine's LAN IP for remote access.
        </div>
      </div>

      {/* ── Available Tools ── */}
      <div className={styles.mcpSection} style={{ marginTop: 20 }}>
        <div className={styles.sectionTitle}>
          <TagRegular style={{ fontSize: 14 }} /> Available Tools
        </div>
        <table className={styles.mcpToolTable}>
          <thead>
            <tr><th style={{width:'22%'}}>Tool</th><th style={{width:'36%'}}>Description</th><th style={{width:'42%'}}>Parameters</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>haystack_list_tags</code></td>
              <td>List all Haystack tags with categories, documentation, and usage counts</td>
              <td>filter?: string</td>
            </tr>
            <tr>
              <td><code>haystack_get_point_tags</code></td>
              <td>Get tags assigned to specific points by serial number</td>
              <td>serial_numbers: int[]<br/>point_type?: "INPUT" | "OUTPUT" | "VARIABLE"</td>
            </tr>
            <tr>
              <td><code>haystack_search_points</code></td>
              <td>Search for points matching specific tag or brick class filters</td>
              <td>tags: string[]<br/>serial_numbers?: int[]<br/>point_types?: string[]</td>
            </tr>
            <tr>
              <td><code>haystack_auto_tag</code></td>
              <td>Run auto-tagging on devices (range rules + regex rules)</td>
              <td>serial_numbers: int[]</td>
            </tr>
            <tr>
              <td><code>haystack_preview_tags</code></td>
              <td>Preview auto-tagging results without writing to database</td>
              <td>serial_numbers: int[]</td>
            </tr>
            <tr>
              <td><code>haystack_list_rules</code></td>
              <td>List all auto-tagging rules with patterns and priorities</td>
              <td>—</td>
            </tr>
            <tr>
              <td><code>haystack_get_brick_class</code></td>
              <td>Get Brick ontology class for specified points</td>
              <td>serial_numbers: int[]</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══ Examples Tab ═══

const MCP_URL = `http://<host>:9103/api/mcp`;

interface ExampleItem {
  title: string;
  description: string;
  tool: string;
  request: object;
}

const examples: ExampleItem[] = [
  {
    title: 'Initialize MCP session',
    description: 'First call — the client sends an initialize request to discover server capabilities.',
    tool: 'initialize',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'my-client', version: '1.0' },
      },
    },
  },
  {
    title: 'List available tools',
    description: 'Discover all Haystack tools the server provides.',
    tool: 'tools/list',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    },
  },
  {
    title: 'List all Haystack tags',
    description: 'Get the full tag vocabulary with categories, docs, and usage counts.',
    tool: 'tools/call',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'haystack_list_tags',
        arguments: { filter: 'haystack' },
      },
    },
  },
  {
    title: 'Get tags for a specific point',
    description: 'Retrieve all Haystack tags and Brick class assigned to device 233626.',
    tool: 'tools/call',
    request: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'haystack_get_point_tags',
        arguments: { serial_numbers: [233626], point_type: 'INPUT' },
      },
    },
  },
  {
    title: 'Search points by tags',
    description: 'Find all outside air temperature sensors across the building.',
    tool: 'tools/call',
    request: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'haystack_search_points',
        arguments: { tags: ['outside', 'air', 'temp'] },
      },
    },
  },
  {
    title: 'Run auto-tagging',
    description: 'Apply range rules + regex rules to tag points on devices 233626 and 237219.',
    tool: 'tools/call',
    request: {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'haystack_auto_tag',
        arguments: { serial_numbers: [233626, 237219] },
      },
    },
  },
  {
    title: 'Preview auto-tagging results',
    description: 'See what tags would be assigned without writing to the database.',
    tool: 'tools/call',
    request: {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'haystack_preview_tags',
        arguments: { serial_numbers: [233626] },
      },
    },
  },
  {
    title: 'Get Brick classes',
    description: 'Retrieve the Brick ontology class for points on a device.',
    tool: 'tools/call',
    request: {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'haystack_get_brick_class',
        arguments: { serial_numbers: [233626] },
      },
    },
  },
];

const ExamplesTab: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      {/* ── LLM Integration ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
        <LightbulbRegular style={{ color: '#0078d4', fontSize: 20, marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--colorNeutralForeground2)' }}>
          <strong style={{ fontSize: 13, color: 'var(--colorNeutralForeground1)' }}>Usage Examples</strong>
          <br />
          The MCP endpoint is at <code>{MCP_URL}</code>. Use the config from the <strong>MCP Server</strong> tab to connect Claude or any MCP client.
        </div>
      </div>

      {/* ── LLM Workflow ── */}
      <div className={styles.mcpSection} style={{ marginBottom: 24 }}>
        <div className={styles.sectionTitle}>
          <SparkleRegular style={{ fontSize: 14 }} /> Using with Claude / LLM Agents
        </div>
        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground2)', lineHeight: 1.7 }}>
          <strong>1. Add the config</strong> from the MCP Server tab to <code>claude_desktop_config.json</code> or <code>.vscode/mcp.json</code> and restart.<br />
          <strong>2. Claude discovers the tools</strong> — you'll see a 🔌 icon confirming the T3000 MCP server is connected.<br />
          <strong>3. Ask natural language questions</strong> — Claude automatically calls the right tools:
        </div>
        <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--colorNeutralBackground2)', borderRadius: 4, fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 6 }}>🗣️ <em>"What Haystack tags are available?"</em><br />→ Calls <code>haystack_list_tags</code></div>
          <div style={{ marginBottom: 6 }}>🗣️ <em>"Show me all outside air temperature sensors"</em><br />→ Calls <code>haystack_search_points</code> with tags [outside, air, temp]</div>
          <div style={{ marginBottom: 6 }}>🗣️ <em>"Auto-tag device 233626"</em><br />→ Calls <code>haystack_auto_tag</code></div>
          <div>🗣️ <em>"What Brick class does point dev233626.in5 have?"</em><br />→ Calls <code>haystack_get_brick_class</code></div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)', marginTop: 8, lineHeight: 1.5 }}>
          <strong>Claude Desktop</strong> and <strong>Claude Code (VS Code)</strong> both support HTTP MCP transport natively (spec 2024-11-05).
          No proxy or stdio wrapper needed.
        </div>
      </div>

      {/* ── Raw JSON-RPC Examples ── */}
      <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>
        <CodeRegular style={{ fontSize: 14 }} /> Raw JSON-RPC Requests
      </div>
      <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)', marginBottom: 16 }}>
        For testing or non-MCP HTTP clients — POST to <code>{MCP_URL}</code>
      </div>

      {examples.map((ex, i) => (
        <div key={i} className={styles.mcpSection} style={{ marginBottom: 20 }}>
          <div className={styles.sectionTitle}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{ex.title}</span>
            <Badge appearance="outline" size="small" style={{ marginLeft: 8 }}>
              {ex.tool}
            </Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground2)', marginBottom: 8, lineHeight: 1.5 }}>
            {ex.description}
          </div>
          <div style={{ position: 'relative' }}>
            <pre style={{
              background: 'var(--colorNeutralBackground2, #f5f5f5)',
              border: '1px solid var(--colorNeutralStroke1)',
              borderRadius: 4,
              padding: '10px 40px 10px 10px',
              fontSize: 11,
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.5,
            }}>
              <code>{JSON.stringify(ex.request, null, 2)}</code>
            </pre>
            <Button
              size="small" appearance="subtle"
              icon={copied === `ex-${i}` ? <CheckmarkCircleRegular style={{ color: '#1e7e34' }} /> : <CopyRegular />}
              style={{ position: 'absolute', top: 4, right: 4, minHeight: 22, height: 22 }}
              onClick={() => handleCopy(JSON.stringify(ex.request, null, 2), `ex-${i}`)}
            >{copied === `ex-${i}` ? 'Copied' : 'Copy'}</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AutoTaggingMcpPage;
