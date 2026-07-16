import React, { useState, useEffect, useCallback } from 'react';
import {
  Spinner, Button, Input, Field, Switch, Tooltip,
  Tab, TabList, Dialog, DialogSurface, DialogBody, DialogTitle,
  DialogContent, DialogActions, Badge, Select,
  DataGrid, DataGridHeader, DataGridRow, DataGridCell, DataGridBody,
  createTableColumn,
  Popover, PopoverSurface, PopoverTrigger,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular, AddRegular, DismissRegular,
  PlayRegular, EyeRegular, CheckmarkCircleRegular,
  WarningRegular, InfoRegular, DeleteRegular,
  TagRegular, FlashRegular, BrainCircuitRegular, SettingsRegular,
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
        <Tab value="mcp" icon={<BrainCircuitRegular />}><span style={{fontSize:13}}>MCP Server</span></Tab>
      </TabList>

      <div className={styles.tabContent}>
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'run' && <RunTab />}
        {activeTab === 'mcp' && <McpTab />}
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
  const { selectedDevice, devices } = useDeviceTreeStore();
  const [serialInput, setSerialInput] = useState('');
  const [running, setRunning] = useState(false);
  const [previewData, setPreviewData] = useState<TagMatch[] | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getSerials = (): number[] => {
    if (serialInput.trim()) {
      return serialInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    }
    if (selectedDevice?.serialNumber) return [selectedDevice.serialNumber];
    return [];
  };

  const handlePreview = async () => {
    const serials = getSerials();
    if (serials.length === 0) { setError('Enter serial numbers or select a device'); return; }
    setRunning(true);
    setError(null);
    setPreviewData(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumbers: serials }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPreviewData(data.matches || []);
      setResult(`Found ${data.matches?.length || 0} matches across ${serials.length} device(s).`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleRun = async () => {
    const serials = getSerials();
    if (serials.length === 0) { setError('Enter serial numbers or select a device'); return; }
    if (!confirm(`Run auto-tagging on ${serials.length} device(s)? This will write tags to the database.`)) return;
    setRunning(true);
    setError(null);
    setPreviewData(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumbers: serials }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(`${data.tagged || 0} points tagged.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleReset = async () => {
    const serials = getSerials();
    if (serials.length === 0) { setError('Enter serial numbers or select a device'); return; }
    if (!confirm(`Reset auto-tags on ${serials.length} device(s)?`)) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumbers: serials }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult('Tags reset.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const serials = getSerials();

  return (
    <div>
      <div className={styles.runPanel}>
        <Field label="Device Serial Numbers">
          <Input
            placeholder={selectedDevice ? `Selected: ${selectedDevice.serialNumber}` : 'e.g., 1,2,3'}
            value={serialInput}
            onChange={(_, d) => setSerialInput(d.value)}
          />
        </Field>
        <div className={styles.runButtons}>
          <Button icon={<EyeRegular />} onClick={handlePreview} disabled={running}>
            Preview
          </Button>
          <Button icon={<PlayRegular />} onClick={handleRun} disabled={running} appearance="primary">
            Run Auto-Tag
          </Button>
          <Button icon={<DeleteRegular />} onClick={handleReset} disabled={running} appearance="subtle">
            Reset Tags
          </Button>
        </div>

        <div className={styles.deviceHint}>
          {serials.length > 0
            ? <span><CheckmarkCircleRegular /> Targeting {serials.length} device(s): {serials.join(', ')}</span>
            : <span style={{ color: '#888' }}>Select a device in the tree or enter serial numbers above.</span>
          }
        </div>
      </div>

      {error && <div className={styles.errorBanner}><WarningRegular /> {error}</div>}
      {result && <div className={styles.successBanner}><CheckmarkCircleRegular /> {result}</div>}
      {running && <Spinner label="Processing..." />}

      {previewData && (
        <div className={styles.previewSection}>
          <h4>Preview Results ({previewData.length} matches)</h4>
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
                  <td>{m.point.serial_number}</td>
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

const McpTab: React.FC = () => {
  return (
    <div className={styles.mcpSection}>
      <div className={styles.mcpCard}>
        <h3><BrainCircuitRegular /> Model Context Protocol Server</h3>
        <p>
          The T3000 Haystack MCP server exposes auto-tagging and tagging tools to LLM agents via JSON-RPC 2.0 over stdio.
          Connect any MCP-compatible client (Claude Desktop, VS Code Copilot, etc.) to query and manage Haystack tags programmatically.
        </p>
      </div>

      <div className={styles.mcpCard}>
        <h4>Available Tools</h4>
        <table className={styles.mcpToolTable}>
          <thead>
            <tr><th>Tool</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>haystack_list_tags</code></td>
              <td>List all Haystack tags with categories, documentation, usage counts</td>
            </tr>
            <tr>
              <td><code>haystack_get_point_tags</code></td>
              <td>Get tags assigned to specific points by serial number</td>
            </tr>
            <tr>
              <td><code>haystack_search_points</code></td>
              <td>Search for points matching specific tag filters</td>
            </tr>
            <tr>
              <td><code>haystack_auto_tag</code></td>
              <td>Run regex-based auto-tagging on devices</td>
            </tr>
            <tr>
              <td><code>haystack_preview_tags</code></td>
              <td>Preview auto-tagging results without writing</td>
            </tr>
            <tr>
              <td><code>haystack_list_rules</code></td>
              <td>List all auto-tagging rules with patterns</td>
            </tr>
            <tr>
              <td><code>haystack_get_brick_class</code></td>
              <td>Get Brick ontology class for points</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.mcpCard}>
        <h4>Connection</h4>
        <p>The MCP server runs on <code>stdio</code> (standard input/output) as a child process.</p>
        <p><strong>Endpoint:</strong> <code>t3_webview_api MCP server</code> (embedded in the API binary)</p>
        <p className={styles.mcpNote}>
          <InfoRegular /> The MCP server is always available when the T3000 WebView API is running. No separate process needed.
        </p>
      </div>
    </div>
  );
};

export default AutoTaggingMcpPage;
