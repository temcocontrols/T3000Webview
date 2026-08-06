/**
 * ChatMessage — Single message bubble for the AI chat panel.
 *
 * - User messages: right-aligned, brand-colored bubble.
 * - AI messages: left-aligned, neutral bubble with full Markdown rendering.
 * - System messages: centered, muted text (errors / info).
 * - Thinking section: collapsible "Finished with N steps · Xs" block.
 * - Tool calls: compact inline tags that open a detail drawer.
 *
 * Uses Fluent UI design tokens via shared AiChat.styles.
 */

import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  CheckmarkCircleRegular,
  DismissCircleRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import styles from '../AiChat.module.css';
import type {
  ChatMessage as ChatMessageType,
  ToolCallRecord,
  ThinkingState,
} from '../hooks/useAiChatStream';

// Configure marked for safety
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface Props {
  message: ChatMessageType;
  isStreaming?: boolean;
}

// ── Helpers ──

const formatTime = (ts: number): string =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

function renderMarkdown(content: string): string {
  if (!content) return '';
  const raw = marked.parse(content) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'hr', 'img', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style'],
  });
}

// ── ThinkingSection ──

const ThinkingSection: React.FC<{
  thinking: ThinkingState;
  isStreaming?: boolean;
}> = ({ thinking, isStreaming }) => {
  const [expanded, setExpanded] = useState(isStreaming ?? true);

  if (isStreaming) {
    return (
      <div className={styles.thinkingSection}>
        <div className={styles.thinkingHeader}>
          <span className={styles.thinkingIcon}>
            <ArrowSyncRegular style={{ fontSize: 14 }} />
          </span>
          <span className={styles.thinkingLabel}>Thinking&hellip;</span>
          <span className={styles.thinkingCount}>{thinking.steps} steps</span>
        </div>
        <div className={styles.thinkingBody}>
          <div className={styles.thinkingContent}>{thinking.content}</div>
          <span className={styles.thinkingCursor}>▊</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.thinkingSection}>
      <button
        className={styles.thinkingToggle}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className={styles.thinkingToggleIcon}>{expanded ? '▾' : '▸'}</span>
        <span className={styles.thinkingToggleLabel}>
          Finished with {thinking.steps} steps &middot; {formatDuration(thinking.durationMs)}
        </span>
      </button>
      {expanded && (
        <div className={styles.thinkingBodyDone}>{thinking.content}</div>
      )}
    </div>
  );
};

// ── ToolCallDetailDrawer ── (replaced with inline expansion below)


// ── ToolCallTag ──

const ToolCallTag: React.FC<{
  tool: ToolCallRecord;
  onClick: () => void;
}> = ({ tool, onClick }) => {
  const isPending = tool.status === 'pending';
  const isError = tool.status === 'error';

  return (
    <button
      className={`${styles.toolTag} ${isPending ? styles.toolTagPending : ''} ${isError ? styles.toolTagError : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`${tool.name} — click for details`}
    >
      <span className={styles.toolTagIcon}>
        {isPending ? (
          <ArrowSyncRegular style={{ fontSize: 12 }} />
        ) : isError ? (
          <DismissCircleRegular style={{ fontSize: 12, color: 'var(--colorStatusDangerForeground1, #c50f1f)' }} />
        ) : (
          <CheckmarkCircleRegular style={{ fontSize: 12, color: 'var(--colorStatusSuccessForeground1, #107c10)' }} />
        )}
      </span>
      <span className={styles.toolTagName}>{tool.name}</span>
      <span className={styles.toolTagArrow}>→</span>
    </button>
  );
};

// ── ChatMessage ──

export const ChatMessage: React.FC<Props> = ({ message, isStreaming }) => {
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  // Pre-compute markdown for assistant messages
  const htmlContent = useMemo(() => {
    if (message.role !== 'assistant') return null;
    return renderMarkdown(message.content);
  }, [message.content, message.role]);

  // System message
  if (message.role === 'system') {
    const isError = message.content.startsWith('Error:');
    return (
      <div className={`${styles.systemMessage} ${isError ? styles.systemError : ''}`}>
        {message.content}
      </div>
    );
  }

  const isUser = message.role === 'user';
  const hasContent = !isUser && (htmlContent || (isStreaming && !message.thinking));
  const hasThinking = !isUser && message.thinking;
  const hasToolCalls = !isUser && message.toolCalls && message.toolCalls.length > 0;

  return (
    <div className={styles.messageWrapper}>
      {/* Meta: role label + timestamp */}
      <div className={styles.messageMeta}>
        <span className={styles.messageRole}>{isUser ? 'User' : 'Model'}</span>
        <span>{formatTime(message.timestamp)}</span>
      </div>

      {/* Thinking section — shows first */}
      {hasThinking && (
        <ThinkingSection thinking={message.thinking!} isStreaming={isStreaming && !message.content} />
      )}

      {/* Content */}
      {isUser ? (
        <div className={styles.userContent}>{message.content}</div>
      ) : hasContent ? (
        <div className={styles.mdWrapper} dangerouslySetInnerHTML={{ __html: htmlContent! }} />
      ) : isStreaming && !message.thinking ? (
        <span style={{ opacity: 0.5 }}>▊</span>
      ) : null}

      {/* Tool call tags — inline after content */}
      {hasToolCalls && (
        <div className={styles.toolTagsRow}>
          {message.toolCalls!.map((tc) => (
            <ToolCallTag
              key={tc.id}
              tool={tc}
              onClick={() => setExpandedToolId(expandedToolId === tc.id ? null : tc.id)}
            />
          ))}
        </div>
      )}

      {/* Inline tool detail expansion */}
      {hasToolCalls &&
        message.toolCalls!.map((tc) => {
          if (expandedToolId !== tc.id) return null;

          let formattedArgs = '';
          try { formattedArgs = JSON.stringify(JSON.parse(tc.args), null, 2); } catch { formattedArgs = tc.args || '(empty)'; }

          let formattedResult = '';
          if (tc.result) {
            try { formattedResult = JSON.stringify(JSON.parse(tc.result), null, 2); } catch { formattedResult = tc.result; }
          }

          const isPending = tc.status === 'pending';
          const isError = tc.status === 'error';

          return (
            <div key={`detail-${tc.id}`} className={styles.toolDetailInline}>
              <div className={styles.toolDetailStatus}>
                <span className={styles.toolDetailStatusIcon}>
                  {isPending ? (
                    <ArrowSyncRegular style={{ fontSize: 14 }} />
                  ) : isError ? (
                    <DismissCircleRegular style={{ fontSize: 14, color: 'var(--colorStatusDangerForeground1, #c50f1f)' }} />
                  ) : (
                    <CheckmarkCircleRegular style={{ fontSize: 14, color: 'var(--colorStatusSuccessForeground1, #107c10)' }} />
                  )}
                </span>
                <span>{tc.name}</span>
                <span className={styles.toolDetailStatusLabel}>
                  {isPending ? 'Running...' : isError ? 'Failed' : 'Completed'}
                </span>
              </div>
              <div className={styles.toolDetailSection}>
                <div className={styles.toolDetailSectionTitle}>Arguments</div>
                <pre className={styles.toolDetailPre}>{formattedArgs}</pre>
              </div>
              {formattedResult && (
                <div className={styles.toolDetailSection}>
                  <div className={styles.toolDetailSectionTitle}>Result</div>
                  <pre className={styles.toolDetailPre}>{formattedResult}</pre>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};
