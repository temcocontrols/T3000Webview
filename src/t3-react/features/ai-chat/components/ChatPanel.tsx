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
import { useMcpServers } from '../hooks/useMcpServers';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { ChatSidebar } from './ChatSidebar';
import { SettingsDrawer } from './SettingsDrawer';
import { ToolsDrawer } from './ToolsDrawer';
import type { AiProviderSettings } from './SettingsDrawer';
import styles from '../AiChat.module.css';

const DEFAULT_SETTINGS: AiProviderSettings = {
  provider: 'local',
  endpoint: 'http://localhost:11434/v1',
  model: 'llama3.1:8b',
  apiKey: '',
};

const STORAGE_KEY = 't3.ai.settings';

const loadSettings = (): AiProviderSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SETTINGS;
};

const saveSettings = (s: AiProviderSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
};

export const ChatPanel: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiProviderSettings>(loadSettings);

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    deleteSession,
    refreshSessions,
  } = useChatHistory();

  const {
    servers: mcpServers,
    addServer,
    removeServer,
    activateServer,
    testServer,
  } = useMcpServers();

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

  const handleInputResize = useCallback(() => {
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [isNearBottom, scrollToBottom]);

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
        mcpServers={mcpServers}
        onOpenTools={() => setToolsOpen(true)}
        providerLabel={providerLabel}
        builtInToolCount={44}
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
        onResize={handleInputResize}
      />

      {/* ── Model info + disclaimer (clickable → opens settings) ── */}
      <button className={styles.modelInfoRow} onClick={() => setSettingsOpen(true)}>
        <span className={styles.modelInfoBadge}>{providerLabel}</span>
        <span className={styles.modelInfoHint}>
          AI can make mistakes. Always verify critical building data before taking action.
        </span>
      </button>

      {/* ── Settings Drawer ── */}
        <SettingsDrawer
          open={settingsOpen}
          settings={aiSettings}
          onSave={(s) => { setAiSettings(s); saveSettings(s); setSettingsOpen(false); }}
          onClose={() => setSettingsOpen(false)}
        />

      {/* ── Tools Drawer ── */}
      <ToolsDrawer
        open={toolsOpen}
        mcpServers={mcpServers}
        onClose={() => setToolsOpen(false)}
        onAddServer={addServer}
        onRemoveServer={(id) => removeServer(id)}
        onActivateServer={(id) => activateServer(id)}
        onTestServer={testServer}
      />
      </div>
    </div>
  );
};
