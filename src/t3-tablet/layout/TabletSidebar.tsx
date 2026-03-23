/**
 * TabletSidebar — persistent left navigation sidebar for tablets (768–1024px).
 *
 * Always visible — no hamburger toggle needed for page navigation.
 * Width: 200px.  Content area sits to its right in a flex row.
 * The hamburger in TabletHeader is kept for the device tree (NavDrawer).
 *
 * Design: matches SideNavContent (GitHub/Notion light style).
 */

import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { SideNavContent } from '@t3-mobile/layout/SideNavContent';

const useStyles = makeStyles({
  sidebar: {
    width: '200px',
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
    <aside className={styles.sidebar} aria-label="Main navigation">
      <SideNavContent />
    </aside>
  );
};
