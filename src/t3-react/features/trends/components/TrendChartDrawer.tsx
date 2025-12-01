/**
 * Trend Chart Drawer
 *
 * Popup drawer/modal for viewing trends from React TrendLogsPage
 * Wraps the main TrendChartContent component
 */

import React from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Button,
  makeStyles,
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
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={onClose}
            />
          }
        >
          Trend Chart Viewer
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.drawerBody}>
        <TrendChartContent
          serialNumber={serialNumber}
          panelId={panelId}
          trendlogId={trendlogId}
          monitorId={monitorId}
          isDrawerMode={true}
        />
      </DrawerBody>
    </Drawer>
  );
};
