/**
 * ChatInput — Sticky input bar at the bottom of the chat panel.
 *
 * Features:
 *   - Auto-growing textarea (Enter to send, Shift+Enter for newline)
 *   - Send button toggles to [STOP] when streaming
 *   - Provider badge showing current model
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  onSend: (content: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  providerLabel?: string; // e.g. "local:llama3.1:8b"
}

export const ChatInput: React.FC<Props> = ({
  onSend,
  onAbort,
  isStreaming,
  providerLabel = 'local:llama3.1:8b',
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    }
  }, [value]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div
      style={{
        borderTop: '1px solid var(--colorNeutralStroke2, #e0e0e0)',
        padding: '12px 16px',
        background: 'var(--colorNeutralBackground1, #fff)',
      }}
    >
      {/* Provider badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 10,
            background: 'var(--colorNeutralBackground3, #e0e0e0)',
            color: 'var(--colorNeutralForeground2, #555)',
          }}
        >
          {providerLabel}
        </span>
        {isStreaming && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--colorBrandForeground1, #0078d4)',
            }}
          >
            ● Streaming
          </span>
        )}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isStreaming}
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            border: '1px solid var(--colorNeutralStroke1, #d1d1d1)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 14,
            fontFamily: 'inherit',
            lineHeight: 1.5,
            outline: 'none',
            background: isStreaming
              ? 'var(--colorNeutralBackground2, #f5f5f5)'
              : 'var(--colorNeutralBackground1, #fff)',
          }}
        />

        {isStreaming ? (
          <button
            onClick={onAbort}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--colorStatusDangerBorder1, #d13438)',
              background: 'var(--colorStatusDangerBackground1, #fde7e9)',
              color: 'var(--colorStatusDangerForeground1, #a4262c)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: 'nowrap',
            }}
          >
            STOP
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: value.trim()
                ? 'var(--colorBrandBackground, #0078d4)'
                : 'var(--colorNeutralBackground3, #e0e0e0)',
              color: value.trim() ? '#fff' : 'var(--colorNeutralForeground3, #888)',
              cursor: value.trim() ? 'pointer' : 'default',
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: 'nowrap',
            }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
};
