/**
 * Mobile App Bar Component
 * Top navigation bar for mobile views.
 *
 * Layout (Option A):
 *   LEFT:  back button (when not home) + page title + device name subtitle
 *   RIGHT: [device icon] [refresh] [nav/menu icon]
 *
 * [device icon] → opens DevicePickerSheet (bottom sheet)
 * [nav icon]    → calls onMenu → opens MobileNavDrawer (pure nav list)
 */

import React from 'react';
import {
  Button,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  ArrowSyncRegular,
  NavigationRegular,
  PlugConnectedRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';

const useStyles = makeStyles({
  appBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    padding: '0 4px',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    zIndex: 100,
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flex: 1,
    overflow: 'hidden',
    minWidth: 0,
  },
  titleArea: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deviceSubtitle: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: 400,
  },
  iconBtn: {
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0px',
    flexShrink: 0,
  },
});

export interface MobileAppBarProps {
  title: string;
  onBack?: () => void;
  onRefresh?: () => void;
  onMenu?: () => void;
  onDevice?: () => void;
  showBack?: boolean;
  showRefresh?: boolean;
  showMenu?: boolean;
}

export const MobileAppBar: React.FC<MobileAppBarProps> = ({
  title,
  onBack,
  onRefresh,
  onMenu,
  onDevice,
  showBack = false,
  showRefresh = true,
  showMenu = false,
}) => {
  const styles = useStyles();
  const selectedDevice = useDeviceTreeStore((s) => s.selectedDevice);

  return (
    <>
      <div className={styles.appBar}>
        {/* LEFT — back + title */}
        <div className={styles.leftSection}>
          {showBack && onBack && (
            <Button
              appearance="transparent"
              icon={<ArrowLeftRegular />}
              onClick={onBack}
              className={styles.iconBtn}
              aria-label="Go back"
            />
          )}
          <div className={styles.titleArea}>
            <Text className={styles.title}>{title}</Text>
            <span className={styles.deviceSubtitle}>
              {selectedDevice ? selectedDevice.nameShowOnTree : 'No device selected'}
            </span>
          </div>
        </div>

        {/* RIGHT — device picker, refresh, nav menu */}
        <div className={styles.rightSection}>
          <Button
            appearance="transparent"
            icon={<PlugConnectedRegular />}
            onClick={onDevice}
            className={styles.iconBtn}
            aria-label="Select device"
          />
          {showRefresh && onRefresh && (
            <Button
              appearance="transparent"
              icon={<ArrowSyncRegular />}
              onClick={onRefresh}
              className={styles.iconBtn}
              aria-label="Refresh"
            />
          )}
          {showMenu && onMenu && (
            <Button
              appearance="transparent"
              icon={<NavigationRegular />}
              onClick={onMenu}
              className={styles.iconBtn}
              aria-label="Open navigation"
            />
          )}
        </div>
      </div>

    </>
  );
};

