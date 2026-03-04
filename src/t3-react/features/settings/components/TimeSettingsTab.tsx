/**
 * TimeSettingsTab
 *
 * Time tab for SettingsPage — matches C++ BacnetSettingTime layout:
 *  Left:  Sync mode (PC/NTP), Date/Time display, SYNC/Refresh, Time Server, Time Zone, DST
 *  Right: Device Running Time card, Device Current Time
 *
 * C++ reference: T3000-Source/T3000/BacnetSettingTime.cpp + global_define.h
 */

import React, { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Field,
  Input,
  Option,
  Text,
  makeStyles,
  tokens,
  Radio,
  RadioGroup,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  ArrowSyncRegular,
  SaveRegular,
} from '@fluentui/react-icons';
import type { DeviceSettings } from '../services/settingsRefreshApi';

// ─── Constants from C++ global_define.h ──────────────────────────────────────

const TIME_ZONE_VALUES = [
  -1200, -1100, -1000, -900, -800, -700, -600, -500, -400, -350, -300, -200, -100,
  0, 100, 200, 300, 350, 400, 450, 500, 550, 600, 650, 700, 800, 900, 950, 1000, 1100, 1200, 1300,
];

const TIME_ZONE_NAMES = [
  '(UTC - 12:00) , Yankee Time Zone',
  '(UTC - 11:00) , X-ray Time Zone',
  '(UTC - 10:00) , Cook Island , Hawaii-Aleutian Standard Time',
  '(UTC - 09:00) , Alaska Standard Time , Gambier Time',
  '(UTC - 08:00) , Pacific Standard Time',
  '(UTC - 07:00) , Mountain Standard Time , Pacific Daylight Time',
  '(UTC - 06:00) , Central Standard Time , Galapagos Time',
  '(UTC - 05:00) , Eastern Standard Time',
  '(UTC - 04:00) , Atlantic Standard Time , Bolivia Time',
  '(UTC - 03:30) , Newfoundland',
  '(UTC - 03:00) , Atlantic Daylight Time , Amazon Summer Time',
  '(UTC - 02:00) , Fernando de Noronha Time , Oscar Time Zone',
  '(UTC - 01:00) , Azores Time , Cape Verde Time',
  '(UTC) , Coordinated Universal Time',
  '(UTC + 01:00) , Alpha Time Zone',
  '(UTC + 02:00) , Central Africa Time , Central European Summer Time',
  '(UTC + 03:00) , Charlie Time Zone , Eastern Africa Time',
  '(UTC + 03:30) , Tehran',
  '(UTC + 04:00) , Armenia Time , Azerbaijan Time',
  '(UTC + 04:30) , Kabul',
  '(UTC + 05:00) , Armenia Summer Time , Aqtobe Time',
  '(UTC + 05:30) , Sri Jayawardenepura',
  '(UTC + 06:00) , Bangladesh Standard Time , Bhutan Time',
  '(UTC + 06:30) , Yangon',
  '(UTC + 07:00) , Christmas Island Time , Davis Time',
  '(UTC + 08:00) , China Standard Time , Hong Kong Time',
  '(UTC + 09:00) , Australian Western Daylight Time',
  '(UTC + 09:30) , Darwin',
  '(UTC + 10:00) , Chamorro Standard Time , Kilo Time Zone',
  '(UTC + 11:00) , Lima , Vanuatu Time',
  '(UTC + 12:00) , Anadyr Time , Fiji Time , Gilbert Island Time',
  '(UTC + 13:00) , New Zealand Daylight Time',
];

/** Preset NTP servers (C++ Time_Server_Name[]). en_sntp: 2/3/4/5+ = preset/custom */
const NTP_PRESETS = [
  { label: 'ntp.sjtu.edu.cn',  enSntp: 2 },
  { label: 'time.nist.gov',    enSntp: 3 },
  { label: 'time.windows.com', enSntp: 4 },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];

/** Days in month (no leap year check needed — just max days for selector) */
function daysInMonth(month: number): number {
  const thirtyOne = [1, 3, 5, 7, 8, 10, 12];
  if (thirtyOne.includes(month)) return 31;
  if (month === 2) return 28;
  return 30;
}

function formatEpochAsLocal(epoch: number): string {
  if (!epoch) return '—';
  const d = new Date(epoch * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatRuntime(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const days  = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins  = Math.floor((seconds % 3600) / 60);
  return `${days} Days   ${hours} Hours   ${mins} Minutes`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    gap: '16px',
    alignItems: 'start',
  },
  card: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '12px 16px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: tokens.fontWeightRegular,
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
    minWidth: '90px',
    color: tokens.colorNeutralForeground3,
  },
  dateTimeBox: {
    fontFamily: 'monospace',
    fontSize: '13px',
    padding: '4px 10px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
    minWidth: '110px',
    color: tokens.colorNeutralForeground1,
  },
  syncModeGroup: {
    marginBottom: '12px',
  },
  pcModeBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px 10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    marginBottom: '10px',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  ntpModeBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px 10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    marginBottom: '10px',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  tzRow: {
    marginBottom: '10px',
  },
  dstBlock: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    padding: '8px 10px',
    marginTop: '4px',
    marginBottom: '12px',
  },
  dstDatesRow: {
    display: 'flex',
    gap: '24px',
    marginTop: '8px',
    alignItems: 'center',
  },
  dstGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dstGroupLabel: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  dstSelectors: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  statusValue: {
    fontFamily: 'monospace',
    fontSize: '13px',
    fontWeight: tokens.fontWeightRegular,
    padding: '8px 12px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    width: '100%',
    marginBottom: '12px',
  },
  statusLabel: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    marginBottom: '4px',
  },
  saveRow: {
    marginTop: '16px',
  },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TimeSettings {
  Time_Zone?: number;
  Time_Zone_Summer_Daytime?: number;
  Enable_SNTP?: number;
  SNTP_Server?: string;
  Time_Sync_Auto_Manual?: number;
  Start_Month?: number;
  Start_Day?: number;
  End_Month?: number;
  End_Day?: number;
}

interface TimeSettingsTabProps {
  timeSettings: TimeSettings;
  setTimeSettings: (s: TimeSettings) => void;
  updateSettings: (u: Partial<DeviceSettings>) => void;
  onSave: () => Promise<void>;
  onSyncPC: () => Promise<void>;
  onSyncTimeServer: () => Promise<void>;
  onRefreshTime: () => Promise<void>;
  loading: boolean;
  /** settings.time_update_since_1970 — device current time as Unix epoch */
  deviceEpoch?: number;
  /** device uptime in seconds */
  deviceRuntimeSeconds?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TimeSettingsTab: React.FC<TimeSettingsTabProps> = ({
  timeSettings,
  setTimeSettings,
  updateSettings,
  onSave,
  onSyncPC,
  onSyncTimeServer,
  onRefreshTime,
  loading,
  deviceEpoch,
  deviceRuntimeSeconds,
}) => {
  const styles = useStyles();

  // Live PC clock (updates every second for display)
  const [pcClock, setPcClock] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setPcClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [syncLoading, setSyncLoading] = useState(false);
  const [ntpLoading, setNtpLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────────────

  const isNTP = (timeSettings.Time_Sync_Auto_Manual ?? 0) === 0;
  const dstEnabled = (timeSettings.Time_Zone_Summer_Daytime ?? 0) === 1;

  // Current timezone index → name
  const tzIndex = TIME_ZONE_VALUES.indexOf(timeSettings.Time_Zone ?? 800);
  const tzDisplayName = tzIndex >= 0 ? TIME_ZONE_NAMES[tzIndex] : String(timeSettings.Time_Zone ?? '');

  // NTP server: determine if preset or custom
  const enSntp = timeSettings.Enable_SNTP ?? 2;
  const presetIdx = NTP_PRESETS.findIndex(p => p.enSntp === enSntp);
  const isCustomServer = enSntp >= 5;
  const [customServer, setCustomServer] = useState(timeSettings.SNTP_Server ?? '');

  // DST selectors — guard valid month ranges
  const startMonth = timeSettings.Start_Month ?? 3;
  const startDay   = timeSettings.Start_Day   ?? 14;
  const endMonth   = timeSettings.End_Month   ?? 11;
  const endDay     = timeSettings.End_Day     ?? 7;

  // PC date/time display
  const pad = (n: number) => String(n).padStart(2, '0');
  const pcDateStr = `${pcClock.getFullYear()}-${pad(pcClock.getMonth()+1)}-${pad(pcClock.getDate())}`;
  const pcTimeStr = `${pad(pcClock.getHours())}:${pad(pcClock.getMinutes())}:${pad(pcClock.getSeconds())}`;


  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSyncModeChange = (value: string) => {
    const v = value === 'ntp' ? 0 : 1;
    setTimeSettings({ ...timeSettings, Time_Sync_Auto_Manual: v });
    updateSettings({ time_sync_auto_manual: v });
  };

  const handleTimezoneSelect = (_: any, data: { optionValue?: string }) => {
    const idx = Number(data.optionValue);
    const val = TIME_ZONE_VALUES[idx] ?? 0;
    setTimeSettings({ ...timeSettings, Time_Zone: val });
    updateSettings({ time_zone: val });
  };

  const handleNtpServerSelect = (_: any, data: { optionValue?: string }) => {
    const val = data.optionValue ?? '';
    if (val === 'custom') {
      setTimeSettings({ ...timeSettings, Enable_SNTP: 5, SNTP_Server: customServer });
      updateSettings({ en_sntp: 5, sntp_server: customServer });
    } else {
      const idx = Number(val);
      const preset = NTP_PRESETS[idx];
      if (preset) {
        setTimeSettings({ ...timeSettings, Enable_SNTP: preset.enSntp, SNTP_Server: preset.label });
        updateSettings({ en_sntp: preset.enSntp, sntp_server: preset.label });
      }
    }
  };

  const handleCustomServerChange = (val: string) => {
    setCustomServer(val);
    setTimeSettings({ ...timeSettings, Enable_SNTP: 5, SNTP_Server: val });
    updateSettings({ en_sntp: 5, sntp_server: val });
  };

  const handleDstToggle = (checked: boolean) => {
    const v = checked ? 1 : 0;
    setTimeSettings({ ...timeSettings, Time_Zone_Summer_Daytime: v });
    updateSettings({ time_zone_summer_daytime: v });
  };

  const handleStartMonth = (_: any, data: { optionValue?: string }) => {
    const m = Number(data.optionValue);
    const clampedDay = Math.min(startDay, daysInMonth(m));
    setTimeSettings({ ...timeSettings, Start_Month: m, Start_Day: clampedDay });
    updateSettings({ start_month: m, start_day: clampedDay });
  };

  const handleStartDay = (_: any, data: { optionValue?: string }) => {
    const d = Number(data.optionValue);
    setTimeSettings({ ...timeSettings, Start_Day: d });
    updateSettings({ start_day: d });
  };

  const handleEndMonth = (_: any, data: { optionValue?: string }) => {
    const m = Number(data.optionValue);
    const clampedDay = Math.min(endDay, daysInMonth(m));
    setTimeSettings({ ...timeSettings, End_Month: m, End_Day: clampedDay });
    updateSettings({ end_month: m, end_day: clampedDay });
  };

  const handleEndDay = (_: any, data: { optionValue?: string }) => {
    const d = Number(data.optionValue);
    setTimeSettings({ ...timeSettings, End_Day: d });
    updateSettings({ end_day: d });
  };

  const handleSyncPC = async () => {
    setSyncLoading(true);
    try { await onSyncPC(); } finally { setSyncLoading(false); }
  };

  const handleNtpSync = async () => {
    setNtpLoading(true);
    try { await onSyncTimeServer(); } finally { setNtpLoading(false); }
  };

  const handleRefreshTime = async () => {
    setRefreshLoading(true);
    try { await onRefreshTime(); } finally { setRefreshLoading(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>

      {/* ── LEFT: Configuration ─────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Time Configuration</div>

        {/* Sync Mode Radio */}
        <div className={styles.syncModeGroup}>
          <RadioGroup
            layout="horizontal"
            value={isNTP ? 'ntp' : 'pc'}
            onChange={(_, data) => handleSyncModeChange(data.value)}
          >
            <Radio value="pc"  label={{ style: { fontSize: '12px', fontWeight: 'normal' }, children: 'Synchronize with Local PC' }} />
            <Radio value="ntp" label={{ style: { fontSize: '12px', fontWeight: 'normal' }, children: 'Synchronize with the time server' }} />
          </RadioGroup>
        </div>

        {/* PC Sync block */}
        {!isNTP && (
          <div className={styles.pcModeBlock}>
            <div className={styles.row}>
              <span className={styles.label}>Date</span>
              <span className={styles.dateTimeBox}>{pcDateStr}</span>
              <Button
                size="small"
                appearance="primary"
                icon={<ArrowSyncRegular style={{ fontSize: 12 }} />}
                style={{ fontSize: 11, minWidth: 110 }}
                onClick={handleSyncPC}
                disabled={loading || syncLoading}
              >
                {syncLoading ? 'Syncing…' : 'Sync Local PC'}
              </Button>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Time</span>
              <span className={styles.dateTimeBox}>{pcTimeStr}</span>
              <Button
                size="small"
                appearance="primary"
                icon={<ArrowClockwiseRegular style={{ fontSize: 12 }} />}
                style={{ fontSize: 11, minWidth: 110 }}
                onClick={handleRefreshTime}
                disabled={loading || refreshLoading}
              >
                {refreshLoading ? 'Reading…' : 'Refresh Time'}
              </Button>
            </div>
          </div>
        )}

        {/* NTP Sync block */}
        {isNTP && (
          <div className={styles.ntpModeBlock}>
            <div className={styles.row}>
              <span className={styles.label}>Time Server</span>
              <Dropdown
                style={{ minWidth: 200, fontSize: 11 }}
                button={{ style: { fontSize: 11 } }}
                value={isCustomServer ? 'Custom' : (presetIdx >= 0 ? NTP_PRESETS[presetIdx].label : '—')}
                onOptionSelect={handleNtpServerSelect}
              >
                {NTP_PRESETS.map((p, i) => (
                  <Option key={i} value={String(i)} style={{ fontSize: 11 }}>
                    {p.label}
                  </Option>
                ))}
                <Option value="custom" style={{ fontSize: 11 }}>Custom…</Option>
              </Dropdown>
              <Button
                size="small"
                appearance="primary"
                onClick={handleNtpSync}
                disabled={loading || ntpLoading}
                style={{ fontSize: 11 }}
              >
                {ntpLoading ? 'Syncing…' : 'Update'}
              </Button>
            </div>
            {isCustomServer && (
              <div className={styles.row}>
                <span className={styles.label}>Custom Server</span>
                <Input
                  style={{ fontSize: 12, minWidth: 200 }}
                  value={customServer}
                  placeholder="e.g. time.google.com"
                  onChange={(_, d) => handleCustomServerChange(d.value)}
                />
              </div>
            )}
            <div className={styles.row}>
              <span className={styles.label}>Last Update</span>
              <Text style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                {deviceEpoch ? formatEpochAsLocal(deviceEpoch) : '—'}
              </Text>
            </div>
          </div>
        )}

        {/* Time Zone */}
        <div className={styles.tzRow}>
          <Field label={<span style={{ fontSize: 13 }}>Time Zone</span>}>
            <Dropdown
              style={{ width: '100%', fontSize: 11 }}
              button={{ style: { fontSize: 11 } }}
              value={tzDisplayName}
              onOptionSelect={handleTimezoneSelect}
            >
              {TIME_ZONE_NAMES.map((name, i) => (
                <Option key={i} value={String(i)} style={{ fontSize: 11 }}>
                  {name}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </div>

        {/* Daylight Saving Time */}
        <div className={styles.dstBlock}>
          <Checkbox
            label={{ style: { fontSize: '11px', fontWeight: 'normal' }, children: 'Enable Daylight Saving Time' }}
            checked={dstEnabled}
            onChange={(_, d) => handleDstToggle(!!d.checked)}
          />

          <div className={styles.dstDatesRow} style={{ opacity: dstEnabled ? 1 : 0.45, pointerEvents: dstEnabled ? undefined : 'none' }}>
              {/* Start */}
              <div className={styles.dstGroup}>
                <span className={styles.dstGroupLabel}>Start Date</span>
                <div className={styles.dstSelectors}>
                  <Dropdown
                    style={{ minWidth: 80, fontSize: 11 }}
                    button={{ style: { fontSize: 11 } }}
                    value={MONTHS[startMonth - 1] ?? '—'}
                    onOptionSelect={handleStartMonth}
                    disabled={!dstEnabled}
                  >
                    {MONTHS.map((m, i) => (
                      <Option key={i} value={String(i + 1)} style={{ fontSize: 11 }}>{m}</Option>
                    ))}
                  </Dropdown>
                  <Dropdown
                    style={{ minWidth: 62, fontSize: 11 }}
                    button={{ style: { fontSize: 11 } }}
                    value={String(startDay)}
                    onOptionSelect={handleStartDay}
                    disabled={!dstEnabled}
                  >
                    {Array.from({ length: daysInMonth(startMonth) }, (_, i) => (
                      <Option key={i + 1} value={String(i + 1)} style={{ fontSize: 11 }}>{String(i + 1)}</Option>
                    ))}
                  </Dropdown>
                </div>
              </div>

              {/* End */}
              <div className={styles.dstGroup}>
                <span className={styles.dstGroupLabel}>End Date</span>
                <div className={styles.dstSelectors}>
                  <Dropdown
                    style={{ minWidth: 80, fontSize: 11 }}
                    button={{ style: { fontSize: 11 } }}
                    value={MONTHS[endMonth - 1] ?? '—'}
                    onOptionSelect={handleEndMonth}
                    disabled={!dstEnabled}
                  >
                    {MONTHS.map((m, i) => (
                      <Option key={i} value={String(i + 1)} style={{ fontSize: 11 }}>{m}</Option>
                    ))}
                  </Dropdown>
                  <Dropdown
                    style={{ minWidth: 62, fontSize: 11 }}
                    button={{ style: { fontSize: 11 } }}
                    value={String(endDay)}
                    onOptionSelect={handleEndDay}
                    disabled={!dstEnabled}
                  >
                    {Array.from({ length: daysInMonth(endMonth) }, (_, i) => (
                      <Option key={i + 1} value={String(i + 1)} style={{ fontSize: 11 }}>{String(i + 1)}</Option>
                    ))}
                  </Dropdown>
                </div>
              </div>
            </div>
        </div>

        {/* Save */}
        <div className={styles.saveRow}>
          <Button
            size="small"
            appearance="primary"
            icon={<SaveRegular />}
            onClick={onSave}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save Time Settings'}
          </Button>
        </div>
      </div>

      {/* ── RIGHT: Device Status ──────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Device Status</div>

        <div className={styles.statusLabel}>Device Running Time</div>
        <div className={styles.statusValue} style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.2px' }}>
          {deviceRuntimeSeconds ? formatRuntime(deviceRuntimeSeconds) : '—'}
        </div>
      </div>
    </div>
  );
};

export default TimeSettingsTab;
