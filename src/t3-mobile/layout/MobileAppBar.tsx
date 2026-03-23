/**
 * Mobile App Bar Component
 * Top navigation bar for mobile views
 */

import React, { useState } from 'react';
import {
  Button,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  ArrowSyncRegular,
  MoreHorizontalRegular,
  NavigationRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';
import { DevicePickerSheet } from '../components/DevicePickerSheet/DevicePickerSheet';

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
  deviceChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '1px',
    padding: '1px 5px 1px 0',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderRadius: '4px',
    maxWidth: '180px',
    ':active': { opacity: 0.7 },
  },
  deviceChipNoDevice: {
    opacity: 0.6,
  },
  deviceName: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.85)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: 500,
  },
  deviceNameDim: {
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  deviceChevron: {
    color: 'rgba(255,255,255,0.7)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    marginTop: '1px',
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
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
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
          {/* Tappable device name chip — opens device picker sheet */}
          <button
            className={mergeClasses(
              styles.deviceChip,
              !selectedDevice && styles.deviceChipNoDevice,
            )}
            onClick={() => setSheetOpen(true)}
            aria-label="Select device"
          >
            <span className={mergeClasses(styles.deviceName, !selectedDevice && styles.deviceNameDim)}>
              {selectedDevice ? selectedDevice.nameShowOnTree : 'No device'}
            </span>
            <span className={styles.deviceChevron}>
              <ChevronDownRegular fontSize={10} />
            </span>
          </button>
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
    <DevicePickerSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
};
