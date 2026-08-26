import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Spinner, Button, Input, Field, Switch, Select, Textarea,
  Tab, TabList, Dialog, DialogSurface, DialogBody, DialogTitle,
  DialogContent, DialogActions, Badge,
  DataGrid, DataGridHeader, DataGridRow, DataGridCell, DataGridBody,
  createTableColumn, TableColumnDefinition,
  Popover, PopoverSurface, PopoverTrigger,
  Dropdown, Option, Tooltip,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular, AddRegular, DismissRegular,
  PlayRegular, CheckmarkCircleRegular, WarningRegular,
  DeleteRegular, EditRegular, SettingsRegular, ErrorCircleRegular,
  InfoRegular, DocumentSearchRegular, PersonQuestionMarkRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { fddApi, FddRule, AnalyzeResult, FddFinding } from '../services/fddApi';
import styles from './FddPage.module.css';

// ── Shared helpers ──

const RULE_KINDS: { value: string; label: string; params: Record<string, unknown> }[] = [
  { value: 'ThresholdAbove', label: 'Threshold Above', params: { field: '', limit: 100 } },
  { value: 'ThresholdBelow', label: 'Threshold Below', params: { field: '', limit: 0 } },
  { value: 'RangeBand', label: 'Range Band', params: { field: '', lo: 0, hi: 100 } },
  { value: 'StuckValue', label: 'Stuck / Frozen Value', params: { field: '', deadband: 0.1, window_rows: 12 } },
  { value: 'SupplyTempDeviation', label: 'Supply Temp Deviation', params: { max_dev: 5 } },
  { value: 'ChwLowDeltaT', label: 'Chilled Water Low ΔT', params: { min_dt: 5 } },
  { value: 'FanMismatch', label: 'Fan Command vs Status', params: {} },
  { value: 'EconomizerOaFraction', label: 'Economizer OA Fraction', params: { oa_min_pct: 15 } },
  { value: 'EconomizerStuckClosed', label: 'Economizer Stuck Closed', params: {} },
];

const SEVERITIES = ['info', 'warning', 'critical'] as const;

const sevColor = (s: string): 'informative' | 'warning' | 'danger' =>
  s === 'critical' ? 'danger' : s === 'warning' ? 'warning' : 'informative';

const sevBadgeClass = (s: string) =>
  s === 'critical' ? styles.sevCritical : s === 'warning' ? styles.sevWarning : styles.sevInfo;

// ── Page ──

const FddPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rules');

  return (
    <div className={styles.container}>
      <style>{'[role="tooltip"],[role="tooltip"] *{max-width:none!important;white-space:nowrap!important;width:auto!important}'}</style>

      <div className={styles.infoBar}>
        <div className={styles.infoBarLeft}>
          <ErrorCircleRegular className={styles.infoIcon} />
          <div className={styles.infoText}>
            <div className={styles.infoTitle}>Fault Detection &amp; Diagnostics</div>
            <div className={styles.infoDesc}>
              Rules + engine evaluate trendlog history against Haystack/Brick roles to surface
              equipment faults. Findings are persisted when an analysis detects fault hours.
            </div>
          </div>
        </div>
      </div>

      <TabList selectedValue={activeTab} onTabSelect={(_, d) => setActiveTab(d.value as string)}>
        <Tab value="rules" icon={<SettingsRegular />}><span style={{ fontSize: 13 }}>FDD Rules</span></Tab>
        <Tab value="analysis" icon={<PlayRegular />}><span style={{ fontSize: 13 }}>Analysis</span></Tab>
        <Tab value="findings" icon={<DocumentSearchRegular />}><span style={{ fontSize: 13 }}>Findings</span></Tab>
      </TabList>

      <div className={styles.tabContent}>
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'analysis' && <AnalysisTab />}
        {activeTab === 'findings' && <FindingsTab />}
      </div>
    </div>
  );
};

// ═══ Rules Tab ═══

const RulesTab: React.FC = () => {
  const [rules, setRules] = useState<FddRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialog, setDialog] = useState<{ open: boolean; editing: FddRule | null }>({ open: false, editing: null });
  const [deleteTarget, setDeleteTarget] = useState<FddRule | null>(null);

  useEffect(() => {
    if (msg) { const t = setTimeout(() => setMsg(null), 3000); return () => clearTimeout(t); }
  }, [msg]);

  const fetchRules = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fddApi.listRules();
      setRules(data.rules || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleToggle = async (rule: FddRule) => {
    try {
      await fddApi.toggleRule(rule.rule_id, !rule.enabled);
      await fetchRules();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fddApi.deleteRule(deleteTarget.rule_id);
      setDeleteTarget(null);
      setMsg(`Rule "${deleteTarget.rule_name}" deleted.`);
      await fetchRules();
    } catch (e: any) { setError(e.message); }
  };

  const categories = useMemo(() => {
    const s = new Set<string>();
    rules.forEach(r => { if (r.category) s.add(r.category); });
    return Array.from(s).sort();
  }, [rules]);

  const filtered = useMemo(() => rules.filter(r =>
    (categoryFilter === 'all' || r.category === categoryFilter) &&
    (!filter ||
      r.rule_id.toLowerCase().includes(filter.toLowerCase()) ||
      r.rule_name.toLowerCase().includes(filter.toLowerCase()) ||
      r.rule_kind.toLowerCase().includes(filter.toLowerCase()) ||
      r.required_roles.some(role => role.toLowerCase().includes(filter.toLowerCase())))
  ), [rules, categoryFilter, filter]);

  const columns: TableColumnDefinition<FddRule>[] = [
    createTableColumn({ columnId: 'rule', renderHeaderCell: () => 'Rule', renderCell: (r) => (
      <div className={styles.ruleCell}>
        <div className={styles.ruleNameLine}>
          <Badge appearance="filled" color={sevColor(r.severity)} className={sevBadgeClass(r.severity)} size="small">
            {r.category || 'fdd'}
          </Badge>
          <span className={styles.ruleName}>{r.rule_name}</span>
        </div>
        <span className={styles.ruleId}>{r.rule_id}</span>
        {r.description && <span className={styles.descCell}>{r.description}</span>}
      </div>
    ) }),
    createTableColumn({ columnId: 'kind', renderHeaderCell: () => 'Kind', renderCell: (r) => (
      <Tooltip content={r.rule_kind} relationship="label" positioning="above-start">
        <span className={styles.kindCell}>{r.rule_kind}</span>
      </Tooltip>
    ) }),
    createTableColumn({ columnId: 'roles', renderHeaderCell: () => 'Required Roles', renderCell: (r) => (
      <div className={styles.rolesCell}>
        {r.required_roles.length ? r.required_roles.map((role, i) => (
          <span key={i} className={styles.roleTag}>{role}</span>
        )) : <span style={{ color: '#999' }}>—</span>}
      </div>
    ) }),
    createTableColumn({ columnId: 'severity', renderHeaderCell: () => 'Severity', renderCell: (r) => (
      <Badge appearance="filled" color={sevColor(r.severity)} className={sevBadgeClass(r.severity)} size="small">
        {r.severity}
      </Badge>
    ) }),
    createTableColumn({ columnId: 'enabled', renderHeaderCell: () => 'Enabled', renderCell: (r) => (
      <Switch checked={r.enabled} onChange={() => handleToggle(r)} className={styles.switchScale} />
    ) }),
    createTableColumn({ columnId: 'actions', renderHeaderCell: () => '', renderCell: (r) => {
      const isDeleteOpen = deleteTarget?.rule_id === r.rule_id;
      return (
        <div className={styles.actionsCell}>
          <Tooltip content="Edit rule" relationship="label">
            <Button
              size="small" icon={<EditRegular style={{ fontSize: 16 }} />}
              appearance="subtle"
              onClick={() => setDialog({ open: true, editing: r })}
            />
          </Tooltip>
          <Popover
            open={isDeleteOpen}
            onOpenChange={(_, d) => { if (!d.open) setDeleteTarget(null); }}
            positioning="above-start"
          >
            <PopoverTrigger disableButtonEnhancement>
              <Button
                size="small" icon={<DeleteRegular style={{ fontSize: 16 }} />}
                appearance="subtle"
                onClick={() => setDeleteTarget(r)}
              />
            </PopoverTrigger>
            <PopoverSurface style={{ maxWidth: 320, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Delete rule "{r.rule_name}"?
              </div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: 8 }}>
                This action cannot be undone. Any persisted findings for this rule will also be removed.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button size="small" appearance="primary" style={{ background: '#d32f2f' }} onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </PopoverSurface>
          </Popover>
        </div>
      );
    }}),
  ];

  return (
    <div className={styles.rulesLayout}>
      <div className={styles.runHint} style={{ display: 'block', marginBottom: 4 }}>
        <InfoRegular style={{ fontSize: 13, verticalAlign: 'text-bottom', marginRight: 4 }} />
        FDD rules define the conditions the engine checks over trendlog history. Rules only run when all of
        their required roles are present on the device (from Haystack/Brick tags).
      </div>

      <div className={styles.rulesTop}>
        <Select
          size="small"
          value={categoryFilter}
          onChange={(_, d) => setCategoryFilter(d.value)}
          className={styles.typeDropdown}
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
        <Button icon={<AddRegular style={{ fontSize: 14 }} />} onClick={() => setDialog({ open: true, editing: null })} size="small">
          New Rule
        </Button>
        <span className={styles.count}>{filtered.length} rules</span>
      </div>

      {error && <div className={styles.errorBanner}><WarningRegular /> {error}</div>}
      {msg && <div className={styles.successBanner}><CheckmarkCircleRegular /> {msg}</div>}

      <div className={styles.rulesBottom}>
        {loading ? (
          <Spinner size="tiny" label="Loading rules…" className={styles.loadingSpinner} />
        ) : (
          <DataGrid items={filtered} columns={columns} sortable className={styles.dataGrid}>
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridCell>{renderHeaderCell()}</DataGridCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<FddRule>>
              {({ item, rowId }) => (
                <DataGridRow<FddRule> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        )}
      </div>

      {dialog.open && (
        <RuleDialog
          editing={dialog.editing}
          onClose={() => setDialog({ open: false, editing: null })}
          onSaved={(m) => { setDialog({ open: false, editing: null }); setMsg(m); fetchRules(); }}
        />
      )}
    </div>
  );
};

// ── Rule Create/Edit Dialog ──

const RuleDialog: React.FC<{
  editing: FddRule | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ editing, onClose, onSaved }) => {
  const [ruleId, setRuleId] = useState(editing?.rule_id || '');
  const [ruleName, setRuleName] = useState(editing?.rule_name || '');
  const [category, setCategory] = useState(editing?.category || 'custom');
  const [description, setDescription] = useState(editing?.description || '');
  const [ruleKind, setRuleKind] = useState(editing?.rule_kind || 'ThresholdAbove');
  const [requiredRoles, setRequiredRoles] = useState(editing?.required_roles.join(', ') || '');
  const [severity, setSeverity] = useState<string>(editing?.severity || 'warning');
  const [enabled, setEnabled] = useState(editing?.enabled ?? true);
  const [paramsText, setParamsText] = useState(() => {
    if (editing) return JSON.stringify(editing.params || {}, null, 2);
    const kind = RULE_KINDS.find(k => k.value === 'ThresholdAbove');
    return JSON.stringify({ confirm_rows: 4, poll_seconds: 300, ...(kind?.params || {}) }, null, 2);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onKindChange = (kind: string) => {
    setRuleKind(kind);
    if (!editing) {
      const found = RULE_KINDS.find(k => k.value === kind);
      setParamsText(JSON.stringify({ confirm_rows: 4, poll_seconds: 300, ...(found?.params || {}) }, null, 2));
    }
  };

  const handleSave = async () => {
    if (!ruleId.trim() || !ruleName.trim()) { setError('Rule ID and Rule Name are required.'); return; }
    let params: Record<string, unknown>;
    try {
      params = JSON.parse(paramsText || '{}');
    } catch {
      setError('Params must be valid JSON.');
      return;
    }
    setSaving(true); setError(null);
    try {
      if (editing) {
        await fddApi.updateRule(editing.rule_id, {
          ruleName, category, description, ruleKind,
          requiredRoles: requiredRoles.split(',').map(s => s.trim()).filter(Boolean),
          severity, enabled, params,
        });
        onSaved(`Rule "${ruleName}" updated.`);
      } else {
        await fddApi.createRule({
          ruleId: ruleId.trim(), ruleName, category, description,
          ruleKind,
          requiredRoles: requiredRoles.split(',').map(s => s.trim()).filter(Boolean),
          severity, enabled, params,
        });
        onSaved(`Rule "${ruleName}" created.`);
      }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogSurface style={{ maxWidth: 640 }}>
        <DialogBody>
          <DialogTitle style={{ fontSize: 14 }}>{editing ? `Edit Rule — ${editing.rule_id}` : 'Create Rule'}</DialogTitle>
          <DialogContent>
            {error && <div className={styles.errorBanner} style={{ marginBottom: 12 }}><WarningRegular /> {error}</div>}
            <div className={styles.formGrid}>
              <Field label="Rule ID" required size="small">
                <Input
                  size="small" value={ruleId}
                  onChange={(_, d) => setRuleId(d.value)}
                  placeholder="e.g. CUSTOM-1"
                  disabled={!!editing}
                />
              </Field>
              <Field label="Rule Name" required size="small">
                <Input size="small" value={ruleName} onChange={(_, d) => setRuleName(d.value)} placeholder="e.g. Supply air temp high" />
              </Field>
              <Field label="Category" size="small">
                <Input size="small" value={category} onChange={(_, d) => setCategory(d.value)} placeholder="e.g. custom, economizer, sensor" />
              </Field>
              <Field label="Severity" size="small">
                <Select size="small" value={severity} onChange={(_, d) => setSeverity(d.value)}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Rule Kind" size="small">
                <Select size="small" value={ruleKind} onChange={(_, d) => onKindChange(d.value)}>
                  {RULE_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </Select>
              </Field>
              <Field label="Required Roles (comma-separated)" size="small">
                <Input
                  size="small" value={requiredRoles}
                  onChange={(_, d) => setRequiredRoles(d.value)}
                  placeholder="e.g. sat, sat_sp, fan_cmd, fan_status"
                />
              </Field>
              <Field label="Description" size="small" className={styles.paramsField}>
                <Input size="small" value={description} onChange={(_, d) => setDescription(d.value)} placeholder="Optional — what this rule detects" />
              </Field>
              <Field label="Params (JSON)" size="small" className={styles.paramsField}>
                <Textarea
                  value={paramsText}
                  onChange={(_, d) => setParamsText(d.value)}
                  className={styles.paramsField}
                  style={{ fontFamily: 'Cascadia Code, Consolas, monospace', fontSize: 11, minHeight: 88 }}
                />
              </Field>
              <Field label="Enabled" size="small">
                <Switch checked={enabled} onChange={(_, d) => setEnabled(!!d.checked)} />
              </Field>
            </div>
          </DialogContent>
          <DialogActions style={{ marginTop: 8 }}>
            <Button appearance="secondary" onClick={onClose} size="small" style={{ fontSize: 12 }}>Cancel</Button>
            <Button appearance="primary" onClick={handleSave} disabled={saving} size="small" style={{ fontSize: 12 }}>
              {saving ? <Spinner size="tiny" /> : editing ? 'Save' : 'Create'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

// ═══ Analysis Tab ═══

const AnalysisTab: React.FC = () => {
  const { devices } = useDeviceTreeStore();
  const allDevices = useMemo(
    () => devices.filter(d => d.productName && d.productName !== 'Unknown' && d.productName !== '(Unknown)'),
    [devices]
  );

  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [equipment, setEquipment] = useState('');
  const [rangeHours, setRangeHours] = useState('24');
  const [rules, setRules] = useState<FddRule[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [ruleSelectorOpen, setRuleSelectorOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<AnalyzeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fddApi.listRules()
      .then(d => {
        const all = d.rules || [];
        setRules(all);
        setSelectedRuleIds(all.filter(r => r.enabled).map(r => r.rule_id));
      })
      .catch(() => {});
  }, []);

  const enabledRules = rules.filter(r => r.enabled);
  const allSerials = allDevices.map(d => String(d.serialNumber));
  const effectiveSerials = selectAll ? allSerials : selectedSerials;
  const serials = effectiveSerials.map(Number).filter(n => !isNaN(n));

  const handleRun = async () => {
    if (serials.length === 0) { setError('No devices selected'); return; }
    setRunning(true); setError(null); setResults(null);
    const collected: AnalyzeResult[] = [];
    try {
      for (const serial of serials) {
        collected.push(await fddApi.analyze(serial, equipment.trim(), Number(rangeHours) || 24, selectedRuleIds));
      }
      setResults(collected);
    } catch (e: any) { setError(e.message); }
    finally { setRunning(false); }
  };

  const toggleRule = (id: string) => {
    setSelectedRuleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const rFaults = (r: AnalyzeResult) => r.findings.filter(f => f.status === 'ok' && f.fault_hours > 0).length;
  const rOk = (r: AnalyzeResult) => r.findings.filter(f => f.status === 'ok' && f.fault_hours === 0).length;
  const rMissing = (r: AnalyzeResult) => r.findings.filter(f => f.status === 'insufficient_roles').length;

  const renderFindings = (r: AnalyzeResult) => (
    <div key={r.device} style={{ marginBottom: 16 }}>
      <div className={styles.analysisSummary}>
        <span className={styles.summaryItem}><strong>Device</strong> {r.device}</span>
        {r.equipment && <span className={styles.summaryItem}><strong>Equipment</strong> {r.equipment}</span>}
        <span className={styles.summaryItem}><strong>Range</strong> {r.range_hours} h</span>
        <span className={styles.summaryItem}><strong>Samples</strong> {r.sample_count}</span>
        <span className={styles.summaryItem}><strong>Roles found</strong> {r.roles_found.length}</span>
        <span className={styles.summaryItem} style={{ color: rFaults(r) ? '#a4262c' : '#107c10' }}>
          <strong>{rFaults(r)}</strong> fault{rFaults(r) !== 1 ? 's' : ''} · {rOk(r)} ok · {rMissing(r)} skipped
        </span>
      </div>
      <div className={styles.findingsList}>
        {r.findings.map(f => {
          const isFault = f.status === 'ok' && f.fault_hours > 0;
          return (
            <div key={f.rule_id} className={`${styles.findingCard} ${!isFault ? styles.okFinding : ''}`}>
              <div className={styles.findingCardHeader}>
                <Badge appearance="filled" color={sevColor(f.severity)} className={sevBadgeClass(f.severity)} size="small">
                  {f.severity}
                </Badge>
                <span className={styles.findingTitle}>{f.rule_name}</span>
                <span className={styles.findingRuleId}>{f.rule_id}</span>
                {f.status === 'insufficient_roles' && (
                  <span className={styles.insufficientRole}>
                    <PersonQuestionMarkRegular style={{ fontSize: 13 }} />
                    missing: {f.missing_roles?.join(', ')}
                  </span>
                )}
              </div>
              <div className={styles.findingBody}>
                {f.status === 'insufficient_roles'
                  ? 'Rule skipped — required roles not found on this device.'
                  : isFault
                    ? <><strong>{f.fault_hours.toFixed(2)} h</strong> of fault detected in range.</>
                    : 'No fault detected in range.'}
                {f.suggestion && isFault && <div style={{ marginTop: 4, color: '#555' }}>💡 {f.suggestion}</div>}
              </div>
              {isFault && f.evidence && Object.keys(f.evidence).length > 0 && (
                <pre className={styles.evidenceCode}>{JSON.stringify(f.evidence, null, 2)}</pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <div className={styles.runHint}>
        <InfoRegular style={{ fontSize: 13 }} />
        Select one or more devices and run analysis over their trendlog history. Findings with fault hours are persisted
        to the Findings tab.
      </div>

      <div className={styles.runRow}>
        <div>
          <div className={styles.fieldLabel}>Devices</div>
          <Dropdown
            size="small"
            multiselect
            className={styles.runDropdown}
            open
            positioning={{ position: 'below', align: 'start', fallbackPositions: ['above'] }}
            listbox={{ style: { maxHeight: 260, overflowY: 'auto' } }}
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
        </div>
        <div>
          <div className={styles.fieldLabel}>Equipment (optional)</div>
          <Input
            size="small" value={equipment}
            onChange={(_, d) => setEquipment(d.value)}
            placeholder="e.g. AHU-1"
            style={{ width: 180 }}
          />
        </div>
        <div>
          <div className={styles.fieldLabel}>Range</div>
          <Select size="small" value={rangeHours} onChange={(_, d) => setRangeHours(d.value)} className={styles.rangeSelect}>
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="72">72 hours</option>
            <option value="168">7 days</option>
            <option value="720">30 days</option>
          </Select>
        </div>
        <div>
          <div className={styles.fieldLabel}>Rules</div>
          <Button
            size="small" icon={<SettingsRegular style={{ fontSize: 14 }} />}
            style={{ minHeight: 28, height: 28 }}
            onClick={() => setRuleSelectorOpen(true)}
          >
            {selectedRuleIds.length} of {enabledRules.length} enabled
          </Button>
        </div>
        <div className={styles.runActions}>
          <Button appearance="primary" icon={<PlayRegular style={{ fontSize: 14 }} />}
            onClick={handleRun} disabled={running || serials.length === 0} size="small">
            {running ? 'Analyzing…' : 'Run Analysis'}
          </Button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}><WarningRegular /> {error}</div>}

      {results && results.length > 0 && (
        <div className={styles.analysisResult}>
          {results.map(r => renderFindings(r))}
        </div>
      )}

      {/* ── Rule Selector Drawer ── */}
      {ruleSelectorOpen && (
        <>
          <div onClick={() => setRuleSelectorOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.3)' }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 360, maxWidth: '90vw', zIndex: 1001,
            background: 'var(--colorNeutralBackground1, #fff)', boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              padding: '14px 16px 8px', borderBottom: '1px solid var(--colorNeutralStroke2)', flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Rules to Run</div>
                <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)', marginTop: 2 }}>
                  {selectedRuleIds.length} of {enabledRules.length} enabled rules selected
                </div>
              </div>
              <Button size="small" appearance="transparent" icon={<DismissRegular />} onClick={() => setRuleSelectorOpen(false)} />
            </div>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--colorNeutralStroke2)', flexShrink: 0 }}>
              <Button size="small" appearance="transparent"
                onClick={() => {
                  if (selectedRuleIds.length === enabledRules.length) setSelectedRuleIds([]);
                  else setSelectedRuleIds(enabledRules.map(r => r.rule_id));
                }}
                style={{ fontSize: 11, minHeight: 22, height: 22, color: '#0078d4' }}>
                {selectedRuleIds.length === enabledRules.length ? 'Deselect All' : 'Select All Enabled'}
              </Button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {enabledRules.length === 0 ? (
                <div style={{ padding: '16px', fontSize: 12, color: 'var(--colorNeutralForeground3)', textAlign: 'center' }}>
                  No enabled rules.
                </div>
              ) : (
                enabledRules.map(r => {
                  const checked = selectedRuleIds.includes(r.rule_id);
                  return (
                    <label key={r.rule_id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                      cursor: 'pointer', fontSize: 12,
                      background: checked ? 'var(--colorNeutralBackground2)' : 'transparent',
                      borderBottom: '1px solid var(--colorNeutralStroke2)',
                    }} onMouseDown={(e) => { e.preventDefault(); toggleRule(r.rule_id); }}>
                      <input type="checkbox" checked={checked} onChange={() => {}} style={{ margin: 0, accentColor: '#0078d4', flexShrink: 0 }} />
                      <Badge appearance="filled" color={sevColor(r.severity)} className={sevBadgeClass(r.severity)} size="small">{r.severity}</Badge>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rule_name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--colorNeutralForeground3)', flexShrink: 0 }}>{r.rule_id}</span>
                    </label>
                  );
                })
              )}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid var(--colorNeutralStroke2)', flexShrink: 0 }}>
              <Button appearance="primary" size="small" style={{ width: '100%' }} onClick={() => setRuleSelectorOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ═══ Findings Tab ═══

const FindingsTab: React.FC = () => {
  const [findings, setFindings] = useState<FddFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState('all');
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (msg) { const t = setTimeout(() => setMsg(null), 3000); return () => clearTimeout(t); }
  }, [msg]);

  const fetchFindings = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fddApi.listFindings({ limit: 200 });
      setFindings(data.findings || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFindings(); }, [fetchFindings]);

  const handleClear = async () => {
    setClearOpen(false); setClearing(true);
    try {
      const data = await fddApi.clearFindings();
      setMsg(`Cleared ${data.count} finding${data.count !== 1 ? 's' : ''}.`);
      setFindings([]);
    } catch (e: any) { setError(e.message); }
    finally { setClearing(false); }
  };

  const filtered = sevFilter === 'all' ? findings : findings.filter(f => f.severity === sevFilter);

  const columns: TableColumnDefinition<FddFinding>[] = [
    createTableColumn({ columnId: 'device', renderHeaderCell: () => 'Device', renderCell: (f) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{f.device_serial}</div>
        {f.equipment && <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)' }}>{f.equipment}</div>}
      </div>
    ) }),
    createTableColumn({ columnId: 'rule', renderHeaderCell: () => 'Rule', renderCell: (f) => (
      <div>
        <div style={{ fontSize: 12 }}>{f.rule_name || f.rule_id}</div>
        <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)', fontFamily: 'Cascadia Code, Consolas, monospace' }}>{f.rule_id}</div>
      </div>
    ) }),
    createTableColumn({ columnId: 'severity', renderHeaderCell: () => 'Severity', renderCell: (f) => (
      <Badge appearance="filled" color={sevColor(f.severity)} className={sevBadgeClass(f.severity)} size="small">{f.severity}</Badge>
    ) }),
    createTableColumn({ columnId: 'hours', renderHeaderCell: () => 'Fault Hours', renderCell: (f) => (
      <span style={{ fontWeight: f.fault_hours > 0 ? 600 : 400, color: f.fault_hours > 0 ? '#a4262c' : undefined }}>
        {f.fault_hours.toFixed(2)} h
      </span>
    ) }),
    createTableColumn({ columnId: 'evidence', renderHeaderCell: () => 'Evidence', renderCell: (f) => (
      <Tooltip content={<pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11 }}>{f.evidence ? JSON.stringify(f.evidence, null, 2) : '—'}</pre>} relationship="label" positioning="above-start">
        <span className={styles.evidenceInline}>{f.evidence ? JSON.stringify(f.evidence) : '—'}</span>
      </Tooltip>
    ) }),
    createTableColumn({ columnId: 'created', renderHeaderCell: () => 'Detected At', renderCell: (f) => (
      <span style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)' }}>{f.created_at}</span>
    ) }),
  ];

  return (
    <div className={styles.findingsLayout}>
      <div className={styles.runHint} style={{ display: 'block', marginBottom: 4 }}>
        <InfoRegular style={{ fontSize: 13, verticalAlign: 'text-bottom', marginRight: 4 }} />
        Persisted findings from past analyses. Each row is a detected fault with its recorded fault hours.
      </div>

      <div className={styles.findingsTop}>
        <Select size="small" value={sevFilter} onChange={(_, d) => setSevFilter(d.value)} className={styles.sevDropdown}>
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </Select>
        <Button icon={<ArrowClockwiseRegular style={{ fontSize: 14 }} />} onClick={fetchFindings} size="small">Refresh</Button>
        <Popover open={clearOpen} onOpenChange={(_, d) => setClearOpen(d.open)} positioning="above-end">
          <PopoverTrigger disableButtonEnhancement>
            <Button icon={<DeleteRegular style={{ fontSize: 14 }} />} size="small" disabled={clearing || findings.length === 0}>
              Clear Findings
            </Button>
          </PopoverTrigger>
          <PopoverSurface style={{ maxWidth: 320, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Clear all {findings.length} finding{findings.length !== 1 ? 's' : ''}?
            </div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: 14 }}>
              This removes the persisted findings history. It does not affect the rules or future analyses.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => setClearOpen(false)}>Cancel</Button>
              <Button size="small" appearance="primary" style={{ background: '#d32f2f' }} onClick={handleClear} disabled={clearing}>
                {clearing ? 'Clearing…' : 'Clear'}
              </Button>
            </div>
          </PopoverSurface>
        </Popover>
        <span className={styles.count}>{filtered.length} findings</span>
      </div>

      {error && <div className={styles.errorBanner}><WarningRegular /> {error}</div>}
      {msg && <div className={styles.successBanner}><CheckmarkCircleRegular /> {msg}</div>}

      <div className={styles.findingsBottom}>
        {loading ? (
          <Spinner size="tiny" label="Loading findings…" className={styles.loadingSpinner} />
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {findings.length === 0
              ? 'No findings yet. Run an analysis to generate findings.'
              : 'No findings match the selected severity.'}
          </div>
        ) : (
          <DataGrid items={filtered} columns={columns} sortable className={styles.dataGrid}>
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridCell>{renderHeaderCell()}</DataGridCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<FddFinding>>
              {({ item, rowId }) => (
                <DataGridRow<FddFinding> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        )}
      </div>
    </div>
  );
};

export default FddPage;
