/**
 * useAiChatStream — SSE client hook for the built-in AI chat page.
 *
 * Manages the full lifecycle:
 *   1. POST /api/ai/chat with fetch()
 *   2. Parse SSE stream via ReadableStream + TextDecoder
 *   3. Dispatch events: text_delta -> streaming text, tool_call -> pending card,
 *      tool_result -> resolved card, done -> finalize, error -> system message
 */

import { useRef, useCallback, useEffect } from 'react';
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
  /** New per-step thinking breakdown — flat, retained for backward compat */
  thinkingSteps?: ThinkingStep[];
  /** Interleaved thinking+output blocks. Each thinking_end starts a new block pair. */
  messageBlocks?: MessageBlock[];
  timestamp: number;
}

export type MessageBlock =
  | { type: 'thinking'; steps: ThinkingStep[] }
  | { type: 'output'; content: string };

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
    finish_reason?: string;
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

// ── Tool descriptions for synthetic thinking text ──
// Used when the model doesn't emit reasoning content (e.g. Gemma, non-reasoning models)

const TOOL_DESCRIPTIONS: Record<string, string> = {
  t3000_device_list: 'Scanning building device inventory\u2026',
  t3000_device_get_points: 'Reading point configuration\u2026',
  t3000_device_refresh: 'Refreshing live data from controller\u2026',
  t3000_device_control: 'Sending control command\u2026',
  t3000_device_current: 'Setting active device context\u2026',
  t3000_device_diagnostics: 'Running device diagnostics\u2026',
  t3000_device_diagnostics_batch: 'Running diagnostics on multiple devices\u2026',
  t3000_building_summary: 'Generating building health summary\u2026',
  t3000_point_search: 'Searching for matching points\u2026',
  t3000_point_read: 'Reading point value\u2026',
  t3000_point_read_batch: 'Reading multiple point values\u2026',
  t3000_point_write: 'Writing value to point\u2026',
  t3000_point_write_batch: 'Writing values to multiple points\u2026',
  t3000_point_get_metadata: 'Fetching point metadata\u2026',
  t3000_point_batch_metadata: 'Fetching metadata for multiple points\u2026',
  t3000_alarm_list: 'Checking active alarms\u2026',
  t3000_alarm_acknowledge: 'Acknowledging alarm\u2026',
  t3000_alarm_settings_read: 'Reading alarm threshold settings\u2026',
  t3000_pid_list: 'Listing PID control loops\u2026',
  t3000_program_list: 'Listing PLC programs\u2026',
  t3000_program_read: 'Reading PLC program source\u2026',
  t3000_schedule_list: 'Reading time schedules\u2026',
  t3000_holiday_list: 'Checking holiday overrides\u2026',
  t3000_trendlog_list: 'Listing trendlog configurations\u2026',
  t3000_trendlog_query: 'Querying historical trend data\u2026',
  t3000_trendlog_export: 'Exporting trendlog data\u2026',
  t3000_settings_read: 'Reading device settings\u2026',
  t3000_settings_write: 'Updating device settings\u2026',
  t3000_users_list: 'Listing device users\u2026',
  t3000_haystack_list_tags: 'Listing Haystack tags\u2026',
  t3000_haystack_get_point_tags: 'Reading Haystack tags for points\u2026',
  t3000_haystack_search_points: 'Searching points by Haystack tags\u2026',
  t3000_haystack_auto_tag: 'Running Haystack auto-tagging\u2026',
  t3000_haystack_preview_tags: 'Previewing Haystack tag assignments\u2026',
  t3000_haystack_export: 'Exporting Haystack/Brick model\u2026',
  t3000_haystack_get_brick_class: 'Reading Brick class assignments\u2026',
  t3000_haystack_list_rules: 'Listing auto-tagging rules\u2026',
  t3000_haystack_validate: 'Validating Haystack ontology\u2026',
  t3000_rule_create: 'Creating auto-tagging rule\u2026',
  t3000_rule_toggle: 'Toggling auto-tagging rule\u2026',
  t3000_doc_list: 'Listing available documentation\u2026',
  t3000_doc_read: 'Reading documentation page\u2026',
  t3000_graphics_list: 'Listing HMI graphics screens\u2026',
  t3000_nav_list: 'Listing navigation entries\u2026',
  t3000_nav_search: 'Searching navigation\u2026',
  t3000_nav_redirect: 'Redirecting to page\u2026',
  t3000_page_info: 'Getting page information\u2026',
  t3000_metadata_search: 'Searching metadata by label\u2026',
  t3000_set_chat_device: 'Setting chat device context\u2026',
  t3000_task_list: 'Listing background tasks\u2026',
  t3000_task_create: 'Creating background task\u2026',
  t3000_task_update: 'Updating background task\u2026',
  t3000_task_delete: 'Deleting background task\u2026',
  t3000_memory_list: 'Listing AI memories\u2026',
  t3000_memory_save: 'Saving AI memory\u2026',
  t3000_memory_delete: 'Deleting AI memory\u2026',
  t3000_describe_tool: 'Looking up tool documentation\u2026',
  t3000_get_version: 'Checking API version\u2026',
  t3000_ping: 'Checking server health\u2026',
};

function toolDescription(name: string): string {
  if (TOOL_DESCRIPTIONS[name]) return TOOL_DESCRIPTIONS[name];
  // Fallback: strip common prefixes and humanize
  const short = name.replace(/^(mcp__|t3000__|haystac__|t3000_)+/g, '').replace(/_/g, ' ');
  return `Calling ${short}\u2026`;
}

/**
 * Build a user-friendly system message when the LLM request fails.
 * Detects HTTP 5xx (server down/starting up/overloaded), connection-level
 * failures (refused/timeout/DNS), and generic provider errors so the user
 * knows to check the server before continuing.
 */
function buildServerErrorNotice(errorMsg: string, endpoint: string): string {
  const stripped = errorMsg.replace(/^Error:\s*/i, '').trim();
  const endpointLabel = endpoint || 'the configured endpoint';

  // HTTP 5xx returned by the LLM server (502 Bad Gateway, 503, 500, 504, ...)
  const statusMatch = stripped.match(/\b(5\d\d)\b/);
  if (statusMatch) {
    return (
      `The LLM server returned HTTP ${statusMatch[1]} — it may be down, still starting up, or overloaded.\n` +
      `Please check that the server is running before continuing, then try again.\n\n` +
      `Endpoint: ${endpointLabel}\n` +
      `Details: ${stripped}`
    );
  }

  // Connection-level failures (refused, timeout, DNS, unreachable, ...)
  if (/connect|refused|timeout|timed out|dns|unreachable|no route|econnrefused|econnreset|failed to/i.test(stripped)) {
    return (
      `Could not reach the LLM server at ${endpointLabel} — it may be down or unreachable.\n` +
      `Please check that the server is running before continuing, then try again.\n\n` +
      `Endpoint: ${endpointLabel}\n` +
      `Details: ${stripped}`
    );
  }

  // Generic provider-side error (e.g. "Provider error: ...")
  if (/provider error/i.test(stripped)) {
    return (
      `The LLM request failed on the server side — the server may be down, overloaded, or misconfigured.\n` +
      `Please check its status before continuing, then try again.\n\n` +
      `Endpoint: ${endpointLabel}\n` +
      `Details: ${stripped}`
    );
  }

  return `Error: ${stripped}`;
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
  const storeSetStreamingBlocks = useChatStore((s) => s.setStreamingBlocks);
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
          messages: state.messages.map((m) => {
            const hasUi = !!(m.thinkingSteps || m.toolCalls || m.messageBlocks || m.thinking);
            return {
              role: m.role,
              content: m.content,
              ui: hasUi
                ? {
                    thinkingSteps: m.thinkingSteps,
                    toolCalls: m.toolCalls,
                    messageBlocks: m.messageBlocks,
                    thinking: m.thinking,
                  }
                : undefined,
            };
          }),
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
      storeSetStreamingBlocks([]);
      storeSetActiveToolCalls(() => ({}));

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
        const blocks: MessageBlock[] = [];
        let currentBlockType: 'thinking' | 'output' | null = null;
        let currentThinkingSteps: ThinkingStep[] = [];
        let currentOutput = '';
        let receivedDone = false;
        let truncated = false;
        let pendingError: string | null = null;

        const flushBlock = () => {
          if (currentBlockType === 'thinking' && currentThinkingSteps.length > 0) {
            blocks.push({ type: 'thinking', steps: [...currentThinkingSteps] });
            currentThinkingSteps = [];
          } else if (currentBlockType === 'output' && currentOutput) {
            blocks.push({ type: 'output', content: currentOutput });
            currentOutput = '';
          }
          currentBlockType = null;
        };

        // Push blocks + in-progress block to the store for live streaming display
        const pushBlocks = () => {
          const display: MessageBlock[] = [...blocks];
          if (currentBlockType === 'thinking' && currentThinkingSteps.length > 0) {
            display.push({ type: 'thinking', steps: [...currentThinkingSteps] });
          } else if (currentBlockType === 'output' && currentOutput) {
            display.push({ type: 'output', content: currentOutput });
          }
          storeSetStreamingBlocks(display);
        };

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
                if (currentBlockType !== 'output') {
                  flushBlock();
                  currentBlockType = 'output';
                }
                currentOutput += chunk;
                assistantContent += chunk;
                storeSetStreamingText(assistantContent);
                pushBlocks();
                break;
              }
              case 'thinking_delta': {
                const chunk = event.data?.content || '';
                if (currentBlockType !== 'thinking') {
                  flushBlock();
                  currentBlockType = 'thinking';
                }
                const last = currentThinkingSteps[currentThinkingSteps.length - 1];
                if (last && !last.toolCall) {
                  last.content += chunk;
                } else {
                  currentThinkingSteps.push({ index: steps.length + currentThinkingSteps.length + 1, content: chunk });
                }
                // Also keep flat steps for backward compat + store
                const flatLast = steps[steps.length - 1];
                if (flatLast && !flatLast.toolCall) {
                  flatLast.content += chunk;
                } else {
                  steps.push({ index: steps.length + 1, content: chunk });
                }
                storeSetStreamingSteps([...steps]);
                pushBlocks();
                break;
              }
              case 'thinking_end': {
                // Flush current thinking block so next output starts a new block
                flushBlock();
                pushBlocks();
                break;
              }
              case 'tool_call': {
                const tc: ToolCallRecord = {
                  id: event.data?.id || '', name: event.data?.name || '',
                  args: event.data?.args || event.data?.arguments || '', status: 'pending',
                };
                toolCallRecords.push(tc);
                storeSetActiveToolCalls((prev) => ({ ...prev, [tc.id]: tc }));

                // Ensure we're in a thinking block so tool calls are visible
                if (currentBlockType !== 'thinking') {
                  flushBlock();
                  currentBlockType = 'thinking';
                }

                // Create a step to host this tool call if none exists
                const desc = toolDescription(tc.name);
                if (currentThinkingSteps.length === 0 || currentThinkingSteps[currentThinkingSteps.length - 1].toolCall) {
                  const idx = steps.length + currentThinkingSteps.length + 1;
                  currentThinkingSteps.push({ index: idx, content: desc });
                }
                const blockLast = currentThinkingSteps[currentThinkingSteps.length - 1];
                blockLast.toolCall = tc;

                // Also keep flat steps for backward compat
                const flatLast = steps[steps.length - 1];
                if (flatLast && !flatLast.toolCall) {
                  flatLast.toolCall = tc;
                } else {
                  steps.push({ index: steps.length + 1, content: desc, toolCall: tc });
                }

                storeSetStreamingSteps([...steps]);
                pushBlocks();
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
                // Update tool in both flat and block steps
                for (const s of steps) {
                  if (s.toolCall?.id === id) {
                    s.toolCall = { ...s.toolCall, result, status: isError ? 'error' : 'success' };
                  }
                }
                for (const s of currentThinkingSteps) {
                  if (s.toolCall?.id === id) {
                    s.toolCall = { ...s.toolCall, result, status: isError ? 'error' : 'success' };
                  }
                }
                storeSetStreamingSteps([...steps]);
                pushBlocks();
                break;
              }
              case 'done': {
                receivedDone = true;
                if (event.data?.session_id) {
                  storeSetSessionId(event.data.session_id);
                }
                if (event.data?.finish_reason === 'length' || event.data?.finish_reason === 'truncated') {
                  truncated = true;
                }
                break;
              }
              case 'error': {
                const msg = event.data?.message || 'Unknown error';
                pendingError = msg.startsWith('Unable to complete') ? msg : `Error: ${msg}`;
                break;
              }
            }
          }
        }

        // Flush final block
        flushBlock();

        const hasAssistantContent = !!(assistantContent || toolCallRecords.length > 0 || steps.length > 0);

        // Finalize assistant message (if the model produced anything)
        if (hasAssistantContent) {
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: assistantContent,
            toolCalls: toolCallRecords.length > 0 ? toolCallRecords : undefined,
            thinkingSteps: steps.length > 0 ? steps : undefined,
            messageBlocks: blocks.length > 0 ? blocks : undefined,
            timestamp: Date.now(),
          };
          storeSetMessages((prev) => [...prev, assistantMsg]);
        }

        // Error / empty-response handling.
        // If the upstream LLM server is down, the backend emits an SSE `error`
        // event but no text/steps/tool-calls — we must surface it anyway so the
        // user doesn't get a silent empty reply.
        if (pendingError) {
          storeSetMessages((prev) => [
            ...prev,
            { role: 'system', content: buildServerErrorNotice(pendingError, s.endpoint || ''), timestamp: Date.now() },
          ]);
        } else if (truncated) {
          storeSetMessages((prev) => [
            ...prev,
            { role: 'system', content: 'Unable to complete your request — token limit reached.\nTry again, start a new chat, or increase the local model token limit. If it persists, post and seek help at https://forums.temcocontrols.com/', timestamp: Date.now() },
          ]);
        } else if (!receivedDone && hasAssistantContent) {
          storeSetMessages((prev) => [
            ...prev,
            { role: 'system', content: 'Unable to complete your request — connection interrupted.\nTry again, start a new chat, or increase the local model token limit. If it persists, post and seek help at https://forums.temcocontrols.com/', timestamp: Date.now() },
          ]);
        } else if (!receivedDone && !hasAssistantContent) {
          // Stream closed with no data at all — typically a down/unreachable server.
          storeSetMessages((prev) => [
            ...prev,
            { role: 'system', content: `No response received from the LLM server at ${s.endpoint || 'the configured endpoint'}.\nCheck that it is running and the URL is correct, then try again.`, timestamp: Date.now() },
          ]);
        }

        // Persist the full conversation (with thinking steps, tool-call records
        // and message blocks) to the backend session file so loaded history
        // replays the original thinking details. (The backend auto-save only
        // stores what it built internally — it has no thinking data.)
        saveCurrentToBackend();
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
