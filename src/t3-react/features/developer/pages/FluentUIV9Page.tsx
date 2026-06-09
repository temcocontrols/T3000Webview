/**
 * FluentUIV9Page — Test harness for FluentUI v9 components
 *
 * Left panel: sidebar nav (DataGrid, Table, Dialog, etc.)
 * Right panel: renders the selected test page
 */

import React, { useState } from 'react';
import {
  Text,
  Button,
  Divider,
} from '@fluentui/react-components';
import {
  GridRegular,
  TableRegular,
  PanelRightRegular,
} from '@fluentui/react-icons';
import { DataGridTest } from './DataGridTest';
import styles from './FluentUIV9Page.module.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  component: React.ComponentType;
}

const navItems: NavItem[] = [
  {
    id: 'datagrid',
    label: 'DataGrid',
    icon: <GridRegular />,
    component: DataGridTest,
  },
  {
    id: 'table',
    label: 'Table',
    icon: <TableRegular />,
    component: () => (
      <div className={styles.placeholder}>
        <Text size={400}>Table test — coming soon</Text>
      </div>
    ),
  },
  {
    id: 'dialog',
    label: 'Dialog',
    icon: <PanelRightRegular />,
    component: () => (
      <div className={styles.placeholder}>
        <Text size={400}>Dialog test — coming soon</Text>
      </div>
    ),
  },
];

export const FluentUIV9Page: React.FC = () => {
  const [activeId, setActiveId] = useState('datagrid');
  const activeItem = navItems.find((n) => n.id === activeId);
  const ActiveComponent = activeItem?.component ?? (() => null);

  return (
    <div className={styles.container}>
      {/* Left Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Text size={300} weight="semibold">Components</Text>
        </div>
        <Divider />
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Button
              key={item.id}
              appearance={item.id === activeId ? 'subtle' : 'transparent'}
              className={`${styles.navItem} ${item.id === activeId ? styles.navItemActive : ''}`}
              onClick={() => setActiveId(item.id)}
              icon={item.icon}
            >
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      {/* Right Content */}
      <div className={styles.content}>
        <ActiveComponent />
      </div>
    </div>
  );
};
