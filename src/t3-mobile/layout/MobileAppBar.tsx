/**
 * Mobile App Bar Component
 * Top navigation bar for mobile views
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
  MoreHorizontalRegular,
  NavigationRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';

const useStyles = makeStyles({
  appBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    padding: '0 8px 0 4px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    boxShadow: tokens.shadow4,
    flexShrink: 0,
    zIndex: 100,
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    overflow: 'hidden',
  },
  titleArea: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForegroundOnBrand,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deviceName: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.75)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  iconBtn: {
    color: tokens.colorNeutralForegroundOnBrand,
    flexShrink: 0,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
});

export interface MobileAppBarProps {
  title: string;
  onBack?: () => void;
  onRefresh?: () => void;
  onMore?: () => void;
  onMenu?: () => void;
  showBack?: boolean;
  showRefresh?: boolean;
  showMore?: boolean;
  showMenu?: boolean;
}

export const MobileAppBar: React.FC<MobileAppBarProps> = ({
  title,
  onBack,
  onRefresh,
  onMore,
  onMenu,
  showBack = false,
  showRefresh = true,
  showMore = false,
  showMenu = false,
}) => {
  const styles = useStyles();
  const selectedDevice = useDeviceTreeStore((s) => s.selectedDevice);

  return (
    <div className={styles.appBar}>
      <div className={styles.leftSection}>
        {/* Hamburger — opens side nav drawer */}
        {showMenu && onMenu && (
          <Button
            appearance="transparent"
            icon={<NavigationRegular />}
            onClick={onMenu}
            className={styles.iconBtn}
            aria-label="Open navigation"
          />
        )}
        {showBack && onBack && (
          <Button
            appearance="transparent"
            icon={<ArrowLeftRegular />}
            onClick={onBack}
            className={styles.iconBtn}
          />
        )}
        <div className={styles.titleArea}>
          <Text className={styles.title}>{title}</Text>
          {selectedDevice && (
            <span className={styles.deviceName}>{selectedDevice.nameShowOnTree}</span>
          )}
        </div>
      </div>

      <div className={styles.rightSection}>
        {showRefresh && onRefresh && (
          <Button
            appearance="transparent"
            icon={<ArrowSyncRegular />}
            onClick={onRefresh}
            className={styles.iconBtn}
          />
        )}
        {showMore && onMore && (
          <Button
            appearance="transparent"
            icon={<MoreHorizontalRegular />}
            onClick={onMore}
            className={styles.iconBtn}
          />
        )}
      </div>
    </div>
  );
};
