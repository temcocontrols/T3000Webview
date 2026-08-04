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
} from '@fluentui/react-icons';
import type { SessionSummary } from '../hooks/useChatHistory';
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
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        {!collapsed && <span className={styles.sidebarTitle}>AI Assistant</span>}
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} relationship="label">
          <button
            className={styles.sidebarIconBtn}
            onClick={onToggleCollapse}
          >
            <NavigationRegular />
          </button>
        </Tooltip>
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

      {/* Settings — flat item at bottom */}
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
