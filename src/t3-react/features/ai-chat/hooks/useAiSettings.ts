/**
 * useAiSettings — Manages AI provider settings.
 *
 * Phase 1: Hardcoded defaults (local provider, llama3.1:8b, localhost:11434).
 * Phase 3: GET/PUT /api/ai/settings for persistent storage with encrypted keys.
 */

import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../../../config/constants';

export interface AiSettings {
  provider: 'local' | 'anthropic' | 'gemini';
  model: string;
  endpoint: string;
  apiKey: string;
}

const DEFAULT_SETTINGS: AiSettings = {
  provider: 'local',
  model: 'llama3.1:8b',
  endpoint: 'http://localhost:11434/v1',
  apiKey: '',
};

export interface UseAiSettingsReturn {
  settings: AiSettings;
  updateSettings: (partial: Partial<AiSettings>) => void;
  saveSettings: () => Promise<void>;
  testConnection: () => Promise<{ ok: boolean; latencyMs?: number; error?: string }>;
  isLoading: boolean;
}

export function useAiSettings(): UseAiSettingsReturn {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);

  const updateSettings = useCallback((partial: Partial<AiSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/ai/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          model: settings.model,
          endpoint: settings.endpoint,
          api_key: settings.apiKey,
        }),
      });
    } catch (err) {
      console.error('[AI Settings] Failed to save:', err);
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  const testConnection = useCallback(async () => {
    setIsLoading(true);
    const start = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          model: settings.model,
          messages: [{ role: 'user', content: 'ping' }],
          settings: {
            endpoint: settings.endpoint,
            api_key: settings.apiKey || undefined,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return { ok: false, error: `HTTP ${response.status}: ${text}` };
      }

      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Connection refused',
      };
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  return { settings, updateSettings, saveSettings, testConnection, isLoading };
}
