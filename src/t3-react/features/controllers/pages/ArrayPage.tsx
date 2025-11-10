/**
 * ArrayPage Component
 *
 * Display and edit BACnet array data
 */

import React from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { TableRegular, AddRegular } from '@fluentui/react-icons';
import { EmptyState } from '@t3-react/components';
import { useDeviceData } from '@t3-react/hooks';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  toolbar: {
    padding: '16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    gap: '8px',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
});

export const ArrayPage: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice } = useDeviceData();

  if (!selectedDevice) {
    return (
      <div className={styles.container}>
        <EmptyState
          title="No Device Selected"
          message="Please select a device from the tree to view arrays"
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button appearance="primary" icon={<AddRegular />}>
          Add Array
        </Button>
      </div>

      <div className={styles.content}>
        <EmptyState
          icon={<TableRegular />}
          title="Array Editor"
          message="Array editor functionality coming soon"
        />
      </div>
    </div>
  );
};
