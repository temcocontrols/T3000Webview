/**
 * chatStore — Shared chat state so panel + full-page ChatPanel share conversations.
 */
import { create } from 'zustand';
import type { ChatMessage, ThinkingStep, ToolCallRecord, MessageBlock } from '../features/ai-chat/hooks/useAiChatStream';

interface ChatStore {
  messages: ChatMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  streamingText: string;
  streamingSteps: ThinkingStep[];
  streamingBlocks: MessageBlock[];
  activeToolCalls: Record<string, ToolCallRecord>;
  previousPageHash: string | null;

  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setSessionId: (id: string | null) => void;
  setIsStreaming: (v: boolean) => void;
  setStreamingText: (t: string) => void;
  setStreamingSteps: (steps: ThinkingStep[]) => void;
  setStreamingBlocks: (blocks: MessageBlock[]) => void;
  setActiveToolCalls: (fn: (prev: Record<string, ToolCallRecord>) => Record<string, ToolCallRecord>) => void;
  setPreviousPageHash: (hash: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  sessionId: null,
  isStreaming: false,
  streamingText: '',
  streamingSteps: [],
  streamingBlocks: [],
  activeToolCalls: {},
  previousPageHash: null,

  setMessages: (v) => set((s) => ({ messages: typeof v === 'function' ? v(s.messages) : v })),
  setSessionId: (id) => set({ sessionId: id }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setStreamingText: (t) => set({ streamingText: t }),
  setStreamingSteps: (steps) => set({ streamingSteps: steps }),
  setStreamingBlocks: (blocks) => set({ streamingBlocks: blocks }),
  setActiveToolCalls: (fn) => set((s) => ({ activeToolCalls: fn(s.activeToolCalls) })),
  setPreviousPageHash: (hash) => set({ previousPageHash: hash }),
  reset: () => set({ messages: [], sessionId: null, isStreaming: false, streamingText: '', streamingSteps: [], streamingBlocks: [], activeToolCalls: {}, previousPageHash: null }),
}));
