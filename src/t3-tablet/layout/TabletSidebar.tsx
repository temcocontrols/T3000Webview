/**
 * TabletSidebar — persistent left device panel for tablets (768–1024px).
 *
 * Always visible — shows the device list so the user can always see
 * and switch devices without opening any drawer.
 * Width: 220px.  Content area sits to its right in a flex row.
 * The hamburger in TabletHeader opens the NavDrawer (page navigation overlay).
 */

import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { DevicePanel } from '@t3-mobile/components/DevicePanel/DevicePanel';

const useStyles = makeStyles({
  sidebar: {
    width: '220px',
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
  },
});

export const TabletSidebar: React.FC = () => {
  const styles = useStyles();
  return (
    <aside className={styles.sidebar} aria-label="Device list">
      <DevicePanel />
    </aside>
  );
};
