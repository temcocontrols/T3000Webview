/**
 * SettingsDrawer — Slide-in settings panel for AI provider configuration.
 *
 * Supports two integration types:
 *   1. Local model (Ollama, vLLM, LM Studio, llama.cpp)
 *   2. External API (Anthropic Claude, Google Gemini) — customer's own API key
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Button,
  Input,
  Textarea,
  RadioGroup,
  Radio,
  Spinner,
  Divider,
  Tooltip,
  Field,
} from '@fluentui/react-components';
import {
  DismissRegular,
  SettingsRegular,
  CheckmarkCircleRegular,
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

const PROVIDER_PRESETS: Record<ProviderType, { label: string; desc: string; defaultEndpoint: string; defaultModel: string }> = {
  local: {
    label: 'Local Model',
    desc: 'Run a model on your own machine — no internet required after download.',
    defaultEndpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1:8b',
  },
  anthropic: {
    label: 'Anthropic Claude',
    desc: 'Claude API — requires your own API key from console.anthropic.com',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  gemini: {
    label: 'Google Gemini',
    desc: 'Gemini API — requires your own API key from aistudio.google.com',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
  },
};

// ── Local model providers ──

const LOCAL_SERVERS = [
  { name: 'Ollama', url: 'https://ollama.com', cmd: 'ollama pull llama3.1:8b && ollama serve', port: '11434' },
  { name: 'llama.cpp', url: 'https://github.com/ggerganov/llama.cpp', cmd: 'llama-server -m model.gguf --port 8080', port: '8080' },
  { name: 'vLLM', url: 'https://github.com/vllm-project/vllm', cmd: 'vllm serve model-name', port: '8000' },
  { name: 'LM Studio', url: 'https://lmstudio.ai', cmd: 'Download & run the app, load a model', port: '1234' },
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
    setEndpoint(cached?.endpoint ?? PROVIDER_PRESETS[p].defaultEndpoint);
    setModel(cached?.model ?? PROVIDER_PRESETS[p].defaultModel);
    setApiKey(cached?.apiKey ?? '');
    setTestResult('idle');
  }, [providerCache]);

  const handleSave = useCallback(() => {
    onSave({ provider, endpoint, model, apiKey });
  }, [provider, endpoint, model, apiKey, onSave]);

  const handleTest = useCallback(async () => {
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
        // Auto-fill model name from response
        if (data.model && data.model !== model) {
          setModel(data.model);
        }
      } else {
        const text = await res.text().catch(() => '');
        setTestResult('error');
        setTestError(`HTTP ${res.status}${text ? ': ' + text.slice(0, 200) : ''}`);
      }
    } catch (e) {
      setTestResult('error');
      setTestError(e instanceof Error ? e.message : 'Connection refused');
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
          {/* ── Provider ── */}
          <Field label="Provider" size="small">
            <RadioGroup
              value={provider}
              onChange={handleProviderChange}
              layout="vertical"
            >
              {(Object.keys(PROVIDER_PRESETS) as ProviderType[]).map((key) => (
                <Radio key={key} value={key} label={PROVIDER_PRESETS[key].label} />
              ))}
            </RadioGroup>
          </Field>
          <p className={styles.drawerHint}>{preset.desc}</p>

          {/* ── Setup Guide (collapsible) ── */}
          <button
            className={styles.guideToggle}
            onClick={() => setShowGuide(!showGuide)}
          >
            <span>Setup Guide</span>
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

          <Divider style={{ margin: '16px 0' }} />

          {/* ── Endpoint ── */}
          <Field label="Endpoint URL" size="small" style={{ marginBottom: 14 }}>
            <Textarea
              value={endpoint}
              onChange={(e) => setEndpoint(e.currentTarget.value)}
              placeholder="https://your-llm-server:port/v1"
              resize="vertical"
              rows={2}
              style={{
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                minHeight: 56,
              }}
            />
          </Field>

          {/* ── Model ── */}
          <Field label="Model Name" size="small" style={{ marginBottom: 14 }}>
            <Input
              value={model}
              onChange={(e) => setModel(e.currentTarget.value)}
              placeholder="model-name"
              style={{ height: 38 }}
            />
          </Field>

          {/* ── API Key (cloud only) ── */}
          {showApiKey && (
            <Field label="API Key" size="small" style={{ marginBottom: 14 }}>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.currentTarget.value)}
                placeholder="sk-..."
                style={{ height: 38 }}
              />
            </Field>
          )}

          {/* ── Test Connection ── */}
          <div style={{ marginBottom: 16 }}>
            <Button
              appearance="outline"
              size="small"
              onClick={handleTest}
              disabled={testing || !endpoint}
              style={{ width: '100%', height: 30 }}
            >
              {testing ? (
                <><Spinner size="extra-tiny" style={{ marginRight: 8 }} /> Testing...</>
              ) : (
                'Test Connection'
              )}
            </Button>
            {testResult === 'success' && (
              <div className={styles.testSuccess}>
                <CheckmarkCircleRegular /> Connected successfully
              </div>
            )}
            {testResult === 'error' && (
              <div className={styles.testError}>
                <ErrorCircleRegular /> {testError || 'Connection failed'}
              </div>
            )}
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
            disabled={!hasChanges || !endpoint || !model || (showApiKey && !apiKey)}
          >
            Save
          </Button>
        </div>
      </div>
    </>
  );
};
