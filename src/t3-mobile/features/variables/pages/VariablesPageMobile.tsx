/**
 * Mobile Variables Page
 * Compact list view for Variables — new design with action bar + column header.
 */

import React, { useState } from 'react';
import {
  Spinner,
  Text,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ErrorCircleRegular,
  ArrowSyncRegular,
  ArrowDownloadRegular,
  SettingsRegular,
  SearchRegular,
} from '@fluentui/react-icons';
import { useMobilePage } from '../../../layout/MobilePageContext';
import { PointListRow, PointListHeader } from '../../../components/PointListRow/PointListRow';
import { useVariablesPage } from '../../../../shared/features/variables/hooks/useVariablesPage';
import { getRangeLabel } from '../../../../t3-react/features/variables/data/rangeData';
import { MobileRangeDrawer } from '../components/MobileRangeDrawer';

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    backgroundColor: '#fafafa',
    borderBottom: `1px solid #edebe9`,
    flexShrink: 0,
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    height: '32px',
    padding: '0 10px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    border: `1px solid #edebe9`,
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
    cursor: 'text',
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'none',
    outline: 'none',
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    fontFamily: 'inherit',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    border: 'none',
    background: 'none',
    color: '#424242',
    cursor: 'pointer',
    flexShrink: 0,
    fontSize: '16px',
    ':hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
    ':active': { backgroundColor: 'rgba(0,0,0,0.1)' },
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    gap: '16px',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    textAlign: 'center',
    gap: '12px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '24px',
  },
});

export const VariablesPageMobile: React.FC = () => {
  const styles = useStyles();
  const [search, setSearch] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [rangeDrawerOpen, setRangeDrawerOpen] = useState(false);
  const [selectedVariableForRange, setSelectedVariableForRange] = useState<any>(null);
  const {
    variables,
    loading,
    error,
    refreshing,
    refreshingItems,
    selectedDevice,
    handleRefresh,
    handleRefreshFromDevice,
    handleRefreshSingleVariable,
    updateVariableField,
  } = useVariablesPage();

  const title = variables.length > 0 ? `Variables (${variables.length})` : 'Variables';
  useMobilePage({ title, onRefresh: error && variables.length === 0 ? handleRefresh : handleRefreshFromDevice });

  const handleRangeClick = (variable: any) => {
    setSelectedVariableForRange(variable);
    setRangeDrawerOpen(true);
  };

  const handleRangeSave = async (newRange: number, newDigitalAnalog: number) => {
    if (!selectedVariableForRange || !selectedDevice) return;
    try {
      const currentVariable = variables.find(
        v => v.serialNumber === selectedVariableForRange.serialNumber && v.variableIndex === selectedVariableForRange.variableIndex
      );
      if (!currentVariable) return;
      const updatedVariable = { ...currentVariable, digitalAnalog: newDigitalAnalog.toString() };
      await updateVariableField(selectedVariableForRange.variableIndex, 'range', newRange.toString(), updatedVariable);
    } catch (error) {
      console.error('Failed to update range:', error);
    }
  };

  if (loading && variables.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Loading variables..." size="tiny" labelPosition="after" style={{ fontSize: '12px', color: '#605e5c' }} />
      </div>
    );
  }

  if (error && variables.length === 0) {
    return (
      <div className={styles.errorState}>
        <ErrorCircleRegular fontSize={48} color={tokens.colorPaletteRedForeground1} />
        <Text size={400} weight="semibold">Failed to load variables</Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>{error}</Text>
        <Button appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefresh}>Try Again</Button>
      </div>
    );
  }

  if (!selectedDevice) {
    return (
      <div className={styles.emptyState}>
        <Text size={400} weight="semibold">No Device Selected</Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
          Please select a device from the tree to view variables
        </Text>
      </div>
    );
  }

  if (variables.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text size={300} weight="semibold">No Variables Found</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Tap refresh to load variables from device
        </Text>
        <Button size="small" appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefreshFromDevice} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh from Device'}
        </Button>
      </div>
    );
  }

  const filtered = search.trim()
    ? variables.filter((v) =>
        (v.fullLabel || v.label || '').toLowerCase().includes(search.toLowerCase()) ||
        String(v.variableIndex).includes(search)
      )
    : variables;

  return (
    <div className={styles.wrapper}>
      <div className={styles.actionBar}>
        <div className={styles.searchBox}>
          <SearchRegular fontSize={14} />
          <input
            className={styles.searchInput}
            placeholder="Search variables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className={styles.actionBtn} onClick={handleRefreshFromDevice} disabled={refreshing} title="Refresh from device" aria-label="Refresh from device">
          <ArrowSyncRegular fontSize={16} />
        </button>
        <button className={styles.actionBtn} title="Export to CSV" aria-label="Export to CSV">
          <ArrowDownloadRegular fontSize={16} />
        </button>
        <button className={styles.actionBtn} title="Settings" aria-label="Settings">
          <SettingsRegular fontSize={16} />
        </button>
      </div>

      <PointListHeader idLabel="Var" labelLabel="Full Label" valueLabel="Value" unitLabel="Units" />

      <div className={styles.list}>
        {filtered.map((variable) => {
          const isRefreshing = refreshingItems.has(variable.variableIndex || '');
          const rangeValue = parseInt(variable.rangeField || '0', 10);
          const digitalAnalog = parseInt(variable.digitalAnalog || '0', 10);
          const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);
          const displayValue = variable.fValue ? (parseFloat(variable.fValue) / 1000).toFixed(2) : 'N/A';
          const isManual = variable.autoManual === '1';

          return (
            <PointListRow
              key={`${variable.serialNumber}-${variable.variableIndex}`}
              pointId={`VAR${parseInt(variable.variableIndex || '0') + 1}`}
              label={variable.fullLabel || variable.label || `Variable ${parseInt(variable.variableIndex || '0') + 1}`}
              subLabel={variable.label}
              value={displayValue}
              unit={variable.units}
              range={rangeLabel}
              expanded={expandedKey === `${variable.serialNumber}-${variable.variableIndex}`}
              onToggle={() => setExpandedKey(prev => prev === `${variable.serialNumber}-${variable.variableIndex}` ? null : `${variable.serialNumber}-${variable.variableIndex}`)}
              onRangeClick={() => handleRangeClick(variable)}
              details={[
                { label: 'Panel', value: variable.panel || '-' },
                { label: 'Variable', value: `VAR${parseInt(variable.variableIndex || '0') + 1}` },
                { label: 'Full Label', value: variable.fullLabel || '-' },
                { label: 'Label', value: variable.label || '-' },
                { label: 'Mode', value: isManual ? 'Manual' : 'Auto' },
                { label: 'Value', value: displayValue },
                { label: 'Units', value: variable.units || '-' },
                { label: 'Range', value: rangeLabel },
                { label: 'Calibration', value: variable.calibration || '0' },
                { label: 'Sign', value: variable.sign || '0' },
                { label: 'Filter', value: variable.filterField || '0' },
                { label: 'Status', value: variable.status || '-' },
                { label: 'Type', value: parseInt(variable.digitalAnalog || '0') === 1 ? 'Analog' : 'Digital' },
              ]}
              onRefresh={() => handleRefreshSingleVariable(variable.variableIndex || '')}
              refreshing={isRefreshing}
            />
          );
        })}
      </div>

      {/* Range selection drawer */}
      {selectedVariableForRange && (
        <MobileRangeDrawer
          isOpen={rangeDrawerOpen}
          onClose={() => setRangeDrawerOpen(false)}
          currentRange={parseInt(selectedVariableForRange.rangeField || '0', 10)}
          digitalAnalog={parseInt(selectedVariableForRange.digitalAnalog || '0', 10)}
          onSave={handleRangeSave}
          inputLabel={`Variable ${parseInt(selectedVariableForRange.variableIndex || '0') + 1} - ${selectedVariableForRange.fullLabel || 'Unnamed'}`}
        />
      )}
    </div>
  );
};
