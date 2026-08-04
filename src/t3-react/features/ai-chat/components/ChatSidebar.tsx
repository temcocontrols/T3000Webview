/**
 * ChatSidebar — Copilot-style collapsible sidebar.
 *
 * Shows:
 *   - + New Chat button
 *   - Conversation history (scrollable)
 *   - Settings button at bottom
 */

import React, { useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import {
  AddRegular,
  DismissRegular,
  DeleteRegular,
  PanelLeftContractRegular,
  PanelLeftExpandRegular,
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
        {!collapsed && <span className={styles.sidebarTitle}>Chats</span>}
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} relationship="label">
          <Button
            appearance="subtle"
            icon={collapsed ? <PanelLeftExpandRegular /> : <PanelLeftContractRegular />}
            size="small"
            onClick={onToggleCollapse}
          />
        </Tooltip>
      </div>

      {/* New Chat button */}
      {!collapsed && (
        <div className={styles.sidebarNewChat}>
          <Button
            appearance="primary"
            icon={<AddRegular />}
            size="small"
            onClick={onNewChat}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            New Chat
          </Button>
        </div>
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

      {/* Settings at bottom */}
      <div className={styles.sidebarFooter}>
        {!collapsed ? (
          <Button
            appearance="subtle"
            icon={<SettingsRegular />}
            size="small"
            onClick={onOpenSettings}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            Settings
          </Button>
        ) : (
          <Tooltip content="Settings" relationship="label">
            <Button
              appearance="subtle"
              icon={<SettingsRegular />}
              size="small"
              onClick={onOpenSettings}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
};
