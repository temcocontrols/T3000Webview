/**
 * TrendChart Component
 *
 * Vue-parity Chart.js renderer for trendlog charts.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { ScatterDataPoint, ChartConfiguration, ChartDataset, TooltipItem } from 'chart.js';
import { makeStyles, tokens } from '@fluentui/react-components';
import './piecewise-scale';

const useStyles = makeStyles({
  chartContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  chartContainerMain: {
    minHeight: '400px',
  },
  chartContainerOscilloscope: {
    minHeight: '60px',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
});

export interface TrendDataPoint {
  timestamp: number;
  value: number;
}

export interface TrendSeries {
  name: string;
  pointId: string;
  pointType: string;
  pointIndex: number;
  data: TrendDataPoint[];
  color: string;
  unit?: string;
  digitalAnalog: 'Analog' | 'Digital';
  visible?: boolean;
  prefix?: string;
  panelId?: number;
}

interface TrendChartProps {
  series: TrendSeries[];
  timeBase: '5m' | '10m' | '30m' | '1h' | '4h' | '12h' | '1d' | '4d';
  showGrid?: boolean;
  chartType?: 'analog' | 'digital';
  timeOffset?: number;
  onTimeRangeChange?: (startTime: number, endTime: number) => void;
  onChartReady?: (instance: any) => void;
}

type ChartPoint = ScatterDataPoint;
type ChartInstanceLike = Chart<'line', ChartPoint[], unknown> & {
  getDataURL?: (options?: { type?: 'png' | 'jpeg'; pixelRatio?: number; backgroundColor?: string }) => string;
};

const CHART_COLORS = [
  '#FF0000', '#0000FF', '#00AA00', '#FF8000', '#AA00AA', '#CC6600',
  '#AA0000', '#0066AA', '#AA6600', '#6600AA', '#006600', '#FF6600', '#0000AA',
  '#FF00FF', '#008080', '#800080', '#808000', '#FF1493', '#4B0082', '#DC143C',
  '#00AAAA', '#00CED1', '#8B4513', '#2F4F4F', '#B22222',
];

const TIME_CONFIGS = {
  '5m': { divisions: 5, totalMinutes: 5 },
  '10m': { divisions: 10, totalMinutes: 10 },
  '30m': { divisions: 6, totalMinutes: 30 },
  '1h': { divisions: 12, totalMinutes: 60 },
  '4h': { divisions: 16, totalMinutes: 240 },
  '12h': { divisions: 12, totalMinutes: 720 },
  '1d': { divisions: 24, totalMinutes: 1440 },
  '4d': { divisions: 16, totalMinutes: 5760 },
} as const;

const BAND_SIZE = 100;
const BAND_MARGIN = 8;
const DIGITAL_GAP = 50;
const DIGITAL_BAND_SIZE = 1.05;
const DBS_HIGH = DIGITAL_BAND_SIZE * 0.25;
const DBS_LOW = DIGITAL_BAND_SIZE * 0.75;

interface YBandInfo {
  unit: string;
  colors: string[];
  realMin: number;
  realMax: number;
  virtualBase: number;
  step: number;
  distinctCount: number;
}

interface YBandLayout {
  analogBands: YBandInfo[];
  analogBandBySeries: Map<string, YBandInfo>;
  digitalBandBySeries: Map<string, { index: number; series: TrendSeries }>;
  digitalCount: number;
  digitalZoneHeight: number;
  analogOffset: number;
  virtualMin: number;
  virtualMax: number;
  clusters: Array<{ vMin: number; vMax: number }>;
  distinct: number[];
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const NICE_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

const normalizeBandRange = (inputMin: number, inputMax: number) => {
  let realMin = inputMin;
  let realMax = inputMax;

  if (!Number.isFinite(realMin) || !Number.isFinite(realMax)) {
    realMin = 0;
    realMax = 100;
  }

  if (realMin === realMax) {
    realMin -= 1;
    realMax += 1;
  }

  const rawRange = Math.max(realMax - realMin, 0.001);
  const rangeStep = NICE_STEPS.find((step) => step >= rawRange / 5) ?? NICE_STEPS[NICE_STEPS.length - 1];
  const maxAbs = Math.max(Math.abs(realMin), Math.abs(realMax), 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxAbs)));
  const magStep = NICE_STEPS.find((step) => step >= magnitude / 10) ?? 0.1;
  let step = Math.max(rangeStep, magStep);

  let stepIndex = NICE_STEPS.indexOf(step);
  while (stepIndex >= 0 && stepIndex < NICE_STEPS.length - 1) {
    const largerStep = NICE_STEPS[stepIndex + 1];
    const snappedMin = Math.floor(realMin / largerStep) * largerStep;
    const snappedMax = Math.ceil(realMax / largerStep) * largerStep;
    const snappedRange = snappedMax - snappedMin;
    const intervals = snappedRange / largerStep;
    const lowPad = realMin - snappedMin;
    const highPad = snappedMax - realMax;
    if (intervals >= 2 && lowPad <= largerStep * 0.8 && highPad <= largerStep * 0.8 && snappedRange <= rawRange * 1.5) {
      step = largerStep;
      stepIndex++;
    } else {
      break;
    }
  }

  realMin = Math.floor(realMin / step) * step;
  realMax = Math.ceil(realMax / step) * step;
  if ((realMax - realMin) / step < 2) {
    realMax = realMin + step * 2;
  }

  const snappedRange = realMax - realMin;
  const boundaryRound = NICE_STEPS.find((candidate) => candidate >= magnitude / 2) ?? step;
  if (boundaryRound > step) {
    const roundedMin = Math.floor(realMin / boundaryRound) * boundaryRound;
    const roundedMax = Math.ceil(realMax / boundaryRound) * boundaryRound;
    if ((roundedMax - roundedMin) <= Math.max(snappedRange * 3, boundaryRound * 4)) {
      realMin = roundedMin;
      realMax = roundedMax;
      const recomputedStep = NICE_STEPS.find((candidate) => candidate >= (realMax - realMin) / 6) ?? step;
      step = Math.max(recomputedStep, magStep);
    }
  }

  return { realMin, realMax, step };
};

const calculateBandStep = (min: number, max: number) => {
  const range = Math.max(max - min, 0);
  if (range === 0) {
    const magnitude = Math.max(Math.abs(min), Math.abs(max), 1);
    return magnitude < 1 ? 0.1 : magnitude < 10 ? 0.5 : magnitude < 100 ? 1 : 10;
  }
  const roughStep = range / 5;
  const candidates = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  return candidates.find((candidate) => candidate >= roughStep) ?? candidates[candidates.length - 1];
};

const getSeriesUnitKey = (series: TrendSeries) => (series.unit || 'N/A').trim() || 'N/A';

const getDigitalStatesForYAxis = (unit?: string): [string, string] => {
  const raw = (unit || '').trim();
  if (raw.includes('/')) {
    const [offState, onState] = raw.split('/').map((part) => part.trim());
    if (offState || onState) {
      return [offState || 'Off', onState || 'On'];
    }
  }
  return ['Off', 'On'];
};

const buildYAxisLayout = (analogSeries: TrendSeries[], digitalSeries: TrendSeries[]): YBandLayout => {
  const digitalCount = digitalSeries.length;
  const digitalZoneHeight = digitalCount * DIGITAL_BAND_SIZE;
  const analogOffset = digitalCount > 0 ? digitalZoneHeight + DIGITAL_GAP : 0;

  const analogBandBySeries = new Map<string, YBandInfo>();
  const digitalBandBySeries = new Map<string, { index: number; series: TrendSeries }>();

  const groupedAnalogSeries = new Map<string, TrendSeries[]>();
  analogSeries.forEach((series) => {
    const key = getSeriesUnitKey(series);
    const current = groupedAnalogSeries.get(key) || [];
    current.push(series);
    groupedAnalogSeries.set(key, current);
  });

  const sortedAnalogGroups = Array.from(groupedAnalogSeries.entries()).sort((left, right) => {
    const leftValues = left[1]
      .flatMap((series) => series.data.map((point) => point.value))
      .filter(isFiniteNumber);
    const rightValues = right[1]
      .flatMap((series) => series.data.map((point) => point.value))
      .filter(isFiniteNumber);

    const leftMin = leftValues.length ? Math.min(...leftValues) : 0;
    const leftMax = leftValues.length ? Math.max(...leftValues) : 0;
    const rightMin = rightValues.length ? Math.min(...rightValues) : 0;
    const rightMax = rightValues.length ? Math.max(...rightValues) : 0;

    const leftCenter = (leftMin + leftMax) / 2;
    const rightCenter = (rightMin + rightMax) / 2;
    const leftLog = Math.log10(Math.max(Math.abs(leftCenter), 1));
    const rightLog = Math.log10(Math.max(Math.abs(rightCenter), 1));

    if (Math.abs(leftLog - rightLog) > 0.3) {
      return leftLog - rightLog;
    }
    return right[1].length - left[1].length;
  });

  const analogBands = sortedAnalogGroups.map(([unit, groupedSeries], index) => {
    const values = groupedSeries
      .flatMap((series) => series.data.map((point) => point.value))
      .filter(isFiniteNumber);
    const baseMin = values.length > 0 ? Math.min(...values) : 0;
    const baseMax = values.length > 0 ? Math.max(...values) : 100;
    const normalized = normalizeBandRange(baseMin, baseMax);
    const distinctCount = Math.max(new Set(values.map((value) => Number(value.toPrecision(6)))).size, 1);
    const band: YBandInfo = {
      unit,
      colors: groupedSeries.map((series) => series.color),
      realMin: normalized.realMin,
      realMax: normalized.realMax,
      virtualBase: analogOffset + index * BAND_SIZE,
      step: normalized.step || calculateBandStep(normalized.realMin, normalized.realMax),
      distinctCount,
    };

    groupedSeries.forEach((series) => {
      analogBandBySeries.set(series.name, band);
    });

    return band;
  });

  digitalSeries.forEach((series, index) => {
    digitalBandBySeries.set(series.name, { index, series });
  });

  const clusters: Array<{ vMin: number; vMax: number }> = [];
  if (digitalCount > 0) {
    clusters.push({
      vMin: DBS_HIGH - 0.05,
      vMax: digitalZoneHeight - DIGITAL_BAND_SIZE + DBS_LOW + 0.05,
    });
  }
  analogBands.forEach((_, index) => {
    clusters.push({
      vMin: analogOffset + index * BAND_SIZE + BAND_MARGIN,
      vMax: analogOffset + (index + 1) * BAND_SIZE - BAND_MARGIN,
    });
  });

  const virtualMin = digitalCount > 0 ? DBS_HIGH - 0.05 : 0;
  const virtualMax = analogBands.length > 0
    ? analogOffset + analogBands.length * BAND_SIZE
    : (digitalCount > 0 ? digitalZoneHeight + DBS_HIGH : 100);

  return {
    analogBands,
    analogBandBySeries,
    digitalBandBySeries,
    digitalCount,
    digitalZoneHeight,
    analogOffset,
    virtualMin,
    virtualMax,
    clusters,
    distinct: clusters.map(() => 5),
  };
};

const toVirtualAnalog = (realY: number, band: YBandInfo) => {
  const range = Math.max(band.realMax - band.realMin, 0.0001);
  const t = Math.max(0, Math.min(1, (realY - band.realMin) / range));
  return band.virtualBase + BAND_MARGIN + t * (BAND_SIZE - 2 * BAND_MARGIN);
};

const toVirtualDigital = (realY: number, digitalIndex: number, digitalCount: number) => {
  const baseY = (digitalCount - 1 - digitalIndex) * DIGITAL_BAND_SIZE;
  return realY > 0.5 ? baseY + DBS_HIGH : baseY + DBS_LOW;
};

const buildSeriesPoints = (
  series: TrendSeries,
  mapY: (value: number) => number,
  gapThresholdMs: number,
) => {
  const sorted = series.data.slice().sort((left, right) => left.timestamp - right.timestamp);
  const points: ChartPoint[] = [];
  let lastRealX: number | null = null;

  sorted.forEach((point) => {
    if (!isFiniteNumber(point.value)) {
      points.push({ x: point.timestamp, y: Number.NaN });
      return;
    }
    if (lastRealX !== null && (point.timestamp - lastRealX) > gapThresholdMs) {
      const splitX = lastRealX + Math.floor((point.timestamp - lastRealX) / 2);
      points.push({ x: splitX, y: Number.NaN });
    }
    points.push({ x: point.timestamp, y: mapY(point.value) });
    lastRealX = point.timestamp;
  });

  return points;
};

const buildPointRadius = (points: ChartPoint[]) => {
  return points.map((point, index) => {
    const currentIsGap = !Number.isFinite(point?.y);
    if (currentIsGap) return 0;

    const prevIsGap = index === 0 || !Number.isFinite(points[index - 1]?.y);
    const nextIsGap = index === points.length - 1 || !Number.isFinite(points[index + 1]?.y);
    return prevIsGap && nextIsGap ? 4 : 0;
  });
};

const formatTimestamp = (timestamp: number, timeBase: string) => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  if (timeBase === '5m' || timeBase === '10m' || timeBase === '30m' || timeBase === '1h') {
    return `${hours}:${minutes}`;
  }
  return `${month}-${day} ${hours}:${minutes}`;
};

const formatDateISO = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeSharedYAxisWidth = (bands: YBandInfo[], digitalSeries: TrendSeries[]) => {
  let maxChars = 4;
  bands.forEach((band) => {
    [band.realMin, band.realMax].forEach((value) => {
      const rounded = Math.round(value);
      let label = rounded.toString();
      if (Math.abs(rounded) >= 1000000) label = `${(rounded / 1000000).toFixed(1)}M`;
      else if (Math.abs(rounded) >= 10000) label = `${(rounded / 1000).toFixed(0)}K`;
      else if (Math.abs(rounded) >= 1000) label = `${(rounded / 1000).toFixed(1)}K`;
      maxChars = Math.max(maxChars, label.length);
    });
  });

  let maxUnitChars = 0;
  bands.forEach((band) => {
    const unit = (band.unit || '').trim();
    if (unit && unit !== 'N/A' && unit.toLowerCase() !== 'unused' && unit.toLowerCase() !== 'dimensionless') {
      maxUnitChars = Math.max(maxUnitChars, unit.length);
    }
  });
  digitalSeries.forEach((series) => {
    const [offState, onState] = getDigitalStatesForYAxis(series.unit);
    maxUnitChars = Math.max(maxUnitChars, offState.length, onState.length);
  });

  const numericWidth = Math.min(116, Math.max(76, 54 + (maxChars - 4) * 6));
  const unitLaneWidth = maxUnitChars > 0 ? Math.min(96, Math.max(52, 28 + maxUnitChars * 5)) : 0;
  return Math.min(252, numericWidth + unitLaneWidth + 42);
};

const formatAxisValue = (value: number, layout: YBandLayout, digitalSeries: TrendSeries[]) => {
  if (!Number.isFinite(value)) return '';

  if (layout.digitalCount > 0 && value < layout.analogOffset - DIGITAL_GAP / 2) {
    const displayIndex = Math.floor(value / DIGITAL_BAND_SIZE);
    const listIndex = layout.digitalCount - 1 - displayIndex;
    const series = digitalSeries[listIndex];
    if (!series) return '';
    const states = getDigitalStatesForYAxis(series.unit);
    const withinSeries = value - displayIndex * DIGITAL_BAND_SIZE;
    if (Math.abs(withinSeries - DBS_HIGH) < 0.05) return states[1] || '';
    if (Math.abs(withinSeries - DBS_LOW) < 0.05) return states[0] || '';
    return '';
  }

  const bandIndex = Math.max(0, Math.min(layout.analogBands.length - 1, Math.floor((value - layout.analogOffset) / BAND_SIZE)));
  const band = layout.analogBands[bandIndex];
  if (!band) return '';

  const range = Math.max(band.realMax - band.realMin, 0.0001);
  const realValue = band.realMin + ((value - band.virtualBase - BAND_MARGIN) / (BAND_SIZE - 2 * BAND_MARGIN)) * range;
  const snapped = Math.round(realValue / band.step) * band.step;
  const decimals = band.step < 1 ? Math.max(1, Math.ceil(-Math.log10(band.step))) : 0;
  if (Math.abs(snapped) >= 1000000) return `${(snapped / 1000000).toFixed(1)}M`;
  if (Math.abs(snapped) >= 10000) return `${(snapped / 1000).toFixed(0)}K`;
  if (Math.abs(snapped) >= 1000) return `${(snapped / 1000).toFixed(1)}K`;
  return decimals > 0 ? snapped.toFixed(decimals) : Math.round(snapped).toString();
};

const axisTickColor = (value: number, layout: YBandLayout, digitalSeries: TrendSeries[]) => {
  if (layout.digitalCount > 0 && value < layout.analogOffset - DIGITAL_GAP / 2) {
    const displayIndex = Math.floor(value / DIGITAL_BAND_SIZE);
    const listIndex = layout.digitalCount - 1 - displayIndex;
    return digitalSeries[listIndex]?.color || '#595959';
  }
  const bandIndex = Math.max(0, Math.min(layout.analogBands.length - 1, Math.floor((value - layout.analogOffset) / BAND_SIZE)));
  return layout.analogBands[bandIndex]?.colors?.[0] || '#595959';
};

const buildCustomYTicks = (scale: any, layout: YBandLayout) => {
  const clusters = scale.options._pwClusters as Array<{ vMin: number; vMax: number }> | null;
  if (!clusters || clusters.length === 0) return;

  const kept: Array<{ value: number }> = [];
  clusters.forEach((cluster, clusterIndex) => {
    if (clusterIndex === 0 && layout.digitalCount > 0) {
      for (let index = 0; index < layout.digitalCount; index++) {
        const baseY = (layout.digitalCount - 1 - index) * DIGITAL_BAND_SIZE;
        kept.push({ value: baseY + DBS_HIGH });
        kept.push({ value: baseY + DBS_LOW });
      }
      return;
    }

    const analogBandIndex = clusterIndex - (layout.digitalCount > 0 ? 1 : 0);
    const band = layout.analogBands[analogBandIndex];
    if (!band) return;

    const firstTick = Math.ceil(band.realMin / band.step) * band.step;
    const lastTick = Math.floor(band.realMax / band.step) * band.step;
    const realRange = Math.max(band.realMax - band.realMin, 0.0001);
    const usableVirtual = BAND_SIZE - 2 * BAND_MARGIN;

    for (let realValue = firstTick; realValue <= lastTick + band.step * 0.001; realValue += band.step) {
      const niceValue = Math.round(realValue / band.step) * band.step;
      const t = (niceValue - band.realMin) / realRange;
      kept.push({ value: band.virtualBase + BAND_MARGIN + t * usableVirtual });
    }

    if (firstTick > lastTick + band.step * 0.001) {
      const mid = (band.realMin + band.realMax) / 2;
      const roundedMid = Math.round(mid / band.step) * band.step;
      const t = (roundedMid - band.realMin) / realRange;
      kept.push({ value: band.virtualBase + BAND_MARGIN + t * usableVirtual });
    }
  });

  scale.ticks = kept;
};

export const TrendChart: React.FC<TrendChartProps> = ({
  series,
  timeBase,
  showGrid = true,
  chartType = 'analog',
  timeOffset = 0,
  onTimeRangeChange,
  onChartReady,
}) => {
  const styles = useStyles();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartInstanceLike | null>(null);

  const analogSeries = useMemo(() => series.filter((item) => item.digitalAnalog === 'Analog' && item.visible !== false), [series]);
  const digitalSeries = useMemo(() => series.filter((item) => item.digitalAnalog === 'Digital' && item.visible !== false), [series]);
  const isDigitalOscilloscope = chartType === 'digital' && series.length === 1 && series[0]?.digitalAnalog === 'Digital';

  useEffect(() => {
    if (!canvasRef.current) return;

    const timeConfig = TIME_CONFIGS[timeBase];
    const now = Date.now() + timeOffset * 60 * 1000;
    const startTime = now - timeConfig.totalMinutes * 60 * 1000;
    const layout = buildYAxisLayout(analogSeries, digitalSeries);
    const gapThresholdMs = 2 * 60 * 1000;

    const datasets: ChartDataset<'line', ChartPoint[]>[] = [];
    analogSeries.forEach((seriesItem, index) => {
      const band = layout.analogBandBySeries.get(seriesItem.name);
      if (!band) return;
      const points = buildSeriesPoints(seriesItem, (value) => toVirtualAnalog(value, band), gapThresholdMs);
      datasets.push({
        label: seriesItem.name,
        data: points,
        borderColor: seriesItem.color || CHART_COLORS[index % CHART_COLORS.length],
        backgroundColor: `${seriesItem.color || CHART_COLORS[index % CHART_COLORS.length]}20`,
        borderWidth: 2,
        fill: false,
        spanGaps: false,
        tension: 0,
        pointRadius: buildPointRadius(points),
        pointHoverRadius: 6,
        pointBackgroundColor: seriesItem.color || CHART_COLORS[index % CHART_COLORS.length],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointStyle: 'circle',
        parsing: false,
      });
    });

    digitalSeries.forEach((seriesItem, index) => {
      const binding = layout.digitalBandBySeries.get(seriesItem.name);
      if (!binding) return;
      const points = buildSeriesPoints(seriesItem, (value) => toVirtualDigital(value, binding.index, layout.digitalCount), gapThresholdMs);
      datasets.push({
        label: seriesItem.name,
        data: points,
        borderColor: seriesItem.color || CHART_COLORS[(analogSeries.length + index) % CHART_COLORS.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        fill: false,
        stepped: 'before',
        spanGaps: false,
        tension: 0,
        pointRadius: buildPointRadius(points),
        pointHoverRadius: 6,
        pointBackgroundColor: seriesItem.color || CHART_COLORS[(analogSeries.length + index) % CHART_COLORS.length],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointStyle: 'circle',
        parsing: false,
      });
    });

    const config: ChartConfiguration<'line', ChartPoint[], unknown> = {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        normalized: true,
        layout: {
          padding: {
            left: 28,
            bottom: 20,
          },
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#ffffff',
            borderColor: '#d9d9d9',
            borderWidth: 1,
            titleColor: '#000000',
            bodyColor: '#595959',
            titleFont: { family: 'Inter, Helvetica, Arial, sans-serif', size: 11, weight: '600' },
            bodyFont: { family: 'Inter, Helvetica, Arial, sans-serif', size: 11 },
            padding: 8,
            callbacks: {
              title: (items: TooltipItem<'line'>[]) => {
                const first = items[0];
                if (!first?.parsed?.x) return '';
                return formatTimestamp(Number(first.parsed.x), timeBase);
              },
              label: (context: TooltipItem<'line'>) => {
                const seriesInfo = series.find((item) => item.name === context.dataset.label);
                const virtualY = Number(context.parsed.y);
                if (!seriesInfo || !Number.isFinite(virtualY)) return '';

                if (seriesInfo.digitalAnalog === 'Digital') {
                  const states = getDigitalStatesForYAxis(seriesInfo.unit);
                  const label = virtualY % DIGITAL_BAND_SIZE < (DBS_HIGH + DBS_LOW) / 2 ? states[1] : states[0];
                  return `${seriesInfo.name}: ${label}`;
                }

                const band = layout.analogBandBySeries.get(seriesInfo.name);
                if (!band) return `${seriesInfo.name}: ${virtualY.toFixed(2)}`;
                const realRange = Math.max(band.realMax - band.realMin, 0.0001);
                const realValue = band.realMin + ((virtualY - band.virtualBase - BAND_MARGIN) / (BAND_SIZE - 2 * BAND_MARGIN)) * realRange;
                const snapped = Math.round(realValue / band.step) * band.step;
                const decimals = band.step < 1 ? Math.max(1, Math.ceil(-Math.log10(band.step))) : 0;
                const display = decimals > 0 ? snapped.toFixed(decimals) : Math.round(snapped).toString();
                const unit = band.unit === 'N/A' ? '' : ` ${band.unit}`;
                return `${seriesInfo.name}: ${display}${unit}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: 'time',
            min: startTime,
            max: now,
            offset: true,
            ticks: {
              color: '#595959',
              font: { family: 'Inter, Helvetica, Arial, sans-serif', size: 11 },
              callback: (value: any, index: number) => {
                const timestamp = Number(value);
                const timeLabel = formatTimestamp(timestamp, timeBase);
                if (index === 0) {
                  return [timeLabel, formatDateISO(timestamp)];
                }
                return timeLabel;
              },
              maxRotation: 0,
              autoSkip: false,
              padding: 8,
              maxTicksLimit: timeConfig.divisions + 1,
            },
            grid: {
              display: showGrid,
              color: '#e0e0e0',
            },
            border: {
              color: '#e0e0e0',
            },
          } as any,
          y: isDigitalOscilloscope ? {
            type: 'linear',
            min: -0.1,
            max: 1.1,
            ticks: {
              color: '#595959',
              callback: (value: any) => (Number(value) === 0 ? 'Off' : (Number(value) === 1 ? 'On' : '')),
            },
            grid: {
              display: showGrid,
              color: '#e0e0e0',
            },
          } as any : {
            type: 'piecewise' as any,
            min: layout.virtualMin,
            max: layout.virtualMax,
            _pwClusters: layout.clusters,
            _pwDistinct: layout.distinct,
            grid: {
              color: showGrid ? '#e0e0e0' : 'transparent',
              display: showGrid,
              lineWidth: 1,
              drawTicks: false,
            },
            ticks: {
              display: true,
              color: (context: any) => axisTickColor(Number(context.tick?.value ?? 0), layout, digitalSeries),
              font: { size: 9, family: 'Inter, Helvetica, Arial, sans-serif' },
              padding: 8,
              autoSkip: false,
              maxTicksLimit: 200,
              align: 'end',
              mirror: false,
              callback: (value: any) => formatAxisValue(Number(value), layout, digitalSeries),
            },
          } as any,
        },
      },
      plugins: isDigitalOscilloscope ? [] : [
        {
          id: 'yScaleHooks',
          afterDataLimits: (_chart: any, args: any) => {
            const scale = args?.scale;
            if (!scale || scale.id !== 'y') return;
            scale.min = layout.virtualMin;
            scale.max = layout.virtualMax;
            scale.options._pwClusters = layout.clusters;
            scale.options._pwDistinct = layout.distinct;
            if (scale.options.ticks) {
              scale.options.ticks.stepSize = BAND_SIZE / 10;
              scale.options.ticks.maxTicksLimit = layout.analogBands.length * 10 + layout.digitalCount * 2 + 1;
            }
          },
          afterBuildTicks: (_chart: any, args: any) => {
            const scale = args?.scale;
            if (!scale || scale.id !== 'y') return;
            buildCustomYTicks(scale, layout);
          },
          afterLayout: (chart: any) => {
            const yScale = chart?.scales?.y;
            if (!yScale) return;
            yScale.width = computeSharedYAxisWidth(layout.analogBands, digitalSeries);
          },
        },
        {
          id: 'yAxisTitleBackground',
          beforeDraw: (chart: any) => {
            const ctx = chart.ctx;
            const yScale = chart?.scales?.y;
            if (!ctx || !yScale || layout.analogBands.length === 0) return;

            const PILL_H = 15;
            const PAD_X = 4;
            const BAR_W = 5;
            const BAR_GAP = 2;
            const BAR_PAD_L = 3;
            const RADIUS = 3;
            const axisX = yScale.left + PILL_H / 2 - 14;
            const analogOffset = layout.analogOffset;

            ctx.save();
            ctx.font = 'bold 9px Inter, sans-serif';

            layout.analogBands.forEach((band, index) => {
              const unit = (band.unit || '').trim();
              const lowerUnit = unit.toLowerCase();
              if (!unit || unit === 'N/A' || lowerUnit === 'unused' || lowerUnit === 'dimensionless') {
                return;
              }

              const topPx = yScale.getPixelForValue(analogOffset + (index + 1) * BAND_SIZE);
              const bottomPx = yScale.getPixelForValue(analogOffset + index * BAND_SIZE);
              const centerY = (topPx + bottomPx) / 2;
              const textWidth = ctx.measureText(unit).width;
              const barsWidth = Math.max(0, band.colors.length * (BAR_W + BAR_GAP) - BAR_GAP);
              const pillWidth = PAD_X + textWidth + BAR_PAD_L + barsWidth + PAD_X;

              ctx.save();
              ctx.translate(axisX, centerY);
              ctx.rotate(-Math.PI / 2);

              const px = -pillWidth / 2;
              const py = -PILL_H / 2;
              ctx.fillStyle = '#f0f0f0';
              ctx.beginPath();
              if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(px, py, pillWidth, PILL_H, RADIUS);
              } else {
                ctx.rect(px, py, pillWidth, PILL_H);
              }
              ctx.fill();
              ctx.strokeStyle = 'rgba(0,0,0,0.12)';
              ctx.lineWidth = 0.5;
              ctx.stroke();

              ctx.save();
              ctx.beginPath();
              if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(px, py, pillWidth, PILL_H, RADIUS);
              } else {
                ctx.rect(px, py, pillWidth, PILL_H);
              }
              ctx.clip();

              ctx.textBaseline = 'middle';
              ctx.textAlign = 'left';
              ctx.fillStyle = band.colors[0] || '#444444';
              ctx.fillText(unit, px + PAD_X, 0);

              band.colors.forEach((color, colorIndex) => {
                ctx.fillStyle = color;
                ctx.fillRect(px + PAD_X + textWidth + BAR_PAD_L + colorIndex * (BAR_W + BAR_GAP), py + 2, BAR_W, PILL_H - 4);
              });

              ctx.restore();
              ctx.restore();
            });

            ctx.restore();
          },
        },
        {
          id: 'digitalRowBands',
          beforeDatasetsDraw: (chart: any) => {
            const ctx = chart.ctx;
            const yScale = chart.scales.y;
            const area = chart.chartArea;
            if (!ctx || !yScale || !area || layout.digitalCount === 0) return;
            ctx.save();
            for (let index = 0; index < layout.digitalCount; index++) {
              const baseY = (layout.digitalCount - 1 - index) * DIGITAL_BAND_SIZE;
              const top = yScale.getPixelForValue(baseY + DBS_LOW);
              const bottom = yScale.getPixelForValue(baseY + DBS_HIGH);
              const height = bottom - top;
              if (height <= 0) continue;
              ctx.fillStyle = 'rgba(0,0,0,0.13)';
              ctx.fillRect(area.left, top, area.right - area.left, height);
            }
            ctx.restore();
          },
        },
        {
          id: 'dividerBridge',
          afterDatasetsDraw: (chart: any) => {
            const ctx = chart.ctx;
            const yScale = chart.scales.y;
            const area = chart.chartArea;
            if (!ctx || !yScale || !area || layout.analogBands.length === 0) return;
            ctx.save();
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            for (let index = 0; index <= layout.analogBands.length; index++) {
              const py = yScale.getPixelForValue(layout.analogOffset + index * BAND_SIZE);
              ctx.beginPath();
              ctx.moveTo(area.left, py);
              ctx.lineTo(area.right, py);
              ctx.stroke();
            }
            ctx.restore();
          },
        },
      ],
    };

    const previousChart = chartInstanceRef.current;
    if (previousChart) {
      previousChart.destroy();
      chartInstanceRef.current = null;
    }

    const chart = new Chart(canvasRef.current, config) as ChartInstanceLike;
    chartInstanceRef.current = chart;
    onChartReady?.(chart);

    if (onTimeRangeChange) {
      onTimeRangeChange(startTime, now);
    }

    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.destroy();
      if (chartInstanceRef.current === chart) {
        chartInstanceRef.current = null;
      }
    };
  }, [analogSeries, digitalSeries, series, timeBase, timeOffset, showGrid, chartType, onChartReady, onTimeRangeChange, isDigitalOscilloscope]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, []);

  return (
    <div className={`${styles.chartContainer} ${isDigitalOscilloscope ? styles.chartContainerOscilloscope : styles.chartContainerMain}`}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
};
