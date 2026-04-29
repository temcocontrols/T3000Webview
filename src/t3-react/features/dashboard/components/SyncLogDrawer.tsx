/**
 * SyncLogDrawer
 *
 * Slide-in panel showing paginated SYNC_EVENT_LOG entries.
 * Filters: All / Errors / Warnings / Info.  Export to CSV.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Badge,
  Spinner,
  Text,
  Tab,
  TabList,
  Input,
} from '@fluentui/react-components';
import {
  DismissRegular,
  ArrowSyncRegular,
  ArrowDownloadRegular,
  FilterRegular,
  ErrorCircleRegular,
  WarningRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';
import { SyncEventEntry, EventLevel } from '../services/syncHealthApi';
import styles from './SyncLogDrawer.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

type LevelFilter = 'all' | EventLevel;

export const SyncLogDrawer: React.FC<Props> = ({ open, onClose }) => {
  const [entries, setEntries] = useState<SyncEventEntry[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  const load = useCallback(async (pg: number, lvl: LevelFilter, cat: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(pg),
        ...(lvl !== 'all' ? { level: lvl } : {}),
        ...(cat !== 'all' ? { category: cat } : {}),
      });
      const url = `${API_BASE_URL}/api/sync/event-log?${qs}`;
      console.log('[SyncLogDrawer] fetching:', url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`event-log: HTTP ${res.status}`);
      const data = await res.json();
      console.log('[SyncLogDrawer] got entries:', data.total);
      setEntries(data.entries);
      setTotal(data.total);
      setAllCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (err) {
      console.error('[SyncLogDrawer] fetch error:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setPage(0);
      load(0, levelFilter, categoryFilter);
    }
  }, [open, levelFilter, categoryFilter, load]);

  const refresh = () => {
    setPage(0);
    load(0, levelFilter, categoryFilter);
  };

  const exportCsv = () => {
    const header = 'Time,Level,Category,Source,Device,Host,Message';
    const rows = entries.map(
      (e) =>
        `"${e.ts}","${e.level}","${e.category ?? ''}","${e.source ?? ''}","${e.deviceSerial ?? ''}","${e.hostname ?? ''}","${e.message.replace(/"/g, '""')}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const levelIcon = (lvl: EventLevel) => {
    switch (lvl) {
      case 'error': return <ErrorCircleRegular style={{ color: '#d13438', fontSize: '14px' }} />;
      case 'warn':  return <WarningRegular style={{ color: '#f7630c', fontSize: '14px' }} />;
      default:      return <InfoRegular style={{ color: '#0078d4', fontSize: '14px' }} />;
    }
  };

  const visibleEntries = search
    ? entries.filter(
        (e) =>
          e.message.toLowerCase().includes(search.toLowerCase()) ||
            (e.deviceSerial ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (e.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (e.source ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (e.hostname ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const knownCategories = allCategories;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Drawer
      type="overlay"
      position="end"
      size="medium"
      open={open}
      onOpenChange={(_, s) => !s.open && onClose()}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          className={styles.drawerTitle}
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<DismissRegular />}
              onClick={onClose}
            />
          }
        >
          <div className={styles.titleRow}>
            <span className={styles.titleText}>Activity Log</span>
            <span className={styles.titleCount}>
              {loading ? 'Loading...' : `${total.toLocaleString()} entries`}
            </span>
          </div>
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.body}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <TabList
            size="small"
            selectedValue={levelFilter}
            onTabSelect={(_, d) => {
              setLevelFilter(d.value as LevelFilter);
              setPage(0);
            }}
          >
            <Tab value="all">All</Tab>
            <Tab value="error">
              <span className={styles.tabWithBadge}>
                Errors
                {entries.filter(e => e.level === 'error').length > 0 && (
                  <Badge color="danger" size="extra-small" appearance="filled">
                    {entries.filter(e => e.level === 'error').length}
                  </Badge>
                )}
              </span>
            </Tab>
            <Tab value="warn">Warnings</Tab>
            <Tab value="info">Info</Tab>
          </TabList>

          <div className={styles.toolbarRight}>
            <select
              className={styles.categorySelect}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              title="Filter category"
            >
              <option value="all">All categories</option>
              {knownCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Input
              size="small"
              placeholder="Search..."
              value={search}
              onChange={(_, d) => setSearch(d.value)}
              contentBefore={<FilterRegular style={{ fontSize: '12px' }} />}
              style={{ width: '140px' }}
            />
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowSyncRegular />}
              onClick={refresh}
              title="Refresh"
            />
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowDownloadRegular />}
              onClick={exportCsv}
              title="Export CSV"
            />
          </div>
        </div>

        <div className={styles.stats}>
          <Text size={300} className={styles.statsText}>
            {total} total entries
            {search && ` • ${visibleEntries.length} matching "${search}"`}
          </Text>
        </div>

        {/* Log list */}
        {loading ? (
          <div className={styles.center}>
            <Spinner size="small" />
          </div>
        ) : loadError ? (
          <div className={styles.empty}>
            <ErrorCircleRegular style={{ color: '#d13438', fontSize: '20px' }} />
            <Text className={styles.emptyText} style={{ color: '#d13438' }}>
              {loadError}
            </Text>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className={styles.empty}>
            <Text className={styles.emptyText}>No log entries found</Text>
          </div>
        ) : (
          <div className={styles.logList}>
            {visibleEntries.map((e) => {
              const metaParts = [
                e.category ? `Category: ${e.category}` : null,
                e.source ? `Source: ${e.source}` : null,
                e.deviceSerial ? `SN ${e.deviceSerial}` : null,
                e.hostname ? `Host: ${e.hostname}` : null,
                e.details ? e.details : null,
              ].filter(Boolean) as string[];

              return (
                <div key={`${e.tsUnix}-${e.id}`} className={`${styles.entry} ${styles[`entry_${e.level}`]}`}>
                  <div className={styles.entryIcon}>{levelIcon(e.level)}</div>
                  <div className={styles.entryBody}>
                    <div className={styles.entryTop}>
                      <span className={styles.entryTime}>{e.ts}</span>
                    </div>
                    <div className={styles.entryMsg}>{e.message}</div>
                    {metaParts.length > 0 && (
                      <div className={styles.entryMeta}>{metaParts.join(' • ')}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !search && (
          <div className={styles.pagination}>
            <Button
              size="small"
              appearance="subtle"
              disabled={page === 0}
              onClick={() => { const p = page - 1; setPage(p); load(p, levelFilter, categoryFilter); }}
            >
              ← Prev
            </Button>
            <Text size={200}>Page {page + 1} / {totalPages}</Text>
            <Button
              size="small"
              appearance="subtle"
              disabled={page >= totalPages - 1}
              onClick={() => { const p = page + 1; setPage(p); load(p, levelFilter, categoryFilter); }}
            >
              Next →
            </Button>
          </div>
        )}
      </DrawerBody>
    </Drawer>
  );
};
