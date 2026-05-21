/**
 * Flow Log Tab
 *
 * Reads from GET /api/flows — shows a list of flow runs with expandable step detail.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  mergeClasses,
  Button,
  Badge,
  Spinner,
  Select,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ChevronRightRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const FLOWS_URL = `${API_BASE_URL}/api/flows`;
const TYPES_URL = `${API_BASE_URL}/api/flows/types`;

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
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#edebe9',
    backgroundColor: '#ffffff',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  toolbarLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    marginRight: '2px',
  },
  spacer: { flex: 1 },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 14px',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '120px',
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
  },
  flowCard: {
    border: '1px solid #edebe9',
    borderRadius: '4px',
    marginBottom: '6px',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  flowHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': { backgroundColor: '#f3f2f1' },
  },
  flowHeaderOpen: {
    backgroundColor: '#f0f6ff',
  },
  flowType: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0f6cbd',
    minWidth: '110px',
    flexShrink: 0,
  },
  flowTrigger: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  flowTime: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  flowDur: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#323130',
    flexShrink: 0,
  },
  flowSteps: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  spacerFlex: { flex: 1 },
  chevron: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
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
    '&:last-child': { borderBottom: 'none' },
  },
  stepSeq: {
    minWidth: '28px',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
    fontFamily: 'monospace',
  },
  stepName: {
    minWidth: '120px',
    fontWeight: 600,
    color: '#201f1e',
    flexShrink: 0,
  },
  stepSource: {
    minWidth: '70px',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  stepDur: {
    minWidth: '60px',
    color: '#323130',
    flexShrink: 0,
  },
  stepMsg: {
    flex: 1,
    color: '#323130',
    wordBreak: 'break-word',
  },
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
            <Badge size="small" color={LEVEL_COLOR[step.level] ?? 'subtle'}>
              {step.level}
            </Badge>{' '}
            <Badge size="small" color={STATUS_COLOR[step.status] ?? 'subtle'}>
              {step.status}
            </Badge>{' '}
            {step.message}
            {/* inline details (small payloads stored directly in DB) */}
            {step.details && (
              <div className={s.stepDetails}>{step.details}</div>
            )}
            {/* large payload offloaded to file — show a load button */}
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
                    {payloadLoading[step.seq] ? 'Loading…' : 'View payload'}
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
// Main component
// ---------------------------------------------------------------------------

export const FlowLogTab: React.FC = () => {
  const s = useStyles();
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [types, setTypes] = useState<FlowTypeCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterType) params.set('flow_type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      const [flowsRes, typesRes] = await Promise.all([
        fetch(`${FLOWS_URL}?${params}`).then((r) => r.json() as Promise<FlowRow[]>),
        fetch(TYPES_URL).then((r) => r.json() as Promise<FlowTypeCount[]>),
      ]);
      setFlows(flowsRes);
      setTypes(typesRes);
    } catch (e) {
      console.error('FlowLogTab: fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    loadFlows();
    const timer = window.setInterval(loadFlows, 15000);
    return () => window.clearInterval(timer);
  }, [loadFlows]);

  const toggleExpand = (flowId: string) => {
    setExpandedId((prev) => (prev === flowId ? null : flowId));
  };

  return (
    <div className={s.root}>
      {/* Toolbar */}
      <div className={s.toolbar}>
        <span className={s.toolbarLabel}>Type:</span>
        <Select
          size="small"
          value={filterType}
          onChange={(_, d) => setFilterType(d.value)}
          style={{ minWidth: '140px' }}
        >
          <option value="">All</option>
          {types.map((t) => (
            <option key={t.flow_type} value={t.flow_type}>
              {t.flow_type} ({t.count})
            </option>
          ))}
        </Select>

        <span className={s.toolbarLabel}>Status:</span>
        <Select
          size="small"
          value={filterStatus}
          onChange={(_, d) => setFilterStatus(d.value)}
          style={{ minWidth: '110px' }}
        >
          <option value="">All</option>
          <option value="running">Running</option>
          <option value="ok">OK</option>
          <option value="error">Error</option>
        </Select>

        <div className={s.spacer} />

        {loading && <Spinner size="tiny" />}

        <Button
          size="small"
          appearance="subtle"
          icon={<ArrowSyncRegular />}
          onClick={loadFlows}
        >
          Refresh
        </Button>
      </div>

      {/* Flow list */}
      <div className={s.body}>
        {flows.length === 0 && !loading && (
          <div className={s.empty}>No flow runs found.</div>
        )}
        {flows.map((flow) => {
          const isOpen = expandedId === flow.flow_id;
          return (
            <div key={flow.flow_id} className={s.flowCard}>
              <div
                className={mergeClasses(s.flowHeader, isOpen && s.flowHeaderOpen)}
                onClick={() => toggleExpand(flow.flow_id)}
              >
                {isOpen
                  ? <ChevronDownRegular className={s.chevron} />
                  : <ChevronRightRegular className={s.chevron} />
                }
                <span className={s.flowType}>{flow.flow_type}</span>
                <Badge
                  size="small"
                  color={STATUS_COLOR[flow.status] ?? 'subtle'}
                >
                  {flow.status}
                </Badge>
                <span className={s.flowTrigger}>{flow.trigger_src}</span>
                <span className={s.flowTime}>{fmtTime(flow.started_at)}</span>
                <span className={s.spacerFlex} />
                <span className={s.flowSteps}>
                  {flow.done_steps}/{flow.total_steps > 0 ? flow.total_steps : '?'} steps
                  {flow.error_count > 0 && (
                    <Badge size="small" color="danger" style={{ marginLeft: '6px' }}>
                      {flow.error_count} err
                    </Badge>
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
  );
};
