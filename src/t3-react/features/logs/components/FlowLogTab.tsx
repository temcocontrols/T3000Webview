/**
 * Flow Log Tab — two-panel layout
 *
 * Left:  type list (all flow types with counts and descriptions)
 * Right: search/filter header + paginated flow list with expandable step detail
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  makeStyles,
  mergeClasses,
  Button,
  Badge,
  Spinner,
  Select,
  Input,
  Tooltip,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ChevronRightRegular,
  ChevronDownRegular,
  InfoRegular,
  SearchRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const FLOWS_URL = `${API_BASE_URL}/api/flows`;
const TYPES_URL = `${API_BASE_URL}/api/flows/types`;

// ---------------------------------------------------------------------------
// Known flow-type descriptions
// ---------------------------------------------------------------------------

const FLOW_TYPE_DESC: Record<string, string> = {
  SYNC_CYCLE:     'Full device synchronization cycle — polls panels, writes data, updates trendlog.',
  DLL_INIT:       'DLL initialization on T3000 startup: DB connect, sampling state, config load.',
  REDISCOVER:     'Network rediscovery scan for new or changed devices.',
  TRENDLOG_SYNC:  'Trendlog configuration sync between local and center DB.',
  DB_MAINTENANCE: 'Database partition creation, WAL checkpoint and size monitoring.',
  API_FLOW:       'Client-initiated operation traced through the REST API.',
  SOCKET_FLOW:    'WebSocket session lifecycle and command dispatch.',
};

function flowTypeDescription(type: string): string {
  return FLOW_TYPE_DESC[type] ?? `Flow type: ${type}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlowRow {
  id: number;
  flow_id: string;
  flow_type: string;
  trigger_src: string;
  started_at: number;
  ended_at: number | null;
  status: string;
  hostname: string | null;
  total_steps: number;
  done_steps: number;
  error_count: number;
  meta: string | null;
  duration_ms: number | null;
}

interface FlowStepRow {
  id: number;
  flow_id: string;
  seq: number;
  step_name: string;
  level: string;
  source: string | null;
  api_path: string | null;
  action_type: number | null;
  status: string;
  duration_ms: number | null;
  payload_ref: string | null;
  message: string | null;
  details: string | null;
  ts_unix: number;
  ts_fmt: string;
}

interface FlowDetail {
  flow: FlowRow;
  steps: FlowStepRow[];
}

interface FlowTypeCount {
  flow_type: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<string, 'success' | 'danger' | 'warning' | 'informative' | 'subtle'> = {
  ok: 'success',
  error: 'danger',
  running: 'informative',
  skip: 'subtle',
  warning: 'warning',
};

const LEVEL_COLOR: Record<string, 'danger' | 'warning' | 'informative' | 'subtle'> = {
  error: 'danger',
  warn: 'warning',
  info: 'informative',
  debug: 'subtle',
};

function fmtMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  // ── Shell ──────────────────────────────────────────────────────────────────
  root: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: '10px',
    padding: '8px 10px',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  // ── Shared panel ──────────────────────────────────────────────────────────
  panel: {
    backgroundColor: '#ffffff',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    minHeight: 0,
  },
  panelHeader: {
    padding: '0 12px',
    minHeight: '36px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#e1e4e8',
    backgroundColor: '#f6f8fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    borderRadius: '8px 8px 0 0',
  },
  panelTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#24292f',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  panelBody: {
    padding: '6px 8px',
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c0bebe transparent',
  },
  // ── Left panel — type list ─────────────────────────────────────────────────
  typeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    ':hover': { backgroundColor: '#f6f8fa' },
  },
  typeItemActive: {
    backgroundColor: '#dff0ff',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: '#0f6cbd',
    paddingLeft: '5px',
  },
  typeName: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#24292f',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  typeNameActive: { color: '#0f6cbd', fontWeight: 600 },
  typeBadge:     { fontSize: '11px', flexShrink: 0 },
  typeInfoBtn: {
    flexShrink: 0,
    padding: 0,
    minWidth: 'unset',
    height: '16px',
    width: '16px',
    color: tokens.colorNeutralForeground3,
  },
  // ── Right panel toolbar ────────────────────────────────────────────────────
  rightToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#e1e4e8',
    backgroundColor: '#f6f8fa',
    flexShrink: 0,
  },
  searchInput: { flex: 1, maxWidth: '280px' },
  spacer:      { flex: 1 },
  // ── Flow list ─────────────────────────────────────────────────────────────
  flowList: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '6px 10px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c0bebe transparent',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100px',
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
  },
  // ── Flow card ─────────────────────────────────────────────────────────────
  flowCard: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e8e8e8',
    borderRadius: '4px',
    marginBottom: '5px',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  flowHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    cursor: 'pointer',
    userSelect: 'none',
    ':hover': { backgroundColor: '#f3f2f1' },
  },
  flowHeaderOpen: { backgroundColor: '#f0f6ff' },
  flowType:    { fontSize: '12px', fontWeight: 700, color: '#0f6cbd', minWidth: '100px', flexShrink: 0 },
  flowTrigger: { fontSize: '11px', color: tokens.colorNeutralForeground3, flexShrink: 0 },
  flowTime:    { fontSize: '11px', color: tokens.colorNeutralForeground3, flexShrink: 0 },
  flowDur:     { fontSize: '11.5px', fontWeight: 600, color: '#323130', flexShrink: 0 },
  flowSteps:   { fontSize: '11px', color: tokens.colorNeutralForeground3, flexShrink: 0 },
  spacerFlex:  { flex: 1 },
  chevron:     { fontSize: '12px', color: tokens.colorNeutralForeground3, flexShrink: 0 },
  // ── Step table ────────────────────────────────────────────────────────────
  stepsTable: {
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#edebe9',
    backgroundColor: '#faf9f8',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '5px 12px 5px 28px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#f3f2f1',
    fontSize: '11.5px',
    ':last-child': { borderBottom: 'none' },
  },
  stepSeq:    { minWidth: '28px', color: tokens.colorNeutralForeground3, flexShrink: 0, fontFamily: 'monospace' },
  stepName:   { minWidth: '120px', fontWeight: 600, color: '#201f1e', flexShrink: 0 },
  stepSource: { minWidth: '70px', color: tokens.colorNeutralForeground3, flexShrink: 0 },
  stepDur:    { minWidth: '60px', color: '#323130', flexShrink: 0 },
  stepMsg:    { flex: 1, color: '#323130', wordBreak: 'break-word' },
  stepDetails: {
    marginTop: '3px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    backgroundColor: '#f3f2f1',
    padding: '3px 6px',
    borderRadius: '2px',
  },
  stepTs: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
    fontSize: '10.5px',
    fontFamily: 'monospace',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px 6px 28px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
});

// ---------------------------------------------------------------------------
// Expanded-flow step panel
// ---------------------------------------------------------------------------

const FlowStepPanel: React.FC<{ flowId: string }> = ({ flowId }) => {
  const s = useStyles();
  const [detail, setDetail] = useState<FlowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // seq → loaded payload text (null = not loaded yet, string = loaded)
  const [payloads, setPayloads] = useState<Record<number, string>>({});
  const [payloadLoading, setPayloadLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${FLOWS_URL}/${encodeURIComponent(flowId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<FlowDetail>;
      })
      .then((data) => { if (!cancelled) { setDetail(data); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [flowId]);

  const loadPayload = async (seq: number) => {
    setPayloadLoading((p) => ({ ...p, [seq]: true }));
    try {
      const res = await fetch(`${FLOWS_URL}/${encodeURIComponent(flowId)}/payload/${seq}`);
      const text = await res.text();
      setPayloads((p) => ({ ...p, [seq]: res.ok ? text : `Error ${res.status}: ${text}` }));
    } catch (e) {
      setPayloads((p) => ({ ...p, [seq]: `Failed to load: ${String(e)}` }));
    } finally {
      setPayloadLoading((p) => ({ ...p, [seq]: false }));
    }
  };

  if (loading) return (
    <div className={s.loadingRow}><Spinner size="tiny" /> Loading steps…</div>
  );
  if (error) return (
    <div className={s.loadingRow} style={{ color: 'red' }}>Error: {error}</div>
  );
  if (!detail || detail.steps.length === 0) return (
    <div className={s.loadingRow}>No steps recorded yet.</div>
  );

  return (
    <div className={s.stepsTable}>
      {detail.steps.map((step) => (
        <div key={step.id} className={s.stepRow}>
          <span className={s.stepSeq}>#{step.seq}</span>
          <span className={s.stepName}>{step.step_name}</span>
          <span className={s.stepSource}>{step.source ?? '—'}</span>
          <span className={s.stepDur}>{fmtMs(step.duration_ms)}</span>
          <div className={s.stepMsg}>
            <Badge size="small" color={LEVEL_COLOR[step.level] ?? 'subtle'}>{step.level}</Badge>{' '}
            <Badge size="small" color={STATUS_COLOR[step.status] ?? 'subtle'}>{step.status}</Badge>{' '}
            {step.message}
            {step.details && (
              <div className={s.stepDetails}>{step.details}</div>
            )}
            {!step.details && step.payload_ref && (
              <div style={{ marginTop: '4px' }}>
                {payloads[step.seq] !== undefined ? (
                  <div className={s.stepDetails}>{payloads[step.seq]}</div>
                ) : (
                  <Button
                    size="small"
                    appearance="subtle"
                    style={{ fontSize: '11px', padding: '0 6px', height: '20px' }}
                    disabled={payloadLoading[step.seq]}
                    onClick={() => loadPayload(step.seq)}
                  >
                    {payloadLoading[step.seq] ? 'Loading…' : 'View detail file'}
                  </Button>
                )}
              </div>
            )}
          </div>
          <span className={s.stepTs}>{step.ts_fmt}</span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component — two-panel layout
// ---------------------------------------------------------------------------

export const FlowLogTab: React.FC = () => {
  const s = useStyles();

  const [flows, setFlows]               = useState<FlowRow[]>([]);
  const [types, setTypes]               = useState<FlowTypeCount[]>([]);
  const [loading, setLoading]           = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]             = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (selectedType) params.set('flow_type', selectedType);
      if (filterStatus) params.set('status', filterStatus);
      const [flowsRes, typesRes] = await Promise.all([
        fetch(`${FLOWS_URL}?${params}`).then((r) => r.json() as Promise<FlowRow[]>),
        fetch(TYPES_URL).then((r) => r.json() as Promise<FlowTypeCount[]>),
      ]);
      setFlows(Array.isArray(flowsRes) ? flowsRes : []);
      setTypes(Array.isArray(typesRes) ? typesRes : []);
    } catch (e) {
      console.error('FlowLogTab fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [selectedType, filterStatus]);

  useEffect(() => {
    loadFlows();
    const timer = window.setInterval(loadFlows, 15_000);
    return () => window.clearInterval(timer);
  }, [loadFlows]);

  const visibleFlows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flows;
    return flows.filter(
      (f) =>
        f.flow_type.toLowerCase().includes(q) ||
        f.trigger_src.toLowerCase().includes(q) ||
        f.status.toLowerCase().includes(q),
    );
  }, [flows, search]);

  const totalCount = types.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className={s.root}>
      {/* ── Left panel: type list ── */}
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <span className={s.panelTitle}>Types</span>
        </div>
        <div className={s.panelBody}>
          {/* All */}
          <div
            className={mergeClasses(s.typeItem, selectedType === '' && s.typeItemActive)}
            onClick={() => setSelectedType('')}
          >
            <span className={mergeClasses(s.typeName, selectedType === '' && s.typeNameActive)}>All</span>
            <Badge size="small" appearance="tint" color="informative" className={s.typeBadge}>{totalCount}</Badge>
          </div>

          {types.map((t) => (
            <div
              key={t.flow_type}
              className={mergeClasses(s.typeItem, selectedType === t.flow_type && s.typeItemActive)}
              onClick={() => setSelectedType(t.flow_type)}
            >
              <span className={mergeClasses(s.typeName, selectedType === t.flow_type && s.typeNameActive)}>
                {t.flow_type}
              </span>
              <Badge
                size="small"
                appearance="tint"
                color={selectedType === t.flow_type ? 'brand' : 'subtle'}
                className={s.typeBadge}
              >
                {t.count}
              </Badge>
              <Tooltip relationship="description" content={flowTypeDescription(t.flow_type)}>
                <Button
                  size="small"
                  appearance="subtle"
                  className={s.typeInfoBtn}
                  icon={<InfoRegular style={{ fontSize: '13px' }} />}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`About ${t.flow_type}`}
                />
              </Tooltip>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: search + flow list ── */}
      <div className={s.panel}>
        <div className={s.rightToolbar}>
          <Input
            size="small"
            className={s.searchInput}
            placeholder="Search type, trigger, status…"
            contentBefore={<SearchRegular style={{ fontSize: '14px', color: '#888' }} />}
            value={search}
            onChange={(_, d) => setSearch(d.value)}
          />
          <Select
            size="small"
            value={filterStatus}
            onChange={(_, d) => setFilterStatus(d.value)}
            style={{ minWidth: '110px' }}
          >
            <option value="">All status</option>
            <option value="running">Running</option>
            <option value="ok">OK</option>
            <option value="error">Error</option>
          </Select>
          <div className={s.spacer} />
          {loading && <Spinner size="tiny" />}
          <Button size="small" appearance="subtle" icon={<ArrowSyncRegular />} onClick={loadFlows}>
            Refresh
          </Button>
        </div>

        <div className={s.flowList}>
          {visibleFlows.length === 0 && !loading && (
            <div className={s.empty}>No flow runs found.</div>
          )}
          {visibleFlows.map((flow) => {
            const isOpen = expandedId === flow.flow_id;
            return (
              <div key={flow.flow_id} className={s.flowCard}>
                <div
                  className={mergeClasses(s.flowHeader, isOpen && s.flowHeaderOpen)}
                  onClick={() => setExpandedId((prev) => (prev === flow.flow_id ? null : flow.flow_id))}
                >
                  {isOpen ? <ChevronDownRegular className={s.chevron} /> : <ChevronRightRegular className={s.chevron} />}
                  <span className={s.flowType}>{flow.flow_type}</span>
                  <Badge size="small" color={STATUS_COLOR[flow.status] ?? 'subtle'}>{flow.status}</Badge>
                  <span className={s.flowTrigger}>{flow.trigger_src}</span>
                  <span className={s.flowTime}>{fmtTime(flow.started_at)}</span>
                  <span className={s.spacerFlex} />
                  <span className={s.flowSteps}>
                    {flow.done_steps}/{flow.total_steps > 0 ? flow.total_steps : '?'} steps
                    {flow.error_count > 0 && (
                      <Badge size="small" color="danger" style={{ marginLeft: '6px' }}>{flow.error_count} err</Badge>
                    )}
                  </span>
                  <span className={s.flowDur}>{fmtMs(flow.duration_ms)}</span>
                </div>
                {isOpen && <FlowStepPanel flowId={flow.flow_id} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
