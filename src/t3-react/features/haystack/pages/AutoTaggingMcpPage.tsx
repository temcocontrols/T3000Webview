import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Spinner, Button, Input, Field, Switch,
  Tab, TabList, Dialog, DialogSurface, DialogBody, DialogTitle,
  DialogContent, DialogActions, Badge, Select, Link,
  DataGrid, DataGridHeader, DataGridRow, DataGridCell, DataGridBody,
  createTableColumn, TableColumnDefinition,
  Popover, PopoverSurface, PopoverTrigger,
  Dropdown, Option,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular, AddRegular, DismissRegular,
  PlayRegular, EyeRegular, CheckmarkCircleRegular,
  WarningRegular, InfoRegular, DeleteRegular,
  SettingsRegular, ErrorCircleRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
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

interface AffectedPoint {
  serial_number: number;
  point_type: string;
  point_index: number;
  label?: string;
  full_label?: string;
}

// ── Page Component ──

const AutoTaggingMcpPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rules');

  return (
    <div className={styles.container}>
      <style>{'[role="tooltip"],[role="tooltip"] *{max-width:none!important;white-space:nowrap!important;width:auto!important}'}</style>

      <TabList selectedValue={activeTab} onTabSelect={(_, d) => setActiveTab(d.value as string)}>
        <Tab value="rules" icon={<SettingsRegular />}><span style={{fontSize:13}}>Rules</span></Tab>
        <Tab value="run" icon={<PlayRegular />}><span style={{fontSize:13}}>Run Auto-Tag</span></Tab>
      </TabList>

      <div className={styles.tabContent}>
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'run' && <RunTab />}
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
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AutoTaggingRule | null>(null);
  const [affectedPoints, setAffectedPoints] = useState<AffectedPoint[]>([]);
  const [forceDeleting, setForceDeleting] = useState(false);
  const [showAllAffected, setShowAllAffected] = useState(false);

  useEffect(() => {
    if (syncMsg) {
      const t = setTimeout(() => setSyncMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [syncMsg]);

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

  const handleSyncBrickRules = async () => {
    setSyncConfirmOpen(false);
    setSyncing(true); setError(null); setSyncMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/sync-brick-rules`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSyncMsg(data.message || `${data.total} rules synced.`);
      await fetchRules();
    } catch (e: any) { setError(e.message); }
    finally { setSyncing(false); }
  };

  const handleClearAllRules = async () => {
    setSyncConfirmOpen(false);
    setSyncing(true); setError(null); setSyncMsg(null);
    try {
      await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules`, { method: 'DELETE' });
      // Re-sync after clearing
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/sync-brick-rules`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSyncMsg(data.message || 'Rules cleared and re-synced.');
      await fetchRules();
    } catch (e: any) { setError(e.message); }
    finally { setSyncing(false); }
  };

  const handleOpenDeletePopover = async (rule: AutoTaggingRule) => {
    setDeleteTarget(rule);
    setShowAllAffected(false);
    setAffectedPoints([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules/${rule.id}/affected-points`);
      if (res.ok) {
        const data = await res.json();
        setAffectedPoints(data.points || []);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setAffectedPoints([]);
      await fetchRules();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleForceDeleteRule = async () => {
    if (!deleteTarget) return;
    setForceDeleting(true);
    try {
      await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules/${deleteTarget.id}?force=true`, { method: 'DELETE' });
      setForceDeleting(false);
      setDeleteTarget(null);
      setAffectedPoints([]);
      await fetchRules();
    } catch (e: any) {
      setForceDeleting(false);
      setError(e.message);
    }
  };

  const filtered = useMemo(() => rules.filter(r =>
    (categoryFilter === 'all' || r.category === categoryFilter) &&
    (!filter || r.rule_name.toLowerCase().includes(filter.toLowerCase()) ||
    r.category.includes(filter) || (r.brick_class || '').toLowerCase().includes(filter.toLowerCase()))
  ), [rules, categoryFilter, filter]);

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
        <code className={styles.patternCode}>{r.pattern || '—'}</code>
    ) }),
    createTableColumn({ columnId: 'brick_class', renderHeaderCell: () => 'Brick Class', renderCell: (r) => (
      <span className={styles.targetCell}>{r.brick_class || r.haystack_tags || '—'}</span>
    ) }),
    createTableColumn({ columnId: 'status', renderHeaderCell: () => 'Status', renderCell: (r) => (
      <Switch checked={r.enabled} onChange={() => handleToggle(r)} className={styles.switchScale} />
    ) }),
    createTableColumn({ columnId: 'actions', renderHeaderCell: () => '', renderCell: (r) => {
      const isOpen = deleteTarget?.id === r.id;
      return (
      <Popover
        open={isOpen}
        onOpenChange={(_, d) => { if (!d.open) { setDeleteTarget(null); setAffectedPoints([]); setShowAllAffected(false); } }}
        positioning="above-start"
      >
        <PopoverTrigger disableButtonEnhancement>
          <Button
            size="small"
            icon={<DeleteRegular style={{ fontSize: 17 }} />}
            appearance="subtle"
            onClick={() => handleOpenDeletePopover(r)}
          />
        </PopoverTrigger>
        <PopoverSurface style={{ maxWidth: 340, padding: 16 }}>
          {affectedPoints.length === 0 ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Delete rule "{r.rule_name}"?
              </div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 16 }}>
                This action cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button size="small" appearance="primary" style={{ background: '#d32f2f' }} onClick={handleDeleteRule}>Delete</Button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ErrorCircleRegular style={{ fontSize: 18, color: '#da3b01' }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Cannot delete "{r.rule_name}"
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 4 }}>
                This rule's pattern matches {affectedPoints.length} point{affectedPoints.length !== 1 ? 's' : ''}:
              </div>

              <div style={{
                maxHeight: (showAllAffected ? 200 : 100),
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                marginBottom: 8,
                border: '1px solid var(--colorNeutralStroke2, #e0e0e0)',
                borderRadius: 4,
                fontSize: 12,
              }}>
                {(showAllAffected ? affectedPoints : affectedPoints.slice(0, 3)).map((p, i) => (
                  <div key={i} style={{
                    padding: '4px 8px',
                    borderBottom: '1px solid var(--colorNeutralStroke2, #f0f0f0)',
                    display: 'flex', gap: 6,
                  }}>
                    <span style={{ color: '#888', minWidth: 48 }}>{p.serial_number}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.full_label || p.label || `${p.point_type} #${p.point_index}`}
                    </span>
                    <span style={{ color: '#888' }}>{p.point_type} #{p.point_index}</span>
                  </div>
                ))}
              </div>

              {affectedPoints.length > 3 && (
                <Button
                  size="small"
                  appearance="transparent"
                  onClick={() => setShowAllAffected(prev => !prev)}
                  style={{ fontSize: 11, marginBottom: 8, minHeight: 22 }}
                >
                  {showAllAffected ? 'Show fewer' : `Show all ${affectedPoints.length} points`}
                </Button>
              )}

              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4, marginBottom: 12 }}>
                Force-delete will remove this rule <strong>and</strong> clean up all auto-assigned tags/brick classes
                matching its pattern. Manual tags are preserved.
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button
                  size="small"
                  appearance="primary"
                  style={{ background: '#d32f2f' }}
                  onClick={handleForceDeleteRule}
                  disabled={forceDeleting}
                >
                  {forceDeleting ? 'Deleting…' : 'Force Delete'}
                </Button>
              </div>
            </>
          )}
        </PopoverSurface>
      </Popover>
    )}}),
  ];

  return (
    <div className={styles.rulesLayout}>
      <div className={styles.runHint} style={{ display: 'block', marginBottom: 4 }}>
        <InfoRegular style={{ fontSize: 13, verticalAlign: 'text-bottom', marginRight: 4 }} />
        Rules are seeded from <Link href="https://github.com/qnst/brick-bacnet-mcp" target="_blank">brick-bacnet-mcp</Link> (regex) &amp; <Link href="https://github.com/qnst/Brick" target="_blank">Brick Schema</Link> (ontology). Click <strong>Sync from Brick Official</strong> to restore missing rules. Custom rules are preserved across syncs.
      </div>

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
        <Button icon={<AddRegular style={{ fontSize: 14 }} />} onClick={() => setCreating(true)} size="small">New Rule</Button>
        <Popover open={syncConfirmOpen} onOpenChange={(_, d) => setSyncConfirmOpen(d.open)} positioning="above-end">
          <PopoverTrigger disableButtonEnhancement>
            <Button
              icon={syncing ? undefined : <ArrowClockwiseRegular style={{ fontSize: 14 }} />}
              onClick={() => setSyncConfirmOpen(true)}
              disabled={syncing}
              size="small"
              appearance="primary"
            >
              {syncing ? 'Syncing…' : 'Sync from Brick Official'}
            </Button>
          </PopoverTrigger>
          <PopoverSurface style={{ padding: 16, maxWidth: 520 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Sync Rules from Brick Official?
            </div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: 14 }}>
              Downloads the latest tagging rules from the official{' '}
              <Link href="https://github.com/qnst/brick-bacnet-mcp" target="_blank">brick-bacnet-mcp</Link>
              {' '}repo. Deleted rules will be restored. Rules you created or modified yourself are left as-is.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
              <Button size="small" appearance="subtle" style={{ color: '#d32f2f', fontSize: 11 }}
                onClick={handleClearAllRules} disabled={syncing}>
                Clear All &amp; Re-sync
              </Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="small" onClick={() => setSyncConfirmOpen(false)}>Cancel</Button>
                <Button size="small" appearance="primary" onClick={handleSyncBrickRules}>Sync</Button>
              </div>
            </div>
          </PopoverSurface>
        </Popover>
        <span className={styles.count}>{filtered.length} rules</span>
      </div>

      {error && <div className={styles.errorBanner}><WarningRegular /> {error}</div>}
      {syncMsg && <div className={styles.successBanner}><CheckmarkCircleRegular /> {syncMsg}</div>}

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

      {creating && <RuleDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); fetchRules(); }} />}
    </div>
  );
};

// ── Rule Dialog ──

const RuleDialog: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
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
      onSaved();
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
  const [rules, setRules] = useState<AutoTaggingRule[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([]); // empty = nothing selected
  const [ruleSelectorOpen, setRuleSelectorOpen] = useState(false);
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState('all'); // all | haystack | brick | range
  const [previewFilter, setPreviewFilter] = useState('');

  const allDevices = devices.filter(d => d.productName && d.productName !== 'Unknown' && d.productName !== '(Unknown)');
  const allSerials = allDevices.map(d => String(d.serialNumber));
  const effectiveSerials = selectAll ? allSerials : selectedSerials;
  const serials = effectiveSerials.map(Number).filter(n => !isNaN(n));

  const handlePreview = async () => {
    if (serials.length === 0) { setError('No devices available'); return; }
    setRunning(true); setError(null); setPreviewData(null); setResult(null);
    try {
      const body: any = { serialNumbers: serials };
      if (selectedRuleIds.length < enabledRules.length) body.ruleIds = selectedRuleIds;
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      const body: any = { serialNumbers: serials };
      if (selectedRuleIds.length < enabledRules.length) body.ruleIds = selectedRuleIds;
      const res = await fetch(`${API_BASE_URL}/api/haystack/auto-tagging/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      .then(r => r.json()).then(d => {
        const all: AutoTaggingRule[] = d.rules || [];
        setRules(all);
        const enabled = all.filter((r: AutoTaggingRule) => r.enabled);
        if (selectedRuleIds.length === 0) setSelectedRuleIds(enabled.map(r => r.id));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (result) {
      const t = setTimeout(() => setResult(null), 4000);
      return () => clearTimeout(t);
    }
  }, [result]);

  const enabledRules = rules.filter(r => r.enabled);
  const filteredRules = ruleCategoryFilter === 'all'
    ? enabledRules
    : enabledRules.filter(r => r.category === ruleCategoryFilter);
  const haystackCount = enabledRules.filter(r => r.category === 'haystack').length;
  const brickCount = enabledRules.filter(r => r.category === 'brick').length;
  const rangeCount = enabledRules.filter(r => r.category === 'range').length;
  const ruleCount = selectedRuleIds.length;
  const filteredSelectedCount = filteredRules.filter(r => selectedRuleIds.includes(r.id)).length;
  const isAllFilteredSelected = filteredRules.length > 0 && filteredRules.every(r => selectedRuleIds.includes(r.id));

  const toggleAllRules = () => {
    const catIds = new Set(filteredRules.map(r => r.id));
    if (isAllFilteredSelected) {
      setSelectedRuleIds(prev => prev.filter(id => !catIds.has(id)));
    } else {
      setSelectedRuleIds(prev => {
        const s = new Set(prev);
        catIds.forEach(id => s.add(id));
        return Array.from(s);
      });
    }
  };

  const toggleRule = (id: number) => {
    setSelectedRuleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
            <Option key={String(d.serialNumber)} value={String(d.serialNumber)} text={`${d.serialNumber} — ${d.productName || `Device ${d.serialNumber}`}`}>
              {d.serialNumber} — {d.productName || `Device ${d.serialNumber}`}
            </Option>
          ))}
        </Dropdown>

        {/* ── Rule Selector Button ── */}
        <Button size="small" icon={<SettingsRegular style={{ fontSize: 14 }} />}
          style={{ minHeight: 28, height: 28 }}
          onClick={() => setRuleSelectorOpen(true)}>
          {ruleCount} of {enabledRules.length} rules
        </Button>

        {/* ── Rule Selector Drawer (custom) ── */}
        {ruleSelectorOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setRuleSelectorOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.3)',
              }}
            />
            {/* Side Panel */}
            <div style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 400, maxWidth: '90vw', zIndex: 1001,
              background: 'var(--colorNeutralBackground1, #fff)',
              boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '14px 16px 8px',
                borderBottom: '1px solid var(--colorNeutralStroke2)',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Select Rules to Apply</div>
                  <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)', marginTop: 2 }}>
                    {filteredSelectedCount} of {filteredRules.length} selected
                  </div>
                </div>
                <Button size="small" appearance="transparent" icon={<DismissRegular />}
                  onClick={() => setRuleSelectorOpen(false)} />
              </div>

              {/* Category Tabs */}
              <TabList
                selectedValue={ruleCategoryFilter}
                onTabSelect={(_, d) => setRuleCategoryFilter(d.value as string)}
                style={{ padding: '6px 12px 0', borderBottom: '1px solid var(--colorNeutralStroke2)', flexShrink: 0 }}
              >
                <Tab value="all" style={{ fontSize: 12 }}>All ({enabledRules.length})</Tab>
                <Tab value="haystack" style={{ fontSize: 12 }}>Haystack ({haystackCount})</Tab>
                <Tab value="brick" style={{ fontSize: 12 }}>Brick ({brickCount})</Tab>
                <Tab value="range" style={{ fontSize: 12 }}>Range ({rangeCount})</Tab>
              </TabList>

              {/* Select All / Deselect All */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--colorNeutralStroke2)', flexShrink: 0 }}>
                <Button size="small" appearance="transparent"
                  onClick={toggleAllRules}
                  style={{ fontSize: 11, minHeight: 22, height: 22, color: '#0078d4' }}>
                  {isAllFilteredSelected
                    ? `Deselect ${ruleCategoryFilter === 'all' ? 'All' : `All ${ruleCategoryFilter}`}`
                    : `Select ${ruleCategoryFilter === 'all' ? 'All' : `All ${ruleCategoryFilter}`}`}
                </Button>
              </div>

              {/* Rule Checklist */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filteredRules.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--colorNeutralForeground3)', textAlign: 'center' }}>
                    No {ruleCategoryFilter !== 'all' ? ruleCategoryFilter : 'enabled'} rules.
                  </div>
                ) : (
                  filteredRules.map(r => {
                    const checked = selectedRuleIds.includes(r.id);
                    return (
                      <label key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                        cursor: 'pointer', fontSize: 12,
                        background: checked ? 'var(--colorNeutralBackground2)' : 'transparent',
                        borderBottom: '1px solid var(--colorNeutralStroke2)',
                      }}
                        onMouseDown={(e) => { e.preventDefault(); toggleRule(r.id); }}
                      >
                        <input type="checkbox" checked={checked} onChange={() => {}} style={{ margin: 0, accentColor: '#0078d4', flexShrink: 0 }} />
                        <Badge appearance="filled"
                          color={r.category === 'brick' ? 'important' : r.category === 'range' ? 'severe' : 'informative'}
                          size="small" style={{ fontSize: 10, flexShrink: 0 }}>
                          {r.category}
                        </Badge>
                        <span style={{ flex: 1 }}>{r.rule_name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

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
                <strong>Run auto-tagging</strong> using {ruleCount} of {enabledRules.length} rule{ruleCount !== 1 ? 's' : ''} on{' '}
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
        const sorted = [...previewData]
          .filter(m => {
            if (!previewFilter) return true;
            const q = previewFilter.toLowerCase();
            return (
              String(m.point.serial_number).includes(q) ||
              (m.point.point_type || '').toLowerCase().includes(q) ||
              String(m.point.point_index).includes(q) ||
              (m.point.label || '').toLowerCase().includes(q) ||
              (m.point.full_label || '').toLowerCase().includes(q) ||
              (m.matched_rule || '').toLowerCase().includes(q) ||
              (m.brick_class || '').toLowerCase().includes(q) ||
              m.haystack_tags.some(t => t.toLowerCase().includes(q))
            );
          })
          .sort((a, b) =>
            a.point.serial_number - b.point.serial_number
            || a.point.point_type.localeCompare(b.point.point_type)
            || a.point.point_index - b.point.point_index
          );
        return (
        <div className={styles.previewSection}>
          <div className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Preview Results ({sorted.length}{previewFilter ? ` of ${previewData.length}` : ''} matches)</span>
            <Input
              size="small"
              placeholder="Filter results…"
              value={previewFilter}
              onChange={(_, d) => setPreviewFilter(d.value)}
              contentAfter={previewFilter ? <DismissRegular style={{ fontSize: 12, cursor: 'pointer', color: '#888' }} onClick={() => setPreviewFilter('')} /> : undefined}
              style={{ width: 200, fontSize: 11 }}
            />
          </div>
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

export default AutoTaggingMcpPage;
