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
  },
  sectionHead: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: tokens.colorNeutralForeground3,
    backgroundColor: '#f5f5f5',
    padding: '8px 16px',
    borderTop: '1px solid #edebe9',
    borderBottom: '1px solid #edebe9',
    textTransform: 'uppercase',
  },
  listBox: {
    overflow: 'hidden',
  },
  listItem: {
    fontSize: '13px',
    padding: '8px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f2f1',
    color: tokens.colorNeutralForeground1,
    minHeight: '34px',
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
  detailPanel: {
    display: 'flex',
    flexDirection: 'column',
  },
  editRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px 12px 10px 16px',
    borderBottom: '1px solid #f3f2f1',
  },
  editLabel: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  inputWrapper: {
    display: 'grid',
    gridTemplateColumns: '1fr',
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
    padding: '12px 16px',
    borderBottom: '1px solid #f3f2f1',
  },
  enableRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 12px 10px 16px',
  },
  enableNote: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
  emptyDetail: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    padding: '20px 16px',
    textAlign: 'center',
  },
  dimmed: {
    opacity: '0.4',
  },
  statusSuccess: {
    fontSize: '12px',
    color: tokens.colorStatusSuccessForeground1,
  },
  statusError: {
    fontSize: '12px',
    color: tokens.colorStatusDangerForeground1,
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
      <div className={styles.sectionHead}>User Login</div>

      {/* User list */}
      <div className={styles.sectionHead}>Users</div>
      <div className={styles.listBox}>
        {Array.from({ length: MAX_USERS }, (_, i) => {
            const u = users[i];
            const isSelected = selectedIndex === i;
            const isAlt = i % 2 === 1;
            return (
              <div
                key={i}
                className={mergeClasses(
                  styles.listItem,
                  isSelected && styles.listItemSelected,
                  !isSelected && isAlt && styles.listItemAlt,
                )}
                onClick={() => handleSelectRow(i)}
              >
                {u?.name || ''}
              </div>
            );
        })}
      </div>

      {/* User detail */}
      <div className={styles.sectionHead}>User Detail</div>
      <div className={styles.detailPanel}>
        {selectedIndex === null ? (
          <div className={styles.emptyDetail}>Select a user from the list to edit</div>
        ) : (
          <>
            {/* Name */}
            <div className={styles.editRow}>
              <span className={styles.editLabel}>Name</span>
              <div className={styles.inputWrapper}>
                <Input size="small" style={{ fontSize: '13px' }}
                  value={editName}
                  maxLength={STR_USER_NAME_LENGTH - 1}
                  onChange={(_, d) => setEditName(d.value)} />
              </div>
            </div>

            {/* Access Level */}
            <div className={styles.editRow}>
              <span className={styles.editLabel}>Access Level</span>
              <div className={styles.inputWrapper}>
                <Dropdown size="small" style={{ fontSize: '13px' }}
                  value={accessLevelLabel}
                  onOptionSelect={(_, data) => setEditAccessLevel(Number(data.optionValue))}>
                  {ACCESS_LEVELS.map(a => (
                    <Option key={a.value} value={String(a.value)} style={{ fontSize: '13px' }}>{a.label}</Option>
                  ))}
                </Dropdown>
              </div>
            </div>

            {/* Current Password */}
            <div className={mergeClasses(styles.editRow, !currentPasswordEnabled && styles.dimmed)}>
              <span className={styles.editLabel}>Password (type Enter to change)</span>
              <div className={styles.inputWrapper}>
                <Input size="small" style={{ fontSize: '13px' }}
                  type="password"
                  value={editPassword}
                  maxLength={STR_USER_PASSWORD_LENGTH - 1}
                  disabled={!currentPasswordEnabled}
                  onChange={(_, d) => setEditPassword(d.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleOk(); }} />
              </div>
            </div>

            {/* Type new password */}
            <div className={mergeClasses(styles.editRow, !newPasswordEnabled && styles.dimmed)}>
              <span className={styles.editLabel}>Type new password</span>
              <div className={styles.inputWrapper}>
                <Input size="small" style={{ fontSize: '13px' }}
                  type="password"
                  value={editNewPassword}
                  maxLength={STR_USER_PASSWORD_LENGTH - 1}
                  disabled={!newPasswordEnabled}
                  onChange={(_, d) => setEditNewPassword(d.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleOk(); }} />
              </div>
            </div>

            {/* Retype new password */}
            <div className={mergeClasses(styles.editRow, !retypePasswordEnabled && styles.dimmed)}>
              <span className={styles.editLabel}>Retype new password</span>
              <div className={styles.inputWrapper}>
                <Input size="small" style={{ fontSize: '13px' }}
                  type="password"
                  value={editRetypePassword}
                  maxLength={STR_USER_PASSWORD_LENGTH - 1}
                  disabled={!retypePasswordEnabled}
                  onChange={(_, d) => setEditRetypePassword(d.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleOk(); }} />
              </div>
            </div>

            {/* Status message */}
            {statusMsg && (
              <div className={styles.editRow}>
                <span className={statusMsg === 'Operation success!' ? styles.statusSuccess : styles.statusError}>
                  {statusMsg}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className={styles.actionRow}>
              <Button size="small" appearance="secondary" icon={<DeleteRegular />}
                onClick={handleDelete}
                disabled={!isExistingUser || deleteLoading || loading}>
                {deleteLoading ? 'Deleting…' : 'Delete User'}
              </Button>
              <Button size="small" appearance="primary" icon={<CheckmarkRegular />}
                onClick={handleOk}
                disabled={saveLoading || loading}>
                {saveLoading ? 'Saving…' : 'OK'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Bottom: Enable user list */}
      <div className={styles.sectionHead}>Settings</div>
      <div className={styles.enableRow}>
        <Checkbox
          label={{ style: { fontSize: '12px', fontWeight: 'normal' }, children: 'Enable user list' }}
          checked={userLoginSettings.enable_user_list === 2}
          onChange={handleEnableToggle}
          disabled={loading}
        />
        <span className={styles.enableNote}>
          (If want to access this device, please use the user list to sign in)
        </span>
      </div>
    </div>
  );
};

export default UserLoginTab;
