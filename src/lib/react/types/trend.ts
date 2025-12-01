/**
 * Trend log types
 */

// Trend data point
export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  status?: 'normal' | 'fault' | 'overridden';
}

// Trend series
export interface TrendSeries {
  id: string;
  name: string;
  deviceId: string;
  objectId: number;
  color?: string;
  visible: boolean;
  data: TrendDataPoint[];
  units?: string;
  min?: number;
  max?: number;
}

// Trend query
export interface TrendQuery {
  deviceId: string;
  objectIds: number[];
  startTime: Date;
  endTime: Date;
  interval?: number;           // seconds, for data aggregation
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}

// Trend export format
export enum TrendExportFormat {
  CSV = 'csv',
  Excel = 'excel',
  JSON = 'json',
  PDF = 'pdf',
}

// Trend export options
export interface TrendExportOptions {
  format: TrendExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  seriesIds?: string[];
  startTime?: Date;
  endTime?: Date;
}

// Trend chart configuration
export interface TrendChartConfig {
  title?: string;
  xAxis: {
    label?: string;
    format?: string;           // Date format string
  };
  yAxis: {
    label?: string;
    min?: number;
    max?: number;
    autoScale?: boolean;
  };
  legend: {
    show: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  grid: {
    show: boolean;
  };
  zoom: {
    enabled: boolean;
  };
  pan: {
    enabled: boolean;
  };
}

// Trend statistics
export interface TrendStatistics {
  seriesId: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
  stdDev: number;
  first: TrendDataPoint;
  last: TrendDataPoint;
}
