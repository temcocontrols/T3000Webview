/**
 * FluentUIV9Page — Test harness for FluentUI v9 components
 */

import React from 'react';
import { Button } from '@fluentui/react-components';
import { GridRegular } from '@fluentui/react-icons';
import { DataGridTest } from './DataGridTest';
import styles from './FluentUIV9Page.module.css';

export const FluentUIV9Page: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <Button
          appearance="subtle"
          className={styles.navItem}
          icon={<GridRegular />}
        >
          DataGrid
        </Button>
      </div>
      <div className={styles.content}>
        <DataGridTest />
      </div>
    </div>
  );
};
