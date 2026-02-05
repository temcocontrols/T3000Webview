/**
 * Mobile Inputs Page
 * Card-based mobile view for Inputs
 * Uses shared useInputsPage hook for business logic
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
import { useInputsPage } from '../../../../shared/features/inputs/hooks/useInputsPage';
import { getRangeLabel } from '../../../../t3-react/features/inputs/data/rangeData';

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

export const InputsPageMobile: React.FC = () => {
  const styles = useStyles();
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

  // Loading state
  if (loading && inputs.length === 0) {
    return (
      <MobileLayout
        appBarProps={{
          title: 'Inputs',
          showRefresh: false,
        }}
      >
        <div className={styles.loadingContainer}>
          <Spinner label="Loading inputs..." size="large" />
        </div>
      </MobileLayout>
    );
  }

  // Error state
  if (error && inputs.length === 0) {
    return (
      <MobileLayout
        appBarProps={{
          title: 'Inputs',
          onRefresh: handleRefresh,
        }}
      >
        <div className={styles.errorState}>
          <ErrorCircleRegular fontSize={48} color={tokens.colorPaletteRedForeground1} />
          <Text size={400} weight="semibold">
            Failed to load inputs
          </Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            {error}
          </Text>
          <Button
            appearance="primary"
            icon={<ArrowSyncRegular />}
            onClick={handleRefresh}
          >
            Try Again
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // Empty state
  if (!selectedDevice) {
    return (
      <MobileLayout
        appBarProps={{
          title: 'Inputs',
        }}
      >
        <div className={styles.emptyState}>
          <Text size={500} weight="semibold">
            No Device Selected
          </Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            Please select a device from the tree to view inputs
          </Text>
        </div>
      </MobileLayout>
    );
  }

  if (inputs.length === 0) {
    return (
      <MobileLayout
        appBarProps={{
          title: 'Inputs',
          onRefresh: handleRefreshFromDevice,
        }}
      >
        <div className={styles.emptyState}>
          <Text size={500} weight="semibold">
            No Inputs Found
          </Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            Tap refresh to load inputs from device
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

  // Main content with data
  return (
    <MobileLayout
      appBarProps={{
        title: `Inputs (${inputs.length})`,
        onRefresh: handleRefreshFromDevice,
      }}
    >
      <div className={styles.container}>
        {/* Device Info */}
        <div className={styles.deviceInfo}>
          <Text size={300} weight="semibold" style={{ display: 'block', marginBottom: '4px' }}>
            Device
          </Text>
          <Text size={400}>
            {selectedDevice.nameShowOnTree}
          </Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
            SN: {selectedDevice.serialNumber}
          </Text>
        </div>

        {/* Input Cards */}
        <div className={styles.cardList}>
          {inputs.map((input) => {
            const isRefreshing = refreshingItems.has(input.inputIndex || '');
            const rangeValue = parseInt(input.rangeField || input.range || '0', 10);
            const digitalAnalog = parseInt(input.digitalAnalog || '0', 10);
            const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);

            return (
              <MobileCard
                key={`${input.serialNumber}-${input.inputIndex}`}
                title={input.fullLabel || input.label || `Input ${input.inputIndex}`}
                subtitle={`#${input.inputIndex} • ${rangeLabel}`}
                value={input.fValue ? (parseFloat(input.fValue) / 1000).toFixed(2) : 'N/A'}
                unit={input.units}
                status={input.autoManual === '1' ? 'Manual' : 'Auto'}
                onRefresh={() => handleRefreshSingleInput(input.inputIndex || '')}
                refreshing={isRefreshing}
              />
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
};
