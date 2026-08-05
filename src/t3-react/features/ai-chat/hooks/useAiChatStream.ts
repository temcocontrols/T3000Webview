/**
 * useAiChatStream — SSE client hook for the built-in AI chat page.
 *
 * Manages the full lifecycle:
 *   1. POST /api/ai/chat with fetch()
 *   2. Parse SSE stream via ReadableStream + TextDecoder
 *   3. Dispatch events: text_delta -> streaming text, tool_call -> pending card,
 *      tool_result -> resolved card, done -> finalize, error -> system message
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../../../config/constants';
import type { AiProviderSettings } from '../components/SettingsDrawer';

// ── Types ──

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCallRecord[];
  /** Reasoning/thinking state for this message */
  thinking?: ThinkingState;
  timestamp: number;
}

export interface ThinkingState {
  steps: number;
  durationMs: number;
  content: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  args: string;
  result?: string;
  status: 'pending' | 'success' | 'error';
}

interface StreamEvent {
  event: string;
  data?: {
    content?: string;
    id?: string;
    name?: string;
    args?: string;
    arguments?: string;
    result?: string;
    session_id?: string;
    message?: string;
    steps?: number;
    duration_ms?: number;
  };
}

export interface UseAiChatStreamReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  streamingThinking: ThinkingState | null;
  activeToolCalls: Map<string, ToolCallRecord>;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  abort: () => void;
  clearSession: () => void;
}

// ── Hook ──

export function useAiChatStream(settings: AiProviderSettings): UseAiChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingThinking, setStreamingThinking] = useState<ThinkingState | null>(null);
  const [activeToolCalls, setActiveToolCalls] = useState<Map<string, ToolCallRecord>>(new Map());
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs to avoid stale closures in sendMessage
  const messagesRef = useRef<ChatMessage[]>([]);
  const isStreamingRef = useRef(false);
  const streamingTextRef = useRef('');
  const sessionIdRef = useRef<string | null>(null);
  const settingsRef = useRef<AiProviderSettings>(settings);
  const abortRef = useRef<AbortController | null>(null);

  // Keep refs in sync with state
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { streamingTextRef.current = streamingText; }, [streamingText]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid) {
      try {
        await fetch(`${API_BASE_URL}/api/ai/sessions/${sid}`, { method: 'DELETE' });
      } catch {
        // Session may already be expired — ignore
      }
    }
    setMessages([]);
    setSessionId(null);
    setStreamingText('');
    setActiveToolCalls(new Map());
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreamingRef.current) return;

      // Capture current state via refs (stable, no deps needed)
      const currentMessages = messagesRef.current;
      const currentSessionId = sessionIdRef.current;
      const s = settingsRef.current;

      // Add user message to state
      const userMsg: ChatMessage = {
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingText('');
      setStreamingThinking(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Build messages array: all previous + the new user message
        const apiMessages = [
          ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: trimmed },
        ];

        const body = JSON.stringify({
          provider: s.provider,
          model: s.model,
          messages: apiMessages,
          session_id: currentSessionId,
          settings: {
            endpoint: s.endpoint,
            api_key: s.apiKey || '',
          },
        });

        const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          setMessages((prev) => [
            ...prev,
            {
              role: 'system',
              content: `Error: Server returned ${response.status}. ${errorText || 'Please check that the LLM server is running.'}`,
              timestamp: Date.now(),
            },
          ]);
          setIsStreaming(false);
          return;
        }

        if (!response.body) {
          throw new Error('No response body — SSE not supported');
        }

        // Parse SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantContent = '';
        const toolCallRecords: ToolCallRecord[] = [];
        let thinkingContent = '';
        let thinkingSteps = 0;
        let thinkingDurationMs = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE frames
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

            const dataStr = trimmedLine.slice(6);
            let event: StreamEvent;
            try {
              event = JSON.parse(dataStr);
            } catch {
              continue;
            }

            switch (event.event) {
              case 'text_delta': {
                const chunk = event.data?.content || '';
                assistantContent += chunk;
                setStreamingText(assistantContent);
                break;
              }
              case 'thinking_delta': {
                const chunk = event.data?.content || '';
                thinkingContent += chunk;
                thinkingSteps++;
                setStreamingThinking({
                  steps: thinkingSteps,
                  durationMs: 0, // will be set on thinking_end
                  content: thinkingContent,
                });
                break;
              }
              case 'thinking_end': {
                thinkingSteps = event.data?.steps || thinkingSteps;
                thinkingDurationMs = event.data?.duration_ms || 0;
                setStreamingThinking((prev) =>
                  prev
                    ? { ...prev, steps: thinkingSteps, durationMs: thinkingDurationMs }
                    : null,
                );
                break;
              }
              case 'tool_call': {
                const tc: ToolCallRecord = {
                  id: event.data?.id || '',
                  name: event.data?.name || '',
                  args: event.data?.args || event.data?.arguments || '',
                  status: 'pending',
                };
                toolCallRecords.push(tc);
                setActiveToolCalls((prev) => {
                  const next = new Map(prev);
                  next.set(tc.id, tc);
                  return next;
                });
                break;
              }
              case 'tool_result': {
                const id = event.data?.id || '';
                const result = event.data?.result || '';
                // Detect error: result is a JSON string like {"error":"message"}
                const isError = result.startsWith('{"error"');
                setActiveToolCalls((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(id);
                  if (existing) {
                    next.set(id, {
                      ...existing,
                      result,
                      status: isError ? 'error' : 'success',
                    });
                  }
                  return next;
                });
                const idx = toolCallRecords.findIndex((t) => t.id === id);
                if (idx !== -1) {
                  toolCallRecords[idx] = {
                    ...toolCallRecords[idx],
                    result,
                    status: isError ? 'error' : 'success',
                  };
                }
                break;
              }
              case 'done': {
                if (event.data?.session_id) {
                  setSessionId(event.data.session_id);
                }
                break;
              }
              case 'error': {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'system',
                    content: `Error: ${event.data?.message || 'Unknown error'}`,
                    timestamp: Date.now(),
                  },
                ]);
                break;
              }
            }
          }
        }

        // Finalize assistant message
        if (assistantContent || toolCallRecords.length > 0 || thinkingContent) {
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: assistantContent,
            toolCalls: toolCallRecords.length > 0 ? toolCallRecords : undefined,
            thinking: thinkingContent
              ? { steps: thinkingSteps, durationMs: thinkingDurationMs, content: thinkingContent }
              : undefined,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          const currentStreamingText = streamingTextRef.current;
          if (currentStreamingText) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: currentStreamingText + ' [stopped]',
                timestamp: Date.now(),
              },
            ]);
          }
        } else {
          const errorMsg =
            err instanceof Error ? err.message : 'Unknown error';
          setMessages((prev) => [
            ...prev,
            {
              role: 'system',
              content: `Connection lost: ${errorMsg}`,
              timestamp: Date.now(),
            },
          ]);
        }
      } finally {
        setIsStreaming(false);
        setStreamingText('');
        setStreamingThinking(null);
        abortRef.current = null;
      }
    },
    [], // Stable reference — uses refs for all external state
  );

  return {
    messages,
    isStreaming,
    streamingText,
    streamingThinking,
    activeToolCalls,
    sessionId,
    sendMessage,
    abort,
    clearSession,
  };
}
