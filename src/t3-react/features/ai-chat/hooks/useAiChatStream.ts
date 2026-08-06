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
  /** Reasoning/thinking state for this message (legacy blob format) */
  thinking?: ThinkingState;
  /** New per-step thinking breakdown */
  thinkingSteps?: ThinkingStep[];
  timestamp: number;
}

export interface ThinkingState {
  steps: number;
  durationMs: number;
  content: string;
}

/** A single thinking step with optional tool call — Copilot-style per-step breakdown */
export interface ThinkingStep {
  index: number;
  content: string;
  toolCall?: ToolCallRecord;
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
  streamingSteps: ThinkingStep[];
  activeToolCalls: Record<string, ToolCallRecord>;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  abort: () => void;
  clearSession: () => void;
}

// ── Hook ──

export function useAiChatStream(settings: AiProviderSettings, onSaved?: () => void): UseAiChatStreamReturn {
  const messages = useChatStore((s) => s.messages);
  const sessionId = useChatStore((s) => s.sessionId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingText = useChatStore((s) => s.streamingText);
  const streamingSteps = useChatStore((s) => s.streamingSteps);
  const activeToolCalls = useChatStore((s) => s.activeToolCalls);
  const storeSetMessages = useChatStore((s) => s.setMessages);
  const storeSetSessionId = useChatStore((s) => s.setSessionId);
  const storeSetIsStreaming = useChatStore((s) => s.setIsStreaming);
  const storeSetStreamingText = useChatStore((s) => s.setStreamingText);
  const storeSetStreamingSteps = useChatStore((s) => s.setStreamingSteps);
  const storeSetActiveToolCalls = useChatStore((s) => s.setActiveToolCalls);
  const storeReset = useChatStore((s) => s.reset);

  const settingsRef = useRef<AiProviderSettings>(settings);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    storeSetIsStreaming(false);
  }, [storeSetIsStreaming]);

  // Save current partial session to backend
  const saveCurrentToBackend = useCallback(async () => {
    const state = useChatStore.getState();
    if (!state.sessionId || state.messages.length === 0) return;
    try {
      await fetch(`${API_BASE_URL}/api/ai/save-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: state.sessionId,
          messages: state.messages.map((m) => ({
            role: m.role,
            content: m.content,
            thinkingSteps: m.thinkingSteps || undefined,
            toolCalls: m.toolCalls || undefined,
          })),
        }),
      });
      onSaved?.();
    } catch {}
  }, [onSaved]);

  const clearSession = useCallback(() => {
    const state = useChatStore.getState();
    if (state.isStreaming) {
      abortRef.current?.abort();
      storeSetIsStreaming(false);
    }
    // Save before clearing if we have a session
    if (state.sessionId && state.messages.length > 0) {
      saveCurrentToBackend();
    }
    storeReset();
  }, [storeReset, saveCurrentToBackend, storeSetIsStreaming]);

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
      storeSetStreamingSteps([]);

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
        const steps: ThinkingStep[] = [];
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
                const last = steps[steps.length - 1];
                if (last && !last.toolCall) {
                  last.content += chunk;
                } else {
                  steps.push({ index: steps.length + 1, content: chunk });
                }
                storeSetStreamingSteps([...steps]);
                break;
              }
              case 'thinking_end': {
                thinkingDurationMs = event.data?.duration_ms || 0;
                break;
              }
              case 'tool_call': {
                const tc: ToolCallRecord = {
                  id: event.data?.id || '', name: event.data?.name || '',
                  args: event.data?.args || event.data?.arguments || '', status: 'pending',
                };
                toolCallRecords.push(tc);
                storeSetActiveToolCalls((prev) => ({ ...prev, [tc.id]: tc }));
                const lastStep = steps[steps.length - 1];
                if (lastStep) {
                  lastStep.toolCall = tc;
                  storeSetStreamingSteps([...steps]);
                }
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
                const stepWithTool = steps.find((s) => s.toolCall?.id === id);
                if (stepWithTool?.toolCall) {
                  stepWithTool.toolCall = { ...stepWithTool.toolCall, result, status: isError ? 'error' : 'success' };
                  storeSetStreamingSteps([...steps]);
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
        if (assistantContent || toolCallRecords.length > 0 || steps.length > 0) {
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: assistantContent,
            toolCalls: toolCallRecords.length > 0 ? toolCallRecords : undefined,
            thinkingSteps: steps.length > 0 ? steps : undefined,
            timestamp: Date.now(),
          };
          storeSetMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          const currentText = useChatStore.getState().streamingText;
          const currentSteps = useChatStore.getState().streamingSteps;
          const currentTools = useChatStore.getState().activeToolCalls;
          if (currentText) {
            storeSetMessages((prev) => [...prev, {
              role: 'assistant',
              content: currentText + ' [stopped]',
              thinkingSteps: currentSteps.length > 0 ? currentSteps : undefined,
              toolCalls: Object.values(currentTools).length > 0 ? Object.values(currentTools) : undefined,
              timestamp: Date.now(),
            }]);
          }
          saveCurrentToBackend();
        } else {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          storeSetMessages((prev) => [...prev, { role: 'system', content: `Connection lost: ${errorMsg}`, timestamp: Date.now() }]);
        }
      } finally {
        storeSetIsStreaming(false);
        storeSetStreamingText('');
        storeSetStreamingSteps([]);
        abortRef.current = null;
      }
    },
    [storeSetMessages, storeSetIsStreaming, storeSetStreamingText, storeSetStreamingSteps, storeSetActiveToolCalls, storeSetSessionId],
  );

  return {
    messages,
    isStreaming,
    streamingText,
    streamingSteps,
    activeToolCalls,
    sessionId,
    sendMessage,
    abort,
    clearSession,
  };
}
