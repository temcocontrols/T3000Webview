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
import { ArrowDownRegular, BotSparkleRegular } from '@fluentui/react-icons';
import { useAiChatStream } from '../hooks/useAiChatStream';
import { useChatHistory } from '../hooks/useChatHistory';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { ChatSidebar } from './ChatSidebar';
import { SettingsDrawer } from './SettingsDrawer';
import type { AiProviderSettings } from './SettingsDrawer';
import styles from '../AiChat.module.css';

const DEFAULT_SETTINGS: AiProviderSettings = {
  provider: 'local',
  endpoint: 'http://localhost:11434/v1',
  model: 'llama3.1:8b',
  apiKey: '',
};

export const ChatPanel: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiProviderSettings>(DEFAULT_SETTINGS);

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    deleteSession,
    refreshSessions,
  } = useChatHistory();

  const {
    messages,
    isStreaming,
    streamingText,
    activeToolCalls,
    sessionId,
    sendMessage,
    abort,
    clearSession,
  } = useAiChatStream(aiSettings);

  // Sync backend session ID to history sidebar
  const prevStreamingRef = useRef(isStreaming);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && sessionId && messages.length > 0) {
      setActiveSessionId(sessionId);
      refreshSessions();
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, sessionId, messages.length, setActiveSessionId, refreshSessions]);

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

  const activeSessionTitle = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId)?.title || ''
    : '';

  const handleNewChat = useCallback(() => {
    clearSession();
    setActiveSessionId(null);
  }, [clearSession, setActiveSessionId]);

  const handleSelectSession = useCallback(
    async (id: string) => {
      setActiveSessionId(id);
      // TODO: load messages from file via API and set them in the chat
      refreshSessions();
    },
    [setActiveSessionId, refreshSessions],
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteSession(id);
      refreshSessions();
    },
    [deleteSession, refreshSessions],
  );

  return (
    <div className={styles.layoutWrapper}>
      {/* ── Sidebar ── */}
      <ChatSidebar
        collapsed={sidebarCollapsed}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* ── Main chat area ── */}
      <div className={styles.root}>
        {/* ── Header — only visible when session is active ── */}
        {activeSessionTitle && (
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <BotSparkleRegular style={{ fontSize: 16 }} />
              <span>{activeSessionTitle}</span>
            </div>
            <div className={styles.headerActions} />
          </div>
        )}

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

      {/* ── Disclaimer ── */}
      <p className={styles.disclaimer}>
        AI may make mistakes. Verify important info.
      </p>

      {/* ── Settings Drawer ── */}
        <SettingsDrawer
          open={settingsOpen}
          settings={aiSettings}
          onSave={(s) => { setAiSettings(s); setSettingsOpen(false); }}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    </div>
  );
};
