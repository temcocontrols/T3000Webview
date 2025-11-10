/**
 * TreeFilter Component
 *
 * Filter controls for device tree
 * Provides search, protocol filter, building filter, and offline-only toggle
 */

import React from 'react';
import {
  SearchBox,
  Dropdown,
  Option,
  Checkbox,
  Button,
} from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../../../store/deviceTreeStore';
import styles from './TreeFilter.module.css';

/**
 * TreeFilter Component
 */
export const TreeFilter: React.FC = () => {
  const {
    filterText,
    filterProtocol,
    filterBuilding,
    showOfflineOnly,
    buildings,
    setFilterText,
    setFilterProtocol,
    setFilterBuilding,
    setShowOfflineOnly,
    clearFilters,
  } = useDeviceTreeStore();

  // Extract unique protocols from buildings
  const protocols = React.useMemo(() => {
    const protocolSet = new Set(buildings.map((b) => b.protocol));
    return ['All', ...Array.from(protocolSet)];
  }, [buildings]);

  // Building names
  const buildingNames = React.useMemo(() => {
    return ['All', ...buildings.map((b) => b.name)];
  }, [buildings]);

  const hasActiveFilters =
    filterText !== '' ||
    filterProtocol !== 'All' ||
    filterBuilding !== 'All' ||
    showOfflineOnly;

  return (
    <div className={styles.container}>
      {/* Search box */}
      <SearchBox
        placeholder="Search devices..."
        value={filterText}
        onChange={(_, data) => setFilterText(data.value)}
        className={styles.searchBox}
        size="small"
        style={{ width: '100%', minWidth: 0 }}
      />

      {/* Protocol filter */}
      <Dropdown
        placeholder="Protocol"
        value={filterProtocol}
        selectedOptions={[filterProtocol]}
        onOptionSelect={(_, data) => setFilterProtocol(data.optionValue as string)}
        className={styles.dropdown}
        size="small"
        style={{ width: '100%', minWidth: 0 }}
      >
        {protocols.map((protocol) => (
          <Option key={protocol} value={protocol}>
            {protocol}
          </Option>
        ))}
      </Dropdown>

      {/* Building filter */}
      <Dropdown
        placeholder="Building"
        value={filterBuilding}
        selectedOptions={[filterBuilding]}
        onOptionSelect={(_, data) => setFilterBuilding(data.optionValue as string)}
        className={styles.dropdown}
        size="small"
        style={{ width: '100%', minWidth: 0 }}
      >
        {buildingNames.map((building) => (
          <Option key={building} value={building}>
            {building}
          </Option>
        ))}
      </Dropdown>

      {/* Offline only checkbox */}
      <Checkbox
        label="Offline only"
        checked={showOfflineOnly}
        onChange={(_, data) => setShowOfflineOnly(data.checked as boolean)}
        className={styles.checkbox}
      />

      {/* Clear filters button */}
      {hasActiveFilters && (
        <Button
          appearance="subtle"
          icon={<Dismiss20Regular />}
          onClick={clearFilters}
          size="small"
        >
          Clear
        </Button>
      )}
    </div>
  );
};

export default TreeFilter;
