/**
 * Trend Chart Drawer
 *
 * Popup drawer/modal for viewing trends from React TrendLogsPage
 * Wraps the main TrendChartContent component
 */

import React, { useState } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { TrendChartContent } from './TrendChartContent';

const useStyles = makeStyles({
  drawerBody: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  drawer: {
    width: '95vw',
    maxWidth: '95vw',
  },
  drawerHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  toolbarContainer: {
    padding: '8px 16px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
});

interface TrendChartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  serialNumber?: number;
  panelId?: number;
  trendlogId?: string;
  monitorId?: string;
}

export const TrendChartDrawer: React.FC<TrendChartDrawerProps> = ({
  isOpen,
  onClose,
  serialNumber,
  panelId,
  trendlogId,
  monitorId,
}) => {
  const styles = useStyles();
  const [toolbarContent, setToolbarContent] = useState<React.ReactNode>(null);

  return (
    <Drawer
      type="overlay"
      separator
      open={isOpen}
      onOpenChange={(_, { open }) => !open && onClose()}
      position="end"
      size="full"
      className={styles.drawer}
    >
      <div className={styles.drawerHeader}>
        <div className={styles.headerTop}>
          <h2 className={styles.headerTitle}>Trend Chart Viewer</h2>
          <Button
            appearance="subtle"
            aria-label="Close"
            icon={<Dismiss24Regular />}
            onClick={onClose}
          />
        </div>
        {toolbarContent && (
          <div className={styles.toolbarContainer}>
            {toolbarContent}
          </div>
        )}
      </div>

      <DrawerBody className={styles.drawerBody}>
        <TrendChartContent
          serialNumber={serialNumber}
          panelId={panelId}
          trendlogId={trendlogId}
          monitorId={monitorId}
          isDrawerMode={true}
          onToolbarRender={setToolbarContent}
        />
      </DrawerBody>
    </Drawer>
  );
};
