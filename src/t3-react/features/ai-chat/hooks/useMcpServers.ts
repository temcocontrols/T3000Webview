/**
 * useMcpServers — Manages external MCP server connections.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../../config/constants';

export interface McpServerInfo {
  id: string;
  name: string;
  url: string;
  api_key?: string;
  enabled: boolean;
}

interface UseMcpServersReturn {
  servers: McpServerInfo[];
  loading: boolean;
  addServer: (name: string, url: string, apiKey?: string) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  activateServer: (id: string) => Promise<void>;
  testServer: (url: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

export function useMcpServers(): UseMcpServersReturn {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/mcp-servers`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setServers(data.servers || []);
      }
    } catch { /* backend may not be ready */ }
    finally { if (mountedRef.current) setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addServer = useCallback(async (name: string, url: string, apiKey?: string) => {
    const res = await fetch(`${API_BASE_URL}/api/ai/mcp-servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: crypto.randomUUID(), name, url, api_key: apiKey || '', enabled: true }),
    });
    const body = await res.json().catch(() => ({ ok: false, error: 'Invalid server response' }));
    if (!body.ok) {
      throw new Error(body.error || 'Failed to add server');
    }
    await refresh();
  }, [refresh]);

  const removeServer = useCallback(async (id: string) => {
    await fetch(`${API_BASE_URL}/api/ai/mcp-servers/${id}`, { method: 'DELETE' });
    setServers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const activateServer = useCallback(async (id: string) => {
    await fetch(`${API_BASE_URL}/api/ai/mcp-servers/${id}/activate`, { method: 'PATCH' });
    await refresh();
  }, [refresh]);

  const testServer = useCallback(async (url: string) => {
    const res = await fetch(`${API_BASE_URL}/api/ai/mcp-servers/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    return { ok: data.ok, error: data.error };
  }, []);

  return { servers, loading, addServer, removeServer, activateServer, testServer, refresh };
}
