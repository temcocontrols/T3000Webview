/**
 * Develop Navigation
 *
 * Left navigation menu for developer tools
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FolderOpenRegular,
  DatabaseRegular,
  PlugConnectedRegular,
  DocumentTextRegular,
} from '@fluentui/react-icons';
import styles from './DevelopNav.module.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  path: string;
}

const navItems: NavItem[] = [
  {
    id: 'files',
    label: 'File Browser',
    icon: FolderOpenRegular,
    path: '/t3000/develop/files',
  },
  {
    id: 'database',
    label: 'Database Viewer',
    icon: DatabaseRegular,
    path: '/t3000/develop/database',
  },
  {
    id: 'transport',
    label: 'Transport Message',
    icon: PlugConnectedRegular,
    path: '/t3000/develop/transport',
  },
  {
    id: 'logs',
    label: 'T3000 Logs',
    icon: DocumentTextRegular,
    path: '/t3000/develop/logs',
  },
];

export const DevelopNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.header}>
        <h2 className={styles.title}>Developer Tools</h2>
      </div>
      <ul className={styles.navList}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <li key={item.id} className={styles.navItem}>
              <button
                className={`${styles.navButton} ${isActive ? styles.active : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                <span className={styles.iconWrapper}>
                  <Icon />
                </span>
                <span className={styles.label}>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default DevelopNav;
