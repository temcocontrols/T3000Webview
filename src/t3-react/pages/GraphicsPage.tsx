/**
 * GraphicsPage Component
 *
 * Display and edit graphical floor plans
 */

import React from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { AddRegular, EditRegular, ImageRegular } from '@fluentui/react-icons';
import { EmptyState } from '@t3-react/components';

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

export const GraphicsPage: React.FC = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button appearance="primary" icon={<AddRegular />}>
          Add Graphic
        </Button>
        <Button icon={<EditRegular />}>Edit</Button>
      </div>

      <div className={styles.content}>
        <EmptyState
          icon={<ImageRegular />}
          title="Graphics Editor"
          message="Graphics editor functionality coming soon"
        />
      </div>
    </div>
  );
};
