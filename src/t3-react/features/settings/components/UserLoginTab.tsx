/**
 * UserLoginTab
 *
 * User Login tab for SettingsPage — matches C++ CBacnetUserConfig layout:
 *
 *  ┌──────────────┐  ┌────────────────────────────────────┐
 *  │  User Name   │  │  Name :          [_____________]   │
 *  │  ──────────  │  │  Access Level    [dropdown     ▼]  │
 *  │  user1       │  │  Password        [_______]         │
 *  │  user2       │  │   ( Type Enter to change )         │
 *  │  ...         │  │  Type new password :  [_______]    │
 *  │  (8 slots)   │  │  Retype new password: [_______]    │
 *  │              │  │                                     │
 *  │              │  │  [Delete User]         [OK]        │
 *  └──────────────┘  └────────────────────────────────────┘
 *  [ ] Enable user list.  (If want to access this device , please use the user list to sign in)
 *
 * C++ reference: T3000-Source/T3000/BacnetUserConfig.cpp
 *
 * Data:
 *  - BAC_USER_LOGIN_COUNT = 8 (max users)
 *  - Str_userlogin_point: { name: char[16], password: char[8], access_level: uint8 }
 *  - access_level: 1=View only, 2=Full access, 3=Graphic Mode, 4=Routine Mode
 *  - Device_Basic_Setting.reg.user_name: 1=disabled, 2=enabled
 *
 * OK button stages (matching C++ ok_button_stage):
 *  - New user (no password):  directly show "Type new password" → "Retype new password" → save
 *  - Existing user:           show "Password" to verify → then new/retype → save
 */

import React, { useState, useEffect } from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Option,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { DeleteRegular, CheckmarkRegular } from '@fluentui/react-icons';
import type { DeviceSettings } from '../services/settingsRefreshApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_USERS = 8;
const STR_USER_NAME_LENGTH = 16;
const STR_USER_PASSWORD_LENGTH = 8;

const ACCESS_LEVELS = [
  { value: 1, label: 'View only' },
  { value: 2, label: 'Full access' },
  { value: 3, label: 'Graphic Mode' },
  { value: 4, label: 'Routine Mode' },
];

type OkStage =
  | 'enter_original_password'   // existing user: verify current password first
  | 'enter_new_password'        // type new password
  | 'retype_new_password';      // confirm new password

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  topRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  listBox: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    minWidth: '160px',
    width: '180px',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
    flexShrink: 0,
  },
  listHeader: {
    fontSize: '12px',
    fontWeight: tokens.fontWeightSemibold,
    padding: '6px 10px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground2,
  },
  listItem: {
    fontSize: '12px',
    padding: '5px 10px',
    cursor: 'pointer',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground1,
    minHeight: '26px',
    backgroundColor: tokens.colorNeutralBackground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  listItemSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  listItemAlt: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  detailBox: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '12px 16px 14px',
    backgroundColor: tokens.colorNeutralBackground1,
    flex: 1,
    minWidth: '260px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  label: {
    fontSize: '12px',
    minWidth: '140px',
    color: tokens.colorNeutralForeground1,
  },
  control: {
    flex: 1,
    minWidth: '160px',
  },
  hint: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    marginLeft: '148px',
    marginBottom: '10px',
    fontStyle: 'italic',
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '6px',
    justifyContent: 'flex-start',
  },
  enableRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  enableNote: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
  emptyDetail: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    padding: '16px 0',
    textAlign: 'center',
  },
  dimmed: {
    opacity: '0.4',
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserEntry {
  name: string;
  password: string;
  access_level: number; // 1=View only, 2=Full access, 3=Graphic Mode, 4=Routine Mode
}

export interface UserLoginSettings {
  users: UserEntry[];
  enable_user_list: number; // 1=disabled, 2=enabled (matches Device_Basic_Setting.reg.user_name)
}

interface UserLoginTabProps {
  userLoginSettings: UserLoginSettings;
  setUserLoginSettings: (s: UserLoginSettings) => void;
  updateSettings: (u: Partial<DeviceSettings>) => void;
  onSaveUser: (index: number, user: UserEntry) => Promise<void>;
  onDeleteUser: (index: number) => Promise<void>;
  loading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UserLoginTab: React.FC<UserLoginTabProps> = ({
  userLoginSettings,
  setUserLoginSettings,
  updateSettings,
  onSaveUser,
  onDeleteUser,
  loading,
}) => {
  const styles = useStyles();

  const users = userLoginSettings.users.length > 0
    ? userLoginSettings.users
    : Array.from({ length: MAX_USERS }, () => ({ name: '', password: '', access_level: 2 }));

  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);

  // Right-panel field state
  const [editName, setEditName]             = useState('');
  const [editAccessLevel, setEditAccessLevel] = useState<number>(2);
  const [editPassword, setEditPassword]     = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editRetypePassword, setEditRetypePassword] = useState('');
  const [okStage, setOkStage]               = useState<OkStage>('enter_original_password');
  const [statusMsg, setStatusMsg]           = useState<string | null>(null);
  const [saveLoading, setSaveLoading]       = useState(false);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  // When user picks a row, populate the form
  useEffect(() => {
    if (selectedIndex === null) return;
    const u = users[selectedIndex];
    setEditName(u.name);
    setEditAccessLevel(u.access_level || 2);
    setEditPassword('');
    setEditNewPassword('');
    setEditRetypePassword('');
    setStatusMsg(null);
    // Determine initial stage: if user already has name+password → verify original first
    if (u.name && u.password) {
      setOkStage('enter_original_password');
    } else {
      setOkStage('enter_new_password');
    }
  }, [selectedIndex]);

  const isExistingUser = selectedIndex !== null && !!users[selectedIndex]?.name;

  // All three password rows are always rendered (matching C++ dialog).
  // Only their enabled/disabled state changes per stage.
  const currentPasswordEnabled = okStage === 'enter_original_password';
  const newPasswordEnabled     = okStage === 'enter_new_password' || okStage === 'retype_new_password';
  const retypePasswordEnabled  = okStage === 'retype_new_password';

  const handleSelectRow = (index: number) => {
    setSelectedIndex(index);
  };

  const handleEnableToggle = (_: any, data: { checked: boolean | 'mixed' }) => {
    const v = data.checked ? 2 : 1;
    setUserLoginSettings({ ...userLoginSettings, enable_user_list: v });
    updateSettings({ user_name: v });
  };

  const handleOk = async () => {
    if (selectedIndex === null) return;
    setStatusMsg(null);

    if (okStage === 'enter_original_password') {
      // Verify original password
      if (!editPassword) { setStatusMsg('Password is empty'); return; }
      if (editPassword !== users[selectedIndex].password) {
        setEditPassword('');
        setStatusMsg('User name or password error');
        return;
      }
      setOkStage('enter_new_password');
      return;
    }

    if (okStage === 'enter_new_password') {
      if (!editName) { setStatusMsg('User name is empty'); return; }
      if (editName.length >= STR_USER_NAME_LENGTH) { setStatusMsg('User name is too long'); return; }
      if (!editNewPassword) { setStatusMsg('Password is empty'); return; }
      if (editNewPassword.length >= STR_USER_PASSWORD_LENGTH) { setStatusMsg('Password too long'); return; }
      setOkStage('retype_new_password');
      return;
    }

    if (okStage === 'retype_new_password') {
      if (!editRetypePassword) { setStatusMsg('Password is empty'); return; }
      if (editRetypePassword !== editNewPassword) { setStatusMsg('Passwords do not match'); return; }
      if (!editName) { setStatusMsg('User name is empty'); return; }

      const updated: UserEntry = {
        name: editName,
        password: editNewPassword,
        access_level: editAccessLevel,
      };
      setSaveLoading(true);
      try {
        await onSaveUser(selectedIndex, updated);
        const newUsers = [...users];
        newUsers[selectedIndex] = updated;
        setUserLoginSettings({ ...userLoginSettings, users: newUsers });
        // Reset form
        setEditPassword('');
        setEditNewPassword('');
        setEditRetypePassword('');
        setOkStage('enter_original_password');
        setStatusMsg('Operation success!');
      } catch (e) {
        setStatusMsg(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaveLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedIndex === null) return;
    setDeleteLoading(true);
    try {
      await onDeleteUser(selectedIndex);
      const newUsers = [...users];
      newUsers[selectedIndex] = { name: '', password: '', access_level: 2 };
      setUserLoginSettings({ ...userLoginSettings, users: newUsers });
      setSelectedIndex(0);
      setStatusMsg(null);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const accessLevelLabel = ACCESS_LEVELS.find(a => a.value === editAccessLevel)?.label ?? 'Full access';

  return (
    <div className={styles.root}>
      {/* Top: list + detail side-by-side */}
      <div className={styles.topRow}>

        {/* ── Left: user list ──────────────────────────────────────── */}
        <div className={styles.listBox}>
          <div className={styles.listHeader}>User  Name</div>
          {Array.from({ length: MAX_USERS }, (_, i) => {
            const u = users[i];
            const isSelected = selectedIndex === i;
            const isAlt = i % 2 === 1;
            return (
              <div
                key={i}
                className={[
                  styles.listItem,
                  isSelected ? styles.listItemSelected : '',
                  !isSelected && isAlt ? styles.listItemAlt : '',
                ].join(' ')}
                onClick={() => handleSelectRow(i)}
              >
                {u?.name || ''}
              </div>
            );
          })}
        </div>

        {/* ── Right: user detail ───────────────────────────────────── */}
        <div className={styles.detailBox}>
          {selectedIndex === null ? (
            <div className={styles.emptyDetail}>Select a user from the list to edit</div>
          ) : (
            <>
              {/* Name */}
              <div className={styles.row}>
                <span className={styles.label}>Name  :</span>
                <Input
                  className={styles.control}
                  style={{ fontSize: '12px' }}
                  value={editName}
                  maxLength={STR_USER_NAME_LENGTH - 1}
                  onChange={(_, d) => setEditName(d.value)}
                />
              </div>

              {/* Access Level */}
              <div className={styles.row}>
                <span className={styles.label}>Access Level</span>
                <Dropdown
                  className={styles.control}
                  style={{ fontSize: '12px' }}
                  button={{ style: { fontSize: '12px' } }}
                  value={accessLevelLabel}
                  onOptionSelect={(_, data) => setEditAccessLevel(Number(data.optionValue))}
                >
                  {ACCESS_LEVELS.map(a => (
                    <Option key={a.value} value={String(a.value)} style={{ fontSize: '12px' }}>
                      {a.label}
                    </Option>
                  ))}
                </Dropdown>
              </div>

              {/* Current Password — always shown, enabled only when verifying existing user */}
              <div className={mergeClasses(styles.row, !currentPasswordEnabled && styles.dimmed)}>
                <span className={styles.label}>Password</span>
                <Input
                  className={styles.control}
                  style={{ fontSize: '12px' }}
                  type="password"
                  value={editPassword}
                  maxLength={STR_USER_PASSWORD_LENGTH - 1}
                  disabled={!currentPasswordEnabled}
                  onChange={(_, d) => setEditPassword(d.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleOk(); }}
                />
              </div>
              <div className={mergeClasses(styles.hint, !currentPasswordEnabled && styles.dimmed)}>
                ( Type Enter to change )
              </div>

              {/* Type new password — always shown, enabled after verifying original */}
              <div className={mergeClasses(styles.row, !newPasswordEnabled && styles.dimmed)}>
                <span className={styles.label}>Type new password :</span>
                <Input
                  className={styles.control}
                  style={{ fontSize: '12px' }}
                  type="password"
                  value={editNewPassword}
                  maxLength={STR_USER_PASSWORD_LENGTH - 1}
                  disabled={!newPasswordEnabled}
                  onChange={(_, d) => setEditNewPassword(d.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleOk(); }}
                />
              </div>

              {/* Retype new password — always shown, enabled only on final stage */}
              <div className={mergeClasses(styles.row, !retypePasswordEnabled && styles.dimmed)}>
                <span className={styles.label}>Retype new password :</span>
                <Input
                  className={styles.control}
                  style={{ fontSize: '12px' }}
                  type="password"
                  value={editRetypePassword}
                  maxLength={STR_USER_PASSWORD_LENGTH - 1}
                  disabled={!retypePasswordEnabled}
                  onChange={(_, d) => setEditRetypePassword(d.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleOk(); }}
                />
              </div>

              {/* Status message */}
              {statusMsg && (
                <Text
                  style={{
                    fontSize: '11px',
                    color: statusMsg === 'Operation success!' ? tokens.colorStatusSuccessForeground1 : tokens.colorStatusDangerForeground1,
                    marginBottom: '8px',
                    display: 'block',
                  }}
                >
                  {statusMsg}
                </Text>
              )}

              {/* Action buttons */}
              <div className={styles.actionRow}>
                <Button
                  size="small"
                  appearance="secondary"
                  icon={<DeleteRegular />}
                  onClick={handleDelete}
                  disabled={!isExistingUser || deleteLoading || loading}
                >
                  {deleteLoading ? 'Deleting…' : 'Delete User'}
                </Button>
                <Button
                  size="small"
                  appearance="primary"
                  icon={<CheckmarkRegular />}
                  onClick={handleOk}
                  disabled={saveLoading || loading}
                >
                  {saveLoading ? 'Saving…' : 'OK'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom: Enable user list checkbox */}
      <div className={styles.enableRow}>
        <Checkbox
          label={{
            style: { fontSize: '12px', fontWeight: 'normal' },
            children: 'Enable user list.',
          }}
          checked={userLoginSettings.enable_user_list === 2}
          onChange={handleEnableToggle}
          disabled={loading}
        />
        <span className={styles.enableNote}>
          (If want to access this device , please use the user list to sign in)
        </span>
      </div>
    </div>
  );
};

export default UserLoginTab;
