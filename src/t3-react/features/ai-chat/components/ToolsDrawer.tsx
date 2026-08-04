/**
 * ToolsDrawer — Slide-in drawer for browsing & managing MCP tools.
 */

import React, { useState, useCallback } from 'react';
import { Button, Input, Tooltip } from '@fluentui/react-components';
import {
  DismissRegular,
  SearchRegular,
  AddRegular,
  DeleteRegular,
} from '@fluentui/react-icons';
import type { McpServerInfo } from '../hooks/useMcpServers';
import styles from '../AiChat.module.css';

interface Props {
  open: boolean;
  mcpServers: McpServerInfo[];
  onClose: () => void;
  onAddServer: () => void;
  onRemoveServer: (id: string) => void;
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

export const ToolsDrawer: React.FC<Props> = ({
  open,
  mcpServers,
  onClose,
  onAddServer,
  onRemoveServer,
}) => {
  const [search, setSearch] = useState('');

  const filtered = search
    ? BUILTIN_TOOLS.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
    : BUILTIN_TOOLS;

  return (
    <>
      {open && <div className={styles.drawerBackdrop} onClick={onClose} />}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderTitle}>
            <SearchRegular style={{ fontSize: 16, opacity: 0.6 }} />
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

          {/* Built-in */}
          <div className={styles.toolsSubHeader}>Built-in ({BUILTIN_TOOLS.length})</div>
          <div className={styles.toolsChecklist}>
            {filtered.map((t) => (
              <label key={t} className={styles.toolsCheckItem}>
                <input type="checkbox" defaultChecked readOnly className={styles.toolsCheckbox} />
                <span>{t}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)', padding: 8 }}>No tools found</p>
            )}
          </div>

          {/* External servers */}
          {mcpServers.length > 0 && (
            <>
              <div className={styles.toolsSubHeader} style={{ marginTop: 20 }}>
                External ({mcpServers.length})
              </div>
              {mcpServers.map((srv) => (
                <div key={srv.id} className={styles.toolsServerCard}>
                  <div>
                    <span className={srv.enabled ? styles.statusDot : styles.statusDotOff} />
                    <span className={styles.toolsServerName}>{srv.name}</span>
                    <span className={styles.toolsServerUrl}>{srv.url}</span>
                  </div>
                  <Tooltip content="Remove server" relationship="label">
                    <button className={styles.sidebarIconBtn} onClick={() => onRemoveServer(srv.id)}>
                      <DeleteRegular fontSize={14} />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </>
          )}

          <button className={styles.toolsAddBtn} onClick={onAddServer} style={{ marginTop: 16 }}>
            <AddRegular fontSize={12} style={{ marginRight: 4 }} />
            Add server
          </button>
        </div>
      </div>
    </>
  );
};
