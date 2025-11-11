/**
 * TreeViewModeSwitch Component
 *
 * Toggle button to switch between Equipment View and Project Point View
 */

import React from 'react';
import { Button } from '@fluentui/react-components';
import { BuildingRegular, DatabaseRegular } from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
import styles from './TreeViewModeSwitch.module.css';

export const TreeViewModeSwitch: React.FC = () => {
  const { viewMode, setViewMode } = useDeviceTreeStore();

  const handleToggle = () => {
    const newMode = viewMode === 'equipment' ? 'projectPoint' : 'equipment';
    setViewMode(newMode);
  };

  const isProjectMode = viewMode === 'projectPoint';

  return (
    <Button
      appearance="subtle"
      size="small"
      icon={isProjectMode ? <DatabaseRegular /> : <BuildingRegular />}
      onClick={handleToggle}
      className={styles.switchButton}
      title={isProjectMode ? 'Switch to Equipment View' : 'Switch to Project Point View'}
    />
  );
};

export default TreeViewModeSwitch;
