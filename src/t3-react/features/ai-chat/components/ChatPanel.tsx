/**
 * ChatPanel — Main chat orchestrator.
 *
 * Composes: EmptyState (when no messages), ChatMessage list (scrollable),
 * streaming indicator, and ChatInput (sticky bottom).
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useAiChatStream } from '../hooks/useAiChatStream';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';

export const ChatPanel: React.FC = () => {
  const {
    messages,
    isStreaming,
    streamingText,
    activeToolCalls,
    sendMessage,
    abort,
    clearSession,
  } = useAiChatStream();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming text
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSelectQuestion = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage],
  );

  const hasMessages = messages.length > 0;
  const showStreamingBubble = isStreaming && streamingText;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--colorNeutralStroke2, #e0e0e0)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>AI Assistant</h3>
        {hasMessages && (
          <button
            onClick={clearSession}
            style={{
              background: 'none',
              border: '1px solid var(--colorNeutralStroke1, #d1d1d1)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
              color: 'var(--colorNeutralForeground2, #555)',
            }}
          >
            New Chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 0',
        }}
      >
        {!hasMessages ? (
          <EmptyState onSelectQuestion={handleSelectQuestion} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}

            {/* Streaming bubble */}
            {showStreamingBubble && (
              <ChatMessage
                message={{
                  role: 'assistant',
                  content: streamingText,
                  timestamp: Date.now(),
                  toolCalls: Array.from(activeToolCalls.values()),
                }}
                isStreaming
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <ChatInput onSend={sendMessage} onAbort={abort} isStreaming={isStreaming} />
    </div>
  );
};
