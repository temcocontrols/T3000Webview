/**
 * Storage and backend persistence for the AI provider settings.
 *
 * Shared by the chat panel and by anything else that hosts `SettingsDrawer` (the report page opens
 * the same drawer without leaving the page), so the storage keys and the PUT payload live in one
 * place instead of being copied per caller.
 */

import { API_BASE_URL } from '../../../config/constants';
import type { AiProviderSettings, ProviderType } from '../components/SettingsDrawer';

export type ProviderCache = Record<
  ProviderType,
  Pick<AiProviderSettings, 'endpoint' | 'model' | 'apiKey'>
>;

export const DEFAULT_SETTINGS: AiProviderSettings = {
  provider: 'local',
  endpoint: '',
  model: '',
  apiKey: '',
};

export const SETTINGS_STORAGE_KEY = 't3.ai.settings';
const PROVIDER_CACHE_KEY = 't3.ai.providerCache';

// No fallback values — a fresh install must be configured by the user.
const EMPTY_PROVIDER = { endpoint: '', model: '', apiKey: '' };

export const DEFAULT_CACHE: ProviderCache = {
  local: { ...EMPTY_PROVIDER },
  anthropic: { ...EMPTY_PROVIDER },
  gemini: { ...EMPTY_PROVIDER },
};

export const loadProviderCache = (): ProviderCache => {
  try {
    const raw = localStorage.getItem(PROVIDER_CACHE_KEY);
    if (raw) {
      return { ...DEFAULT_CACHE, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_CACHE;
};

export const saveProviderCache = (cache: ProviderCache) => {
  try {
    localStorage.setItem(PROVIDER_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

export const loadSettings = (): AiProviderSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AiProviderSettings;
      // Migrate old format: if provider-specific cache doesn't exist, seed it from current settings
      if (!localStorage.getItem(PROVIDER_CACHE_KEY)) {
        const cache = loadProviderCache();
        const prov = parsed.provider as ProviderType;
        cache[prov] = { endpoint: parsed.endpoint, model: parsed.model, apiKey: parsed.apiKey || '' };
        saveProviderCache(cache);
      }
      return parsed;
    }
  } catch {}
  return DEFAULT_SETTINGS;
};

export const saveSettings = (s: AiProviderSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
    // Also update the per-provider cache
    const cache = loadProviderCache();
    cache[s.provider] = { endpoint: s.endpoint, model: s.model, apiKey: s.apiKey || '' };
    saveProviderCache(cache);
  } catch {}

  // Persist to the backend too, so settings survive across browsers/machines.
  fetch(`${API_BASE_URL}/api/ai/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: s.provider,
      model: s.model,
      endpoint: s.endpoint,
      api_key: s.apiKey || '',
    }),
  }).catch(() => {});
};

/** "Configured" means both endpoint and model are filled in. */
export const isSettingsConfigured = (s: AiProviderSettings) =>
  (s.endpoint || '').trim() !== '' && (s.model || '').trim() !== '';
