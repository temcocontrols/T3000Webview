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
  CodeRegular, BookOpenRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import { useLocation } from 'react-router-dom';
import styles from './AutoTaggingMcpPage.module.css';

// ── Types ──

interface AutoTaggingRule {
  id: number;
  rule_name: string;
  category: 'haystack' | 'brick' | 'range';
  pattern?: string;
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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.hash === '#mcp' ? 'mcp' : 'rules'
  );

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
  const [categoryFilter, setCategoryFilter] = useState('all');
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
    (categoryFilter === 'all' || r.category === categoryFilter) &&
    (!filter || r.rule_name.toLowerCase().includes(filter.toLowerCase()) ||
    r.category.includes(filter) || (r.brick_class || '').toLowerCase().includes(filter.toLowerCase()))
  );

  const columns: TableColumnDefinition<AutoTaggingRule>[] = [
    createTableColumn({ columnId: 'name', renderHeaderCell: () => 'Rule', renderCell: (r) => (
      <div className={styles.ruleCell}>
        <Badge appearance="filled" color={r.category === 'brick' ? 'important' : r.category === 'range' ? 'severe' : 'informative'} size="small">
          {r.category}
        </Badge>
        <span className={styles.ruleName}>{r.rule_name}</span>
      </div>
    ) }),
    createTableColumn({ columnId: 'pattern', renderHeaderCell: () => 'Pattern', renderCell: (r) => (
      <Tooltip content={r.pattern || '(metadata-based)'} relationship="description" positioning="above-end">
        <code className={styles.patternCode}>{r.pattern || '—'}</code>
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
        <Select
          size="small"
          value={categoryFilter}
          onChange={(_, d) => setCategoryFilter(d.value)}
          className={styles.typeDropdown}
        >
          <option value="all">All Types</option>
          <option value="haystack">Haystack</option>
          <option value="brick">Brick</option>
          <option value="range">Range</option>
        </Select>
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
          <Spinner size="tiny" label="Loading rules…" className={styles.loadingSpinner} />
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
                  <option value="range">Range</option>
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
      setPreviewData(null);
      setResult('Auto-tags cleared. Manual tags preserved.');
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
              <Button icon={<DeleteRegular style={{ fontSize: 14 }} />} disabled={running} size="small">Clear Auto-Tags</Button>
          </PopoverTrigger>
          <PopoverSurface style={{ padding: 12, maxWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <WarningRegular style={{ color: '#d32f2f', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 12 }}>
                <strong>Clear Auto-Tags:</strong> This will permanently delete all auto-assigned Haystack tags and Brick classes for {serials.length} device(s). Manual tags are preserved.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button size="small" appearance="primary" style={{ background: '#d32f2f' }} onClick={handleReset}>Clear</Button>
            </div>
          </PopoverSurface>
        </Popover>
      </div>
      </div>

      {error && <div className={styles.errorBanner}><WarningRegular /> {error}</div>}
      {result && <div className={styles.successBanner}><CheckmarkCircleRegular /> {result}</div>}
      {running && <Spinner size="extra-small" label="Processing..." className={styles.loadingSpinner} />}

      {previewData && (() => {
        const sorted = [...previewData].sort((a, b) =>
          a.point.serial_number - b.point.serial_number
          || a.point.point_type.localeCompare(b.point.point_type)
          || a.point.point_index - b.point.point_index
        );
        return (
        <div className={styles.previewSection}>
          <div className={styles.sectionTitle}>Preview Results ({sorted.length} matches)</div>
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
              {sorted.map((m, i) => (
                <tr key={i}>
                  <td>{m.point.serial_number}{getDeviceName(m.point.serial_number) ? ` — ${getDeviceName(m.point.serial_number)}` : ''}</td>
                  <td>{m.point.point_type} #{m.point.point_index}</td>
                  <td>{m.point.full_label || m.point.label || '—'}</td>
                  <td><Badge size="small">{m.matched_rule || '—'}</Badge></td>
                  <td>
                    {m.haystack_tags.length > 0
                      ? m.haystack_tags.map(t => <Badge key={t} size="small" style={{ marginRight: 2 }}>{t}</Badge>)
                      : '—'}
                  </td>
                  <td>{m.brick_class || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        );
      })()}
    </div>
  );
};

// ═══ MCP Tab ═══

const MCP_CONFIG_CLAUDE = `{
  "mcpServers": {
    "T3000": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://<host>:9103/api/mcp",
        "--allow-http"
      ]
    }
  }
}`;

const MCP_CONFIG_VSCODE = `{
  "servers": {
    "T3000": {
      "type": "http",
      "url": "http://<host>:9103/api/mcp"
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
          <strong style={{ fontSize: 13, color: 'var(--colorNeutralForeground1)' }}>Model Context Protocol (MCP) Server — Streamable HTTP</strong>
          <br />
          The T3000 MCP server lets LLM agents (Claude Desktop, VS Code Copilot, Cursor, Cline, etc.) query devices, read/write points, manage Haystack tags, and run analytics via MCP Streamable HTTP on port 9103.
          Runs <strong>inside the T3000 API</strong>.
        </div>
      </div>

      {/* ── How to Connect ── */}
      <div className={styles.mcpSection}>
        <div className={styles.sectionTitle}>
          <SettingsRegular style={{ fontSize: 14 }} /> How to Connect
        </div>
        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground2)', marginBottom: 10, lineHeight: 1.6 }}>
          Copy the config below into your MCP client. Replace <code>&lt;host&gt;</code> with <code>localhost</code> (local) or the machine's LAN IP (remote). The T3000 API must be running on port <code>9103</code>.
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {/* Claude / Cursor config */}
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--colorNeutralForeground1)' }}>Claude Desktop / Cursor (via mcp-remote)</div>
            <pre style={{
              background: 'var(--colorNeutralBackground2, #f5f5f5)',
              border: '1px solid var(--colorNeutralStroke1)',
              borderRadius: 4,
              padding: '10px 36px 10px 10px',
              fontSize: 11,
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.5,
              flex: 1,
            }}>
              <code>{MCP_CONFIG_CLAUDE}</code>
            </pre>
            <Button
              size="small" appearance="subtle"
              icon={copied === 'claude' ? <CheckmarkCircleRegular style={{ color: '#1e7e34' }} /> : <CopyRegular />}
              style={{ position: 'absolute', top: 22, right: 2, minHeight: 22, height: 22 }}
              onClick={() => handleCopy(MCP_CONFIG_CLAUDE, 'claude')}
            >{copied === 'claude' ? 'Copied' : ''}</Button>
          </div>

          {/* VS Code config */}
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--colorNeutralForeground1)' }}>VS Code Copilot</div>
            <pre style={{
              background: 'var(--colorNeutralBackground2, #f5f5f5)',
              border: '1px solid var(--colorNeutralStroke1)',
              borderRadius: 4,
              padding: '10px 36px 10px 10px',
              fontSize: 11,
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.5,
              flex: 1,
            }}>
              <code>{MCP_CONFIG_VSCODE}</code>
            </pre>
            <Button
              size="small" appearance="subtle"
              icon={copied === 'vscode' ? <CheckmarkCircleRegular style={{ color: '#1e7e34' }} /> : <CopyRegular />}
              style={{ position: 'absolute', top: 22, right: 2, minHeight: 22, height: 22 }}
              onClick={() => handleCopy(MCP_CONFIG_VSCODE, 'vscode')}
            >{copied === 'vscode' ? 'Copied' : ''}</Button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>
          {/* Claude Desktop */}
          <div style={{ padding: '10px 12px', background: 'var(--colorNeutralBackground2)', borderRadius: 4 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, borderLeft: '3px solid var(--colorBrandForeground1, #0078d4)', paddingLeft: 8 }}>
              Claude Desktop
              <a href="#/t3000/documentation/t3000/haystack/mcp-claude-desktop" style={{ fontSize: 11, color: 'var(--colorBrandForeground1, #0078d4)', textDecoration: 'none', marginLeft: 8, fontWeight: 400 }}>Full Details →</a>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--colorNeutralForeground2)' }}>
              <li>Open <code>Claude</code> → Settings → Developer → Edit Config</li>
              <li>Paste the <strong>Claude Desktop</strong> config (left) into <code>claude_desktop_config.json</code></li>
              <li>Make sure <code>npx</code> is installed (<code>npm install -g npx</code> if needed)</li>
              <li>Restart Claude Desktop — first run will download <code>mcp-remote</code> automatically</li>
              <li>Look for the 🔌 icon — you should see 25 T3000 tools available</li>
            </ol>
          </div>

          {/* VS Code Copilot */}
          <div style={{ padding: '10px 12px', background: 'var(--colorNeutralBackground2)', borderRadius: 4 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, borderLeft: '3px solid var(--colorBrandForeground1, #0078d4)', paddingLeft: 8 }}>
              VS Code Copilot
              <a href="#/t3000/documentation/t3000/haystack/mcp-vscode-copilot" style={{ fontSize: 11, color: 'var(--colorBrandForeground1, #0078d4)', textDecoration: 'none', marginLeft: 8, fontWeight: 400 }}>Full Details →</a>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--colorNeutralForeground2)' }}>
              <li>In your project, create <code>.vscode/mcp.json</code></li>
              <li>Paste the <strong>VS Code Copilot</strong> config (right)</li>
              <li>Reload VS Code (<code>Ctrl+Shift+P</code> → Reload Window)</li>
              <li>In Copilot Chat, verify tools appear by asking "list available tools"</li>
            </ol>
          </div>

          {/* Cursor / Cline / Continue.dev */}
          <div style={{ padding: '10px 12px', background: 'var(--colorNeutralBackground2)', borderRadius: 4 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, borderLeft: '3px solid var(--colorBrandForeground1, #0078d4)', paddingLeft: 8 }}>
              Cursor / Cline / Continue.dev
              <a href="#/t3000/documentation/t3000/haystack/mcp-claude-desktop" style={{ fontSize: 11, color: 'var(--colorBrandForeground1, #0078d4)', textDecoration: 'none', marginLeft: 8, fontWeight: 400 }}>Full Details →</a>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--colorNeutralForeground2)' }}>
              <li>Open your MCP settings (Cursor: <code>.cursor/mcp.json</code>, Cline: MCP Servers view, Continue: <code>config.json</code>)</li>
              <li>Use the <strong>Claude Desktop</strong> config (left) — same <code>mcp-remote</code> approach</li>
              <li>Restart or reload the extension</li>
              <li>Verify: ask "list T3000 devices" — it should call <code>device_list</code></li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Available Tools ── */}
      <div className={styles.mcpSection} style={{ marginTop: 20 }}>
        <div className={styles.sectionTitle}>
          <TagRegular style={{ fontSize: 14 }} /> Available Tools (25 across 7 categories)
        </div>
        <table className={styles.mcpToolTable}>
          <thead>
            <tr><th style={{width:'22%'}}>Tool</th><th style={{width:'36%'}}>Description</th><th style={{width:'42%'}}>Parameters</th></tr>
          </thead>
          <tbody>
            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Haystack Tagging</td></tr>
            <tr><td><code>haystack_list_tags</code></td><td>List all Haystack tags with categories, documentation, and usage counts</td><td>filter?: string</td></tr>
            <tr><td><code>haystack_get_point_tags</code></td><td>Get tags assigned to specific points by serial number</td><td>serial_numbers: int[]<br/>point_type?: INPUT|OUTPUT|VARIABLE</td></tr>
            <tr><td><code>haystack_search_points</code></td><td>Search for points matching specific tag filters</td><td>tags: string[]<br/>serial_numbers?: int[]<br/>point_types?: string[]</td></tr>
            <tr><td><code>haystack_auto_tag</code></td><td>Run auto-tagging on devices (range+regex rules)</td><td>serial_numbers: int[]</td></tr>
            <tr><td><code>haystack_preview_tags</code></td><td>Preview auto-tagging results without writing to DB</td><td>serial_numbers: int[]</td></tr>
            <tr><td><code>haystack_list_rules</code></td><td>List all auto-tagging rules with patterns and priorities</td><td>—</td></tr>
            <tr><td><code>haystack_get_brick_class</code></td><td>Get Brick ontology class for specified points</td><td>serial_numbers: int[]</td></tr>
            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🟢 Core</td></tr>
            <tr><td><code>ping</code></td><td>Health check — returns server status and timestamp</td><td>—</td></tr>
            <tr><td><code>get_version</code></td><td>Server name, version, protocol version, tool count</td><td>—</td></tr>
            <tr><td><code>describe_tool</code></td><td>Get full schema and description for any tool</td><td>tool_name: string</td></tr>
            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🟡 Data &amp; Metadata</td></tr>
            <tr><td><code>device_list</code></td><td>List all devices with serial, name, type, point counts</td><td>filter_name?: string</td></tr>
            <tr><td><code>device_get_points</code></td><td>Get all points for a device with tags and Brick class</td><td>serial_number: int<br/>point_type?: INPUT|OUTPUT|VARIABLE</td></tr>
            <tr><td><code>point_get_metadata</code></td><td>Full metadata: label, units, range, tags, Brick class</td><td>serial_number, point_type, point_index</td></tr>
            <tr><td><code>metadata_search</code></td><td>Search points across devices by label text</td><td>query: string<br/>serial_numbers?, point_types?, limit?</td></tr>
            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🟠 Operational (Read/Write)</td></tr>
            <tr><td><code>point_read</code></td><td>Read current value of a single point</td><td>serial_number, point_type, point_index</td></tr>
            <tr><td><code>point_write</code></td><td>Write a value to a point (confirm:true required)</td><td>serial_number, point_type, point_index, value, confirm</td></tr>
            <tr><td><code>point_read_batch</code></td><td>Read multiple points in a single call</td><td>points: [&#123;serial_number, point_type, point_index&#125;]</td></tr>
            <tr><td><code>point_write_batch</code></td><td>Write values to multiple points (confirm:true required)</td><td>points: [&#123;...value&#125;], confirm</td></tr>
            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔴 Analytics</td></tr>
            <tr><td><code>haystack_validate</code></td><td>Validate tagging against ontology rules (sensor→INPUT, etc.)</td><td>serial_numbers?: int[]</td></tr>
            <tr><td><code>haystack_export</code></td><td>Export semantic model as haystack-json, brick-ttl, or brick-jsonld</td><td>serial_numbers: int[]<br/>format: string</td></tr>
            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🟣 Rules Management</td></tr>
            <tr><td><code>rule_toggle</code></td><td>Enable or disable an auto-tagging rule by ID</td><td>rule_id: int, enabled: boolean</td></tr>
            <tr><td><code>rule_create</code></td><td>Create a new auto-tagging rule with regex pattern</td><td>rule_name, pattern, category<br/>haystack_tags?, brick_class?, etc.</td></tr>
            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>⚫ Alarms &amp; Trends</td></tr>
            <tr><td><code>alarm_list</code></td><td>List alarms, optionally filtered to active-only</td><td>serial_numbers?: int[]<br/>active_only?: boolean</td></tr>
            <tr><td><code>alarm_acknowledge</code></td><td>Acknowledge an alarm by device serial and alarm ID</td><td>serial_number: int<br/>alarm_id: string</td></tr>
            <tr><td><code>trendlog_query</code></td><td>Query historical trend data for a point over a time range</td><td>serial_number, point_type, point_index, start<br/>end?, limit?</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══ Examples Tab ═══

const MCP_URL = `http://<host>:9103/api/mcp`;

interface PromptExample {
  prompt: string;
  tool: string;
  desc: string;
}

interface PromptCategory {
  name: string;
  tools: number;
  items: PromptExample[];
}

const promptCategories: PromptCategory[] = [
  {
    name: 'Haystack Tagging', tools: 7, items: [
      { prompt: 'What Haystack tags are available?', tool: 'haystack_list_tags', desc: 'List all tag definitions with categories and docs' },
      { prompt: 'What tags are assigned to device 233626?', tool: 'haystack_get_point_tags', desc: 'Get all tags for a device\'s points' },
      { prompt: 'Search for all temperature sensors', tool: 'haystack_search_points', desc: 'Find points with temp and sensor tags' },
      { prompt: 'Auto-tag device 233626', tool: 'haystack_auto_tag', desc: 'Run auto-tagging on a single device' },
      { prompt: 'Preview what tags would be assigned to device 240488', tool: 'haystack_preview_tags', desc: 'Dry-run without writing to DB' },
      { prompt: 'List the Haystack auto-tagging rules', tool: 'haystack_list_rules', desc: 'Show all regex rules with status' },
      { prompt: 'What Brick class does input 8 on device 237219 have?', tool: 'haystack_get_brick_class', desc: 'Check Brick ontology assignments' },
    ]
  },
  {
    name: 'Data & Discovery', tools: 4, items: [
      { prompt: 'List all T3000 devices', tool: 'device_list', desc: 'Enumerate all devices with serials and point counts' },
      { prompt: 'Show me the input points for device T3-NB-ESP', tool: 'device_get_points', desc: 'Get all inputs on a device' },
      { prompt: 'Get full metadata for input 0 on device 240488', tool: 'point_get_metadata', desc: 'Label, units, range, tags, Brick class' },
      { prompt: 'Search for points labeled temperature', tool: 'metadata_search', desc: 'Cross-device label search' },
    ]
  },
  {
    name: 'Operational', tools: 4, items: [
      { prompt: 'Read input point 0 on device 233626', tool: 'point_read', desc: 'Read a single point value' },
      { prompt: 'Set output 5 on device 233626 to 72.5', tool: 'point_write', desc: 'Write a value (requires confirm)' },
      { prompt: 'Read inputs 0, 1, and 2 on device 240488 all at once', tool: 'point_read_batch', desc: 'Batch read multiple points' },
      { prompt: 'Set outputs 0 through 3 on device 237219 to 100', tool: 'point_write_batch', desc: 'Batch write (requires confirm)' },
    ]
  },
  {
    name: 'Analytics & Export', tools: 2, items: [
      { prompt: 'Validate the Haystack tags on device 237219', tool: 'haystack_validate', desc: 'Check for missing tags, conflicts' },
      { prompt: 'Export device 233626 as Brick Turtle RDF', tool: 'haystack_export', desc: 'Export semantic model in brick-ttl format' },
    ]
  },
  {
    name: 'Rules Management', tools: 2, items: [
      { prompt: 'Disable auto-tagging rule 5', tool: 'rule_toggle', desc: 'Enable or disable a tagging rule' },
      { prompt: 'Create a rule that tags CO2 labels as air, co2, sensor', tool: 'rule_create', desc: 'Create a new auto-tagging rule' },
    ]
  },
  {
    name: 'Alarms & Trends', tools: 3, items: [
      { prompt: 'List all active alarms', tool: 'alarm_list', desc: 'Get unacknowledged alarms' },
      { prompt: 'Get trend data for input 8 on device 237219 for the last hour', tool: 'trendlog_query', desc: 'Query historical trend data' },
    ]
  },
];

const ExamplesTab: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleCategory = (name: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const totalPrompts = promptCategories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <LightbulbRegular style={{ color: '#0078d4', fontSize: 20, marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--colorNeutralForeground2)', flex: 1 }}>
          <strong style={{ fontSize: 13, color: 'var(--colorNeutralForeground1)' }}>Natural Language Prompts</strong>
          <br />
          {totalPrompts} prompts across {promptCategories.length} categories. Click any prompt to copy, then paste into Copilot Chat or Claude.
          The MCP endpoint is at <code>{MCP_URL}</code>.
        </div>
        <a
          href="#/t3000/documentation/t3000/haystack/mcp-api-examples"
          style={{ fontSize: 11, color: 'var(--colorBrandForeground1, #0078d4)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}
        >
          Full Docs →
        </a>
      </div>

      {/* ── Prompt Categories ── */}
      {promptCategories.map((cat) => {
        const isCollapsed = collapsedCategories.has(cat.name);
        return (
          <div key={cat.name} style={{ marginBottom: 12 }}>
            {/* Category Header */}
            <div
              onClick={() => toggleCategory(cat.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                cursor: 'pointer', userSelect: 'none',
                borderBottom: '1px solid var(--colorNeutralStroke2)',
                marginBottom: isCollapsed ? 0 : 8,
              }}
            >
              <span style={{
                fontSize: 11, transition: 'transform 0.15s',
                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                color: 'var(--colorNeutralForeground3)',
              }}>▼</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--colorNeutralForeground1)' }}>{cat.name}</span>
              <Badge appearance="outline" size="small" style={{ fontSize: 10 }}>{cat.tools} tools</Badge>
              <span style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)', marginLeft: 'auto' }}>{cat.items.length} prompts</span>
            </div>

            {/* Prompt Cards */}
            {!isCollapsed && (
              <div className={styles.promptGrid}>
                {cat.items.map((item, idx) => {
                  const key = `${cat.name}-${idx}`;
                  return (
                    <div
                      key={key}
                      className={styles.promptCard}
                      onClick={() => handleCopy(item.prompt, key)}
                      title="Click to copy prompt"
                    >
                      <div className={styles.promptText}>{item.prompt}</div>
                      <div className={styles.promptMeta}>
                        <code style={{ fontSize: 10, color: 'var(--colorNeutralForeground3)' }}>{item.tool}</code>
                        <span style={{ fontSize: 10, color: 'var(--colorNeutralForeground4)' }}>{item.desc}</span>
                      </div>
                      <div className={styles.promptCopyIcon}>
                        {copied === key
                          ? <CheckmarkCircleRegular style={{ color: '#1e7e34', fontSize: 14 }} />
                          : <CopyRegular style={{ color: 'var(--colorNeutralForeground3)', fontSize: 12 }} />
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Footer ── */}
      <div style={{
        marginTop: 20, paddingTop: 12,
        borderTop: '1px solid var(--colorNeutralStroke2)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
        color: 'var(--colorNeutralForeground3)',
      }}>
        <BookOpenRegular style={{ fontSize: 14 }} />
        <span>See the full <a href="#/t3000/documentation/t3000/haystack/mcp-api-examples" style={{ color: 'var(--colorBrandForeground1)' }}>MCP API Examples</a> doc for all 25 tools with detailed descriptions.</span>
      </div>
    </div>
  );
};

export default AutoTaggingMcpPage;
