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
  Button,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { TrendChartContent } from './TrendChartContent';
import styles from './TrendChartDrawer.module.css';

interface TrendChartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  serialNumber?: number;
  panelId?: number;
  trendlogId?: string;
  monitorId?: string;
  itemData?: any; // Complete monitor configuration data (Vue pattern)
}

export const TrendChartDrawer: React.FC<TrendChartDrawerProps> = ({
  isOpen,
  onClose,
  serialNumber,
  panelId,
  trendlogId,
  monitorId,
  itemData,
}) => {
  const [toolbarContent, setToolbarContent] = useState<React.ReactNode>(null);

  return (
    <Drawer
      type="overlay"
      separator
      open={isOpen}
      onOpenChange={(_, { open }) => {
        // Only allow closing via the close button (don't close on backdrop click)
      }}
      position="end"
      size="full"
      className={styles.drawer}
    >
      <div className={styles.drawerHeader}>
        {toolbarContent && (
          <div className={styles.toolbarContainer}>
            <div className={styles.toolbarContent}>
              {toolbarContent}
            </div>
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={onClose}
              className={styles.closeButton}
            />
          </div>
        )}
      </div>

      <DrawerBody className={styles.drawerBody}>
        <TrendChartContent
          serialNumber={serialNumber}
          panelId={panelId}
          trendlogId={trendlogId}
          monitorId={monitorId}
          itemData={itemData}
          isDrawerMode={true}
          onToolbarRender={setToolbarContent}
        />
      </DrawerBody>
    </Drawer>
  );
};
