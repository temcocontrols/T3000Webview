/**
 * TabletHeader — compact header for tablet (768–1024px).
 * Shows: hamburger (opens NavDrawer) + page title + essential toolbar buttons.
 * Full desktop menu bar is replaced with a single ≡ menu dropdown.
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Tooltip,
} from '@fluentui/react-components';
import {
  NavigationRegular,
  SettingsRegular,
  ArrowSyncRegular,
  PersonRegular,
  ArrowCounterclockwiseRegular,
  HomeRegular,
} from '@fluentui/react-icons';
import { useUIStore } from '@t3-shared/store/uiStore';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    height: '56px',
    padding: '0 12px',
    backgroundColor: '#0078d4',
    color: '#ffffff',
    gap: '8px',
    flexShrink: 0,
  },
  iconBtn: {
    color: '#ffffff',
    minWidth: '36px',
    padding: '4px',
    ':hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
  },
  title: {
    flex: 1,
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingLeft: '4px',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'rgba(255,255,255,0.3)',
    margin: '0 4px',
  },
});

/** Derive a human-readable page title from the current path */
const pathToTitle = (pathname: string): string => {
  const segment = pathname.split('/').filter(Boolean).pop() ?? 'home';
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
};

export const TabletHeader: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toggleDrawer = useUIStore((s) => s.toggleDrawer);

  return (
    <header className={styles.header}>
      {/* Hamburger — opens NavDrawer */}
      <Tooltip content="Open navigation" relationship="label">
        <Button
          appearance="subtle"
          icon={<NavigationRegular />}
          className={styles.iconBtn}
          onClick={toggleDrawer}
        />
      </Tooltip>

      {/* Page title */}
      <span className={styles.title}>T3000 — {pathToTitle(pathname)}</span>

      <div className={styles.divider} />

      {/* Essential toolbar: Home, Refresh, Settings */}
      <Tooltip content="Home" relationship="label">
        <Button
          appearance="subtle"
          icon={<HomeRegular />}
          className={styles.iconBtn}
          onClick={() => navigate('/t3000')}
        />
      </Tooltip>

      <Tooltip content="Refresh" relationship="label">
        <Button
          appearance="subtle"
          icon={<ArrowCounterclockwiseRegular />}
          className={styles.iconBtn}
          onClick={() => window.location.reload()}
        />
      </Tooltip>

      {/* Collapsed full menu */}
      <Menu>
        <MenuTrigger>
          <Tooltip content="More options" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowSyncRegular />}
              className={styles.iconBtn}
            />
          </Tooltip>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem icon={<SettingsRegular />} onClick={() => navigate('/t3000/settings')}>
              Settings
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<PersonRegular />} onClick={() => navigate('/t3000/users')}>
              Users
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    </header>
  );
};
