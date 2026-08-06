/**
 * ChatSidebar — Copilot-style sidebar.
 *
 * Matches Copilot's design: flat items, no buttons, just hover highlights.
 */

import React, { useState } from 'react';
import { Tooltip } from '@fluentui/react-components';
import {
  AddRegular,
  DeleteRegular,
  NavigationRegular,
  SettingsRegular,
  WrenchRegular,
  BoxRegular,
  GlobeRegular,
  PanelRightExpandRegular,
} from '@fluentui/react-icons';
import type { SessionSummary } from '../hooks/useChatHistory';
import type { McpServerInfo } from '../hooks/useMcpServers';
import styles from '../AiChat.module.css';

interface Props {
  collapsed: boolean;
  sessions: SessionSummary[];
  activeSessionId: string | null;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  mcpServers?: McpServerInfo[];
  onOpenTools: () => void;
  onBackToPanel?: () => void;
  providerLabel?: string;
  builtInToolCount?: number;
}

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const ChatSidebar: React.FC<Props> = ({
  collapsed,
  sessions,
  activeSessionId,
  onToggleCollapse,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onOpenSettings,
  mcpServers = [],
  onOpenTools,
  onBackToPanel,
  providerLabel = '',
  builtInToolCount = 44,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const extCount = mcpServers.filter((s) => s.enabled).length;

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        {!collapsed && <span className={styles.sidebarTitle}>AI Assistant</span>}
        <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
          {!collapsed && onBackToPanel && (
            <Tooltip content="Back to sidebar" relationship="label">
              <button className={styles.sidebarIconBtn} onClick={onBackToPanel}>
                <PanelRightExpandRegular />
              </button>
            </Tooltip>
          )}
          <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} relationship="label">
            <button className={styles.sidebarIconBtn} onClick={onToggleCollapse}>
              <NavigationRegular />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* New Chat — flat item, not a button */}
      {!collapsed && (
        <button className={styles.sidebarNewChatItem} onClick={onNewChat}>
          <AddRegular fontSize={16} style={{ marginRight: 8 }} />
          New chat
        </button>
      )}

      {/* History list */}
      {!collapsed && (
        <div className={styles.sidebarHistory}>
          {sessions.length === 0 ? (
            <p className={styles.sidebarEmpty}>No conversations yet</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                className={`${styles.sidebarItem} ${
                  s.id === activeSessionId ? styles.sidebarItemActive : ''
                }`}
                onClick={() => onSelectSession(s.id)}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className={styles.sidebarItemContent}>
                  <span className={styles.sidebarItemTitle}>{s.title}</span>
                  <span className={styles.sidebarItemMeta}>
                    {formatDate(s.created_at)} · {s.message_count} msgs
                  </span>
                </div>
                {hoveredId === s.id && (
                  <Tooltip content="Delete conversation" relationship="label">
                    <button
                      className={styles.sidebarItemDelete}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(s.id);
                      }}
                    >
                      <DeleteRegular fontSize={14} />
                    </button>
                  </Tooltip>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Tools panel ── */}
      {!collapsed && (
        <div className={styles.toolsPanel}>
          <button className={styles.toolsPanelHeader} onClick={onOpenTools}>
            <span className={styles.toolsPanelLabel}>
              <WrenchRegular fontSize={16} style={{ marginRight: 5 }} />
              Tools
            </span>
            <span className={styles.sidebarItemMeta} style={{ fontSize: 10 }}>
              {builtInToolCount}{extCount > 0 ? ` + ${extCount}` : ''}
            </span>
          </button>

          <div className={styles.toolsPanelBody}>
            {/* Built-in */}
            <div className={styles.toolsPanelItem}>
              <BoxRegular fontSize={16} className={styles.toolsPanelItemIcon} />
              <div className={styles.toolsPanelItemContent}>
                <span className={styles.toolsPanelItemTitle}>
                  Built-in T3000 MCP
                  <span className={styles.activeTag}>Active</span>
                </span>
                <span className={styles.toolsPanelItemMeta}>{builtInToolCount} tools</span>
              </div>
            </div>

            {/* External — show first active server only */}
            {(() => {
              const active = mcpServers.filter((s) => s.enabled)[0];
              if (active) {
                return (
                  <div className={styles.toolsPanelItem}>
                    <GlobeRegular fontSize={16} className={styles.toolsPanelItemIcon} />
                    <div className={styles.toolsPanelItemContent}>
                      <span className={styles.toolsPanelItemTitle}>
                        {active.name}
                        <span className={styles.activeTag}>Active</span>
                      </span>
                      <span className={styles.toolsPanelItemMeta} title={active.url}>
                        {active.url.length > 28 ? active.url.slice(0, 28) + '…' : active.url}
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <button className={styles.toolsPanelAddHint} onClick={onOpenTools}>
                  <AddRegular fontSize={16} className={styles.toolsPanelItemIcon} style={{ opacity: 0.4 }} />
                  <span className={styles.toolsPanelItemMeta} style={{ fontStyle: 'italic' }}>
                    Connect external MCP server
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className={styles.sidebarFooter}>
        {!collapsed ? (
          <button className={styles.sidebarFooterItem} onClick={onOpenSettings}>
            <SettingsRegular fontSize={16} style={{ marginRight: 8 }} />
            Settings
          </button>
        ) : (
          <Tooltip content="Settings" relationship="label">
            <button className={styles.sidebarIconBtn} onClick={onOpenSettings}>
              <SettingsRegular />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
