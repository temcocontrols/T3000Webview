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
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  appBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    boxShadow: tokens.shadow4,
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
});

export interface MobileAppBarProps {
  title: string;
  onBack?: () => void;
  onRefresh?: () => void;
  onMore?: () => void;
  showBack?: boolean;
  showRefresh?: boolean;
  showMore?: boolean;
}

export const MobileAppBar: React.FC<MobileAppBarProps> = ({
  title,
  onBack,
  onRefresh,
  onMore,
  showBack = false,
  showRefresh = true,
  showMore = false,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.appBar}>
      <div className={styles.leftSection}>
        {showBack && onBack && (
          <Button
            appearance="transparent"
            icon={<ArrowLeftRegular />}
            onClick={onBack}
            style={{ color: tokens.colorNeutralForegroundOnBrand }}
          />
        )}
        <Text className={styles.title}>{title}</Text>
      </div>

      <div className={styles.rightSection}>
        {showRefresh && onRefresh && (
          <Button
            appearance="transparent"
            icon={<ArrowSyncRegular />}
            onClick={onRefresh}
            style={{ color: tokens.colorNeutralForegroundOnBrand }}
          />
        )}
        {showMore && onMore && (
          <Button
            appearance="transparent"
            icon={<MoreHorizontalRegular />}
            onClick={onMore}
            style={{ color: tokens.colorNeutralForegroundOnBrand }}
          />
        )}
      </div>
    </div>
  );
};
