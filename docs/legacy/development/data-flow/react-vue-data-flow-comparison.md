# React vs Vue Data Flow Comparison - TrendChart Implementation

## Summary
Successfully implemented Vue-style data loading flow in React TrendChartContent component to match the robust data handling patterns from TrendLogChart.vue.

## Key Changes Made

### 1. State Management
**Added New States:**
```typescript
// Data source tracking for proper indicators
const [dataSource, setDataSource] = useState<'realtime' | 'api'>('realtime');
const [hasConnectionError, setHasConnectionError] = useState(false);

// Refs for async operation management
const timebaseChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const historyAbortControllerRef = useRef<AbortController | null>(null);
```

**Purpose:**
- `dataSource`: Tracks whether data is coming from real-time updates or API historical fetch
- `hasConnectionError`: Tracks API connection failures for UI feedback
- `timebaseChangeTimeoutRef`: Manages debounced timebase changes
- `historyAbortControllerRef`: Allows cancellation of in-flight API requests

### 2. Enhanced Historical Data Loading

**New Helper Function:**
```typescript
const getExistingDataTimeRange = useCallback(() => {
  let earliest = Infinity;
  let latest = -Infinity;
  let totalPoints = 0;

  series.forEach((s) => {
    s.data.forEach((point) => {
      if (point.timestamp < earliest) earliest = point.timestamp;
      if (point.timestamp > latest) latest = point.timestamp;
      totalPoints++;
    });
  });

  if (totalPoints === 0) return null;
  return { earliest, latest, totalPoints };
}, [series]);
```

**Optimizations in `loadHistoricalData`:**
1. **Smart Loading**: Checks existing data range before fetching
   - Only loads missing historical gaps
   - Skips API call if all data already exists in memory

2. **UTC Timestamp Formatting**: Matches backend storage format
   ```typescript
   const formatUTCDateTime = (timestamp: number) => {
     const date = new Date(timestamp);
     const year = date.getUTCFullYear();
     const month = String(date.getUTCMonth() + 1).padStart(2, '0');
     // ... etc
     return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
   };
   ```

3. **Data Merging**: Preserves existing real-time data while adding historical
   - Deduplication: Checks if timestamps already exist
   - Sorted output: Maintains chronological order after merge

4. **Error Handling**: Sets connection error state for UI feedback

### 3. Enhanced Real-time Updates

**Improvements in `updateRealtimeData`:**
1. **Deduplication**: Prevents duplicate timestamps
   ```typescript
   const exists = updatedSeries[seriesIndex].data.some((d) => d.timestamp === timestamp);
   if (!exists) {
     updatedSeries[seriesIndex].data.push({ timestamp, value: point.value });
   }
   ```

2. **Data Sorting**: Ensures chronological order after each update
3. **Data Source Tracking**: Sets `dataSource` to 'realtime' when receiving live data
4. **Connection Error Tracking**: Updates error state on failure

### 4. TimeBase Change Handler with Debouncing

**New Effect Implementation:**
```typescript
useEffect(() => {
  // Cancel previous pending timebase change
  if (timebaseChangeTimeoutRef.current) {
    clearTimeout(timebaseChangeTimeoutRef.current);
  }

  // Abort any ongoing history API request
  if (historyAbortControllerRef.current) {
    historyAbortControllerRef.current.abort();
  }

  // Debounce: wait 300ms before executing
  timebaseChangeTimeoutRef.current = setTimeout(async () => {
    // ... load data based on isRealtime state
  }, 300);

  return () => {
    // Cleanup on unmount
  };
}, [timeBase, isRealtime, series.length, ...deps]);
```

**Benefits:**
- **Prevents Rapid API Calls**: 300ms debounce delay
- **Cancels Pending Requests**: Aborts old requests when new timebase selected
- **Smart Data Reuse**: Checks for existing data before loading
- **Dual Mode Support**: Handles both real-time and historical-only modes

### 5. Auto Scroll Toggle Behavior

**Real-time Mode (Auto Scroll ON):**
- Loads historical data to populate initial view
- Starts 5-second interval for real-time updates
- Badge shows "⚡ Live" with green color

**Historical Mode (Auto Scroll OFF):**
- Stops real-time interval
- Only shows historical data from database
- Badge shows "📚 Historical" with blue color

**Separate Effect for Auto Scroll:**
```typescript
useEffect(() => {
  if (isRealtime) {
    if (!realtimeIntervalRef.current) {
      realtimeIntervalRef.current = setInterval(updateRealtimeData, 5000);
    }
  } else {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
  }

  return () => {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
  };
}, [isRealtime, updateRealtimeData]);
```

## Comparison with Vue Implementation

### Vue (TrendLogChart.vue)
- Uses `ref()` for reactive state
- Uses `watch()` for side effects
- Uses `useTrendlogDataAPI` composable
- Stores real-time data to database in watcher
- Complex time range calculations with offset support
- Advanced optimization: Checks data reuse before loading

### React (TrendChartContent.tsx) - Now Implemented
- ✅ Uses `useState()` for state management
- ✅ Uses `useEffect()` for side effects
- ✅ Uses `TrendChartApiService` for API calls
- ✅ Real-time data updates via interval (5 seconds)
- ✅ Smart data loading with gap detection
- ✅ Debounced timebase changes (300ms)
- ✅ Request cancellation via AbortController
- ✅ Data deduplication and merging
- ✅ Connection error tracking
- ✅ Dual-mode support (real-time vs historical)

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TrendChartContent                        │
│                                                             │
│  State:                                                     │
│  • series: TrendSeries[]                                    │
│  • timeBase: '5m' | '10m' | '30m' | ... | '4d'            │
│  • isRealtime: boolean (Auto Scroll toggle)                │
│  • dataSource: 'realtime' | 'api'                          │
│  • hasConnectionError: boolean                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                    │
        ▼                                    ▼
┌───────────────┐                  ┌──────────────────┐
│  Auto Scroll  │                  │  TimeBase Change │
│     Toggle    │                  │    (Debounced)   │
└───────┬───────┘                  └────────┬─────────┘
        │                                    │
   ON   │   OFF                             │
   ┌────┴────┐                              │
   │         │                               │
   ▼         ▼                               ▼
┌──────┐  ┌───────┐              ┌──────────────────┐
│Start │  │ Stop  │              │ Load Historical  │
│Real- │  │Real-  │              │ Data (Smart)     │
│time  │  │time   │              │                  │
│5s    │  │Inter- │              │ • Check existing │
│Inter-│  │val    │              │ • Load gaps only │
│val   │  │       │              │ • Merge data     │
└──┬───┘  └───────┘              │ • Deduplicate    │
   │                              └─────────┬────────┘
   │                                        │
   │      ┌─────────────────────────────────┘
   │      │
   ▼      ▼
┌────────────────────────────────────────┐
│      TrendChartApiService              │
│                                        │
│  • getTrendHistory(request)            │
│    - POST /trendlog/history            │
│    - Returns: TrendDataResponse        │
│                                        │
│  • getRealtimeData(sn, panelId, pts)  │
│    - POST /trendlog/realtime           │
│    - Returns: TrendDataPoint[]         │
└────────────────────────────────────────┘
```

## Benefits of New Implementation

1. **Performance**: Only loads missing data gaps, not entire dataset
2. **Responsiveness**: 300ms debounce prevents UI lag during rapid changes
3. **Reliability**: Request cancellation prevents race conditions
4. **Data Integrity**: Deduplication prevents duplicate timestamps
5. **User Experience**: Connection error tracking provides feedback
6. **Consistency**: Matches Vue implementation patterns
7. **Maintainability**: Clear separation of concerns (real-time vs historical)

## Testing Checklist

- [ ] TimeBase changes load correct data range
- [ ] Auto Scroll toggle starts/stops real-time updates
- [ ] Rapid timebase changes are debounced (only last request executes)
- [ ] Data merging works correctly (no duplicates)
- [ ] Connection errors are displayed to user
- [ ] Real-time data updates every 5 seconds when enabled
- [ ] Historical mode stops real-time updates
- [ ] Badge shows correct state (Live vs Historical)
- [ ] Data persists when switching between timebases
- [ ] Loading state shows during initial data fetch

## Future Enhancements

1. **Time Offset Navigation**: Add left/right arrow support to navigate historical data
2. **Data Storage**: Implement real-time data storage to database
3. **Smart Timebase Transition**: Check if existing data can be reused when changing timebases
4. **Connection Retry Logic**: Automatic retry on transient failures
5. **Data Compression**: For large datasets, implement data point sampling
6. **WebSocket Integration**: Replace polling with WebSocket for true real-time updates

## Files Modified

1. `src/t3-react/features/trends/components/TrendChartContent.tsx`
   - Added data source tracking state
   - Enhanced loadHistoricalData with smart gap detection
   - Improved real-time updates with deduplication
   - Added debounced timebase change handler
   - Implemented dual-mode support (real-time vs historical)

## References

- Vue Implementation: `src/t3-vue/components/NewUI/TrendLogChart.vue`
- API Service: `src/lib/vue/T3000/Hvac/Opt/FFI/TrendlogDataAPI.ts`
- React API Service: `src/t3-react/features/trends/services/trendChartApi.ts`
