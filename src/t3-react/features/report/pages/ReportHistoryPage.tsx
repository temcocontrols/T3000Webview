/**
 * Report history — every bundle T3000 has saved, in one place.
 *
 * The details drawer lists the last few for at-a-glance recall; this page is the full view: a flat
 * list, a filter, and a details drawer per report. Nothing here sends or deletes — the bundles are
 * the customer's own files.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Divider,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Input,
  Link,
  OverlayDrawer,
  Spinner,
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  ArrowLeftRegular,
  ChevronRightRegular,
  CopyRegular,
  OpenRegular,
  SearchRegular,
} from '@fluentui/react-icons';

import reportApi from '../services/reportApi';
import type { StoredReport } from '../types';
import { openReportForm, reportFormHref } from '../services/reportRoutes';
import styles from './ReportHistoryPage.module.css';

/** `2026-11-17T15:04:22+08:00` → `2026-11-17 15:04`. */
function formatWhen(value: string): string {
  if (!value) {
    return 'unknown';
  }
  return value.slice(0, 16).replace('T', ' ');
}

type StatusTone = 'sent' | 'browser' | 'none';

function statusOf(report: StoredReport): { label: string; tone: StatusTone } {
  if (report.send?.issue_number) {
    return { label: `Issue #${report.send.issue_number}`, tone: 'sent' };
  }
  if (report.send?.route === 'browser') {
    return { label: 'Opened in the browser', tone: 'browser' };
  }
  if (report.send) {
    return { label: 'Sent', tone: 'sent' };
  }
  return { label: 'Not sent', tone: 'none' };
}

export const ReportHistoryPage: React.FC = () => {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [dir, setDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<StoredReport | null>(null);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await reportApi.list();
      setReports(result.reports);
      setDir(result.dir);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The history could not be read');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return reports;
    }
    return reports.filter((report) =>
      [report.title, report.kind, report.id, report.dir]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [reports, query]);

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(path);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      setCopied('');
    }
  };

  const selectedStatus = selected ? statusOf(selected) : null;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Button
          className={styles.toolButton}
          appearance="subtle"
          size="small"
          icon={<ArrowLeftRegular />}
          onClick={openReportForm}
        >
          Back to the report
        </Button>
        <span className={styles.title}>Report history</span>
        <span className={styles.count}>
          {reports.length === 0 ? 'nothing saved yet' : `${reports.length} saved`}
        </span>
        <div className={styles.toolbarRight}>
          <Button
            className={styles.toolButton}
            appearance="subtle"
            size="small"
            icon={<ArrowClockwiseRegular />}
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.summary}>
          <span className={styles.folder} title={dir}>
            {dir || 'Reports are saved next to T3000'}
          </span>
          <Tooltip content="Copy the folder that holds every report" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<CopyRegular />}
              onClick={() => void copyPath(dir)}
              disabled={!dir}
              aria-label="Copy the reports folder path"
            />
          </Tooltip>
          <Input
            className={styles.search}
            size="small"
            value={query}
            onChange={(_, data) => setQuery(data.value)}
            placeholder="Filter by title, kind or id"
            contentBefore={<SearchRegular />}
          />
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        {loading ? (
          <Spinner size="tiny" label="Reading the report folder" />
        ) : visible.length === 0 ? (
          <div className={styles.empty}>
            {reports.length === 0
              ? 'Every report keeps a local copy here, even when sending fails. '
              : 'Nothing matches that filter. '}
            <Link href={reportFormHref()}>Write a report</Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {visible.map((report) => {
              const status = statusOf(report);
              return (
                <li key={report.id}>
                  <button type="button" className={styles.item} onClick={() => setSelected(report)}>
                    <span className={styles.itemMain}>
                      <span className={styles.itemTitle} title={report.title || report.id}>
                        {report.title || '(no title)'}
                      </span>
                      {report.summary ? (
                        <span className={styles.itemDetail} title={report.summary}>
                          {report.summary}
                        </span>
                      ) : null}
                      <span className={styles.itemMeta}>
                        {report.kind} · {formatWhen(report.created)}
                        {report.screenshots
                          ? ` · ${report.screenshots} shot${report.screenshots === 1 ? '' : 's'}`
                          : ''}
                        {` · ${report.id}`}
                      </span>
                    </span>
                    <span className={`${styles.status} ${styles[status.tone]}`}>{status.label}</span>
                    <ChevronRightRegular className={styles.chevron} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <OverlayDrawer
        open={Boolean(selected)}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setSelected(null);
          }
        }}
        position="end"
        className={styles.drawer}
      >
        <DrawerHeader>
          <DrawerHeaderTitle heading={{ className: styles.drawerHeading }}>
            Report details
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody className={styles.drawerBody}>
          {selected ? (
            <>
              <div className={styles.drawerTitle}>{selected.title || '(no title)'}</div>
              <div className={styles.drawerMeta}>
                {selected.kind} · {formatWhen(selected.created)}
              </div>
              {selected.summary ? (
                <div className={styles.drawerSummary}>{selected.summary}</div>
              ) : null}

              <div className={styles.drawerRow}>
                {selectedStatus ? (
                  <span className={`${styles.status} ${styles[selectedStatus.tone]}`}>
                    {selectedStatus.label}
                  </span>
                ) : null}
                {selected.send?.issue_url ? (
                  <Link href={selected.send.issue_url} target="_blank" rel="noreferrer">
                    Open the issue <OpenRegular />
                  </Link>
                ) : null}
              </div>

              <Divider />

              <div className={styles.fieldLabel}>ID</div>
              <div className={styles.mono}>{selected.id}</div>

              {selected.labels && selected.labels.length > 0 ? (
                <>
                  <div className={styles.fieldLabel}>Labels</div>
                  <div className={styles.labelRow}>
                    {selected.labels.map((label) => (
                      <span key={label} className={styles.labelChip}>
                        {label}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}

              <div className={styles.fieldLabel}>Folder</div>
              <div className={styles.pathRow}>
                <span className={styles.path}>{selected.dir}</span>
                <Tooltip
                  content={copied === selected.dir ? 'Copied' : 'Copy the folder path'}
                  relationship="label"
                >
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<CopyRegular />}
                    onClick={() => void copyPath(selected.dir)}
                    aria-label="Copy this report's folder path"
                  />
                </Tooltip>
              </div>

              <div className={styles.fieldLabel}>Files</div>
              {selected.files && selected.files.length > 0 ? (
                <ul className={styles.fileList}>
                  {selected.files.map((file) => (
                    <li key={file} className={styles.fileItem}>
                      {file}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.drawerMeta}>The file list needs a newer T3000 build.</div>
              )}

              {copied ? <div className={styles.copied}>Copied: {copied}</div> : null}
            </>
          ) : null}
        </DrawerBody>
      </OverlayDrawer>
    </div>
  );
};

export default ReportHistoryPage;
