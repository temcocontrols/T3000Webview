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
  CloudRegular,
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
  onActivateServer: (id: string) => Promise<void>;
  onTestServer: (url: string) => Promise<{ ok: boolean; error?: string }>;
}

const TOOL_CATEGORIES = [
  {
    name: 'Haystack Tagging',
    tools: ['List Tags', 'Get Point Tags', 'Search Points', 'Auto Tag', 'Preview Tags', 'List Rules', 'Get Brick Class'],
  },
  {
    name: 'Core',
    tools: ['Ping', 'Get Version', 'Describe Tool'],
  },
  {
    name: 'Data & Discovery',
    tools: ['Device List', 'Get Device Points', 'Point Metadata', 'Metadata Search', 'Semantic Search'],
  },
  {
    name: 'Operational',
    tools: ['Read Point', 'Write Point', 'Batch Read', 'Batch Write', 'Batch Metadata'],
  },
  {
    name: 'Analytics',
    tools: ['Validate Tags', 'Export Model'],
  },
  {
    name: 'Rules Management',
    tools: ['Toggle Rule', 'Create Rule'],
  },
  {
    name: 'Alarms & Trends',
    tools: ['Alarm List', 'Acknowledge Alarm', 'Trendlog Query'],
  },
  {
    name: 'Device Operations',
    tools: ['Trendlog List', 'Export Trendlog', 'Refresh Device', 'Schedule List'],
  },
  {
    name: 'Settings',
    tools: ['Read Settings', 'Write Settings', 'Device Control'],
  },
  {
    name: 'Control Logic',
    tools: ['Program List', 'Read Program', 'Alarm Settings', 'Users List', 'Graphics List'],
  },
  {
    name: 'Docs & Config',
    tools: ['Documentation List', 'Read Doc', 'PID List', 'Holiday List', 'Building Summary'],
  },
  {
    name: 'Task Management',
    tools: ['Create Task', 'List Tasks', 'Update Task', 'Delete Task'],
  },
  {
    name: 'Site Memory',
    tools: ['Save Memory', 'List Memories', 'Delete Memory'],
  },
  {
    name: 'Diagnostics',
    tools: ['Device Diagnostics', 'Batch Diagnostics'],
  },
  {
    name: 'Navigation',
    tools: ['Nav List', 'Nav Search', 'Nav Redirect', 'Page Info', 'Current Device'],
  },
];

const TOTAL_BUILTIN = TOOL_CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0);

export const ToolsDrawer: React.FC<Props> = ({
  open,
  mcpServers,
  onClose,
  onAddServer,
  onRemoveServer,
  onActivateServer,
  onTestServer,
}) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  // ── Inline add-server form state ──
  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addApiKey, setAddApiKey] = useState('');
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [testError, setTestError] = useState('');
  const [addError, setAddError] = useState('');

  const filteredCategories = search
    ? TOOL_CATEGORIES
        .map((c) => ({ ...c, tools: c.tools.filter((t) => t.toLowerCase().includes(search.toLowerCase())) }))
        .filter((c) => c.tools.length > 0)
    : TOOL_CATEGORIES;

  const visibleToolCount = filteredCategories.reduce((sum, c) => sum + c.tools.length, 0);

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
    setAddError('');
    try {
      await onAddServer(addName, addUrl, addApiKey || undefined);
      setAddName(''); setAddUrl(''); setAddApiKey('');
      setTestResult('idle');
      setAddError('');
      setShowAddForm(false);
    } catch (e: any) {
      setAddError(e.message || 'Failed to add server');
    }
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
            <span>Tools</span>
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
            contentBefore={<SearchRegular fontSize={10} style={{ opacity: 0.4 }} />}
            style={{ marginBottom: 14, height: 28, fontSize: 11, width: '100%' }}
          />

          {/* ═══ Built-in T3000 MCP ═══ */}
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionHeader}>
              <BoxRegular fontSize={16} style={{ opacity: 0.6 }} />
              <span className={styles.drawerSectionTitle}>Built-in T3000 MCP</span>
              <span className={styles.drawerSectionCount}>{visibleToolCount} tools</span>
            </div>

            {filteredCategories.length === 0 ? (
              <p className={styles.drawerEmpty}>No tools match your search</p>
            ) : (
              <>
                {filteredCategories.slice(0, showAllCategories ? undefined : 1).map((cat, idx) => (
                  <div key={cat.name} className={`${styles.toolCategory} ${idx > 0 ? styles.toolCategoryDivider : ''}`}>
                    <div className={styles.toolCategoryHeader}>
                      <span className={styles.toolCategoryIndicator} />
                      <span className={styles.toolCategoryName}>{cat.name}</span>
                      <span className={styles.toolCategoryCount}>{cat.tools.length}</span>
                    </div>
                    <div className={styles.toolCategoryGrid}>
                      {cat.tools.map((t) => (
                        <span key={t} className={styles.drawerToolItem}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {!showAllCategories && filteredCategories.length > 1 && (
                  <button
                    className={styles.drawerShowMore}
                    onClick={() => setShowAllCategories(true)}
                  >
                    <ChevronDownRegular fontSize={11} />
                    Show all {filteredCategories.length} categories
                  </button>
                )}
                {showAllCategories && filteredCategories.length > 1 && (
                  <button
                    className={styles.drawerShowMore}
                    onClick={() => setShowAllCategories(false)}
                  >
                    <ChevronRightRegular fontSize={11} />
                    Show less
                  </button>
                )}
              </>
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
                <div
                  key={srv.id}
                  className={`${styles.drawerServerCard} ${srv.enabled ? styles.drawerServerCardActive : ''}`}
                >
                  {/* Row 1: icon + name + status badge + remove */}
                  <div className={styles.drawerServerRow}>
                    <CloudRegular fontSize={15} className={styles.drawerServerIcon} />
                    <span className={styles.drawerServerName}>{srv.name}</span>
                    <button
                      className={`${styles.drawerServerBadge} ${srv.enabled ? styles.drawerServerBadgeOn : ''}`}
                      onClick={() => onActivateServer(srv.id)}
                    >
                      {srv.enabled ? 'Active' : 'Inactive'}
                    </button>
                    <Tooltip content="Remove server" relationship="label">
                      <button
                        className={styles.drawerServerRemove}
                        onClick={() => onRemoveServer(srv.id)}
                      >
                        <DeleteRegular fontSize={14} />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Row 2: URL */}
                  <div className={styles.drawerServerUrl}>{srv.url}</div>

                  {/* Row 3: connection info + expand */}
                  <button
                    className={styles.drawerServerFooter}
                    onClick={() => toggleServerExpand(srv.id)}
                  >
                    <span className={styles.drawerServerConnText}>
                      {srv.enabled ? 'Connected' : '—'}
                    </span>
                    {expandedServers.has(srv.id)
                      ? <ChevronDownRegular fontSize={11} style={{ opacity: 0.3 }} />
                      : <ChevronRightRegular fontSize={11} style={{ opacity: 0.3 }} />
                    }
                  </button>

                  {expandedServers.has(srv.id) && (
                    <div className={styles.drawerServerTools}>
                      <p className={styles.drawerEmpty} style={{ padding: '4px 0 0 0' }}>
                        Tools discovered on connect
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* ═══ Add new MCP server ═══ */}
          <div className={styles.drawerSection}>
            <button
              className={styles.drawerSectionHeader}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <AddRegular fontSize={16} style={{ opacity: 0.6 }} />
              <span className={styles.drawerSectionTitle}>Add MCP Server</span>
              {showAddForm
                ? <ChevronDownRegular fontSize={12} style={{ opacity: 0.4 }} />
                : <ChevronRightRegular fontSize={12} style={{ opacity: 0.4 }} />
              }
            </button>

            {showAddForm && (
            <div className={styles.drawerAddForm}>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.currentTarget.value)}
                placeholder="Display name (e.g. Weather API)"
                style={{ height: 30, fontSize: 10, width: '100%', marginBottom: 10 }}
              />
              <Input
                value={addUrl}
                onChange={(e) => setAddUrl(e.currentTarget.value)}
                placeholder="MCP URL (e.g. http://x:9001/mcp)"
                style={{ height: 30, fontSize: 10, width: '100%', marginBottom: 10 }}
              />
              <Input
                value={addApiKey}
                onChange={(e) => setAddApiKey(e.currentTarget.value)}
                placeholder="API Key (optional)"
                style={{ height: 30, fontSize: 10, width: '100%', marginBottom: 12 }}
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
              {addError && (
                <div className={styles.drawerTestFail}>
                  <ErrorCircleRegular fontSize={14} /> {addError}
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
