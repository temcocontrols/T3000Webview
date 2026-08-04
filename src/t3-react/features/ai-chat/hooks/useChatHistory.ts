/**
 * useChatHistory — Manages AI chat conversation history.
 *
 * Stores sessions via the backend file-based API:
 *   GET  /api/ai/sessions       → list
 *   GET  /api/ai/sessions/{id}  → load single
 *   DELETE /api/ai/sessions/{id} → delete
 *   PUT  /api/ai/sessions/{id}  → rename
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../../config/constants';
import type { ChatMessage } from './useAiChatStream';

export interface SessionSummary {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

interface UseChatHistoryReturn {
  sessions: SessionSummary[];
  activeSessionId: string | null;
  isLoading: boolean;
  setActiveSessionId: (id: string | null) => void;
  loadSessionMessages: (id: string) => Promise<ChatMessage[]>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/sessions`);
      if (!res.ok) return;
      const data = await res.json();
      if (mountedRef.current) {
        setSessions(data.sessions || []);
      }
    } catch {
      // Backend might not be available yet
    }
  }, []);

  // Load on mount
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const loadSessionMessages = useCallback(async (id: string): Promise<ChatMessage[]> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/sessions/${id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.messages || []).map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        timestamp: Date.now(),
      }));
    } catch {
      return [];
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await fetch(`${API_BASE_URL}/api/ai/sessions/${id}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  }, [activeSessionId]);

  const renameSession = useCallback(async (id: string, title: string) => {
    await fetch(`${API_BASE_URL}/api/ai/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  }, []);

  return {
    sessions,
    activeSessionId,
    isLoading,
    setActiveSessionId,
    loadSessionMessages,
    deleteSession,
    renameSession,
    refreshSessions,
  };
}
