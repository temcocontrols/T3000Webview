/**
 * SettingsDrawer — Slide-in settings panel for AI provider configuration.
 *
 * Supports two integration types:
 *   1. Local model (Ollama, vLLM, LM Studio, llama.cpp)
 *   2. External API (Anthropic Claude, Google Gemini) — customer's own API key
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Button,
  Input,
  Textarea,
  Spinner,
  Divider,
  Tooltip,
  Field,
} from '@fluentui/react-components';
import {
  DismissRegular,
  SettingsRegular,
  CheckmarkCircleRegular,
  CheckmarkCircleFilled,
  ErrorCircleRegular,
  ChevronDownRegular,
  ChevronUpRegular,
  OpenRegular,
} from '@fluentui/react-icons';
import styles from '../AiChat.module.css';

// ── Types ──

export type ProviderType = 'local' | 'anthropic' | 'gemini';

export interface AiProviderSettings {
  provider: ProviderType;
  endpoint: string;
  model: string;
  apiKey: string;
}

interface Props {
  open: boolean;
  settings: AiProviderSettings;
  providerCache: Record<ProviderType, Pick<AiProviderSettings, 'endpoint' | 'model' | 'apiKey'>>;
  onSave: (settings: AiProviderSettings) => void;
  onClose: () => void;
}

// ── Provider presets ──

const PROVIDER_PRESETS: Record<ProviderType, { label: string; desc: string; defaultEndpoint: string; defaultModel: string; endpointPlaceholder: string; modelPlaceholder: string }> = {
  local: {
    label: 'Local Model',
    desc: 'Run a model on your own machine — no internet required after download.',
    defaultEndpoint: '',
    defaultModel: '',
    endpointPlaceholder: 'http://localhost:11434/v1',
    modelPlaceholder: 'llama3.1:8b',
  },
  anthropic: {
    label: 'Anthropic Claude',
    desc: 'Claude API — requires your own API key from console.anthropic.com',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    defaultModel: '',
    endpointPlaceholder: 'https://api.anthropic.com/v1',
    modelPlaceholder: 'claude-3-5-sonnet-20241022',
  },
  gemini: {
    label: 'Google Gemini',
    desc: 'Gemini API — requires your own API key from aistudio.google.com',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: '',
    endpointPlaceholder: 'https://generativelanguage.googleapis.com/v1beta',
    modelPlaceholder: 'gemini-2.0-flash',
  },
};

// ── Local model providers ──

const LOCAL_SERVERS = [
  { name: 'Ollama', url: 'https://ollama.com', cmd: 'ollama pull llama3.1:8b && ollama serve', port: '11434' },
  { name: 'llama.cpp', url: 'https://github.com/ggerganov/llama.cpp', cmd: 'llama-server -m model.gguf --port 8080', port: '8080' },
  { name: 'vLLM', url: 'https://github.com/vllm-project/vllm', cmd: 'vllm serve model-name', port: '8000' },
];

// ── Component ──

export const SettingsDrawer: React.FC<Props> = ({ open, settings, providerCache, onSave, onClose }) => {
  const [provider, setProvider] = useState<ProviderType>(settings.provider);
  const [endpoint, setEndpoint] = useState(settings.endpoint);
  const [model, setModel] = useState(settings.model);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [showGuide, setShowGuide] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Sequence number + AbortController: only the LATEST fetch may update state.
  // This prevents a slow in-flight request (e.g. from a down/slow saved URL)
  // from overwriting the results of a newer request after the user edits the URL.
  const abortRef = useRef<AbortController | null>(null);
  const fetchSeqRef = useRef(0);

  const fetchModels = useCallback(async (ep: string, key?: string, autoSelectFirst = false) => {
    if (!ep.trim()) return;
    abortRef.current?.abort();
    const seq = ++fetchSeqRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    setFetchingModels(true);
    try {
      const res = await fetch(`${ep.trimEnd('/')}/models`, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        signal: controller.signal,
      });
      if (seq !== fetchSeqRef.current) return; // superseded — ignore
      if (res.ok) {
        const data = await res.json();
        const models: string[] = (data.data || [])
          .map((m: any) => m.id || m.name || '')
          .filter(Boolean);
        if (seq !== fetchSeqRef.current) return;
        setAvailableModels(models);
        if (autoSelectFirst) {
          // URL changed: always select the first model, clearing the previous one
          setModel(models.length > 0 ? models[0] : '');
        } else if (models.length > 0 && !model.trim()) {
          setModel(models[0]);
        }
      } else {
        setAvailableModels([]);
        if (autoSelectFirst) {
          setModel(''); // stale model from the previous URL no longer applies
        }
      }
    } catch {
      if (seq !== fetchSeqRef.current) return; // aborted or superseded — ignore
      setAvailableModels([]);
      if (autoSelectFirst) {
        setModel('');
      }
    } finally {
      if (seq === fetchSeqRef.current) {
        setFetchingModels(false);
      }
    }
  }, [model]);

  // Fetch available models when the drawer opens (local provider) or the
  // endpoint changes. Debounced so typing a URL doesn't fire a request per
  // keystroke, and guarded so each endpoint is fetched only once per open.
  const lastFetchedEndpointRef = useRef<string>('');
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    if (!open || provider !== 'local') return;
    const ep = endpoint.trim();
    if (!ep) return;

    debounceRef.current = window.setTimeout(() => {
      if (lastFetchedEndpointRef.current === ep) return;
      // Initial open: keep the saved URL/model as-is — don't fetch or show a
      // loading flash. Only fetch on first-time setup (no saved model) so the
      // dropdown can still populate. A real URL change always fetches.
      const isUrlChange = lastFetchedEndpointRef.current !== '';
      lastFetchedEndpointRef.current = ep;
      if (!isUrlChange) {
        if (model.trim()) {
          return;
        }
        setTestResult('idle');
        fetchModels(ep, apiKey, false);
        return;
      }
      // URL change: clear the previous model now (input shows empty while
      // loading) and auto-select the first model from the new list.
      setModel('');
      setTestResult('idle');
      fetchModels(ep, apiKey, true);
    }, 400);

    return () => window.clearTimeout(debounceRef.current);
  }, [open, provider, endpoint, apiKey, fetchModels]);

  // Reset the guard when the drawer closes so reopening re-fetches models,
  // and abort any in-flight fetch on unmount.
  useEffect(() => {
    if (!open) {
      lastFetchedEndpointRef.current = '';
    }
  }, [open]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // When model changes, reset test result
  useEffect(() => {
    setTestResult('idle');
  }, [model]);

  // Sync from parent on open
  useEffect(() => {
    if (open) {
      setProvider(settings.provider);
      setEndpoint(settings.endpoint);
      setModel(settings.model);
      setApiKey(settings.apiKey);
      setTestResult('idle');
      setTestError('');
    }
  }, [open, settings]);

  const handleProviderChange = useCallback((_: any, data: { value: string }) => {
    const p = data.value as ProviderType;
    setProvider(p);
    // Restore last-used settings for this provider, falling back to defaults
    const cached = providerCache[p];
    setEndpoint(cached?.endpoint || PROVIDER_PRESETS[p].defaultEndpoint);
    setModel(cached?.model || PROVIDER_PRESETS[p].defaultModel);
    setApiKey(cached?.apiKey ?? '');
    setTestResult('idle');
  }, [providerCache]);

  const handleSave = useCallback(() => {
    onSave({ provider, endpoint, model, apiKey });
  }, [provider, endpoint, model, apiKey, onSave]);

  const handleTest = useCallback(async () => {
    if (!model.trim()) {
      if (availableModels.length > 0) {
        setTestResult('error');
        setTestError('Please select a model from the list below, then test again');
      } else {
        setTestResult('error');
        setTestError('Could not fetch model list from this endpoint. Check the URL or enter a model name manually.');
      }
      return;
    }
    setTesting(true);
    setTestResult('idle');
    setTestError('');
    try {
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setTestResult('success');
        if (data.model && data.model !== model) {
          setModel(data.model);
        }
        // Refresh available models
        fetchModels(endpoint, apiKey);
      } else {
        const text = await res.text().catch(() => '');
        setTestResult('error');
        setTestError(`HTTP ${res.status}${text ? ': ' + text.slice(0, 200) : ''}`);
      }
    } catch (e) {
      setTestResult('error');
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('NetworkError') || msg.includes('Failed to fetch') || msg.includes('fetch')) {
        setTestError(`Could not reach ${endpoint}. Make sure the model server is running and the URL is correct.`);
      } else {
        setTestError(msg || 'Connection refused');
      }
    } finally {
      setTesting(false);
    }
  }, [endpoint, model, apiKey]);

  const preset = PROVIDER_PRESETS[provider];
  const showApiKey = provider !== 'local';
  const hasChanges =
    provider !== settings.provider ||
    endpoint !== settings.endpoint ||
    model !== settings.model ||
    apiKey !== settings.apiKey;

  return (
    <>
      {/* Backdrop */}
      {open && <div className={styles.drawerBackdrop} onClick={onClose} />}

      {/* Panel */}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}>
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderTitle}>
            <SettingsRegular style={{ fontSize: 18 }} />
            AI Settings
          </div>
          <Tooltip content="Close settings" relationship="label">
            <Button
              appearance="subtle"
              icon={<DismissRegular />}
              size="small"
              onClick={onClose}
            />
          </Tooltip>
        </div>

        <div className={styles.drawerBody}>
          {/* ═══════════════════════════════════════════
              GROUP 1 — Provider
              ═══════════════════════════════════════════ */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            }}>
              <span style={{
                width: 2, height: 12, borderRadius: 1,
                background: 'var(--colorBrandForeground1, #0078d4)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--colorNeutralForeground2)', lineHeight: '12px' }}>
                Provider
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(Object.keys(PROVIDER_PRESETS) as ProviderType[]).map((key) => {
                const p = PROVIDER_PRESETS[key];
                const selected = key === provider;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      setProvider(key);
                      const cached = providerCache[key];
                      setEndpoint(cached?.endpoint || p.defaultEndpoint);
                      setModel(cached?.model || p.defaultModel);
                      setApiKey(cached?.apiKey ?? '');
                      setTestResult('idle');
                    }}
                    style={{
                      flex: '0 0 calc(50% - 4px)',
                      minWidth: 140,
                      position: 'relative',
                      padding: '12px 14px',
                      border: selected
                        ? '1px solid var(--colorBrandForeground1, #0078d4)'
                        : '1px solid var(--colorNeutralStroke2, #d1d1d1)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: selected
                        ? 'var(--colorBrandBackground2, #f0f6ff)'
                        : 'var(--colorNeutralBackground1, #fff)',
                    }}
                  >
                    {selected && (
                      <CheckmarkCircleFilled
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          fontSize: 18,
                          color: 'var(--colorBrandForeground1, #0078d4)',
                        }}
                      />
                    )}
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)', lineHeight: 1.4 }}>
                      {p.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              GROUP 2 — Setup Guide
              ═══════════════════════════════════════════ */}
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => setShowGuide(!showGuide)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', border: 'none', background: 'none',
                cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit',
                textAlign: 'left', marginBottom: showGuide ? 12 : 0,
              }}
            >
              <span style={{
                width: 2, height: 12, borderRadius: 1,
                background: 'var(--colorBrandForeground1, #0078d4)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--colorNeutralForeground2)', flex: 1, lineHeight: '12px' }}>
                Setup Guide
              </span>
              {showGuide ? <ChevronUpRegular fontSize={14} /> : <ChevronDownRegular fontSize={14} />}
            </button>

            {showGuide && (
              <div className={styles.guideBody}>
                {provider === 'local' ? (
                  <>
                    <p className={styles.guideText}>
                      Choose one of these free, open-source local servers. Click to visit their site.
                    </p>
                    <div className={styles.guideGrid}>
                      {LOCAL_SERVERS.map((srv) => (
                        <a
                          key={srv.name}
                          href={srv.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.guideCard}
                        >
                          <div className={styles.guideCardName}>
                            {srv.name}
                            <OpenRegular fontSize={12} style={{ marginLeft: 4, opacity: 0.5 }} />
                          </div>
                          <code className={styles.guideCardCmd}>{srv.cmd}</code>
                          <span className={styles.guideCardPort}>Port: {srv.port}</span>
                        </a>
                      ))}
                    </div>
                    <p className={styles.guideNote}>
                      After starting your server, set the Endpoint URL below to <code>http://localhost:&lt;port&gt;/v1</code>.
                      No API key is needed for local models.
                    </p>
                  </>
                ) : provider === 'anthropic' ? (
                  <>
                    <p className={styles.guideText}>To use Claude, you need an API key from Anthropic:</p>
                    <ol className={styles.guideList}>
                      <li>Go to <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></li>
                      <li>Sign up or log in, then create an API key</li>
                      <li>Paste your key below (starts with <code>sk-ant-</code>)</li>
                      <li>Choose your model (e.g. claude-3-5-sonnet-20241022)</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className={styles.guideText}>To use Gemini, you need an API key from Google:</p>
                    <ol className={styles.guideList}>
                      <li>Go to <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">aistudio.google.com</a></li>
                      <li>Sign in with your Google account</li>
                      <li>Click "Get API Key" and create a new key</li>
                      <li>Paste your key below and select a model</li>
                    </ol>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════
              GROUP 3 — Configuration
              ═══════════════════════════════════════════ */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            }}>
              <span style={{
                width: 2, height: 12, borderRadius: 1,
                background: 'var(--colorBrandForeground1, #0078d4)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--colorNeutralForeground2)', lineHeight: '12px' }}>
                Configuration
              </span>
            </div>

            {/* Endpoint */}
            <Field label={<span style={{ color: 'var(--colorNeutralForeground2)', fontSize: 11 }}>Endpoint URL</span>} size="small" style={{ marginBottom: 14 }}>
              <Textarea
                value={endpoint}
                onChange={(e) => setEndpoint(e.currentTarget.value)}
                placeholder={preset.endpointPlaceholder}
                resize="vertical"
                rows={2}
                style={{
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  minHeight: 56,
                }}
              />
            </Field>

            {/* Model */}
            <Field label={<span style={{ color: 'var(--colorNeutralForeground2)', fontSize: 11 }}>Model Name</span>} size="small" style={{ marginBottom: 4 }}>
              <Input
                value={model}
                onChange={(e) => setModel(e.currentTarget.value)}
                placeholder={fetchingModels ? 'Fetching models...' : preset.modelPlaceholder}
                style={{ height: 38 }}
              />
            </Field>
            {provider === 'local' && availableModels.length > 0 && (
              <div style={{
                marginBottom: 14, maxHeight: 120, overflowY: 'auto',
                border: '1px solid var(--colorNeutralStroke2)',
                borderRadius: 4, fontSize: 12,
              }}>
                {fetchingModels ? (
                  <div style={{ padding: '8px 12px', color: 'var(--colorNeutralForeground3)' }}>Loading models...</div>
                ) : availableModels.map((m) => (
                  <div
                    key={m}
                    onClick={() => setModel(m)}
                    style={{
                      padding: '6px 12px', cursor: 'pointer',
                      background: m === model ? 'var(--colorNeutralBackground2)' : 'transparent',
                      borderBottom: '1px solid var(--colorNeutralStroke2)',
                    }}
                  >
                    <CheckmarkCircleRegular
                      style={{
                        fontSize: 12, color: m === model ? 'var(--colorBrandForeground1)' : 'transparent',
                        marginRight: 6, verticalAlign: 'middle',
                      }}
                    />
                    {m}
                  </div>
                ))}
              </div>
            )}

            {/* API Key (cloud only) */}
            {showApiKey && (
              <Field label={<span style={{ color: 'var(--colorNeutralForeground2)', fontSize: 11 }}>API Key</span>} size="small" style={{ marginTop: 14, marginBottom: 14 }}>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.currentTarget.value)}
                  placeholder="sk-..."
                  style={{ height: 38 }}
                />
              </Field>
            )}

            {/* Test Connection */}
            <div style={{ marginTop: 8 }}>
              <Button
                appearance="outline"
                size="small"
                onClick={handleTest}
                disabled={testing || !endpoint.trim() || !model.trim()}
                style={{ width: '100%', height: 30 }}
              >
                {testing ? (
                  <><Spinner size="extra-tiny" style={{ marginRight: 8 }} /> Testing...</>
                ) : (
                  'Test Connection'
                )}
              </Button>
              {testResult === 'success' && (
                <div className={styles.testSuccess} style={{ fontSize: 12 }}>
                  <CheckmarkCircleRegular /> Connected successfully
                </div>
              )}
              {testResult === 'error' && (
                <div className={styles.testError} style={{ fontSize: 12 }}>
                  <ErrorCircleRegular style={{ fontSize: 16 }} /> {testError || 'Connection failed'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.drawerFooter}>
          <Button appearance="outline" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            size="small"
            onClick={handleSave}
            disabled={!hasChanges || !endpoint || !model || (showApiKey && !apiKey) || (hasChanges && testResult !== 'success')}
          >
            Save
          </Button>
        </div>
      </div>
    </>
  );
};
