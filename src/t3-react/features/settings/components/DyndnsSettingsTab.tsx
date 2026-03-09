/**
 * DyndnsSettingsTab
 *
 * Dyndns tab for SettingsPage — matches C++ BacnetSettingDyndns layout:
 *   "Dyndns Config" group box:
 *     [ ] Enable Dyndns Service
 *     Select DDNS Server  [dropdown]
 *     User Name           [input]
 *     Password            [input]
 *     Domain              [input]
 *     Check the external IP address automatically [input] min
 *
 * C++ reference: T3000-Source/T3000/BacnetSettingDyndns.cpp
 * DDNS servers from global_define.h DDNS_Server_Name[]:
 *   0 = www.3322.org
 *   1 = www.dyndns.com
 *   2 = www.no-ip.com
 *   3 = dynu.com
 *   4 = bravocontrols.com
 *
 * en_dyndns: 1 = disabled, 2 = enabled  (mirrors C++ toggle logic)
 */

import React from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Option,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { SaveRegular } from '@fluentui/react-icons';
import type { DeviceSettings } from '../services/settingsRefreshApi';

// ─── Constants from C++ global_define.h DDNS_Server_Name[] ───────────────────

const DDNS_SERVERS = [
  { value: '0', label: 'www.3322.org' },
  { value: '1', label: 'www.dyndns.com' },
  { value: '2', label: 'www.no-ip.com' },
  { value: '3', label: 'dynu.com' },
  { value: '4', label: 'bravocontrols.com' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '480px',
  },
  groupBox: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '12px 16px 16px',
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'relative',
  },
  groupTitle: {
    fontSize: '12px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    paddingBottom: '6px',
    marginBottom: '12px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  label: {
    fontSize: '12px',
    minWidth: '190px',
    color: tokens.colorNeutralForeground1,
  },
  control: {
    flex: 1,
    minWidth: '180px',
  },
  updateTimeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  updateTimeLabel: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
  },
  updateTimeInput: {
    width: '70px',
  },
  unitText: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
  saveRow: {
    marginTop: '8px',
  },
  disabledOverlay: {
    opacity: 0.45,
    pointerEvents: 'none' as const,
  },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DyndnsSettings {
  Enable_DynDNS?: number;         // 1 = disabled, 2 = enabled
  DynDNS_Provider?: number;       // 0-4 index into DDNS_SERVERS
  DynDNS_User?: string;
  DynDNS_Pass?: string;
  DynDNS_Domain?: string;
  DynDNS_Update_Time?: number;    // minutes, 0-65535
}

interface DyndnsSettingsTabProps {
  dyndnsSettings: DyndnsSettings;
  setDyndnsSettings: (s: DyndnsSettings) => void;
  updateSettings: (u: Partial<DeviceSettings>) => void;
  onSave: () => Promise<void>;
  loading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DyndnsSettingsTab: React.FC<DyndnsSettingsTabProps> = ({
  dyndnsSettings,
  setDyndnsSettings,
  updateSettings,
  onSave,
  loading,
}) => {
  const styles = useStyles();

  const enabled = dyndnsSettings.Enable_DynDNS === 2;
  const providerIdx = dyndnsSettings.DynDNS_Provider ?? 0;
  const providerLabel = DDNS_SERVERS[providerIdx]?.label ?? DDNS_SERVERS[0].label;

  const handleEnable = (_: any, data: { checked: boolean | 'mixed' }) => {
    const v = data.checked ? 2 : 1;
    setDyndnsSettings({ ...dyndnsSettings, Enable_DynDNS: v });
    updateSettings({ en_dyndns: v });
  };

  const handleProviderSelect = (_: any, data: { optionValue?: string }) => {
    const v = Number(data.optionValue ?? '0');
    setDyndnsSettings({ ...dyndnsSettings, DynDNS_Provider: v });
    updateSettings({ dyndns_provider: v });
  };

  const handleUser = (_: any, data: { value: string }) => {
    setDyndnsSettings({ ...dyndnsSettings, DynDNS_User: data.value });
    updateSettings({ dyndns_user: data.value });
  };

  const handlePass = (_: any, data: { value: string }) => {
    setDyndnsSettings({ ...dyndnsSettings, DynDNS_Pass: data.value });
    updateSettings({ dyndns_pass: data.value });
  };

  const handleDomain = (_: any, data: { value: string }) => {
    setDyndnsSettings({ ...dyndnsSettings, DynDNS_Domain: data.value });
    updateSettings({ dyndns_domain: data.value });
  };

  const handleUpdateTime = (_: any, data: { value: string }) => {
    const v = Number(data.value);
    if (isNaN(v) || v < 0 || v > 65535) return;
    setDyndnsSettings({ ...dyndnsSettings, DynDNS_Update_Time: v });
    updateSettings({ dyndns_update_time: v });
  };

  return (
    <div className={styles.root}>
      {/* ── Dyndns Config group box ─────────────────────────────────────── */}
      <div className={styles.groupBox}>
        <div className={styles.groupTitle}>Dyndns Config</div>

        {/* Enable checkbox */}
        <div className={styles.row}>
          <Checkbox
            label={{ style: { fontSize: '12px', fontWeight: 'normal' }, children: 'Enable Dyndns Service' }}
            checked={enabled}
            onChange={handleEnable}
          />
        </div>

        {/* Fields — always visible, disable when service is off (matches C++ dialog behavior) */}
        <div className={enabled ? undefined : styles.disabledOverlay}>
          {/* Select DDNS Server */}
          <div className={styles.row}>
            <span className={styles.label}>Select DDNS Server</span>
            <Dropdown
              className={styles.control}
              style={{ fontSize: '12px' }}
              button={{ style: { fontSize: '12px' } }}
              value={providerLabel}
              onOptionSelect={handleProviderSelect}
              disabled={!enabled}
            >
              {DDNS_SERVERS.map((s) => (
                <Option key={s.value} value={s.value} style={{ fontSize: '12px' }}>
                  {s.label}
                </Option>
              ))}
            </Dropdown>
          </div>

          {/* User Name */}
          <div className={styles.row}>
            <span className={styles.label}>User Name</span>
            <Input
              className={styles.control}
              style={{ fontSize: '12px' }}
              value={dyndnsSettings.DynDNS_User ?? ''}
              maxLength={32}
              onChange={handleUser}
              disabled={!enabled}
            />
          </div>

          {/* Password */}
          <div className={styles.row}>
            <span className={styles.label}>Password</span>
            <Input
              className={styles.control}
              style={{ fontSize: '12px' }}
              type="password"
              value={dyndnsSettings.DynDNS_Pass ?? ''}
              maxLength={32}
              onChange={handlePass}
              disabled={!enabled}
            />
          </div>

          {/* Domain */}
          <div className={styles.row}>
            <span className={styles.label}>Domain</span>
            <Input
              className={styles.control}
              style={{ fontSize: '12px' }}
              value={dyndnsSettings.DynDNS_Domain ?? ''}
              maxLength={64}
              onChange={handleDomain}
              disabled={!enabled}
            />
          </div>

          {/* Check interval */}
          <div className={styles.updateTimeRow}>
            <span className={styles.updateTimeLabel}>
              Check the external IP address automatically
            </span>
            <Input
              className={styles.updateTimeInput}
              style={{ fontSize: '12px' }}
              type="number"
              min={0}
              max={65535}
              value={String(dyndnsSettings.DynDNS_Update_Time ?? 0)}
              onChange={handleUpdateTime}
              disabled={!enabled}
            />
            <span className={styles.unitText}>min</span>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className={styles.saveRow}>
        <Button
          size="small"
          appearance="primary"
          icon={<SaveRegular />}
          onClick={onSave}
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Save DynDNS Settings'}
        </Button>
      </div>
    </div>
  );
};

export default DyndnsSettingsTab;
