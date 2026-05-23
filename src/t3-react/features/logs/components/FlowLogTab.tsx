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
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  tokens,
  Tooltip,
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  SearchRegular,
  DismissRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const FLOWS_URL = `${API_BASE_URL}/api/flows`;
const TYPES_URL = `${API_BASE_URL}/api/flows/types`;

// ---------------------------------------------------------------------------
// Known flow-type descriptions
// ---------------------------------------------------------------------------
const FLOW_TYPE_DESC: Record<string, string> = {
  SYNC_CYCLE:     'Periodic device sync triggered by the FFI scheduler. Reads data from all panels and writes changes to the local DB. Steps with warn level indicate non-fatal issues (e.g. skipped devices).',
  DLL_INIT:       'One-time initialization sequence run when T3000 loads the DLL. Sets up all background services, verifies DB connectivity, and binds port 9103.',
  TRENDLOG_CHART:    'TrendLog chart page opened. trigger_src=init creates the DB record from URL params (fast). trigger_src=sync follows immediately and calls FFI to populate the full trendlog data. Both happen once per page load. See TRENDLOG_REALTIME for the ongoing interval polling.',
  TRENDLOG_REALTIME: 'Periodic realtime data collection driven by the chart page interval timer. Each polling cycle produces ONE flow with 2 steps: ffi_poll (action=15 LOGGING_DATA call, shows items fetched from device) and batch_save (DB write, shows rows saved). trigger_src=realtime is the normal case; trigger_src=batch means batch arrived without a matching FFI call.',
  TRENDLOG_SYNC:     'Manual trendlog sync triggered via the monitor page. Looks up the device then calls the FFI sync service.',
  TRENDLOG_REFRESH:  'Trendlog list refresh via Action 17 (GET_WEBVIEW_LIST). Looks up device then calls FFI to get the latest trendlog list.',
};

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
    gridTemplateColumns: '180px 1fr 500px',
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
    gap: '5px',
    padding: '6px 0 6px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c8c6c4 transparent',
    backgroundColor: '#ffffff',
  },
  typeItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '7px 10px 7px 14px',
    cursor: 'pointer',
    userSelect: 'none',
    borderRadius: '0',
    position: 'relative',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#ebebeb',
    ':hover': { backgroundColor: '#f3f2f1' },
  },
  typeItemActive: {
    backgroundColor: '#e8f4fd',
    ':hover': { backgroundColor: '#dde8f7' },
  },
  typeName: { fontSize: '12px', fontWeight: 500, color: '#323130', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' },
  typeNameActive: { color: '#0f6cbd', fontWeight: 600 },
  typeSubtext: { fontSize: '10px', color: '#8a8886', marginTop: '1px' },
  typeIndicator: {
    position: 'absolute',
    left: '0',
    top: '9px',
    width: '3px',
    height: '16px',
    backgroundColor: tokens.colorBrandForeground1,
    borderRadius: '2px',
  },
  panelHeaderLeft: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#e0e0e0',
  },
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
    cursor: 'help',
    borderRadius: '4px',
    padding: '2px 4px',
    width: '100%',
    boxSizing: 'border-box',
    ':hover': { backgroundColor: '#f0f4f8' },
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
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerSeq, setDrawerSeq]     = useState<number | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);

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

  const openPayloadDrawer = (seq: number) => {
    setDrawerSeq(seq);
    setDrawerOpen(true);
    if (payloads[seq] === undefined && !payloadLoading[seq]) {
      loadPayload(seq);
    }
  };

  const flow = detail?.flow;

  return (
    <>
    <div className={s.panel}>
      {/* Header */}
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>Detail</span>
        {flow && (
          <Badge size="small" appearance="filled" color={STATUS_COLOR[flow.status] ?? 'subtle'}>{flow.status}</Badge>
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
          <div className={s.detailHeader} style={{ position: 'relative' }}>
            <div
              className={s.detailBar}
              onMouseEnter={() => setInfoVisible(true)}
              onMouseLeave={() => setInfoVisible(false)}
            >
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
            {infoVisible && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                backgroundColor: '#1e2a3a', color: '#e2e8f0',
                padding: '8px 12px', borderRadius: '0 0 4px 4px',
                fontSize: '11px', fontFamily: 'monospace', lineHeight: '1.8',
                zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                borderTop: '1px solid #2d3f55',
              }}>
                <div><span style={{ color: '#6b9fd4' }}>ID:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>{flow.flow_id}</div>
                {flow.hostname && <div><span style={{ color: '#6b9fd4' }}>Host:&nbsp;&nbsp;&nbsp;</span>{flow.hostname}</div>}
                <div><span style={{ color: '#6b9fd4' }}>Started:&nbsp;</span>{fmtTime(flow.started_at)}</div>
                {flow.trigger_src && <div><span style={{ color: '#6b9fd4' }}>Trigger:&nbsp;</span>{flow.trigger_src}</div>}
              </div>
            )}
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
                  <div style={{ paddingLeft: '26px', marginTop: '2px' }}>
                    <Button size="small" appearance="transparent"
                      style={{ fontSize: '11px', padding: '0 2px', height: '18px', color: '#0f6cbd', minWidth: 'unset', textDecoration: 'underline' }}
                      onClick={() => openPayloadDrawer(step.seq)}>
                      View detail file
                    </Button>
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

      {/* Payload detail drawer */}
      <Drawer
        type="overlay"
        position="end"
        size="medium"
        open={drawerOpen}
        onOpenChange={(_, { open }) => setDrawerOpen(open)}
      >
        <DrawerHeader style={{ padding: '8px 12px' }}>
          <DrawerHeaderTitle
            style={{ fontSize: '13px', fontWeight: 600 }}
            action={
              <Button size="small" appearance="subtle" aria-label="Close"
                icon={<DismissRegular style={{ fontSize: '13px' }} />}
                onClick={() => setDrawerOpen(false)} />
            }
          >
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {drawerSeq !== null ? `Step #${drawerSeq} · detail` : 'Detail file'}
            </span>
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody style={{ padding: '12px', overflow: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#c8c6c4 transparent' }}>
          {drawerSeq != null && payloadLoading[drawerSeq] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Spinner size="tiny" /> Loading…
            </div>
          )}
          {drawerSeq != null && payloads[drawerSeq] !== undefined && (
            <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.5' }}>
              {payloads[drawerSeq]}
            </pre>
          )}
        </DrawerBody>
      </Drawer>
    </>
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
  const [refreshKey, setRefreshKey]   = useState(0);

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
  }, [page, limit, selectedType, filterStatus, refreshKey]);

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
        <div className={mergeClasses(s.panelHeader, s.panelHeaderLeft)}><span className={s.panelTitle}>Types</span></div>
        <div className={s.typeList}>
          <div className={mergeClasses(s.typeItem, selectedType === '' && s.typeItemActive)}
            onClick={() => setSelectedType('')}>
            {selectedType === '' && <span className={s.typeIndicator} />}
            <span className={mergeClasses(s.typeName, selectedType === '' && s.typeNameActive)}>All</span>
            <span className={s.typeSubtext}>{totalCount.toLocaleString()} flows</span>
          </div>
          {types.map((t) => (
            <div key={t.flow_type}
              className={mergeClasses(s.typeItem, selectedType === t.flow_type && s.typeItemActive)}
              onClick={() => setSelectedType(t.flow_type)}>
              {selectedType === t.flow_type && <span className={s.typeIndicator} />}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0, gap: '2px' }}>
                <span className={mergeClasses(s.typeName, selectedType === t.flow_type && s.typeNameActive)}>
                  {t.flow_type}
                </span>
                {FLOW_TYPE_DESC[t.flow_type] && (
                  <Tooltip content={FLOW_TYPE_DESC[t.flow_type]} relationship="description" positioning="after">
                    <Button size="small" appearance="transparent" className={s.typeInfoBtn}
                      icon={<InfoRegular style={{ fontSize: '12px' }} />}
                      aria-label={`Info: ${t.flow_type}`}
                      onClick={(e) => e.stopPropagation()} />
                  </Tooltip>
                )}
              </div>
              <span className={s.typeSubtext}>{t.count.toLocaleString()} flows</span>
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
            onClick={() => { setPage(0); setSearch(''); setFilterStatus(''); setRefreshKey((k) => k + 1); }} disabled={loading}>Refresh</Button>
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
                          <Badge size="small" appearance="filled" color="danger" style={{ marginLeft: '4px' }}>{flow.error_count} err</Badge>
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
