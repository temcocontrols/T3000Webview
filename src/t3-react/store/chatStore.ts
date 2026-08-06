/**
 * chatStore — Shared chat state so panel + full-page ChatPanel share conversations.
 */
import { create } from 'zustand';
import type { ChatMessage, ThinkingState, ToolCallRecord } from '../features/ai-chat/hooks/useAiChatStream';

interface ChatStore {
  messages: ChatMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  streamingText: string;
  streamingThinking: ThinkingState | null;
  activeToolCalls: Record<string, ToolCallRecord>;

  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setSessionId: (id: string | null) => void;
  setIsStreaming: (v: boolean) => void;
  setStreamingText: (t: string) => void;
  setStreamingThinking: (t: ThinkingState | null) => void;
  setActiveToolCalls: (fn: (prev: Record<string, ToolCallRecord>) => Record<string, ToolCallRecord>) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  sessionId: null,
  isStreaming: false,
  streamingText: '',
  streamingThinking: null,
  activeToolCalls: {},

  setMessages: (v) => set((s) => ({ messages: typeof v === 'function' ? v(s.messages) : v })),
  setSessionId: (id) => set({ sessionId: id }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setStreamingText: (t) => set({ streamingText: t }),
  setStreamingThinking: (t) => set({ streamingThinking: t }),
  setActiveToolCalls: (fn) => set((s) => ({ activeToolCalls: fn(s.activeToolCalls) })),
  reset: () => set({ messages: [], sessionId: null, isStreaming: false, streamingText: '', streamingThinking: null, activeToolCalls: {} }),
}));
