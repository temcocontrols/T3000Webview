/**
 * AddServerDialog — Dialog to add an external MCP server.
 */

import React, { useState, useCallback } from 'react';
import { Button, Input, Spinner } from '@fluentui/react-components';
import {
  DismissRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import styles from '../AiChat.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, url: string, apiKey?: string) => Promise<void>;
  onTest: (url: string) => Promise<{ ok: boolean; error?: string }>;
}

export const AddServerDialog: React.FC<Props> = ({ open, onClose, onAdd, onTest }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [testError, setTestError] = useState('');

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult('idle');
    const r = await onTest(url);
    setTestResult(r.ok ? 'ok' : 'fail');
    setTestError(r.error || '');
    setTesting(false);
  }, [url, onTest]);

  const handleAdd = useCallback(async () => {
    setAdding(true);
    try {
      await onAdd(name, url, apiKey || undefined);
      setName(''); setUrl(''); setApiKey('');
      onClose();
    } catch { }
    setAdding(false);
  }, [name, url, apiKey, onAdd, onClose]);

  if (!open) return null;

  return (
    <>
      <div className={styles.dialogBackdrop} onClick={onClose} />
      <div className={styles.dialog}>
        <div className={styles.dialogHeader}>
          <span>Add MCP Server</span>
          <Button appearance="subtle" icon={<DismissRegular />} size="small" onClick={onClose} />
        </div>
        <div className={styles.dialogBody}>
          <div style={{ marginBottom: 12 }}>
            <Input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Display name (e.g. Weather API)"
              style={{ height: 38 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Input
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              placeholder="MCP URL (e.g. http://x:9001/mcp)"
              style={{ height: 38, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.currentTarget.value)}
              placeholder="API Key (optional)"
              style={{ height: 38 }}
            />
          </div>
          <Button
            appearance="outline"
            size="small"
            onClick={handleTest}
            disabled={testing || !url}
            style={{ width: '100%', height: 30, marginBottom: 8 }}
          >
            {testing ? <><Spinner size="extra-tiny" style={{ marginRight: 8 }} /> Testing…</> : 'Test Connection'}
          </Button>
          {testResult === 'ok' && (
            <div className={styles.testSuccess}><CheckmarkCircleRegular /> Connected</div>
          )}
          {testResult === 'fail' && (
            <div className={styles.testError}><ErrorCircleRegular /> {testError || 'Failed'}</div>
          )}
        </div>
        <div className={styles.dialogFooter}>
          <Button appearance="outline" size="small" onClick={onClose}>Cancel</Button>
          <Button appearance="primary" size="small" onClick={handleAdd} disabled={!name || !url || adding}>
            {adding ? 'Adding…' : 'Add Server'}
          </Button>
        </div>
      </div>
    </>
  );
};
