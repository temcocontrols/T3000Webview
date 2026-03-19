/**
 * Mobile Outputs Page
 * Card-based mobile view for Outputs
 * Uses shared useOutputsPage hook for business logic
 */

import React from 'react';
import {
  Spinner,
  Text,
  makeStyles,
  tokens,
  Button,
} from '@fluentui/react-components';
import {
  ErrorCircleRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import { MobileLayout } from '../../../layout/MobileLayout';
import { MobileCard } from '../../../components/MobileCard/MobileCard';
import { useOutputsPage } from '../../../../shared/features/outputs/hooks/useOutputsPage';
import { getRangeLabel } from '../../../../t3-react/features/outputs/data/rangeData';

const useStyles = makeStyles({
  container: {
    paddingBottom: '24px',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  deviceInfo: {
    padding: '12px 16px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: '16px',
  },
});

export const OutputsPageMobile: React.FC = () => {
  const styles = useStyles();
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
  } = useOutputsPage();

  if (loading && outputs.length === 0) {
    return (
      <MobileLayout appBarProps={{ title: 'Outputs', showRefresh: false }}>
        <div className={styles.loadingContainer}>
          <Spinner label="Loading outputs..." size="large" />
        </div>
      </MobileLayout>
    );
  }

  if (error && outputs.length === 0) {
    return (
      <MobileLayout appBarProps={{ title: 'Outputs', onRefresh: handleRefresh }}>
        <div className={styles.errorState}>
          <ErrorCircleRegular fontSize={48} color={tokens.colorPaletteRedForeground1} />
          <Text size={400} weight="semibold">Failed to load outputs</Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>{error}</Text>
          <Button appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      </MobileLayout>
    );
  }

  if (!selectedDevice) {
    return (
      <MobileLayout appBarProps={{ title: 'Outputs' }}>
        <div className={styles.emptyState}>
          <Text size={500} weight="semibold">No Device Selected</Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            Please select a device from the tree to view outputs
          </Text>
        </div>
      </MobileLayout>
    );
  }

  if (outputs.length === 0) {
    return (
      <MobileLayout appBarProps={{ title: 'Outputs', onRefresh: handleRefreshFromDevice }}>
        <div className={styles.emptyState}>
          <Text size={500} weight="semibold">No Outputs Found</Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            Tap refresh to load outputs from device
          </Text>
          <Button
            appearance="primary"
            icon={<ArrowSyncRegular />}
            onClick={handleRefreshFromDevice}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh from Device'}
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      appBarProps={{
        title: `Outputs (${outputs.length})`,
        onRefresh: handleRefreshFromDevice,
      }}
    >
      <div className={styles.container}>
        <div className={styles.deviceInfo}>
          <Text size={300} weight="semibold" style={{ display: 'block', marginBottom: '4px' }}>Device</Text>
          <Text size={400}>{selectedDevice.nameShowOnTree}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
            SN: {selectedDevice.serialNumber}
          </Text>
        </div>
        <div className={styles.cardList}>
          {outputs.map((output) => {
            const isRefreshing = refreshingItems.has(output.outputIndex || '');
            const rangeValue = parseInt(output.rangeField || output.range || '0', 10);
            const digitalAnalog = parseInt(output.digitalAnalog || '0', 10);
            const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);

            return (
              <MobileCard
                key={`${output.serialNumber}-${output.outputIndex}`}
                title={output.fullLabel || output.label || `Output ${output.outputIndex}`}
                subtitle={`#${output.outputIndex} • ${rangeLabel}`}
                value={output.fValue ? (parseFloat(output.fValue) / 1000).toFixed(2) : 'N/A'}
                unit={output.units}
                status={output.autoManual === '1' ? 'Manual' : 'Auto'}
                onRefresh={() => handleRefreshSingleOutput(output.outputIndex || '')}
                refreshing={isRefreshing}
              />
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
};
