/**
 * useAiChatStream — SSE client hook for the built-in AI chat page.
 *
 * Manages the full lifecycle:
 *   1. POST /api/ai/chat with fetch()
 *   2. Parse SSE stream via ReadableStream + TextDecoder
 *   3. Dispatch events: text_delta -> streaming text, tool_call -> pending card,
 *      tool_result -> resolved card, done -> finalize, error -> system message
 */

import { useState, useRef, useCallback } from 'react';

// ── Types ──

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCallRecord[];
  timestamp: number;
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
  };
}

export interface UseAiChatStreamReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  activeToolCalls: Map<string, ToolCallRecord>;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  abort: () => void;
  clearSession: () => void;
}

// ── Hook ──

export function useAiChatStream(): UseAiChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeToolCalls, setActiveToolCalls] = useState<Map<string, ToolCallRecord>>(new Map());
  const [sessionId, setSessionId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearSession = useCallback(async () => {
    if (sessionId) {
      try {
        await fetch(`/api/ai/sessions/${sessionId}`, { method: 'DELETE' });
      } catch {
        // Session may already be expired — ignore
      }
    }
    setMessages([]);
    setSessionId(null);
    setStreamingText('');
    setActiveToolCalls(new Map());
  }, [sessionId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Add user message
      const userMsg: ChatMessage = {
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingText('');

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const body = JSON.stringify({
          provider: 'local',
          model: 'llama3.1:8b',
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: content.trim() },
          ],
          session_id: sessionId,
          settings: {
            endpoint: 'http://localhost:11434/v1',
            api_key: '',
          },
        });

        const response = await fetch('/api/ai/chat', {
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE frames
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete last line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const dataStr = trimmed.slice(6);
            let event: StreamEvent;
            try {
              event = JSON.parse(dataStr);
            } catch {
              continue; // Skip unparseable lines
            }

            switch (event.event) {
              case 'text_delta': {
                const chunk = event.data?.content || '';
                assistantContent += chunk;
                setStreamingText(assistantContent);
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
                setActiveToolCalls((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(id);
                  if (existing) {
                    next.set(id, {
                      ...existing,
                      result: event.data?.result || '',
                      status: 'success',
                    });
                  }
                  return next;
                });
                // Update in local records
                const idx = toolCallRecords.findIndex((t) => t.id === id);
                if (idx !== -1) {
                  toolCallRecords[idx] = {
                    ...toolCallRecords[idx],
                    result: event.data?.result || '',
                    status: 'success',
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
        if (assistantContent || toolCallRecords.length > 0) {
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: assistantContent,
            toolCalls: toolCallRecords.length > 0 ? toolCallRecords : undefined,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User aborted — keep whatever text was accumulated so far
          if (streamingText) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: streamingText + ' [stopped]',
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
        abortRef.current = null;
      }
    },
    [messages, sessionId, isStreaming, streamingText],
  );

  return {
    messages,
    isStreaming,
    streamingText,
    activeToolCalls,
    sessionId,
    sendMessage,
    abort,
    clearSession,
  };
}
