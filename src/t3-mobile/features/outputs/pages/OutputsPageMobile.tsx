/**
 * Mobile Outputs Page
 * Compact list view for Outputs — new design with action bar + column header.
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
import { useOutputsPage } from '../../../../shared/features/outputs/hooks/useOutputsPage';
import { getRangeLabel } from '../../../../t3-react/features/outputs/data/rangeData';
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

export const OutputsPageMobile: React.FC = () => {
  const styles = useStyles();
  const [search, setSearch] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [rangeDrawerOpen, setRangeDrawerOpen] = useState(false);
  const [selectedOutputForRange, setSelectedOutputForRange] = useState<any>(null);
  const {
    outputs,
    loading,
    error,
    refreshing,
    refreshingItems,
    selectedDevice,
    handleRefresh,
    handleRefreshFromDevice,
    handleRefreshSingleOutput,
    updateOutputField,
  } = useOutputsPage();

  const title = outputs.length > 0 ? `Outputs (${outputs.length})` : 'Outputs';
  useMobilePage({ title, onRefresh: error && outputs.length === 0 ? handleRefresh : handleRefreshFromDevice });

  const handleRangeClick = (output: any) => {
    setSelectedOutputForRange(output);
    setRangeDrawerOpen(true);
  };

  const handleRangeSave = async (newRange: number, newDigitalAnalog: number) => {
    if (!selectedOutputForRange || !selectedDevice) return;
    try {
      const currentOutput = outputs.find(
        o => o.serialNumber === selectedOutputForRange.serialNumber && o.outputIndex === selectedOutputForRange.outputIndex
      );
      if (!currentOutput) return;
      const updatedOutput = { ...currentOutput, digitalAnalog: newDigitalAnalog.toString() };
      await updateOutputField(selectedOutputForRange.outputIndex, 'range', newRange.toString(), updatedOutput);
    } catch (error) {
      console.error('Failed to update range:', error);
    }
  };

  if (loading && outputs.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Loading outputs..." size="tiny" labelPosition="after" style={{ fontSize: '12px', color: '#605e5c' }} />
      </div>
    );
  }

  if (error && outputs.length === 0) {
    return (
      <div className={styles.errorState}>
        <ErrorCircleRegular fontSize={48} color={tokens.colorPaletteRedForeground1} />
        <Text size={400} weight="semibold">Failed to load outputs</Text>
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
          Please select a device from the tree to view outputs
        </Text>
      </div>
    );
  }

  if (outputs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text size={300} weight="semibold">No Outputs Found</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Tap refresh to load outputs from device
        </Text>
        <Button size="small" appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefreshFromDevice} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh from Device'}
        </Button>
      </div>
    );
  }

  const filtered = search.trim()
    ? outputs.filter((out) =>
        (out.fullLabel || out.label || '').toLowerCase().includes(search.toLowerCase()) ||
        String(out.outputIndex).includes(search)
      )
    : outputs;

  return (
    <div className={styles.wrapper}>
      <div className={styles.actionBar}>
        <div className={styles.searchBox}>
          <SearchRegular fontSize={14} />
          <input
            className={styles.searchInput}
            placeholder="Search outputs..."
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

      <PointListHeader idLabel="Output" labelLabel="Full Label" valueLabel="Value" unitLabel="Units" statusLabel="Status" typeLabel="Type" />

      <div className={styles.list}>
        {filtered.map((output) => {
          const isRefreshing = refreshingItems.has(output.outputIndex || '');
          const rangeValue = parseInt(output.rangeField || output.range || '0', 10);
          const digitalAnalog = parseInt(output.digitalAnalog || '0', 10);
          const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);
          const displayValue = output.fValue ? (parseFloat(output.fValue) / 1000).toFixed(2) : 'N/A';
          const isManual = output.autoManual === '1';

          return (
            <PointListRow
              key={`${output.serialNumber}-${output.outputIndex}`}
              pointId={`OUT${parseInt(output.outputIndex || '0') + 1}`}
              label={output.fullLabel || output.label || `Output ${parseInt(output.outputIndex || '0') + 1}`}
              subLabel={output.label}
              mode={isManual ? 'Manual' : 'Auto'}
              statusText={output.status || '—'}
              typeText={parseInt(output.digitalAnalog || '0') === 1 ? 'Analog' : 'Digital'}
              signalType={output.signalType || '—'}
              value={displayValue}
              unit={output.units}
              range={rangeLabel}
              expanded={expandedKey === `${output.serialNumber}-${output.outputIndex}`}
              onToggle={() => setExpandedKey(prev => prev === `${output.serialNumber}-${output.outputIndex}` ? null : `${output.serialNumber}-${output.outputIndex}`)}
              onRangeClick={() => handleRangeClick(output)}
              details={[
                { label: 'Panel', value: output.panel || '-' },
                { label: 'Output', value: `OUT${parseInt(output.outputIndex || '0') + 1}` },
                { label: 'Full Label', value: output.fullLabel || '-' },
                { label: 'Label', value: output.label || '-' },
                { label: 'Mode', value: isManual ? 'Manual' : 'Auto' },
                { label: 'Value', value: displayValue },
                { label: 'Units', value: output.units || '-' },
                { label: 'Range', value: rangeLabel },
                { label: 'HW Switch', value: output.hwSwitchStatus || '-' },
                { label: 'Low Voltage', value: output.lowVoltage || '-' },
                { label: 'High Voltage', value: output.highVoltage || '-' },
                { label: 'PWM Period', value: output.pwmPeriod || '-' },
                { label: 'Status', value: output.status || '-' },
                { label: 'Signal Type', value: output.signalType || '-' },
                { label: 'Type', value: parseInt(output.digitalAnalog || '0') === 1 ? 'Analog' : 'Digital' },
              ]}
              onRefresh={() => handleRefreshSingleOutput(output.outputIndex || '')}
              refreshing={isRefreshing}
            />
          );
        })}
      </div>

      {/* Range selection drawer */}
      {selectedOutputForRange && (
        <MobileRangeDrawer
          isOpen={rangeDrawerOpen}
          onClose={() => setRangeDrawerOpen(false)}
          currentRange={parseInt(selectedOutputForRange.rangeField || selectedOutputForRange.range || '0', 10)}
          digitalAnalog={parseInt(selectedOutputForRange.digitalAnalog || '0', 10)}
          onSave={handleRangeSave}
          inputLabel={`Output ${parseInt(selectedOutputForRange.outputIndex || '0') + 1} - ${selectedOutputForRange.fullLabel || 'Unnamed'}`}
        />
      )}
    </div>
  );
};
