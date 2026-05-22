/**
 * Flow Log Tab — 3-panel layout
 *
 * Left (220px):  Type list with info tooltips
 * Middle (1fr):  Paginated flow table (server-side, like ActivityLogTab)
 * Right (320px): Detail panel — flow summary + step list (shown on row click)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  mergeClasses,
  Text,
  Button,
  Badge,
  Spinner,
  Select,
  Input,
  Tooltip,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  InfoRegular,
  SearchRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const FLOWS_URL = `${API_BASE_URL}/api/flows`;
const TYPES_URL = `${API_BASE_URL}/api/flows/types`;

// ---------------------------------------------------------------------------
// Known flow-type descriptions
// ---------------------------------------------------------------------------

const FLOW_TYPE_DESC: Record<string, string> = {
  SYNC_CYCLE:        'Full device sync cycle — polls panels, writes data to center DB.',
  DLL_INIT:          'DLL init on T3000 startup: DB connect, sampling state, config load.',
  REDISCOVER:        'Network rediscovery scan for new or changed devices.',
  TRENDLOG_SYNC:     'Trendlog config sync between local and center DB.',
  TRENDLOG_SYNC_ALL: 'Full trendlog sync for all devices.',
  DB_MAINTENANCE:    'Database partition creation, WAL checkpoint and size monitoring.',
  API_FLOW:          'Client-initiated REST API operation trace.',
  SOCKET_FLOW:       'WebSocket session lifecycle and command dispatch.',
};

function flowTypeDescription(type: string): string {
  return FLOW_TYPE_DESC[type] ?? `Flow type: ${type}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlowRow {
  id: number; flow_id: string; flow_type: string; trigger_src: string;
  started_at: number; ended_at: number | null; status: string; hostname: string | null;
  total_steps: number; done_steps: number; error_count: number; meta: string | null;
  duration_ms: number | null;
}
interface FlowStepRow {
  id: number; flow_id: string; seq: number; step_name: string; level: string;
  source: string | null; api_path: string | null; action_type: number | null;
  status: string; duration_ms: number | null; payload_ref: string | null;
  message: string | null; details: string | null; ts_unix: number; ts_fmt: string;
}
interface FlowDetail { flow: FlowRow; steps: FlowStepRow[]; }
interface FlowTypeCount { flow_type: string; count: number; }
interface FlowListResponse {
  flows: FlowRow[]; total: number; page: number; limit: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<string, 'success' | 'danger' | 'warning' | 'informative' | 'subtle'> = {
  ok: 'success', error: 'danger', running: 'informative', skip: 'subtle',
  partial: 'warning', failed: 'danger', warning: 'warning',
};
const LEVEL_COLOR: Record<string, 'danger' | 'warning' | 'informative' | 'subtle'> = {
  error: 'danger', warn: 'warning', info: 'informative', debug: 'subtle',
};

function fmtMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
function fmtTime(ms: number): string { return new Date(ms).toLocaleString(); }
function truncateId(id: string): string { return id.length > 8 ? id.substring(0, 8) + '…' : id; }

function getPageNums(cur: number, total: number): (number | null)[] {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | null)[] = [0];
  if (cur <= 2) {
    for (let i = 1; i <= Math.min(4, total - 2); i++) pages.push(i);
    pages.push(null); pages.push(total - 1); return pages;
  }
  if (cur >= total - 3) {
    pages.push(null);
    for (let i = Math.max(1, total - 5); i <= total - 2; i++) pages.push(i);
    pages.push(total - 1); return pages;
  }
  pages.push(null);
  for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) pages.push(i);
  pages.push(null); pages.push(total - 1); return pages;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  // Shell
  root: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: '8px',
    padding: '0 8px 8px',
    marginTop: '8px',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  rootWithDetail: {
    gridTemplateColumns: '180px 600px 1fr',
  },
  // Shared panel
  panel: {
    backgroundColor: '#ffffff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d0e4f7',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
  },
  panelLeft: {
    borderColor: '#b0b0b0',
  },
  panelHeader: {
    padding: '8px 12px 5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    gap: '6px',
  },
  panelTitle: {
    fontSize: '10px',
    fontWeight: 700,
    color: tokens.colorBrandForeground1,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    userSelect: 'none',
  },
  // Left panel — type list
  typeList: {
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: '12px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c8c6c4 transparent',
    backgroundColor: '#f5f5f5',
  },
  typeItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 12px',
    cursor: 'pointer',
    userSelect: 'none',
    gap: '6px',
    ':hover': { backgroundColor: '#eaeaea' },
  },
  typeItemActive: {
    backgroundColor: '#dbeafe',
    ':hover': { backgroundColor: '#d0e6fc' },
  },
  typeName: { fontSize: '11.5px', fontWeight: 400, color: '#323130', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
  typeNameActive: { color: '#0f6cbd', fontWeight: 600 },
  typeBadge: { fontSize: '11px', flexShrink: 0 },
  typeInfoBtn: { flexShrink: 0, padding: 0, minWidth: 'unset', height: '16px', width: '16px', color: tokens.colorNeutralForeground3 },
  // Middle panel toolbar
  toolbar: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    padding: '6px 10px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#e1e4e8',
    backgroundColor: '#f6f8fa',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  searchInput: { flex: 1, minWidth: '160px', maxWidth: '240px' },
  statusSelect: { minWidth: '110px' },
  totalText: { color: '#605e5c', fontSize: '12px', whiteSpace: 'nowrap' },
  tableWrapper: {
    flex: 1,
    overflow: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c8c6c4 transparent',
  },
  table: { width: '100%' },
  thId:      { width: '86px',  fontSize: '12px' },
  thTime:    { width: '148px', fontSize: '12px' },
  thType:    { width: '120px', fontSize: '12px' },
  thTrigger: { width: '80px',  fontSize: '12px' },
  thStatus:  { width: '70px',  fontSize: '12px' },
  thSteps:   { width: '80px',  fontSize: '12px' },
  thDur:     { width: '72px',  fontSize: '12px' },
  rowSelected: { backgroundColor: '#dff0ff' },
  rowClickable: { cursor: 'pointer' },
  timeCell: { fontSize: '11px', color: '#605e5c', whiteSpace: 'nowrap' },
  typeCell: { fontSize: '12px', fontWeight: 600, color: '#0f6cbd' },
  idCell: { fontSize: '10.5px', fontFamily: 'monospace', color: '#605e5c', whiteSpace: 'nowrap' },
  triggerCell: { fontSize: '11px', color: '#605e5c' },
  stepsCell: { fontSize: '11px', color: '#605e5c' },
  durCell: { fontSize: '11.5px', fontWeight: 600, color: '#323130' },
  emptyCell: { textAlign: 'center', padding: '24px', color: '#605e5c' },
  loadingState: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', gap: '8px' },
  // Pagination
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 8px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#edebe9',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  paginationSpacer: { flex: 1 },
  paginationJump: { display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' },
  paginationJumpLabel: { fontSize: '11px', color: '#605e5c', whiteSpace: 'nowrap' },
  paginationJumpInput: { width: '48px', minWidth: '48px' },
  pageBtn: { minWidth: '28px', height: '26px', padding: '0 4px', fontSize: '12px' },
  // Right detail panel
  detailHeader: {
    padding: '6px 10px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#e1e4e8',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
    backgroundColor: '#fafbfc',
  },
  detailBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    fontSize: '11px',
    color: '#24292f',
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  detailBarSep: {
    color: '#ccc',
    padding: '0 8px',
    flexShrink: 0,
    userSelect: 'none',
  },
  detailBarLabel: { color: '#888', fontWeight: 500, flexShrink: 0 },
  detailBarValue: { color: '#24292f', flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  detailMetaLabel: { color: '#888', fontWeight: 500 },
  detailMetaValue: { color: '#24292f', wordBreak: 'break-all' },
  detailSteps: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'thin',
  },
  stepRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '6px 10px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#f0f0f0',
    fontSize: '11.5px',
  },
  stepRowTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  stepSeq:    { color: tokens.colorNeutralForeground3, fontFamily: 'monospace', minWidth: '20px', fontSize: '11px' },
  stepName:   { fontWeight: 600, color: '#201f1e' },
  stepDur:    { color: '#605e5c', fontSize: '11px' },
  stepSpacer: { flex: 1 },
  stepTs:     { color: tokens.colorNeutralForeground3, fontSize: '10.5px', fontFamily: 'monospace' },
  stepMsg:    { color: '#323130', paddingLeft: '26px', lineHeight: '1.4' },
  stepDetails: {
    marginTop: '2px',
    marginLeft: '26px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    backgroundColor: '#f3f2f1',
    padding: '3px 6px',
    borderRadius: '2px',
  },
  loadingRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', fontSize: '11px', color: tokens.colorNeutralForeground3 },
  noSelect: { padding: '24px 12px', textAlign: 'center', color: '#888', fontSize: '12px' },
  detailMetaJson: {
    fontSize: '10.5px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    backgroundColor: '#f3f2f1',
    padding: '3px 6px',
    borderRadius: '2px',
    marginTop: '2px',
  },
  detailFlowId: {
    fontSize: '10.5px',
    fontFamily: 'monospace',
    color: '#605e5c',
    wordBreak: 'break-all',
  },
  dismissBtn: { marginLeft: 'auto', flexShrink: 0 },
});

// ---------------------------------------------------------------------------
// Step detail panel (shown in right column)
// ---------------------------------------------------------------------------

const FlowDetailPanel: React.FC<{ flowId: string; onClose: () => void }> = ({ flowId, onClose }) => {
  const s = useStyles();
  const [detail, setDetail]     = useState<FlowDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [payloads, setPayloads] = useState<Record<number, string>>({});
  const [payloadLoading, setPayloadLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setDetail(null); setPayloads({});
    fetch(`${FLOWS_URL}/${encodeURIComponent(flowId)}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<FlowDetail>; })
      .then((d) => { if (!cancelled) { setDetail(d); setLoading(false); } })
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
      setPayloads((p) => ({ ...p, [seq]: `Failed: ${String(e)}` }));
    } finally {
      setPayloadLoading((p) => ({ ...p, [seq]: false }));
    }
  };

  const flow = detail?.flow;

  return (
    <div className={s.panel}>
      {/* Header */}
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>Detail</span>
        {flow && (
          <Badge size="small" color={STATUS_COLOR[flow.status] ?? 'subtle'}>{flow.status}</Badge>
        )}
        <Button size="small" appearance="subtle" className={s.dismissBtn}
          icon={<DismissRegular style={{ fontSize: '13px' }} />}
          onClick={onClose} aria-label="Close detail panel" />
      </div>

      {loading && (
        <div className={s.loadingRow}><Spinner size="tiny" /> Loading…</div>
      )}
      {error && (
        <div className={s.loadingRow} style={{ color: 'red' }}>Error: {error}</div>
      )}

      {flow && (
        <>
          {/* Flow metadata — compact one-line bar */}
          <div className={s.detailHeader}>
            <div className={s.detailBar}>
              <span className={s.detailFlowId} style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#605e5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>{flow.flow_id}</span>
              {flow.hostname && <>
                <span className={s.detailBarSep}>|</span>
                <span className={s.detailBarLabel}>Host</span>&nbsp;
                <span className={s.detailBarValue}>{flow.hostname}</span>
              </>}
              <span className={s.detailBarSep}>|</span>
              <span className={s.detailBarLabel}>Started</span>&nbsp;
              <span className={s.detailBarValue}>{fmtTime(flow.started_at)}</span>
            </div>
          </div>

          {/* Step list */}
          <div className={s.detailSteps}>
            {(detail?.steps ?? []).length === 0 && !loading && (
              <div className={s.loadingRow}>No steps recorded.</div>
            )}
            {(detail?.steps ?? []).map((step) => (
              <div key={step.id} className={s.stepRow}>
                <div className={s.stepRowTop}>
                  <span className={s.stepSeq}>#{step.seq}</span>
                  <span className={s.stepName}>{step.step_name}</span>
                  <Badge size="small" color={LEVEL_COLOR[step.level] ?? 'subtle'}>{step.level}</Badge>
                  <Badge size="small" color={STATUS_COLOR[step.status] ?? 'subtle'}>{step.status}</Badge>
                  <span className={s.stepDur}>{fmtMs(step.duration_ms)}</span>
                  <span className={s.stepSpacer} />
                  <span className={s.stepTs}>{step.ts_fmt}</span>
                </div>
                {step.message && (
                  <div className={s.stepMsg}>{step.message}</div>
                )}
                {step.details && (
                  <div className={s.stepDetails}>{step.details}</div>
                )}
                {!step.details && step.payload_ref && (
                  <div style={{ paddingLeft: '26px', marginTop: '3px' }}>
                    {payloads[step.seq] !== undefined ? (
                      <pre className={s.stepDetails}>{payloads[step.seq]}</pre>
                    ) : (
                      <Button size="small" appearance="subtle"
                        style={{ fontSize: '11px', padding: '0 6px', height: '20px' }}
                        disabled={payloadLoading[step.seq]}
                        onClick={() => loadPayload(step.seq)}>
                        {payloadLoading[step.seq] ? 'Loading…' : 'View detail file'}
                      </Button>
                    )}
                  </div>
                )}
                {step.source && (
                  <div style={{ paddingLeft: '26px', fontSize: '10.5px', color: '#888' }}>
                    source: {step.source}{step.api_path ? ` · ${step.api_path}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const FlowLogTab: React.FC = () => {
  const s = useStyles();

  // State
  const [data, setData]               = useState<FlowListResponse | null>(null);
  const [types, setTypes]             = useState<FlowTypeCount[]>([]);
  const [loading, setLoading]         = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(0);
  const [limit]                       = useState(15);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [jumpValue, setJumpValue]     = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (selectedType)   params.set('flow_type', selectedType);
      if (filterStatus)   params.set('status', filterStatus);
      const [rawFlows, typesRes] = await Promise.all([
        fetch(`${FLOWS_URL}?${params}`).then((r) => r.json()),
        fetch(TYPES_URL).then((r) => r.json() as Promise<FlowTypeCount[]>),
      ]);
      // Support both paginated { flows, total } and legacy bare-array response
      if (Array.isArray(rawFlows)) {
        setData({ flows: rawFlows as FlowRow[], total: rawFlows.length, page, limit });
      } else {
        setData(rawFlows as FlowListResponse);
      }
      setTypes(Array.isArray(typesRes) ? typesRes : []);
    } catch (e) {
      console.error('FlowLogTab fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedType, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filter/type changes
  useEffect(() => { setPage(0); }, [selectedType, filterStatus]);

  const flows = data?.flows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const totalCount = types.reduce((s, t) => s + t.count, 0);

  // Client-side search filter (on loaded page)
  const visibleFlows = search.trim()
    ? flows.filter((f) => {
        const q = search.toLowerCase();
        return f.flow_type.toLowerCase().includes(q) ||
               f.trigger_src.toLowerCase().includes(q) ||
               f.status.toLowerCase().includes(q);
      })
    : flows;

  return (
    <div className={mergeClasses(s.root, selectedFlowId != null && s.rootWithDetail)}>
      {/* ── Left panel: type list ── */}
      <div className={mergeClasses(s.panel, s.panelLeft)}>
        <div className={s.panelHeader}><span className={s.panelTitle}>Types</span></div>
        <div className={s.typeList}>
          <div className={mergeClasses(s.typeItem, selectedType === '' && s.typeItemActive)}
            onClick={() => setSelectedType('')}>
            <span className={mergeClasses(s.typeName, selectedType === '' && s.typeNameActive)}>All</span>
            <Badge size="small" appearance="tint" color="informative" className={s.typeBadge}>{totalCount}</Badge>
          </div>
          {types.map((t) => (
            <div key={t.flow_type}
              className={mergeClasses(s.typeItem, selectedType === t.flow_type && s.typeItemActive)}
              onClick={() => setSelectedType(t.flow_type)}>
              <span className={mergeClasses(s.typeName, selectedType === t.flow_type && s.typeNameActive)}>
                {t.flow_type}
              </span>
              <Badge size="small" appearance="tint"
                color={selectedType === t.flow_type ? 'brand' : 'subtle'}
                className={s.typeBadge}>{t.count}</Badge>
              <Tooltip relationship="description" content={flowTypeDescription(t.flow_type)}>
                <Button size="small" appearance="subtle" className={s.typeInfoBtn}
                  icon={<InfoRegular style={{ fontSize: '13px' }} />}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`About ${t.flow_type}`} />
              </Tooltip>
            </div>
          ))}
        </div>
      </div>

      {/* ── Middle panel: flow table ── */}
      <div className={s.panel}>
        {/* Toolbar */}
        <div className={s.toolbar}>
          <Input size="small" className={s.searchInput}
            placeholder="Search…"
            contentBefore={<SearchRegular style={{ fontSize: '13px', color: '#888' }} />}
            value={search} onChange={(_, d) => setSearch(d.value)} />
          <Select size="small" className={s.statusSelect} value={filterStatus}
            onChange={(_, d) => setFilterStatus(d.value)}>
            <option value="">All status</option>
            <option value="running">Running</option>
            <option value="ok">OK</option>
            <option value="error">Error</option>
            <option value="partial">Partial</option>
            <option value="skip">Skip</option>
          </Select>
          <Button size="small" appearance="subtle" icon={<ArrowClockwiseRegular />}
            onClick={loadData} disabled={loading}>Refresh</Button>
          {loading && <Spinner size="tiny" />}
          {data && (
            <Text size={200} className={s.totalText}>{total.toLocaleString()} total</Text>
          )}
        </div>

        {/* Table */}
        <div className={s.tableWrapper}>
          {loading && !data ? (
            <div className={s.loadingState}><Spinner size="tiny" /><Text size={200}>Loading…</Text></div>
          ) : (
            <Table size="small" className={s.table}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className={s.thId}>ID</TableHeaderCell>
                  <TableHeaderCell className={s.thTime}>Time</TableHeaderCell>
                  <TableHeaderCell className={s.thType}>Type</TableHeaderCell>
                  <TableHeaderCell className={s.thTrigger}>Trigger</TableHeaderCell>
                  <TableHeaderCell className={s.thStatus}>Status</TableHeaderCell>
                  <TableHeaderCell className={s.thSteps}>Steps</TableHeaderCell>
                  <TableHeaderCell className={s.thDur}>Duration</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleFlows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className={s.emptyCell}>
                      <Text size={200}>No flow runs found.</Text>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleFlows.map((flow) => (
                    <TableRow
                      key={flow.flow_id}
                      className={mergeClasses(s.rowClickable, selectedFlowId === flow.flow_id && s.rowSelected)}
                      onClick={() => setSelectedFlowId((prev) => prev === flow.flow_id ? null : flow.flow_id)}
                    >
                      <TableCell className={s.idCell}>{truncateId(flow.flow_id)}</TableCell>
                      <TableCell className={s.timeCell}>{fmtTime(flow.started_at)}</TableCell>
                      <TableCell className={s.typeCell}>{flow.flow_type}</TableCell>
                      <TableCell className={s.triggerCell}>{flow.trigger_src}</TableCell>
                      <TableCell>
                        <Badge size="small" appearance="filled"
                          color={STATUS_COLOR[flow.status] ?? 'subtle'}>{flow.status}</Badge>
                        {flow.error_count > 0 && (
                          <Badge size="small" color="danger" style={{ marginLeft: '4px' }}>{flow.error_count} err</Badge>
                        )}
                      </TableCell>
                      <TableCell className={s.stepsCell}>
                        {flow.done_steps}
                        {flow.total_steps > 0 ? `/${flow.total_steps}` : ''}
                      </TableCell>
                      <TableCell className={s.durCell}>{fmtMs(flow.duration_ms)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={s.pagination}>
            <Button size="small" appearance="subtle" icon={<ChevronLeftRegular />}
              disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
              className={s.pageBtn} />
            {getPageNums(page, totalPages).map((pg, i) =>
              pg === null
                ? <span key={`el-${i}`} style={{ padding: '0 2px', color: '#8a8886', fontSize: '12px', lineHeight: '26px' }}>…</span>
                : <Button key={pg} size="small"
                    appearance={pg === page ? 'primary' : 'subtle'}
                    onClick={() => setPage(pg)}
                    className={s.pageBtn}>{pg + 1}</Button>
            )}
            <Button size="small" appearance="subtle" icon={<ChevronRightRegular />}
              disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className={s.pageBtn} />
            <div className={s.paginationSpacer} />
            <div className={s.paginationJump}>
              <span className={s.paginationJumpLabel}>Go to</span>
              <Input size="small" className={s.paginationJumpInput}
                value={jumpValue} onChange={(_, d) => setJumpValue(d.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const n = parseInt(jumpValue, 10);
                    if (!isNaN(n) && n >= 1 && n <= totalPages) { setPage(n - 1); setJumpValue(''); }
                  }
                }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel: detail ── */}
      {selectedFlowId != null && (
        <FlowDetailPanel
          flowId={selectedFlowId}
          onClose={() => setSelectedFlowId(null)}
        />
      )}
    </div>
  );
};
