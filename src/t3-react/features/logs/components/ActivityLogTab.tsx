/**
 * Activity Log Tab
 *
 * Reads from GET /api/sync/event-log — paginated, filterable by level/category
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  mergeClasses,
  Text,
  Button,
  Input,
  Spinner,
  Badge,
  Select,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@fluentui/react-components';
import { ArrowSyncRegular, ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const ACTIVITY_LOG_URL = `${API_BASE_URL}/api/sync/event-log`;

interface AppLogEntry {
  id: number;
  ts?: string;
  logged_at?: string;
  level: string;
  category: string;
  sink?: string | null;
  source: string | null;
  device_serial: string | null;
  message: string;
  details: string | null;
}

interface EventLogResponse {
  entries: AppLogEntry[];
  total: number;
  categories: string[];
  page: number;
  limit: number;
}

const LEVEL_COLORS: Record<string, 'danger' | 'warning' | 'informative' | 'subtle'> = {
  ERROR: 'danger',
  WARN: 'warning',
  INFO: 'informative',
  DEBUG: 'subtle',
};

const normalizeLevel = (level: string | null | undefined) =>
  (level ?? '').trim().toUpperCase();

const SINK_COLORS: Record<string, 'danger' | 'warning' | 'informative' | 'subtle'> = {
  SQLITE: 'informative',
  MSSQL: 'warning',
  FILE: 'subtle',
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: '8px',
    padding: '12px',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  levelSelect: { minWidth: '100px' },
  categorySelect: { minWidth: '130px' },
  searchInput: { flex: 1, minWidth: '200px' },
  totalText: { color: '#605e5c', whiteSpace: 'nowrap' },
  tableWrapper: {
    flex: 1,
    overflow: 'auto',
    border: '1px solid #edebe9',
    borderRadius: '4px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c8c6c4 transparent',
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#c8c6c4',
      borderRadius: '2px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    gap: '8px',
  },
  table: { width: '100%' },
  thTime: { width: '160px', fontSize: '12px' },
  thLevel: { width: '70px', fontSize: '12px' },
  thCategory: { width: '110px', fontSize: '12px' },
  thSink: { width: '90px', fontSize: '12px' },
  thSource: { width: '110px', fontSize: '12px' },
  thMessage: { fontSize: '12px' },
  emptyCell: { textAlign: 'center', padding: '24px', color: '#605e5c' },
  rowClickable: { cursor: 'pointer' },
  timeCell: { fontSize: '11px', color: '#605e5c', whiteSpace: 'nowrap' },
  badgeText: { fontSize: '10px' },
  categoryCell: { fontSize: '11px' },
  sourceCell: { fontSize: '11px', color: '#605e5c' },
  messageCell: { fontSize: '12px' },
  detailsCell: { padding: '4px 8px 8px 24px' },
  detailsPre: {
    margin: 0,
    fontSize: '11px',
    color: '#605e5c',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
  },
});

interface ActivityLogTabProps {
  externalCategoryFilter?: string;
  onCategoryFilterChange?: (cat: string) => void;
  categoryOptions?: string[];
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
  externalCategoryFilter,
  onCategoryFilterChange,
  categoryOptions,
}) => {
  const s = useStyles();
  const [data, setData] = useState<EventLogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [levelFilter, setLevelFilter] = useState('');
  const [internalCategoryFilter, setInternalCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  // If parent controls category filter, use that; else use internal
  const categoryFilter = externalCategoryFilter !== undefined ? externalCategoryFilter : internalCategoryFilter;
  const setCategoryFilter = (val: string) => {
    if (onCategoryFilterChange) {
      onCategoryFilterChange(val);
    } else {
      setInternalCategoryFilter(val);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(levelFilter ? { level: levelFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
      });
      const response = await fetch(`${ACTIVITY_LOG_URL}?${params}`);
      if (response.ok) {
        const json: EventLogResponse = await response.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to load activity log:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, levelFilter, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [levelFilter, categoryFilter]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const filteredEntries = (data?.entries ?? []).filter(e =>
    !searchQuery || e.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.details ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className={s.root}>
      {/* Toolbar */}
      <div className={s.toolbar}>
        <Select
          value={levelFilter}
          onChange={(_, data) => setLevelFilter(data.value)}
          size="small"
          className={s.levelSelect}
        >
          <option value="">All Levels</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </Select>

        <Select
          value={categoryFilter}
          onChange={(_, data) => setCategoryFilter(data.value)}
          size="small"
          className={s.categorySelect}
        >
          <option value="">All Categories</option>
          {(categoryOptions ?? data?.categories ?? []).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>

        <Input
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(_, d) => setSearchQuery(d.value)}
          size="small"
          className={s.searchInput}
        />

        <Button
          appearance="subtle"
          icon={<ArrowSyncRegular />}
          onClick={load}
          disabled={loading}
          size="small"
        >
          Refresh
        </Button>

        {data && (
          <Text size={200} className={s.totalText}>
            {data.total.toLocaleString()} total
          </Text>
        )}
      </div>

      {/* Table */}
      <div className={s.tableWrapper}>
        {loading && !data ? (
          <div className={s.loadingState}>
            <Spinner size="tiny" />
            <Text size={200}>Loading...</Text>
          </div>
        ) : (
          <Table size="small" className={s.table}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell className={s.thTime}>Time</TableHeaderCell>
                <TableHeaderCell className={s.thLevel}>Level</TableHeaderCell>
                <TableHeaderCell className={s.thCategory}>Category</TableHeaderCell>
                <TableHeaderCell className={s.thSink}>Sink</TableHeaderCell>
                <TableHeaderCell className={s.thSource}>Source</TableHeaderCell>
                <TableHeaderCell className={s.thMessage}>Message</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className={s.emptyCell}>
                    <Text size={200}>No entries</Text>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow
                      className={mergeClasses(entry.details && s.rowClickable)}
                      onClick={() => entry.details && setExpanded(expanded === entry.id ? null : entry.id)}
                    >
                      <TableCell className={s.timeCell}>
                        {formatTime(entry.logged_at ?? entry.ts ?? '')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          appearance="filled"
                          color={LEVEL_COLORS[normalizeLevel(entry.level)] ?? 'informative'}
                          size="small"
                          className={s.badgeText}
                        >
                          {entry.level}
                        </Badge>
                      </TableCell>
                      <TableCell className={s.categoryCell}>{entry.category}</TableCell>
                      <TableCell>
                        <Badge
                          appearance="tint"
                          color={SINK_COLORS[(entry.sink ?? 'SQLITE').toUpperCase()] ?? 'subtle'}
                          size="small"
                          className={s.badgeText}
                        >
                          {(entry.sink ?? 'SQLITE').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className={s.sourceCell}>{entry.source ?? ''}</TableCell>
                      <TableCell className={s.messageCell}>{entry.message}</TableCell>
                    </TableRow>
                    {expanded === entry.id && entry.details && (
                      <TableRow>
                        <TableCell colSpan={6} className={s.detailsCell}>
                          <pre className={s.detailsPre}>
                            {entry.details}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={s.pagination}>
          <Button
            appearance="subtle"
            icon={<ChevronLeftRegular />}
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            size="small"
          />
          <Text size={200}>Page {page + 1} of {totalPages}</Text>
          <Button
            appearance="subtle"
            icon={<ChevronRightRegular />}
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            size="small"
          />
        </div>
      )}
    </div>
  );
};

export default ActivityLogTab;
