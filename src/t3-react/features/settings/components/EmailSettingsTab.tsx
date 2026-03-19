/**
 * EmailSettingsTab
 *
 * Email tab for SettingsPage — matches C++ BacnetEmailAlarm dialog layout:
 *   SMTP Server      [input]
 *   Port Number      [input]
 *   Email            [input]
 *   User Name        [input]
 *   Password         [input]
 *   Secure Connection [dropdown: NULL | SSL | TLS]
 *   Recipient 1      [input]
 *   Recipient 2      [input]
 *   Status           [read-only]
 *                    [Save / OK]
 *
 * C++ reference: T3000-Source/T3000/BacnetEmailAlarm.cpp
 *
 * Field sizes from C++ Device_Email_Point.reg:
 *   smtp_domain        char[40]
 *   smtp_port          uint16
 *   email_address      char[60]
 *   user_name          char[60]
 *   password           char[20]
 *   secure_connection_type  0=NULL, 1=SSL, 2=TLS
 *   To1Addr            char[60]
 *   To2Addr            char[60]
 *   error_code         0=Normal, 2=Connection failed, 3=Handshake failed,
 *                      8=Send data failed, 13=Login failed
 */

import React from 'react';
import {
  Button,
  Dropdown,
  Input,
  Option,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { SaveRegular, InfoRegular } from '@fluentui/react-icons';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECURE_TYPES = [
  { value: '0', label: 'NULL' },
  { value: '1', label: 'SSL' },
  { value: '2', label: 'TLS' },
];

const ERROR_CODE_MAP: Record<number, string> = {
  0: 'Normal',
  2: 'Failed to establish the connection',
  3: 'Handshake failed',
  8: 'Send data failed',
  13: 'Login failed',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '500px',
  },
  groupBox: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '12px 16px 16px',
    backgroundColor: tokens.colorNeutralBackground1,
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
    minWidth: '150px',
    color: tokens.colorNeutralForeground1,
  },
  control: {
    flex: 1,
    minWidth: '200px',
  },
  statusBox: {
    flex: 1,
    minWidth: '200px',
    fontSize: '12px',
    padding: '4px 8px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    fontFamily: 'inherit',
  },
  saveRow: {
    marginTop: '4px',
  },
  dataNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    padding: '4px 8px',
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailSettings {
  smtp_domain?: string;            // SMTP Server, max 40
  smtp_port?: number;              // Port Number
  email_address?: string;          // Email / From address, max 60
  user_name?: string;              // User Name, max 60
  password?: string;               // Password, max 20
  secure_connection_type?: number; // 0=NULL, 1=SSL, 2=TLS
  To1Addr?: string;                // Recipient 1, max 60
  To2Addr?: string;                // Recipient 2, max 60
  error_code?: number;             // Status code (read-only)
}

interface EmailSettingsTabProps {
  emailSettings: EmailSettings;
  setEmailSettings: (s: EmailSettings) => void;
  onSave: () => Promise<void>;
  loading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EmailSettingsTab: React.FC<EmailSettingsTabProps> = ({
  emailSettings,
  setEmailSettings,
  onSave,
  loading,
}) => {
  const styles = useStyles();

  const secureTypeValue = emailSettings.secure_connection_type ?? 0;
  const secureTypeLabel = SECURE_TYPES[secureTypeValue]?.label ?? 'NULL';
  const statusText = ERROR_CODE_MAP[emailSettings.error_code ?? 0] ?? 'Normal';

  const set = (patch: Partial<EmailSettings>) =>
    setEmailSettings({ ...emailSettings, ...patch });

  return (
    <div className={styles.root}>
      {/* ⚠️ Data source note: Str_Email_point is NOT in the 400-byte Str_Setting_Info */}
      <div className={styles.dataNote}>
        <InfoRegular fontSize={12} />
        <span>
          <strong>Data source:</strong> Str_Email_point — separate from the 400-byte settings block.
          Loaded via <code>GET /api/v1/devices/:sn/email-settings</code>.
        </span>
      </div>
      <div className={styles.groupBox}>
        <div className={styles.groupTitle}>Email Configuration</div>

        {/* SMTP Server */}
        <div className={styles.row}>
          <span className={styles.label}>SMTP Server :</span>
          <Input
            className={styles.control}
            style={{ fontSize: '12px' }}
            value={emailSettings.smtp_domain ?? ''}
            maxLength={40}
            placeholder="e.g. smtp.gmail.com"
            onChange={(_, d) => set({ smtp_domain: d.value })}
          />
        </div>

        {/* Port Number */}
        <div className={styles.row}>
          <span className={styles.label}>Port Number:</span>
          <Input
            className={styles.control}
            style={{ fontSize: '12px' }}
            type="number"
            min={0}
            max={65535}
            value={String(emailSettings.smtp_port ?? 0)}
            onChange={(_, d) => {
              const v = Number(d.value);
              if (!isNaN(v) && v >= 0 && v <= 65535) set({ smtp_port: v });
            }}
          />
        </div>

        {/* Email */}
        <div className={styles.row}>
          <span className={styles.label}>Email:</span>
          <Input
            className={styles.control}
            style={{ fontSize: '12px' }}
            type="email"
            value={emailSettings.email_address ?? ''}
            maxLength={60}
            placeholder="sender@example.com"
            onChange={(_, d) => set({ email_address: d.value })}
          />
        </div>

        {/* User Name */}
        <div className={styles.row}>
          <span className={styles.label}>User Name :</span>
          <Input
            className={styles.control}
            style={{ fontSize: '12px' }}
            value={emailSettings.user_name ?? ''}
            maxLength={60}
            onChange={(_, d) => set({ user_name: d.value })}
          />
        </div>

        {/* Password */}
        <div className={styles.row}>
          <span className={styles.label}>Password:</span>
          <Input
            className={styles.control}
            style={{ fontSize: '12px' }}
            type="password"
            value={emailSettings.password ?? ''}
            maxLength={20}
            onChange={(_, d) => set({ password: d.value })}
          />
        </div>

        {/* Secure Connection */}
        <div className={styles.row}>
          <span className={styles.label}>Secure Connection :</span>
          <Dropdown
            className={styles.control}
            style={{ fontSize: '12px' }}
            button={{ style: { fontSize: '12px' } }}
            value={secureTypeLabel}
            onOptionSelect={(_, data) => {
              set({ secure_connection_type: Number(data.optionValue ?? '0') });
            }}
          >
            {SECURE_TYPES.map((t) => (
              <Option key={t.value} value={t.value} style={{ fontSize: '12px' }}>
                {t.label}
              </Option>
            ))}
          </Dropdown>
        </div>

        {/* Recipient 1 */}
        <div className={styles.row}>
          <span className={styles.label}>Recipient  1</span>
          <Input
            className={styles.control}
            style={{ fontSize: '12px' }}
            type="email"
            value={emailSettings.To1Addr ?? ''}
            maxLength={60}
            placeholder="recipient1@example.com"
            onChange={(_, d) => set({ To1Addr: d.value })}
          />
        </div>

        {/* Recipient 2 */}
        <div className={styles.row}>
          <span className={styles.label}>Recipient  2</span>
          <Input
            className={styles.control}
            style={{ fontSize: '12px' }}
            type="email"
            value={emailSettings.To2Addr ?? ''}
            maxLength={60}
            placeholder="recipient2@example.com"
            onChange={(_, d) => set({ To2Addr: d.value })}
          />
        </div>

        {/* Status (read-only) */}
        <div className={styles.row}>
          <span className={styles.label}>Status :</span>
          <span className={styles.statusBox}>{statusText}</span>
        </div>
      </div>

      {/* Save / OK button */}
      <div className={styles.saveRow}>
        <Button
          size="small"
          appearance="primary"
          icon={<SaveRegular />}
          onClick={onSave}
          disabled={loading}
        >
          {loading ? 'Saving…' : 'OK'}
        </Button>
      </div>
    </div>
  );
};

export default EmailSettingsTab;
