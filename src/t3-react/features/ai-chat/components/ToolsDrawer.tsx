/**
 * ToolsDrawer — Slide-in drawer for browsing & managing MCP tools.
 *
 * Sections:
 *   1. Built-in T3000 MCP (collapsible list)
 *   2. External MCP servers (server cards)
 *   3. Inline "Add new MCP server" form
 */

import React, { useState, useCallback } from 'react';
import { Button, Input, Spinner, Tooltip } from '@fluentui/react-components';
import {
  DismissRegular,
  SearchRegular,
  AddRegular,
  DeleteRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  WrenchRegular,
  BoxRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import type { McpServerInfo } from '../hooks/useMcpServers';
import styles from '../AiChat.module.css';

interface Props {
  open: boolean;
  mcpServers: McpServerInfo[];
  onClose: () => void;
  onAddServer: (name: string, url: string, apiKey?: string) => Promise<void>;
  onRemoveServer: (id: string) => void;
  onTestServer: (url: string) => Promise<{ ok: boolean; error?: string }>;
}

const BUILTIN_TOOLS = [
  'Device List', 'Active Alarms', 'Search Tags', 'Trend Logs',
  'Read Points', 'Write Points', 'Auto Tag', 'Preview Tags',
  'Export Model', 'Validate Tags', 'Refresh Device', 'Building Summary',
  'Batch Read', 'Batch Write', 'Get Metadata', 'Semantic Search',
  'List Rules', 'Toggle Rule', 'Create Rule', 'Acknowledge Alarm',
  'List Trendlogs', 'Export Trendlog', 'List Schedules', 'List Programs',
  'List Users', 'Read Settings', 'Device Control', 'Holiday List',
  'PID List', 'Documentation', 'Server Version', 'Describe Tool',
];

const INITIAL_SHOW = 8;

export const ToolsDrawer: React.FC<Props> = ({
  open,
  mcpServers,
  onClose,
  onAddServer,
  onRemoveServer,
  onTestServer,
}) => {
  const [search, setSearch] = useState('');
  const [showAllBuiltin, setShowAllBuiltin] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  // ── Inline add-server form state ──
  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addApiKey, setAddApiKey] = useState('');
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [testError, setTestError] = useState('');

  const filteredBuiltin = search
    ? BUILTIN_TOOLS.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
    : BUILTIN_TOOLS;

  const visibleBuiltin = showAllBuiltin ? filteredBuiltin : filteredBuiltin.slice(0, INITIAL_SHOW);

  const toggleServerExpand = (id: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = useCallback(async () => {
    if (!addName || !addUrl) return;
    setAdding(true);
    try {
      await onAddServer(addName, addUrl, addApiKey || undefined);
      setAddName(''); setAddUrl(''); setAddApiKey('');
      setTestResult('idle');
    } catch {}
    setAdding(false);
  }, [addName, addUrl, addApiKey, onAddServer]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult('idle');
    const r = await onTestServer(addUrl);
    setTestResult(r.ok ? 'ok' : 'fail');
    setTestError(r.error || '');
    setTesting(false);
  }, [addUrl, onTestServer]);

  return (
    <>
      {open && <div className={styles.drawerBackdrop} onClick={onClose} />}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderTitle}>
            <WrenchRegular style={{ fontSize: 16, opacity: 0.6 }} />
            Tools
          </div>
          <Tooltip content="Close" relationship="label">
            <Button appearance="subtle" icon={<DismissRegular />} size="small" onClick={onClose} />
          </Tooltip>
        </div>

        <div className={styles.drawerBody}>
          {/* Search */}
          <Input
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search tools..."
            contentBefore={<SearchRegular fontSize={14} style={{ opacity: 0.4 }} />}
            style={{ marginBottom: 16, height: 34, fontSize: 12 }}
          />

          {/* ═══ Built-in T3000 MCP ═══ */}
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionHeader}>
              <BoxRegular fontSize={16} style={{ opacity: 0.6 }} />
              <span className={styles.drawerSectionTitle}>Built-in T3000 MCP</span>
              <span className={styles.drawerSectionCount}>{filteredBuiltin.length} tools</span>
            </div>

            <div className={styles.drawerToolsList}>
              {visibleBuiltin.map((t) => (
                <label key={t} className={styles.drawerToolItem}>
                  <input type="checkbox" defaultChecked readOnly className={styles.toolsCheckbox} />
                  <span>{t}</span>
                </label>
              ))}
              {filteredBuiltin.length === 0 && (
                <p className={styles.drawerEmpty}>No tools match your search</p>
              )}
            </div>

            {filteredBuiltin.length > INITIAL_SHOW && !showAllBuiltin && (
              <button
                className={styles.drawerShowMore}
                onClick={() => setShowAllBuiltin(true)}
              >
                <ChevronDownRegular fontSize={12} />
                Show all {filteredBuiltin.length} tools
              </button>
            )}
            {showAllBuiltin && filteredBuiltin.length > INITIAL_SHOW && (
              <button
                className={styles.drawerShowMore}
                onClick={() => setShowAllBuiltin(false)}
              >
                <ChevronRightRegular fontSize={12} />
                Show less
              </button>
            )}
          </div>

          {/* ═══ External MCP Servers ═══ */}
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionHeader}>
              <WrenchRegular fontSize={16} style={{ opacity: 0.6 }} />
              <span className={styles.drawerSectionTitle}>External MCP Servers</span>
              <span className={styles.drawerSectionCount}>{mcpServers.length}</span>
            </div>

            {mcpServers.length === 0 ? (
              <p className={styles.drawerEmpty}>No external servers connected</p>
            ) : (
              mcpServers.map((srv) => (
                <div key={srv.id} className={styles.drawerServerCard}>
                  <button
                    className={styles.drawerServerHeader}
                    onClick={() => toggleServerExpand(srv.id)}
                  >
                    <span className={srv.enabled ? styles.statusDot : styles.statusDotOff} />
                    <span className={styles.drawerServerName}>{srv.name}</span>
                    {expandedServers.has(srv.id)
                      ? <ChevronDownRegular fontSize={12} style={{ opacity: 0.4 }} />
                      : <ChevronRightRegular fontSize={12} style={{ opacity: 0.4 }} />
                    }
                  </button>
                  <div className={styles.drawerServerUrl}>{srv.url}</div>
                  {expandedServers.has(srv.id) && (
                    <div className={styles.drawerServerTools}>
                      <p className={styles.drawerEmpty} style={{ padding: '4px 0 0 0' }}>
                        Tools discovered on connect
                      </p>
                    </div>
                  )}
                  <Tooltip content="Remove server" relationship="label">
                    <button
                      className={styles.drawerServerRemove}
                      onClick={() => onRemoveServer(srv.id)}
                    >
                      <DeleteRegular fontSize={14} />
                    </button>
                  </Tooltip>
                </div>
              ))
            )}
          </div>

          {/* ═══ Add new MCP server ═══ */}
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionHeader}>
              <AddRegular fontSize={16} style={{ opacity: 0.6 }} />
              <span className={styles.drawerSectionTitle}>Add MCP Server</span>
            </div>

            <div className={styles.drawerAddForm}>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.currentTarget.value)}
                placeholder="Display name (e.g. Weather API)"
                style={{ height: 34, fontSize: 12, marginBottom: 8 }}
              />
              <Input
                value={addUrl}
                onChange={(e) => setAddUrl(e.currentTarget.value)}
                placeholder="MCP URL (e.g. http://x:9001/mcp)"
                style={{ height: 34, fontSize: 12, fontFamily: 'monospace', marginBottom: 8 }}
              />
              <Input
                value={addApiKey}
                onChange={(e) => setAddApiKey(e.currentTarget.value)}
                placeholder="API Key (optional)"
                style={{ height: 34, fontSize: 12, marginBottom: 10 }}
              />

              <div className={styles.drawerAddActions}>
                <Button
                  appearance="outline"
                  size="small"
                  onClick={handleTest}
                  disabled={testing || !addUrl}
                  style={{ flex: 1, height: 30, fontSize: 12 }}
                >
                  {testing ? <><Spinner size="extra-tiny" style={{ marginRight: 6 }} /> Testing…</> : 'Test Connection'}
                </Button>
                <Button
                  appearance="primary"
                  size="small"
                  onClick={handleAdd}
                  disabled={!addName || !addUrl || adding}
                  style={{ flex: 1, height: 30, fontSize: 12 }}
                >
                  {adding ? 'Adding…' : 'Add Server'}
                </Button>
              </div>

              {testResult === 'ok' && (
                <div className={styles.drawerTestOk}>
                  <CheckmarkCircleRegular fontSize={14} /> Connected successfully
                </div>
              )}
              {testResult === 'fail' && (
                <div className={styles.drawerTestFail}>
                  <ErrorCircleRegular fontSize={14} /> {testError || 'Connection failed'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
