/**
 * Mobile Inputs Page
 * Compact list view for Inputs — new design with action bar + column header.
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
import { useInputsPage } from '../../../../shared/features/inputs/hooks/useInputsPage';
import { getRangeLabel } from '../../../../t3-react/features/inputs/data/rangeData';

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  /* ── Action bar ── */
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
  /* ── List ── */
  list: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  /* ── States ── */
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

export const InputsPageMobile: React.FC = () => {
  const styles = useStyles();
  const [search, setSearch] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const {
    inputs,
    loading,
    error,
    refreshing,
    refreshingItems,
    selectedDevice,
    handleRefresh,
    handleRefreshFromDevice,
    handleRefreshSingleInput,
  } = useInputsPage();

  const title = inputs.length > 0 ? `Inputs (${inputs.length})` : 'Inputs';
  useMobilePage({ title, onRefresh: error && inputs.length === 0 ? handleRefresh : handleRefreshFromDevice });

  if (loading && inputs.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Loading inputs..." size="tiny" labelPosition="after" style={{ fontSize: '12px', color: '#605e5c' }} />
      </div>
    );
  }

  if (error && inputs.length === 0) {
    return (
      <div className={styles.errorState}>
        <ErrorCircleRegular fontSize={48} color={tokens.colorPaletteRedForeground1} />
        <Text size={400} weight="semibold">Failed to load inputs</Text>
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
          Please select a device from the tree to view inputs
        </Text>
      </div>
    );
  }

  if (inputs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text size={500} weight="semibold">No Inputs Found</Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
          Tap refresh to load inputs from device
        </Text>
        <Button appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefreshFromDevice} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh from Device'}
        </Button>
      </div>
    );
  }

  const filtered = search.trim()
    ? inputs.filter((inp) =>
        (inp.fullLabel || inp.label || '').toLowerCase().includes(search.toLowerCase()) ||
        String(inp.inputIndex).includes(search)
      )
    : inputs;

  return (
    <div className={styles.wrapper}>
      {/* Action bar */}
      <div className={styles.actionBar}>
        <div className={styles.searchBox}>
          <SearchRegular fontSize={14} />
          <input
            className={styles.searchInput}
            placeholder="Search inputs..."
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

      {/* Column header */}
      <PointListHeader idLabel="Input" labelLabel="Full Label" valueLabel="Value" unitLabel="Units" statusLabel="Status" typeLabel="Type" />

      {/* List */}
      <div className={styles.list}>
        {filtered.map((input) => {
          const isRefreshing = refreshingItems.has(input.inputIndex || '');
          const rangeValue = parseInt(input.rangeField || input.range || '0', 10);
          const digitalAnalog = parseInt(input.digitalAnalog || '0', 10);
          const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);
          const displayValue = input.fValue ? (parseFloat(input.fValue) / 1000).toFixed(2) : 'N/A';
          const isManual = input.autoManual === '1';

          return (
            <PointListRow
              key={`${input.serialNumber}-${input.inputIndex}`}
              pointId={`IN${parseInt(input.inputIndex || '0') + 1}`}
              label={input.fullLabel || input.label || `Input ${parseInt(input.inputIndex || '0') + 1}`}
              subLabel={input.label}
              mode={isManual ? 'Manual' : 'Auto'}
              statusText={input.status || '—'}
              typeText={parseInt(input.digitalAnalog || '0') === 1 ? 'Analog' : 'Digital'}
              calibration={input.calibration || '0'}
              signalType={input.signalType || '—'}
              value={displayValue}
              unit={input.units}
              range={rangeLabel}
              expanded={expandedKey === `${input.serialNumber}-${input.inputIndex}`}
              onToggle={() => setExpandedKey(prev => prev === `${input.serialNumber}-${input.inputIndex}` ? null : `${input.serialNumber}-${input.inputIndex}`)}
              details={[
                { label: 'Panel', value: input.panel || '-' },
                { label: 'Input', value: `IN${parseInt(input.inputIndex || '0') + 1}` },
                { label: 'Full Label', value: input.fullLabel || '-' },
                { label: 'Label', value: input.label || '-' },
                { label: 'Mode', value: isManual ? 'Manual' : 'Auto' },
                { label: 'Value', value: displayValue },
                { label: 'Units', value: input.units || '-' },
                { label: 'Range', value: rangeLabel },
                { label: 'Calibration', value: input.calibration || '0' },
                { label: 'Sign', value: input.sign || '0' },
                { label: 'Filter', value: input.filterField || '0' },
                { label: 'Status', value: input.status || '-' },
                { label: 'Signal Type', value: input.signalType || '-' },
                { label: 'Type', value: parseInt(input.digitalAnalog || '0') === 1 ? 'Analog' : 'Digital' },
              ]}
              onRefresh={() => handleRefreshSingleInput(input.inputIndex || '')}
              refreshing={isRefreshing}
            />
          );
        })}
      </div>
    </div>
  );
};
