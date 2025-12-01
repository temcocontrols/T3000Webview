# Trend Chart - React Migration

## Overview

This is the React migration of the TrendLogChart Vue component. It provides advanced trend visualization with real-time updates and historical data support.

## Architecture

### Communication Flow

```
┌─────────────────────┐
│ C++ Windows App     │──── "Graphic Beta" button ────┐
│ (T3000.exe)         │                                │
└─────────────────────┘                                │
                                                       │
┌─────────────────────┐                                │
│ React TrendLogsPage │──── Click row ────────────────┤
│ (Configuration)     │                                │
└─────────────────────┘                                │
                                                       ▼
                                          ┌────────────────────────┐
                                          │  TrendChartPage.tsx    │
                                          │  (Visualization)       │
                                          └────────────────────────┘
                                                       │
                                                       ▼
                                          ┌────────────────────────┐
                                          │   TrendChart.tsx       │
                                          │   (ECharts component)  │
                                          └────────────────────────┘
```

### File Structure

```
src/t3-react/features/trends/
├── components/
│   └── TrendChart.tsx           # ECharts wrapper component
├── pages/
│   ├── TrendChartPage.tsx       # Main page component
│   └── TrendChartPage.module.css
├── services/
│   └── trendChartApi.ts         # API service layer
└── index.ts                     # Exports
```

## Features Implemented

### ✅ All User Requirements (from TRENDLOG_UI_IMPROVEMENTS.md)

1. **Time Scale Divisions (4 or 6)**
   - 1-hour: 0, 15, 30, 45, 60 (4 divisions)
   - 4-hour: 0, 1h, 2h, 3h, 4h (4 divisions)
   - 12-hour: 0, 2h, 4h, 6h, 8h, 10h, 12h (6 divisions)
   - 1-day: 0, 4h, 8h, 12h, 16h, 20h, 24h (6 divisions)
   - 4-day: 0, 16h, 32h, 48h, 64h, 80h, 96h (6 divisions)

2. **Enhanced Auto-Ranging**
   - 3x zoom for small variations (<2 units)
   - ±10% padding for zero range
   - 10% padding for normal ranges

3. **Finer Tick Marks**
   - 10 Y-axis tick marks (was 5-6)
   - Better precision with 2 decimal places

4. **Continuous Monitoring**
   - Automatic gap detection on page visibility change
   - Backfill missing data from database
   - No gaps when navigating away

5. **Color Optimization**
   - Cyan moved to position 20 (rarely used)
   - 25 total colors (expanded from 14)

## Usage

### Opening from C++ Application

The C++ application should open a URL like:
```
http://localhost:5173/trends/chart?serial_number=237451&panel_id=3&trendlog_id=0&monitor_id=0
```

Query parameters:
- `serial_number`: Device serial number
- `panel_id`: Panel ID (usually 1-4)
- `trendlog_id`: Trendlog configuration ID
- `monitor_id`: Monitor configuration ID

### Opening from React TrendLogsPage

Click the "View Chart" button in any trendlog row. The page will automatically navigate with correct parameters.

### Component Usage

```tsx
import { TrendChart, TrendSeries } from '@/features/trends';

const series: TrendSeries[] = [
  {
    name: 'IN1',
    pointId: 'IN1',
    pointType: 'INPUT',
    pointIndex: 1,  // 1-based index
    data: [
      { timestamp: 1234567890000, value: 22.5 },
      { timestamp: 1234567895000, value: 22.7 },
    ],
    color: '#FF0000',
    unit: '°C',
    digitalAnalog: 'Analog',
    visible: true,
  },
];

<TrendChart
  series={series}
  timeBase="1h"
  showGrid={true}
  onTimeRangeChange={(start, end) => console.log('Time range:', start, end)}
/>
```

## API Integration

### Endpoints Used

1. **GET `/trendlog/history`** - Fetch historical data
   - Request body: `TrendDataRequest`
   - Response: `TrendDataResponse`

2. **POST `/trendlog/realtime`** - Fetch real-time data
   - Request body: `{ serial_number, panel_id, points[] }`
   - Response: `TrendDataPoint[]`

3. **POST `/trendlog/store`** - Store real-time data
   - Request body: `{ data: TrendDataPoint[] }`

### Important: Point Index Conversion

⚠️ **Critical**: The database uses **1-based** indexing:
- IN1 → `point_index: 1`
- IN2 → `point_index: 2`
- OUT1 → `point_index: 1`

The frontend must send 1-based indexes in API requests.

## Technical Details

### Chart Library

Uses **ECharts** (already integrated in the project) instead of Chart.js:
- Better performance with large datasets
- Built-in pan/zoom functionality
- Easier multi-grid support (analog + digital)
- Better touch/mobile support

### State Management

- Local component state (React hooks)
- Uses `useDeviceTreeStore` from existing device store
- Real-time updates via `setInterval` (5 seconds)
- Automatic cleanup on unmount

### Performance Optimizations

1. **Data Windowing**: Only keeps data within current time range
2. **Debounced Updates**: 5-second intervals for real-time data
3. **Memoized Calculations**: `useCallback` for expensive operations
4. **Visibility API**: Pauses updates when page not visible

## Migration from Vue

### What Changed

| Vue Pattern | React Pattern |
|------------|---------------|
| `<template>` | JSX in return statement |
| `ref()` | `useState()` |
| `computed()` | `useMemo()` |
| `watch()` | `useEffect()` |
| `onMounted()` | `useEffect(() => {}, [])` |
| `onUnmounted()` | `useEffect(() => () => {}, [])` |
| Chart.js | ECharts |
| Ant Design Vue | Fluent UI 9 |

### Key Differences

1. **No Composition API** - Uses React hooks instead
2. **ECharts instead of Chart.js** - Better performance and features
3. **Fluent UI 9** - Modern Microsoft design system
4. **TypeScript** - Strong typing throughout
5. **CSS Modules** - Scoped styles

## Testing

### Manual Testing Checklist

- [ ] Open from C++ "Graphic Beta" button
- [ ] Open from React TrendLogsPage "View Chart" button
- [ ] Verify all time ranges show correct divisions
- [ ] Test real-time updates (5-second interval)
- [ ] Navigate away and back (test gap filling)
- [ ] Toggle series visibility
- [ ] Export to CSV
- [ ] Pan/zoom functionality
- [ ] Test with 20+ series (verify cyan color at position 20)

### Test Devices

- Device 237451 (Panel 3) - Has historical data
- Device 237219 (Panel 1) - Production device

## Known Limitations

1. **Monitor Configuration**: Currently uses sample data - needs to fetch from monitor config API
2. **Real-time Connection**: Uses polling instead of WebSocket
3. **Persistence**: Series visibility not saved to localStorage yet

## Future Enhancements

1. WebSocket connection for true real-time updates
2. Save user preferences (series order, colors, visibility)
3. Multiple chart windows (compare different devices)
4. Advanced export options (PDF, PNG)
5. Statistical analysis tools

## Related Files

- Vue component: `src/t3-vue/components/NewUI/TrendLogChart.vue` (12,696 lines)
- Requirements doc: `docs/project/TRENDLOG_UI_IMPROVEMENTS.md`
- Backend service: `api/src/t3_device/trendlog_monitor_service.rs`

## Maintenance Notes

- Color array must keep cyan at position 20 (user requirement)
- Time divisions must be 4 or 6 (not 5)
- Y-axis must have 10 tick marks
- Point indexes must be 1-based for API calls
- Auto-range expansion must be 3x for small ranges
