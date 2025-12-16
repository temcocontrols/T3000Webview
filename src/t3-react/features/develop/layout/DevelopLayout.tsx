/**
 * Develop Layout
 *
 * Special layout for developer tools with left navigation
 * Replaces main layout when in /develop routes
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { DevelopNav } from './DevelopNav';
import styles from './DevelopLayout.module.css';

export const DevelopLayout: React.FC = () => {
  return (
    <div className={styles.container}>
      {/* Left Navigation */}
      <aside className={styles.sidebar}>
        <DevelopNav />
      </aside>

      {/* Content Area */}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default DevelopLayout;
