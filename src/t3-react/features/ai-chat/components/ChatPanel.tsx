/**
 * ChatPanel — Main chat orchestrator for the AI Assistant page.
 *
 * Composes:
 *   - Header bar (title + New Chat button)
 *   - EmptyState (when no messages) / ChatMessage list
 *   - Streaming indicator during active generation
 *   - ChatInput (sticky bottom)
 *
 * Uses Fluent UI design tokens via shared AiChat.styles.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import {
  DismissRegular,
  ArrowDownRegular,
  BotSparkleRegular,
  SettingsRegular,
} from '@fluentui/react-icons';
import { useAiChatStream } from '../hooks/useAiChatStream';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { SettingsDrawer } from './SettingsDrawer';
import type { AiProviderSettings, ProviderType } from './SettingsDrawer';
import styles from '../AiChat.module.css';

const DEFAULT_SETTINGS: AiProviderSettings = {
  provider: 'local',
  endpoint: 'http://localhost:11434/v1',
  model: 'llama3.1:8b',
  apiKey: '',
};

export const ChatPanel: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiProviderSettings>(DEFAULT_SETTINGS);

  const {
    messages,
    isStreaming,
    streamingText,
    activeToolCalls,
    sendMessage,
    abort,
    clearSession,
  } = useAiChatStream(aiSettings);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // ── Auto-scroll logic ──
  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, isNearBottom]);

  // Show scroll-to-bottom button when not near bottom
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handleScroll = () => setShowScrollBtn(!isNearBottom());
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSelectQuestion = useCallback(
    (question: string) => sendMessage(question),
    [sendMessage],
  );

  const hasMessages = messages.length > 0;
  const showStreamingBubble = isStreaming && streamingText;

  const providerLabel = `${aiSettings.provider}:${aiSettings.model}`;

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <BotSparkleRegular style={{ fontSize: 20 }} />
          AI Assistant
        </div>
        <div className={styles.headerActions}>
          <Tooltip content="AI provider settings" relationship="label">
            <Button
              appearance="subtle"
              icon={<SettingsRegular />}
              size="small"
              onClick={() => setSettingsOpen(true)}
            />
          </Tooltip>
          {hasMessages && (
            <Tooltip content="Start a new conversation" relationship="label">
              <Button
                appearance="subtle"
                icon={<DismissRegular />}
                size="small"
                onClick={clearSession}
              >
                New Chat
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ── Messages area ── */}
      <div className={styles.messagesArea} ref={messagesContainerRef}>
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

        {/* Scroll-to-bottom FAB */}
        {showScrollBtn && (
          <button
            className={styles.scrollButton}
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <ArrowDownRegular style={{ fontSize: 16 }} />
          </button>
        )}
      </div>

      {/* ── Input bar ── */}
      <ChatInput
        onSend={sendMessage}
        onAbort={abort}
        isStreaming={isStreaming}
        providerLabel={providerLabel}
      />

      {/* ── Settings Drawer ── */}
      <SettingsDrawer
        open={settingsOpen}
        settings={aiSettings}
        onSave={(s) => { setAiSettings(s); setSettingsOpen(false); }}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
