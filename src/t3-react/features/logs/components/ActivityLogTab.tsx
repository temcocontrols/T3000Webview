/**
 * Activity Log Tab
 *
 * Reads from GET /api/sync/event-log — paginated, filterable by level/category
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
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
  logged_at: string;
  level: string;
  category: string;
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

export const ActivityLogTab: React.FC = () => {
  const [data, setData] = useState<EventLogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [levelFilter, setLevelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '12px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          value={levelFilter}
          onChange={(_, data) => setLevelFilter(data.value)}
          size="small"
          style={{ minWidth: '100px' }}
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
          style={{ minWidth: '130px' }}
        >
          <option value="">All Categories</option>
          {(data?.categories ?? []).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>

        <Input
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(_, d) => setSearchQuery(d.value)}
          size="small"
          style={{ flex: 1, minWidth: '200px' }}
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
          <Text size={200} style={{ color: '#605e5c', whiteSpace: 'nowrap' }}>
            {data.total.toLocaleString()} total
          </Text>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #edebe9', borderRadius: '4px' }}>
        {loading && !data ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px' }}>
            <Spinner size="tiny" />
            <Text size={200}>Loading...</Text>
          </div>
        ) : (
          <Table size="small" style={{ width: '100%' }}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: '160px', fontSize: '12px' }}>Time</TableHeaderCell>
                <TableHeaderCell style={{ width: '70px', fontSize: '12px' }}>Level</TableHeaderCell>
                <TableHeaderCell style={{ width: '110px', fontSize: '12px' }}>Category</TableHeaderCell>
                <TableHeaderCell style={{ width: '110px', fontSize: '12px' }}>Source</TableHeaderCell>
                <TableHeaderCell style={{ fontSize: '12px' }}>Message</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#605e5c' }}>
                    <Text size={200}>No entries</Text>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow
                      style={{ cursor: entry.details ? 'pointer' : 'default' }}
                      onClick={() => entry.details && setExpanded(expanded === entry.id ? null : entry.id)}
                    >
                      <TableCell style={{ fontSize: '11px', color: '#605e5c', whiteSpace: 'nowrap' }}>
                        {formatTime(entry.logged_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          appearance="filled"
                          color={LEVEL_COLORS[entry.level] ?? 'informative'}
                          size="small"
                          style={{ fontSize: '10px' }}
                        >
                          {entry.level}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ fontSize: '11px' }}>{entry.category}</TableCell>
                      <TableCell style={{ fontSize: '11px', color: '#605e5c' }}>{entry.source ?? ''}</TableCell>
                      <TableCell style={{ fontSize: '12px' }}>{entry.message}</TableCell>
                    </TableRow>
                    {expanded === entry.id && entry.details && (
                      <TableRow>
                        <TableCell colSpan={5} style={{ padding: '4px 8px 8px 24px' }}>
                          <pre style={{ margin: 0, fontSize: '11px', color: '#605e5c', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
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
