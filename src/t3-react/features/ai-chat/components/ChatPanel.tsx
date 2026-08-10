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
import { useNavigate } from 'react-router-dom';
import { ArrowDownRegular, BotSparkleRegular, AddRegular, WrenchRegular, SettingsRegular, ArrowExpandRegular, DismissRegular, ArrowSyncRegular, HistoryRegular, DeleteRegular } from '@fluentui/react-icons';
import { useAiChatStream } from '../hooks/useAiChatStream';
import { useChatHistory } from '../hooks/useChatHistory';
import { useMcpServers } from '../hooks/useMcpServers';
import { useChatStore } from '../../../store/chatStore';
import { useUIStore } from '../../../store/uiStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { ChatSidebar } from './ChatSidebar';
import { SettingsDrawer } from './SettingsDrawer';
import { ToolsDrawer } from './ToolsDrawer';
import { Popover, PopoverTrigger, PopoverSurface, Button } from '@fluentui/react-components';
import type { AiProviderSettings, ProviderType } from './SettingsDrawer';
import styles from '../AiChat.module.css';

const DEFAULT_SETTINGS: AiProviderSettings = {
  provider: 'local',
  endpoint: 'http://localhost:11434/v1',
  model: 'llama3.1:8b',
  apiKey: '',
};

const STORAGE_KEY = 't3.ai.settings';
const PROVIDER_CACHE_KEY = 't3.ai.providerCache';

type ProviderCache = Record<ProviderType, Pick<AiProviderSettings, 'endpoint' | 'model' | 'apiKey'>>;

const DEFAULT_CACHE: ProviderCache = {
  local: { endpoint: 'http://localhost:11434/v1', model: 'llama3.1:8b', apiKey: '' },
  anthropic: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022', apiKey: '' },
  gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash', apiKey: '' },
};

const loadProviderCache = (): ProviderCache => {
  try {
    const raw = localStorage.getItem(PROVIDER_CACHE_KEY);
    if (raw) return { ...DEFAULT_CACHE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CACHE;
};

const saveProviderCache = (cache: ProviderCache) => {
  try {
    localStorage.setItem(PROVIDER_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

const loadSettings = (): AiProviderSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old format: if provider-specific cache doesn't exist, seed it from current settings
      if (!localStorage.getItem(PROVIDER_CACHE_KEY)) {
        const cache = loadProviderCache();
        cache[parsed.provider] = { endpoint: parsed.endpoint, model: parsed.model, apiKey: parsed.apiKey || '' };
        saveProviderCache(cache);
      }
      return parsed;
    }
  } catch {}
  return DEFAULT_SETTINGS;
};

const saveSettings = (s: AiProviderSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    // Also update the per-provider cache
    const cache = loadProviderCache();
    cache[s.provider] = { endpoint: s.endpoint, model: s.model, apiKey: s.apiKey || '' };
    saveProviderCache(cache);
  } catch {}
};

interface ChatPanelProps {
  variant?: 'full' | 'panel';
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ variant = 'full' }) => {
  const isPanel = variant === 'panel';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyHoveredId, setHistoryHoveredId] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiProviderSettings>(loadSettings);
  const [providerCache, setProviderCache] = useState<ProviderCache>(loadProviderCache);
  const navigate = useNavigate();
  const setChatMode = useUIStore((s) => s.setChatMode);
  const setPreviousPageHash = useChatStore((s) => s.setPreviousPageHash);
  const previousPageHash = useChatStore((s) => s.previousPageHash);
  const storeSetMessages = useChatStore((s) => s.setMessages);

  const handleBackToPanel = useCallback(() => {
    setChatMode('sidebar');
    const target = previousPageHash?.replace(/^#/, '') || '/t3000/dashboard';
    navigate(target.startsWith('/') ? target : `/${target}`);
  }, [setChatMode, previousPageHash, navigate]);

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    deleteSession,
    refreshSessions,
    loadSessionMessages,
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
    streamingSteps,
    activeToolCalls,
    sessionId,
    sendMessage,
    abort,
    clearSession,
  } = useAiChatStream(aiSettings, refreshSessions);

  const streamingBlocks = useChatStore((s) => s.streamingBlocks);

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
    const el = messagesContainerRef.current;
    if (!el) return;
    // Instant scroll during streaming to keep up with rapid updates
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingText, streamingSteps]);

  // Show scroll-to-bottom button when not near bottom
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handleScroll = () => setShowScrollBtn(!isNearBottom());
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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
  const showStreamingBubble = isStreaming && (streamingText || streamingSteps.length > 0);
  const showThinkingIndicator = isStreaming && !streamingText && streamingSteps.length === 0;

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
      const msgs = await loadSessionMessages(id);
      if (msgs.length > 0) {
        storeSetMessages(msgs);
        // Scroll to bottom after render
        setTimeout(() => {
          const el = messagesContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        }, 100);
      }
      refreshSessions();
    },
    [setActiveSessionId, loadSessionMessages, storeSetMessages, refreshSessions],
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteSession(id);
      if (activeSessionId === id) {
        storeSetMessages([]);
      }
      refreshSessions();
    },
    [deleteSession, refreshSessions, activeSessionId, storeSetMessages],
  );

  const handleClearAll = useCallback(() => {
    sessions.forEach((s) => deleteSession(s.id));
    storeSetMessages([]);
    setClearAllOpen(false);
  }, [sessions, deleteSession, storeSetMessages]);

  return (
    <div className={styles.layoutWrapper}>
      {/* ── Sidebar (hidden in overlay mode) ── */}
      {!isPanel && (
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
          onClearAll={handleClearAll}
          onBackToPanel={handleBackToPanel}
          providerLabel={providerLabel}
          builtInToolCount="50+"
        />
      )}

      {/* ── Main chat area ── */}
      <div className={styles.root}>
        {/* ── Compact toolbar (overlay mode) ── */}
        {isPanel && (
          <div className={styles.compactToolbar}>
            <button className={styles.compactToolbarBtn} onClick={handleNewChat} title="New chat">
              <AddRegular style={{ fontSize: 16 }} />
            </button>
            <button className={styles.compactToolbarBtn} onClick={() => setToolsOpen(true)} title="Tools">
              <WrenchRegular style={{ fontSize: 16 }} />
            </button>
            <button className={styles.compactToolbarBtn} onClick={() => setSettingsOpen(true)} title="Settings">
              <SettingsRegular style={{ fontSize: 16 }} />
            </button>
            <button className={styles.compactToolbarBtn} onClick={() => { refreshSessions(); setHistoryOpen(true); }} title="History">
              <HistoryRegular style={{ fontSize: 16 }} />
            </button>
            <span className={styles.compactToolbarLabel}>{providerLabel}</span>
            <button className={styles.compactToolbarBtn} onClick={() => { setPreviousPageHash(window.location.hash.replace(/^#/, '')); setChatMode('full'); navigate('/t3000/ai-chat'); }} title="Open full screen">
              <ArrowExpandRegular style={{ fontSize: 16 }} />
            </button>
            <button className={styles.compactToolbarBtn} onClick={() => setChatMode('hidden')} title="Hide AI">
              <DismissRegular style={{ fontSize: 16 }} />
            </button>
          </div>
        )}

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
          <EmptyState onSelectQuestion={handleSelectQuestion} variant={isPanel ? 'panel' : 'full'} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}

            {/* Thinking indicator — shows immediately before any steps arrive */}
            {showThinkingIndicator && (
              <div className={styles.messageWrapper}>
                <div className={styles.messageMeta}>
                  <span className={styles.messageRole}>Model</span>
                </div>
                <div className={styles.thinkingIndicator}>
                  <ArrowSyncRegular style={{ fontSize: 14 }} />
                  <span>Thinking&hellip;</span>
                </div>
              </div>
            )}

            {/* Streaming bubble */}
            {showStreamingBubble && (
              <ChatMessage
                message={{
                  role: 'assistant',
                  content: streamingText,
                  thinkingSteps: streamingSteps,
                  messageBlocks: streamingBlocks.length > 0 ? streamingBlocks : undefined,
                  timestamp: Date.now(),
                  toolCalls: Object.values(activeToolCalls),
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
        placeholder={isPanel ? 'Ask anything — AI can make mistakes. Verify critical data.' : undefined}
      />

      {/* ── Model info + disclaimer (hidden in panel mode) ── */}
      {!isPanel && (
        <button className={styles.modelInfoRow} onClick={() => setSettingsOpen(true)}>
          <span className={styles.modelInfoBadge}>{providerLabel}</span>
          <span className={styles.modelInfoHint}>
            AI can make mistakes. Always verify critical building data before taking action.
          </span>
        </button>
      )}

      {/* ── History Drawer (panel mode) ── */}
      {isPanel && historyOpen && (
        <>
          <div className={styles.historyOverlay} onClick={() => setHistoryOpen(false)} />
          <div className={styles.historyDrawer}>
            <div className={styles.historyDrawerHeader}>
              <span className={styles.historyDrawerTitle}>History</span>
              <button className={styles.historyDrawerClose} onClick={() => setHistoryOpen(false)} title="Close">
                <DismissRegular style={{ fontSize: 14 }} />
              </button>
            </div>
            <div className={styles.historyDrawerList}>
              {sessions.length === 0 ? (
                <div className={styles.historyDrawerEmpty}>No conversations yet</div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`${styles.historyDrawerItem} ${s.id === activeSessionId ? styles.historyDrawerItemActive : ''}`}
                    onClick={() => { setActiveSessionId(s.id); setHistoryOpen(false); }}
                    onMouseEnter={() => setHistoryHoveredId(s.id)}
                    onMouseLeave={() => setHistoryHoveredId(null)}
                  >
                    <div className={styles.historyDrawerItemContent}>
                      <span className={styles.historyDrawerItemTitle}>{s.title || 'Untitled'}</span>
                      <span className={styles.historyDrawerItemMeta}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    {historyHoveredId === s.id && (
                      <button
                        className={styles.sidebarItemDelete}
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        title="Delete conversation"
                      >
                        <DeleteRegular fontSize={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className={styles.historyDrawerFooter}>
              <Popover open={clearAllOpen} onOpenChange={(_, d) => { if (!d.open) setClearAllOpen(false); }}>
                <PopoverTrigger disableButtonEnhancement>
                  <button className={styles.historyDrawerClearBtn} onClick={() => setClearAllOpen(true)}>
                    <DeleteRegular style={{ fontSize: 14 }} />
                    <span>Clear all chats</span>
                  </button>
                </PopoverTrigger>
                <PopoverSurface style={{ maxWidth: 300, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Clear all chats?</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 16 }}>
                    This action cannot be undone.
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button size="small" onClick={() => setClearAllOpen(false)}>Cancel</Button>
                    <Button size="small" appearance="primary" style={{ background: '#d32f2f' }} onClick={handleClearAll}>Delete all</Button>
                  </div>
                </PopoverSurface>
              </Popover>
            </div>
          </div>
        </>
      )}

      {/* ── Settings Drawer ── */}
      {settingsOpen && (
        <SettingsDrawer
          open={settingsOpen}
          settings={aiSettings}
          providerCache={providerCache}
          onSave={(s) => {
            setAiSettings(s);
            saveSettings(s);
            setProviderCache(loadProviderCache());
            setSettingsOpen(false);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* ── Tools Drawer ── */}
      {toolsOpen && (
        <ToolsDrawer
          open={toolsOpen}
          mcpServers={mcpServers}
          onClose={() => setToolsOpen(false)}
          onAddServer={addServer}
          onRemoveServer={(id) => removeServer(id)}
          onActivateServer={(id) => activateServer(id)}
          onTestServer={testServer}
        />
      )}
      </div>
    </div>
  );
};
