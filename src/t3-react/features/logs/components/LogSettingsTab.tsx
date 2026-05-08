/**
 * Log Settings Tab
 *
 * Read/write per-category log config via GET/PUT /api/logs/settings
 */

import React, { useState, useEffect } from 'react';
import {
  Text,
  Button,
  Switch,
  Select,
  Spinner,
  Badge,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, SaveRegular, ErrorCircleRegular } from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';

const SETTINGS_URL = `${API_BASE_URL}/api/logs/settings`;

interface LogCategoryConfig {
  category: string;
  displayName: string;
  description: string;
  group: string;
  enabled: boolean;
  detailMode: string;
  minLevel: string;
  target: string;
}

const GROUP_LABELS: Record<string, string> = {
  system: 'System Events',
  operational: 'Operational (high-volume)',
  debug: 'Debug (off by default)',
};

const GROUP_ORDER = ['system', 'operational', 'debug'];

export const LogSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<LogCategoryConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SETTINGS_URL);
      if (response.ok) {
        const data: LogCategoryConfig[] = await response.json();
        setSettings(data);
        setDirty(false);
      } else {
        setError(`Server returned ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to load log settings:', err);
      setError('Could not reach the T3000 service — is it running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (category: string, patch: Partial<LogCategoryConfig>) => {
    setSettings(prev => prev.map(s => s.category === category ? { ...s, ...patch } : s));
    setDirty(true);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(SETTINGS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (response.ok) {
        setSaved(true);
        setDirty(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save log settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const grouped = GROUP_ORDER.map(group => ({
    group,
    label: GROUP_LABELS[group] ?? group,
    items: settings.filter(s => s.group === group),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', gap: '12px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button appearance="subtle" icon={<ArrowClockwiseRegular style={{ fontSize: '13px' }} />} onClick={load} disabled={loading} size="small">
          Reload
        </Button>
        <Button
          appearance={dirty ? 'primary' : 'subtle'}
          icon={saving ? <Spinner size="tiny" /> : <SaveRegular />}
          onClick={save}
          disabled={saving || !dirty}
          size="small"
        >
          Save Changes
        </Button>
        {saved && (
          <Badge appearance="filled" color="success" size="small">Saved</Badge>
        )}
        <Text size={200} style={{ color: '#605e5c', marginLeft: 'auto' }}>
          Changes take effect on next log write (no restart required)
        </Text>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flex: 1 }}>
          <Spinner size="small" />
          <Text size={200}>Loading settings...</Text>
        </div>
      ) : error ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          margin: '0',
          backgroundColor: '#fde7e9',
          borderBottom: '1px solid #f1a3a8',
          flexShrink: 0,
        }}>
          <ErrorCircleRegular style={{ fontSize: '14px', color: '#a4262c', flexShrink: 0 }} />
          <Text size={200} style={{ color: '#a4262c', flex: 1 }}>{error}</Text>
          <Button
            size="small"
            appearance="subtle"
            icon={<ArrowClockwiseRegular style={{ fontSize: '12px' }} />}
            onClick={load}
            style={{ flexShrink: 0 }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div style={{ overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {grouped.map(({ group, label, items }) => (
            <div key={group}>
              <Text size={300} weight="semibold" style={{ display: 'block', marginBottom: '8px', color: '#323130' }}>
                {label}
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {items.map(cfg => (
                  <div key={cfg.category} style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 36px 1fr 130px 110px 80px',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: '#faf9f8',
                    borderRadius: '4px',
                    border: '1px solid #edebe9',
                  }}>
                    <div>
                      <Text size={200} weight="semibold">{cfg.displayName}</Text>
                      <Text size={100} style={{ display: 'block', color: '#a19f9d' }}>{cfg.category}</Text>
                    </div>

                    <Switch
                      checked={cfg.enabled}
                      onChange={(_, data) => update(cfg.category, { enabled: data.checked })}
                      style={{ margin: 0 }}
                    />

                    <Text size={100} style={{ color: '#605e5c' }}>{cfg.description}</Text>

                    <Select
                      value={cfg.detailMode}
                      onChange={(_, data) => update(cfg.category, { detailMode: data.value })}
                      size="small"
                      disabled={!cfg.enabled}
                    >
                      <option value="SUMMARY">SUMMARY</option>
                      <option value="FULL">FULL</option>
                    </Select>

                    <Select
                      value={cfg.minLevel}
                      onChange={(_, data) => update(cfg.category, { minLevel: data.value })}
                      size="small"
                      disabled={!cfg.enabled}
                    >
                      <option value="DEBUG">DEBUG</option>
                      <option value="INFO">INFO</option>
                      <option value="WARN">WARN</option>
                      <option value="ERROR">ERROR</option>
                    </Select>

                    <Badge
                      appearance="outline"
                      color={cfg.target === 'mssql' ? 'warning' : 'informative'}
                      size="small"
                      style={{ justifySelf: 'center' }}
                    >
                      {cfg.target}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LogSettingsTab;
