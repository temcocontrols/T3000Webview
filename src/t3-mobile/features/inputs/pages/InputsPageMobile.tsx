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
import { useMobilePage } from '../../../layout/MobilePageContext';
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
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
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

  const title = inputs.length > 0 ? `Inputs (${inputs.length})` : 'Inputs';
  useMobilePage({ title, onRefresh: error && inputs.length === 0 ? handleRefresh : handleRefreshFromDevice });

  // Loading state
  if (loading && inputs.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Loading inputs..." size="large" />
      </div>
    );
  }

  // Error state
  if (error && inputs.length === 0) {
    return (
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
    );
  }

  // Empty state
  if (!selectedDevice) {
    return (
      <div className={styles.emptyState}>
        <Text size={500} weight="semibold">
          No Device Selected
        </Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
          Please select a device from the tree to view inputs
        </Text>
      </div>
    );
  }

  if (inputs.length === 0) {
    return (
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
    );
  }

  // Main content with data
  return (
    <div className={styles.container}>
      <div className={styles.cardList}>
        {inputs.map((input) => {
          const isRefreshing = refreshingItems.has(input.inputIndex || '');
          const rangeValue = parseInt(input.rangeField || input.range || '0', 10);
          const digitalAnalog = parseInt(input.digitalAnalog || '0', 10);
          const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);
          const displayValue = input.fValue ? (parseFloat(input.fValue) / 1000).toFixed(2) : 'N/A';

          return (
            <MobileCard
              key={`${input.serialNumber}-${input.inputIndex}`}
              index={`#${input.inputIndex}`}
              title={input.fullLabel || input.label || `Input ${input.inputIndex}`}
              displayValue={displayValue}
              displayUnit={input.units}
              statusColor={input.autoManual === '1' ? 'manual' : 'auto'}
              expandedDetails={[
                { label: 'Value', value: `${displayValue}${input.units ? ' ' + input.units : ''}` },
                { label: 'Mode', value: input.autoManual === '1' ? 'Manual' : 'Auto' },
                { label: 'Range', value: rangeLabel },
                { label: 'Index', value: `#${input.inputIndex}` },
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
