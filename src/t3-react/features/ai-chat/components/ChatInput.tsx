/**
 * ChatInput — Sticky input bar at the bottom of the chat panel.
 *
 * Features:
 *   - Auto-growing textarea (Enter to send, Shift+Enter for newline)
 *   - Send button toggles to [STOP] when streaming
 *   - Provider badge showing current model
 *
 * Uses Fluent UI design tokens via shared AiChat.styles.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowCircleUpRegular, ArrowCircleUpFilled, DismissCircleRegular } from '@fluentui/react-icons';
import styles from '../AiChat.module.css';

interface Props {
  onSend: (content: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  onResize?: () => void;
  placeholder?: string;
}

export const ChatInput: React.FC<Props> = ({
  onSend,
  onAbort,
  isStreaming,
  onResize,
  placeholder = 'Ask anything about your building\u2026',
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevHeightRef = useRef(0);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      const newHeight = Math.min(el.scrollHeight, 150);
      el.style.height = newHeight + 'px';
      if (newHeight !== prevHeightRef.current) {
        prevHeightRef.current = newHeight;
        onResize?.();
      }
    }
  }, [value, onResize]);

  // Refocus textarea after streaming completes
  useEffect(() => {
    if (!isStreaming) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
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
      // Esc to abort streaming
      if (e.key === 'Escape' && isStreaming) {
        e.preventDefault();
        onAbort();
      }
    },
    [handleSend, isStreaming, onAbort],
  );

  return (
    <div className={styles.inputArea}>
      {/* Input row */}
      <div className={styles.inputRow}>
        <div className={styles.inputTextareaWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.inputTextarea}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'AI is responding\u2026' : placeholder}
            disabled={isStreaming}
            rows={2}
            aria-label="Chat message input"
          />

          {/* Send / Stop button */}
          <div className={styles.inputSendBtnRow}>
            {isStreaming ? (
              <button
                className={`${styles.inputSendBtn} ${styles.inputSendBtnActive}`}
                onClick={onAbort}
                title="Stop generating"
                aria-label="Stop generating"
              >
                <DismissCircleRegular style={{ fontSize: 18 }} />
              </button>
            ) : (
              <button
                className={`${styles.inputSendBtn} ${value.trim() ? styles.inputSendBtnActive : ''}`}
                onClick={handleSend}
                disabled={!value.trim()}
                title="Send message"
                aria-label="Send message"
              >
                {value.trim() ? (
                  <ArrowCircleUpFilled style={{ fontSize: 18 }} />
                ) : (
                  <ArrowCircleUpRegular style={{ fontSize: 18 }} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
