/**
 * ChatMessage — Single message bubble for the AI chat panel.
 *
 * - User messages: right-aligned, brand-colored bubble.
 * - AI messages: left-aligned, neutral bubble with full Markdown rendering.
 * - System messages: centered, muted text (errors / info).
 * - Tool calls: collapsible cards showing args + result.
 *
 * Uses Fluent UI design tokens via shared AiChat.styles.
 */

import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import styles from '../AiChat.module.css';
import type { ChatMessage as ChatMessageType, ToolCallRecord } from '../hooks/useAiChatStream';

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

// ── ToolCallCard ──

const ToolCallCard: React.FC<{ tool: ToolCallRecord }> = ({ tool }) => {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = tool.status === 'pending' ? '⏳' : tool.status === 'error' ? '❌' : '✅';
  const statusLabel =
    tool.status === 'pending' ? 'Running...' : tool.status === 'error' ? 'Failed' : 'Done';

  let formattedArgs = '';
  try {
    formattedArgs = JSON.stringify(JSON.parse(tool.args), null, 2);
  } catch {
    formattedArgs = tool.args;
  }

  let formattedResult = '';
  if (tool.result) {
    try {
      formattedResult = JSON.stringify(JSON.parse(tool.result), null, 2);
    } catch {
      formattedResult = tool.result;
    }
  }

  return (
    <div className={styles.toolCard}>
      <button
        className={styles.toolCardHeader}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span>{statusIcon}</span>
        <span style={{ fontWeight: 600 }}>{tool.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7 }}>{statusLabel}</span>
        <span style={{ fontSize: 11 }}>{expanded ? '▴' : '▾'}</span>
      </button>
      {expanded && (
        <div className={styles.toolCardBody}>
          {tool.args && (
            <div style={{ marginBottom: 8 }}>
              <strong>Arguments:</strong>
              <pre
                style={{
                  margin: '4px 0 0 0',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {formattedArgs}
              </pre>
            </div>
          )}
          {formattedResult && (
            <div>
              <strong>Result:</strong>
              <pre
                style={{
                  margin: '4px 0 0 0',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  maxHeight: 160,
                  overflowY: 'auto',
                }}
              >
                {formattedResult.length > 800
                  ? formattedResult.slice(0, 800) + '\u2026'
                  : formattedResult}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── ChatMessage ──

export const ChatMessage: React.FC<Props> = ({ message, isStreaming }) => {
  // Pre-compute markdown for assistant messages
  const htmlContent = useMemo(() => {
    if (message.role !== 'assistant') return null;
    return renderMarkdown(message.content);
  }, [message.content, message.role]);

  // System message
  if (message.role === 'system') {
    return <div className={styles.systemMessage}>{message.content}</div>;
  }

  const isUser = message.role === 'user';

  return (
    <div className={styles.messageWrapper}>
      {/* Meta: role label + timestamp */}
      <div className={styles.messageMeta}>
        <span className={styles.messageRole}>{isUser ? 'User' : 'Model'}</span>
        <span>{formatTime(message.timestamp)}</span>
      </div>

      {/* Content */}
      {isUser ? (
        <div className={styles.userContent}>{message.content}</div>
      ) : htmlContent ? (
        <div className={styles.mdWrapper} dangerouslySetInnerHTML={{ __html: htmlContent }} />
      ) : isStreaming ? (
        <span style={{ opacity: 0.5, padding: '0 16px' }}>▊</span>
      ) : null}

      {/* Tool call cards */}
      {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
        <div style={{ marginTop: 10, padding: '0 16px' }}>
          {message.toolCalls.map((tc) => (
            <ToolCallCard key={tc.id} tool={tc} />
          ))}
        </div>
      )}
    </div>
  );
};
