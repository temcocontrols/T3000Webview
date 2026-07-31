/**
 * ChatMessage — Single message bubble for the chat panel.
 *
 * User messages: right-aligned, blue background.
 * AI messages: left-aligned, neutral background, with collapsible tool call cards.
 * System messages: centered, muted text (errors / info).
 */

import React, { useState } from 'react';
import type { ChatMessage as ChatMessageType, ToolCallRecord } from '../hooks/useAiChatStream';

interface Props {
  message: ChatMessageType;
  isStreaming?: boolean;
}

const formatTime = (ts: number): string => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ToolCallCard: React.FC<{ tool: ToolCallRecord }> = ({ tool }) => {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = tool.status === 'pending' ? '⏳' : tool.status === 'error' ? '❌' : '✅';
  const statusLabel = tool.status === 'pending' ? 'Running...' : tool.status === 'error' ? 'Failed' : 'Done';

  return (
    <div
      style={{
        marginTop: 8,
        border: '1px solid var(--colorNeutralStroke1, #d1d1d1)',
        borderRadius: 6,
        overflow: 'hidden',
        fontSize: 13,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'var(--colorNeutralBackground2, #f5f5f5)',
          border: 'none',
          cursor: 'pointer',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        <span>{statusIcon}</span>
        <span style={{ fontWeight: 600 }}>{tool.name}</span>
        <span style={{ color: 'var(--colorNeutralForeground3, #888)', marginLeft: 'auto' }}>
          {statusLabel}
        </span>
        <span style={{ fontSize: 11 }}>{expanded ? '▴' : '▾'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '8px 10px', background: 'var(--colorNeutralBackground1, #fff)' }}>
          {tool.args && (
            <div style={{ marginBottom: 4 }}>
              <strong>Args:</strong>{' '}
              <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{tool.args}</code>
            </div>
          )}
          {tool.result && (
            <div>
              <strong>Result:</strong>{' '}
              <code style={{ fontSize: 12, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                {tool.result.length > 500
                  ? tool.result.slice(0, 500) + '…'
                  : tool.result}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ChatMessage: React.FC<Props> = ({ message, isStreaming }) => {
  if (message.role === 'system') {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '8px 16px',
          color: 'var(--colorNeutralForeground3, #888)',
          fontSize: 13,
          fontStyle: 'italic',
        }}
      >
        {message.content}
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
        padding: '0 8px',
      }}
    >
      {/* Role label */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--colorNeutralForeground3, #888)',
          marginBottom: 4,
        }}
      >
        {isUser ? 'You' : 'AI'} · {formatTime(message.timestamp)}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '80%',
          padding: '10px 14px',
          borderRadius: 12,
          background: isUser
            ? 'var(--colorBrandBackground, #0078d4)'
            : 'var(--colorNeutralBackground2, #f0f0f0)',
          color: isUser ? '#fff' : 'var(--colorNeutralForeground1, #222)',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content || (isStreaming ? '▊' : '')}

        {/* Tool call cards */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} tool={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
