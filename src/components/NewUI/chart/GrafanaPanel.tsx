import React, { useEffect, useState } from 'react';
import {
  DataFrame,
  Field,
  FieldType,
  TimeRange,
  dateTime,
  LoadingState,
  PanelData,
  FieldConfig,
  FieldDisplay
} from '@grafana/data';
import { T3000DataPoint, T3000Config } from './types';

// Simple fallback components to avoid broken Grafana UI imports
const SimpleButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}> = ({ onClick, children, variant = 'secondary', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '8px 16px',
      margin: '0 4px',
      border: variant === 'primary' ? '1px solid #1f77b4' : '1px solid #ddd',
      backgroundColor: variant === 'primary' ? '#1f77b4' : '#f8f9fa',
      color: variant === 'primary' ? 'white' : '#333',
      borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}
  >
    {children}
  </button>
);

const SimpleSpinner: React.FC = () => (
  <div style={{
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #1f77b4',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }}>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

const SimplePanelContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    backgroundColor: '#ffffff',
    border: '1px solid #e7e7e7',
    borderRadius: '2px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }}>
    {children}
  </div>
);

interface T3000PanelProps {
  data?: PanelData;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  config: T3000Config;
  onDataRefresh: () => void;
  width: number;
  height: number;
}

/**
 * Grafana Panel Component for T3000 Data Visualization
 * Uses official Grafana components with T3000 data integration
 */
export const T3000Panel: React.FC<T3000PanelProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  config,
  onDataRefresh,
  width,
  height
}) => {
  console.log('[GrafanaPanel] Received props:', {
    data,
    timeRange,
    config,
    width,
    height
  });

  // Simple theme object since useTheme2 is broken
  const theme = {
    colors: {
      text: {
        primary: '#212529',
        secondary: '#6c757d'
      },
      background: {
        primary: '#ffffff',
        secondary: '#f8f9fa',
        canvas: '#fafbfc'
      },
      border: {
        weak: '#e7e7e7'
      },
      info: {
        transparent: '#e3f2fd',
        border: '#90caf9',
        text: '#1976d2'
      }
    }
  };
  const [isLoading, setIsLoading] = useState(false);

  const quickTimeRanges = [
    { label: '5m', value: { from: 'now-5m', to: 'now' } },
    { label: '15m', value: { from: 'now-15m', to: 'now' } },
    { label: '30m', value: { from: 'now-30m', to: 'now' } },
    { label: '1h', value: { from: 'now-1h', to: 'now' } },
    { label: '4h', value: { from: 'now-4h', to: 'now' } },
    { label: '12h', value: { from: 'now-12h', to: 'now' } },
    { label: '24h', value: { from: 'now-24h', to: 'now' } },
    { label: '7d', value: { from: 'now-7d', to: 'now' } }
  ];

  const handleTimeRangeSelect = (range: any) => {
    const newTimeRange: TimeRange = {
      from: dateTime(range.from),
      to: dateTime(range.to),
      raw: range
    };
    onTimeRangeChange(newTimeRange);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await onDataRefresh();
    setIsLoading(false);
  };

  return (
    <SimplePanelContainer>
      <div style={{
        width,
        height,
        background: theme.colors.background.primary,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header with controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: `1px solid ${theme.colors.border.weak}`,
          background: theme.colors.background.secondary
        }}>
          <h3 style={{ margin: 0, color: theme.colors.text.primary }}>
            T3000 Real-Time Data - {config.deviceId}
          </h3>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Quick time range buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {quickTimeRanges.map((range) => (
                <SimpleButton
                  key={range.label}
                  variant="secondary"
                  onClick={() => handleTimeRangeSelect(range.value)}
                >
                  {range.label}
                </SimpleButton>
              ))}
            </div>

            <SimpleButton
              variant="primary"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? <SimpleSpinner /> : 'Refresh'}
            </SimpleButton>

            <SimpleButton
              variant="secondary"
              onClick={() => {
                console.log('[GrafanaPanel] Manual test data generation');
                // Test data generation directly
                const { t3000Api } = require('./api');
                t3000Api.getData({
                  deviceId: 123,
                  timeRange: {
                    from: { valueOf: () => Date.now() - 30 * 60 * 1000 },
                    to: { valueOf: () => Date.now() }
                  },
                  channels: [1, 2, 3, 4, 5]
                }).then(result => {
                  console.log('[GrafanaPanel] Test result:', result);
                });
              }}
            >
              Test API
            </SimpleButton>
          </div>
        </div>

        {/* Chart area */}
        <div style={{
          flex: 1,
          padding: '16px',
          background: theme.colors.background.primary,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Debug information */}
          <div style={{
            marginBottom: '16px',
            padding: '8px',
            background: '#fffbe6',
            border: '1px solid #d9c441',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>Debug Info:</strong> Data state: {data?.state || 'undefined'},
            Series count: {data?.series?.length || 0},
            Loading: {isLoading ? 'true' : 'false'}
          </div>

          {data && data.series && data.series.length > 0 ? (
            <div style={{
              flex: 1,
              border: `1px solid ${theme.colors.border.weak}`,
              borderRadius: '4px',
              padding: '16px',
              background: theme.colors.background.canvas
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: theme.colors.text.primary }}>
                Data Series ({data.series.length} channels)
              </h4>

              {/* Display data series information */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {data.series.map((series, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      border: `1px solid ${theme.colors.border.weak}`,
                      borderRadius: '4px',
                      background: theme.colors.background.secondary
                    }}
                  >
                    <div style={{
                      fontWeight: 'bold',
                      color: theme.colors.text.primary,
                      marginBottom: '8px'
                    }}>
                      {series.name || `Series ${index + 1}`}
                    </div>
                    <div style={{ color: theme.colors.text.secondary, fontSize: '14px' }}>
                      Fields: {series.fields.length}<br/>
                      Length: {series.length}<br/>
                      RefId: {series.refId || 'N/A'}
                    </div>

                    {/* Show latest values */}
                    {series.fields.length > 1 && series.length > 0 && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: theme.colors.background.primary,
                        borderRadius: '4px'
                      }}>
                        <div style={{ color: theme.colors.text.secondary, fontSize: '12px' }}>
                          Latest Value:
                        </div>
                        <div style={{
                          color: theme.colors.text.primary,
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          {series.fields[1]?.values?.[series.length - 1]?.toFixed(2) || 'N/A'}
                          {series.fields[1]?.config?.unit && ` ${series.fields[1].config.unit}`}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Note about visualization */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: theme.colors.info.transparent,
                border: `1px solid ${theme.colors.info.border}`,
                borderRadius: '4px',
                color: theme.colors.info.text
              }}>
                <strong>Note:</strong> This is a simplified Grafana integration demo.
                In a full implementation, this would render as a proper TimeSeries chart
                using Grafana's visualization components.
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: theme.colors.text.secondary
            }}>
              {isLoading ? (
                <>
                  <SimpleSpinner />
                  <div style={{ marginTop: '16px' }}>Loading T3000 data...</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>No data available</div>
                  <div>Try refreshing or selecting a different time range</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </SimplePanelContainer>
  );
};

export default T3000Panel;
