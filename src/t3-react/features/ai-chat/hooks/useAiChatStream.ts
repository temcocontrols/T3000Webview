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
import { useChatStore } from '../../../store/chatStore';
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
  activeToolCalls: Record<string, ToolCallRecord>;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  abort: () => void;
  clearSession: () => void;
}

// ── Hook ──

export function useAiChatStream(settings: AiProviderSettings): UseAiChatStreamReturn {
  const messages = useChatStore((s) => s.messages);
  const sessionId = useChatStore((s) => s.sessionId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingText = useChatStore((s) => s.streamingText);
  const streamingThinking = useChatStore((s) => s.streamingThinking);
  const activeToolCalls = useChatStore((s) => s.activeToolCalls);
  const storeSetMessages = useChatStore((s) => s.setMessages);
  const storeSetSessionId = useChatStore((s) => s.setSessionId);
  const storeSetIsStreaming = useChatStore((s) => s.setIsStreaming);
  const storeSetStreamingText = useChatStore((s) => s.setStreamingText);
  const storeSetStreamingThinking = useChatStore((s) => s.setStreamingThinking);
  const storeSetActiveToolCalls = useChatStore((s) => s.setActiveToolCalls);
  const storeReset = useChatStore((s) => s.reset);

  const settingsRef = useRef<AiProviderSettings>(settings);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    storeSetIsStreaming(false);
  }, [storeSetIsStreaming]);

  const clearSession = useCallback(async () => {
    const sid = useChatStore.getState().sessionId;
    if (sid) {
      try {
        await fetch(`${API_BASE_URL}/api/ai/sessions/${sid}`, { method: 'DELETE' });
      } catch {}
    }
    storeReset();
  }, [storeReset]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      const state = useChatStore.getState();
      if (!trimmed || state.isStreaming) return;

      const currentMessages = state.messages;
      const currentSessionId = state.sessionId;
      const s = settingsRef.current;

      const userMsg: ChatMessage = {
        role: 'user', content: trimmed, timestamp: Date.now(),
      };
      storeSetMessages((prev) => [...prev, userMsg]);
      storeSetIsStreaming(true);
      storeSetStreamingText('');
      storeSetStreamingThinking(null);

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
          storeSetMessages((prev) => [
            ...prev,
            { role: 'system', content: `Error: Server returned ${response.status}. ${errorText || 'Please check that the LLM server is running.'}`, timestamp: Date.now() },
          ]);
          storeSetIsStreaming(false);
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
                storeSetStreamingText(assistantContent);
                break;
              }
              case 'thinking_delta': {
                const chunk = event.data?.content || '';
                thinkingContent += chunk;
                thinkingSteps++;
                storeSetStreamingThinking({
                  steps: thinkingSteps, durationMs: 0, content: thinkingContent,
                });
                break;
              }
              case 'thinking_end': {
                thinkingSteps = event.data?.steps || thinkingSteps;
                thinkingDurationMs = event.data?.duration_ms || 0;
                storeSetStreamingThinking((prev) =>
                  prev ? { ...prev, steps: thinkingSteps, durationMs: thinkingDurationMs } : null,
                );
                break;
              }
              case 'tool_call': {
                const tc: ToolCallRecord = {
                  id: event.data?.id || '', name: event.data?.name || '',
                  args: event.data?.args || event.data?.arguments || '', status: 'pending',
                };
                toolCallRecords.push(tc);
                storeSetActiveToolCalls((prev) => ({ ...prev, [tc.id]: tc }));
                break;
              }
              case 'tool_result': {
                const id = event.data?.id || '';
                const result = event.data?.result || '';
                const isError = result.startsWith('{"error"');
                storeSetActiveToolCalls((prev) => {
                  const existing = prev[id];
                  if (existing) {
                    return { ...prev, [id]: { ...existing, result, status: isError ? 'error' : 'success' } };
                  }
                  return prev;
                });
                const idx = toolCallRecords.findIndex((t) => t.id === id);
                if (idx !== -1) {
                  toolCallRecords[idx] = { ...toolCallRecords[idx], result, status: isError ? 'error' : 'success' };
                }
                break;
              }
              case 'done': {
                if (event.data?.session_id) {
                  storeSetSessionId(event.data.session_id);
                }
                break;
              }
              case 'error': {
                storeSetMessages((prev) => [
                  ...prev,
                  { role: 'system', content: `Error: ${event.data?.message || 'Unknown error'}`, timestamp: Date.now() },
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
          storeSetMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          const currentText = useChatStore.getState().streamingText;
          if (currentText) {
            storeSetMessages((prev) => [...prev, { role: 'assistant', content: currentText + ' [stopped]', timestamp: Date.now() }]);
          }
        } else {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          storeSetMessages((prev) => [...prev, { role: 'system', content: `Connection lost: ${errorMsg}`, timestamp: Date.now() }]);
        }
      } finally {
        storeSetIsStreaming(false);
        storeSetStreamingText('');
        storeSetStreamingThinking(null);
        abortRef.current = null;
      }
    },
    [storeSetMessages, storeSetIsStreaming, storeSetStreamingText, storeSetStreamingThinking, storeSetActiveToolCalls, storeSetSessionId],
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
