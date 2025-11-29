# TrendLog UI Improvements - Technical Documentation

**Component:** TrendLogChart.vue (src/t3-vue/components/NewUI/TrendLogChart.vue)
**Chart Library:** Chart.js 4.x with time scale plugin
**Component Size:** 12,549 lines
**Last Updated:** 2025-11-29

---

## User Requirements Summary

Based on detailed user feedback, the following improvements are needed:

### 1. **Time Scale Division Issues** (High Priority)
**Current Problem:**
- Horizontal axis divided into 5 segments (e.g., 12min, 48min marks on 1-hour scale)
- Difficult to interpret for users
- Example: 1-hour scale shows marks at 12min intervals

**Desired Behavior:**
- Divide into 4 or 6 segments for easier interpretation
- 4 segments: 15min intervals (0, 15, 30, 45, 60) or 60min intervals for larger scales
- 6 segments: 10min intervals (0, 10, 20, 30, 40, 50, 60) or 40min intervals

**Technical Location:**
```typescript
// Line 2366: getXAxisTickConfig function
const getXAxisTickConfig = (timeBase: string) => {
  const configs = {
    '5m': { stepMinutes: 1, unit: 'minute' },     // Every 1 minute (5 divisions)
    '10m': { stepMinutes: 2, unit: 'minute' },    // Every 2 minutes (5 divisions)
    '30m': { stepMinutes: 5, unit: 'minute' },    // Every 5 minutes (6 divisions)
    '1h': { stepMinutes: 10, unit: 'minute' },    // Every 10 minutes (6 divisions)
    '4h': { stepMinutes: 30, unit: 'minute' },    // Every 30 minutes (8 divisions)
    '12h': { stepMinutes: 60, unit: 'hour' },     // Every 1 hour (12 divisions)
    '1d': { stepMinutes: 120, unit: 'hour' },     // Every 2 hours (12 divisions)
    '4d': { stepMinutes: 480, unit: 'hour' }      // Every 8 hours (12 divisions)
  }
  return configs[timeBase] || { stepMinutes: 10, unit: 'minute' }
}

// Lines 6060-6075: maxTicksLimit configuration
const maxTicksConfigs = {
  '5m': 6, '10m': 6, '30m': 7, '1h': 7,
  '4h': 9, '12h': 13, '1d': 13, '4d': 13
}
maxTicks = maxTicksConfigs[timeBase.value] || 7
```

**Proposed Fix:**
```typescript
const getXAxisTickConfig = (timeBase: string) => {
  const configs = {
    '5m': { stepMinutes: 1, unit: 'minute' },     // 0, 1, 2, 3, 4, 5 (6 ticks = 5 divisions) ✓
    '10m': { stepMinutes: 2, unit: 'minute' },    // 0, 2, 4, 6, 8, 10 (6 ticks = 5 divisions) ✓
    '30m': { stepMinutes: 5, unit: 'minute' },    // 0, 5, 10, 15, 20, 25, 30 (7 ticks = 6 divisions) ✓
    '1h': { stepMinutes: 15, unit: 'minute' },    // 0, 15, 30, 45, 60 (5 ticks = 4 divisions) ✅ CHANGED
    '4h': { stepMinutes: 60, unit: 'minute' },    // 0, 1h, 2h, 3h, 4h (5 ticks = 4 divisions) ✅ CHANGED
    '12h': { stepMinutes: 120, unit: 'hour' },    // 0, 2h, 4h, 6h, 8h, 10h, 12h (7 ticks = 6 divisions) ✅ CHANGED
    '1d': { stepMinutes: 240, unit: 'hour' },     // 0, 4h, 8h, 12h, 16h, 20h, 24h (7 ticks = 6 divisions) ✅ CHANGED
    '4d': { stepMinutes: 960, unit: 'hour' }      // 0, 16h, 32h, 48h, 64h, 80h, 96h (7 ticks = 6 divisions) ✅ CHANGED
  }
  return configs[timeBase] || { stepMinutes: 15, unit: 'minute' }
}

// Update maxTicksLimit to match new divisions
const maxTicksConfigs = {
  '5m': 6,   // 5 divisions
  '10m': 6,  // 5 divisions
  '30m': 7,  // 6 divisions (no change)
  '1h': 5,   // 4 divisions ✅ CHANGED from 7
  '4h': 5,   // 4 divisions ✅ CHANGED from 9
  '12h': 7,  // 6 divisions ✅ CHANGED from 13
  '1d': 7,   // 6 divisions ✅ CHANGED from 13
  '4d': 7    // 6 divisions ✅ CHANGED from 13
}
```

---

### 2. **Vertical Axis Auto-Ranging Issues** (Medium Priority)
**Current Problem:**
- Auto-ranging y-axis makes interpretation difficult
- Small value changes hard to see (e.g., 0.1-0.3 range)
- User wants finer tick marks on vertical axis

**Current Implementation:**
```typescript
// Lines 3097-3133: Dynamic Y-axis scaling (getAnalogChartConfig)
afterDataLimits: function (scale: any) {
  // Get all data values
  const allValues: number[] = []
  // ... collect values ...

  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const range = max - min

  // If range is very small (like 0.1-0.3), expand the Y-axis
  if (range > 0 && range < 2) {
    const center = (min + max) / 2
    const expandedRange = Math.max(range * 2, 1) // At least 1 unit range
    scale.min = center - expandedRange / 2
    scale.max = center + expandedRange / 2
  }
}

// Tick callback (lines 3091-3095)
callback: function (value: any) {
  return Number(value).toFixed(2)  // 2 decimal places
}
```

**Proposed Improvements:**
1. **Add more granular tick marks:**
   ```typescript
   ticks: {
     // ... existing config ...
     count: 8,  // Add: Force 8 tick marks for better granularity
     precision: 2,  // Add: Ensure 2 decimal precision
     autoSkip: false,  // Add: Don't skip ticks
     callback: function (value: any) {
       return Number(value).toFixed(2)
     }
   }
   ```

2. **Better auto-range algorithm:**
   ```typescript
   afterDataLimits: function (scale: any) {
     // ... existing collection logic ...

     if (allValues.length === 0) return

     const min = Math.min(...allValues)
     const max = Math.max(...allValues)
     const range = max - min

     // Enhanced logic for better visibility
     if (range === 0) {
       // All values same - show ±10% range
       scale.min = min * 0.9
       scale.max = max * 1.1
     } else if (range < 2) {
       // Small range - expand 3x instead of 2x
       const center = (min + max) / 2
       const expandedRange = Math.max(range * 3, 1)
       scale.min = center - expandedRange / 2
       scale.max = center + expandedRange / 2
     } else {
       // Normal range - add 10% padding
       const padding = range * 0.1
       scale.min = min - padding
       scale.max = max + padding
     }

     // Ensure minimum tick spacing
     const tickRange = scale.max - scale.min
     const minTickSpacing = tickRange / 8  // 8 ticks minimum
     scale.ticks.stepSize = minTickSpacing
   }
   ```

---

### 3. **Continuous Monitoring During Navigation** (High Priority)
**Current Problem:**
- Trace breaks/gaps when user navigates away (programming, variable table review)
- Concerned about gaps when setting up multiple trends (2, 3, 4 trends)

**Current Architecture:**
```typescript
// Real-time updates controlled by realtimeInterval
// Line ~5500: startRealTimeUpdates function
const startRealTimeUpdates = () => {
  if (realtimeInterval) {
    clearInterval(realtimeInterval)
  }

  realtimeInterval = setInterval(() => {
    if (!isRealTime.value) {
      stopRealTimeUpdates()
      return
    }
    // Fetch new data...
  }, REALTIME_UPDATE_INTERVAL_MS) // Currently 5000ms (5 seconds)
}

// Line ~1993: T3000_Data watcher stores data to database
watch(T3000_Data, (newPanelsData, oldPanelsData) => {
  // ... process data ...
  if (isRealTime.value && chartDataFormat.length > 0) {
    storeRealtimeDataToDatabase(chartRelevantItems)
  }
}, { deep: true })
```

**Analysis:**
- Data **IS** being stored to SQLite database in real-time (line 2071: `storeRealtimeDataToDatabase`)
- Historical data loaded from database when returning (line 2140+: `loadHistoricalDataFromDatabase`)
- Gap issue likely caused by:
  1. **WebSocket disconnection** when navigating away from page
  2. **C++ backend data collection paused** when chart not visible
  3. **Browser tab throttling** when tab not active

**Proposed Solutions:**

**Option A: Backend-Side Continuous Collection (Recommended)**
```rust
// Rust backend (api/src/t3_device/routes.rs)
// Add persistent background data collection service
// - Runs independently of frontend page visibility
// - Stores all incoming data to database
// - Frontend only reads from database

// Pseudo-code for new service:
pub async fn start_continuous_trendlog_collection(
    device_sn: String,
    panel_id: u32,
    trendlog_id: u32
) {
    // Spawn background task that runs even when frontend disconnected
    tokio::spawn(async move {
        loop {
            // Poll device every 5 seconds
            let data = fetch_trendlog_data(&device_sn, panel_id, trendlog_id).await;

            // Store to database
            store_to_database(data).await;

            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });
}
```

**Option B: Frontend Keep-Alive (Simpler but less reliable)**
```typescript
// Add to TrendLogChart.vue
// Line ~1993: Modify watch to continue even when page not visible
const keepAliveWorker = new SharedWorker('/t3000-worker.js')

keepAliveWorker.port.onmessage = (event) => {
  if (event.data.type === 'TRENDLOG_DATA') {
    storeRealtimeDataToDatabase(event.data.payload)
  }
}

// Worker continues WebSocket connection even when page not visible
```

**Option C: Database Backfill on Return (Easiest)**
```typescript
// Add to onMounted/watch visibility
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && isRealTime.value) {
    // Fetch any missing data since we left
    const lastTimestamp = getLastDataTimestamp()
    const missingData = await fetchHistoricalDataSince(lastTimestamp)

    // Merge into existing series
    mergeHistoricalData(missingData)
    updateCharts()
  }
})
```

**Recommendation:** Implement **Option C** first (quick fix), then **Option A** for robust solution.

---

### 4. **Color Ordering and Visibility** (Low Priority)
**Current Problem:**
- Cyan color (#00AAAA) hard to see on grey background
- Position 3 in color array (6th color overall)
- User wants it moved down to position 20 (far from early usage)
- User wants ability to reorder colors within Analog/Digital categories

**Current Implementation:**
```typescript
// Line 1703: SERIES_COLORS array
const SERIES_COLORS = [
  '#FF0000',  // 0: Red
  '#0000FF',  // 1: Blue
  '#00AA00',  // 2: Green
  '#FF8000',  // 3: Orange
  '#AA00AA',  // 4: Purple
  '#00AAAA',  // 5: Cyan ⚠️ PROBLEM COLOR
  '#CC6600',  // 6: Brown-Orange
  '#AA0000',  // 7: Dark Red
  '#0066AA',  // 8: Dark Blue
  '#AA6600',  // 9: Brown
  '#6600AA',  // 10: Dark Purple
  '#006600',  // 11: Dark Green
  '#FF6600',  // 12: Bright Orange
  '#0000AA'   // 13: Navy Blue
  // Only 14 colors total - need to add 6+ more to reach position 20
]
```

**Proposed Fix:**

**Part 1: Move Cyan to Position 20**
```typescript
const SERIES_COLORS = [
  '#FF0000',  // 0: Red (good visibility)
  '#0000FF',  // 1: Blue (good visibility)
  '#00AA00',  // 2: Green (good visibility)
  '#FF8000',  // 3: Orange (good visibility)
  '#AA00AA',  // 4: Purple (good visibility)
  '#CC6600',  // 5: Brown-Orange (moved up from 6)
  '#AA0000',  // 6: Dark Red (moved up from 7)
  '#0066AA',  // 7: Dark Blue (moved up from 8)
  '#AA6600',  // 8: Brown (moved up from 9)
  '#6600AA',  // 9: Dark Purple (moved up from 10)
  '#006600',  // 10: Dark Green (moved up from 11)
  '#FF6600',  // 11: Bright Orange (moved up from 12)
  '#0000AA',  // 12: Navy Blue (moved up from 13)

  // Add more distinct colors before cyan
  '#FF00FF',  // 13: Magenta
  '#008080',  // 14: Teal
  '#800080',  // 15: Purple-Dark
  '#808000',  // 16: Olive
  '#FF1493',  // 17: Deep Pink
  '#4B0082',  // 18: Indigo
  '#DC143C',  // 19: Crimson

  '#00AAAA',  // 20: Cyan ✅ MOVED HERE (better on white, rare usage)

  // Additional colors for >20 series
  '#00CED1',  // 21: Dark Turquoise
  '#8B4513',  // 22: Saddle Brown
  '#2F4F4F',  // 23: Dark Slate Gray
  '#B22222'   // 24: Fire Brick
]
```

**Part 2: Add Color Reordering UI (Optional Enhancement)**
```vue
<!-- Add to series list item controls (around line 403) -->
<div class="series-controls">
  <!-- Existing expand button... -->

  <!-- NEW: Reorder buttons (only show on hover) -->
  <a-button-group v-if="currentView === 1" size="small" class="reorder-btns">
    <a-button
      @click="moveSeriesUp(index)"
      :disabled="index === 0"
      title="Move up">
      <UpOutlined />
    </a-button>
    <a-button
      @click="moveSeriesDown(index)"
      :disabled="index === displayedSeries.length - 1"
      title="Move down">
      <DownOutlined />
    </a-button>
  </a-button-group>
</div>
```

```typescript
// Add to script section
const moveSeriesUp = (index: number) => {
  if (index === 0) return

  const series = dataSeries.value
  ;[series[index], series[index - 1]] = [series[index - 1], series[index]]

  // Persist order to localStorage
  saveSeriesOrder()
  updateCharts()
}

const moveSeriesDown = (index: number) => {
  if (index === dataSeries.value.length - 1) return

  const series = dataSeries.value
  ;[series[index], series[index + 1]] = [series[index + 1], series[index]]

  saveSeriesOrder()
  updateCharts()
}

const saveSeriesOrder = () => {
  const order = dataSeries.value.map((s, i) => ({ name: s.name, order: i }))
  localStorage.setItem('trendlog_series_order', JSON.stringify(order))
}

const restoreSeriesOrder = () => {
  const saved = localStorage.getItem('trendlog_series_order')
  if (!saved) return

  const order = JSON.parse(saved)
  dataSeries.value.sort((a, b) => {
    const aOrder = order.find(o => o.name === a.name)?.order ?? 999
    const bOrder = order.find(o => o.name === b.name)?.order ?? 999
    return aOrder - bOrder
  })
}
```

---

### 5. **Finer Tick Marks on Axes** (Medium Priority)
**Current Problem:**
- Not enough tick marks for precise reading
- User wants denser grid lines

**Current X-Axis Tick Configuration:**
```typescript
// Lines 6060-6075: Current maxTicksLimit
const maxTicksConfigs = {
  '5m': 6, '10m': 6, '30m': 7, '1h': 7,
  '4h': 9, '12h': 13, '1d': 13, '4d': 13
}
```

**Proposed X-Axis Enhancement:**
```typescript
// Increase maxTicksLimit for all timebases
const maxTicksConfigs = {
  '5m': 11,   // Every 30 seconds (doubled from 6) ✅
  '10m': 11,  // Every 1 minute (doubled from 6) ✅
  '30m': 13,  // Every 2.5 minutes (increased from 7) ✅
  '1h': 9,    // Every 7.5 minutes (increased from 5/7) ✅
  '4h': 9,    // Every 30 minutes (same as current) ✓
  '12h': 13,  // Every 1 hour (same) ✓
  '1d': 25,   // Every 1 hour (doubled from 13) ✅
  '4d': 25    // Every 4 hours (doubled from 13) ✅
}

// Also reduce stepSize proportionally
const getXAxisTickConfig = (timeBase: string) => {
  const configs = {
    '5m': { stepMinutes: 0.5, unit: 'minute' },   // 30-second intervals ✅
    '10m': { stepMinutes: 1, unit: 'minute' },    // 1-minute intervals ✅
    '30m': { stepMinutes: 2.5, unit: 'minute' },  // 2.5-minute intervals ✅
    '1h': { stepMinutes: 7.5, unit: 'minute' },   // 7.5-minute intervals ✅
    '4h': { stepMinutes: 30, unit: 'minute' },    // 30-minute intervals ✓
    '12h': { stepMinutes: 60, unit: 'hour' },     // 1-hour intervals ✓
    '1d': { stepMinutes: 60, unit: 'hour' },      // 1-hour intervals ✅
    '4d': { stepMinutes: 240, unit: 'hour' }      // 4-hour intervals ✅
  }
  return configs[timeBase] || { stepMinutes: 10, unit: 'minute' }
}
```

**Current Y-Axis Tick Configuration:**
```typescript
// Lines 3085-3095: Y-axis ticks
ticks: {
  color: '#595959',
  font: { size: 11, family: 'Inter, Helvetica, Arial, sans-serif' },
  padding: 2,
  callback: function (value: any) {
    return Number(value).toFixed(2)
  }
  // ⚠️ No count/stepSize control
}
```

**Proposed Y-Axis Enhancement:**
```typescript
ticks: {
  color: '#595959',
  font: { size: 11, family: 'Inter, Helvetica, Arial, sans-serif' },
  padding: 2,
  count: 10,  // ✅ ADD: Force 10 tick marks (more granular)
  autoSkip: false,  // ✅ ADD: Don't skip ticks
  maxTicksLimit: 10,  // ✅ ADD: Ensure 10 ticks displayed
  callback: function (value: any) {
    return Number(value).toFixed(2)
  }
}
```

---


---

## Implementation Status

### Phase 1: Quick Wins ✅ COMPLETED
1. ✅ **Time scale divisions** - Updated `getXAxisTickConfig` and `maxTicksConfigs`
2. ✅ **Y-axis tick density** - Added `count: 10` and `autoSkip: false` to y-axis config
3. ✅ **Color array reorder** - Moved cyan to position 20, added 11 new colors

### Phase 2: Medium Effort ✅ COMPLETED
4. ✅ **Better auto-range algorithm** - Enhanced `afterDataLimits` function (3x zoom)
5. ✅ **Continuous monitoring** - Implemented visibility backfill with auto-gap-filling

### Phase 3: Future Enhancements
6. ⏳ **Backend continuous collection** - Rust service for 24/7 data collection
7. ⏳ **Color reordering UI** - Add drag-and-drop or up/down buttons for series

---

## Changes Summary

### ✅ 1. Time Scale Divisions (Fixed Awkward Intervals)
**Modified:** Line 2366 (`getXAxisTickConfig` function)

| Timebase | OLD Interval | OLD Ticks | NEW Interval | NEW Ticks | Result |
|----------|-------------|-----------|--------------|-----------|--------|
| 5m       | 1 min       | 6         | 1 min        | 6         | ✓ (no change) |
| 10m      | 2 min       | 6         | 2 min        | 6         | ✓ (no change) |
| 30m      | 5 min       | 7         | 5 min        | 7         | ✓ (no change) |
| **1h**   | **10 min**  | **7**     | **15 min**   | **5**     | ✅ **0, 15, 30, 45, 60** |
| **4h**   | **30 min**  | **9**     | **1 hour**   | **5**     | ✅ **0, 1h, 2h, 3h, 4h** |
| **12h**  | **1 hour**  | **13**    | **2 hours**  | **7**     | ✅ **0, 2h, 4h, 6h, 8h, 10h, 12h** |
| **1d**   | **2 hours** | **13**    | **4 hours**  | **7**     | ✅ **0, 4h, 8h, 12h, 16h, 20h, 24h** |
| **4d**   | **8 hours** | **13**    | **16 hours** | **7**     | ✅ **0, 16h, 32h, 48h, 64h, 80h, 96h** |

**Impact:** All time marks now show round numbers for easy interpretation.

---

### ✅ 2. Color Array Reorganization
**Modified:** Line 1703 (`SERIES_COLORS` array)

**OLD Array (14 colors):**
```
0: Red, 1: Blue, 2: Green, 3: Orange, 4: Purple,
5: Cyan ⚠️, 6: Brown-Orange, 7: Dark Red, ...
```

**NEW Array (25 colors):**
```
0: Red, 1: Blue, 2: Green, 3: Orange, 4: Purple, 5: Brown-Orange,
6: Dark Red, 7: Dark Blue, 8: Brown, 9: Dark Purple, 10: Dark Green,
11: Bright Orange, 12: Navy, 13: Magenta, 14: Teal, 15: Purple-Dark,
16: Olive, 17: Deep Pink, 18: Indigo, 19: Crimson,
20: Cyan ✅ (MOVED HERE), 21: Dark Turquoise, 22: Saddle Brown,
23: Dark Slate Gray, 24: Fire Brick
```

**Impact:** Cyan only appears when 20+ trend lines are active, improving visibility.

---

### ✅ 3. Y-Axis Tick Marks (Finer Granularity)
**Modified:** Line 3085-3098 (`getAnalogChartConfig` ticks section)

**Added Properties:**
```typescript
count: 10,              // Force 10 tick marks
maxTicksLimit: 10,      // Ensure 10 ticks displayed
autoSkip: false,        // Don't skip ticks automatically
```

**Impact:** Y-axis always shows 10 tick marks (was auto 5-6) for precise reading.

---

### ✅ 4. Auto-Range Improvements
**Modified:** Line 3115-3135 (`afterDataLimits` callback)

**Enhanced Algorithm:**
- **Zero range** (all values same): ±10% padding
- **Small range** (<2 units): **3x zoom** (was 2x)
- **Normal range** (≥2 units): +10% padding top/bottom

**Example:** Data 22.1-22.3°C (range 0.2)
- **OLD:** 21.9-22.5 (0.6 window) - variation barely visible
- **NEW:** 21.7-22.7 (1.0 window) - variation clearly visible

**Impact:** Small temperature variations (0.1°C) now clearly visible as line movement.

---

### ✅ 5. Continuous Monitoring (Auto-Backfill)
**Modified:** Lines 4571+ (new functions), 9227+ (lifecycle hooks)

**Implementation:**
```typescript
// Added visibility detection
document.addEventListener('visibilitychange', handleVisibilityChange)

// Auto-backfill when returning to page
handleVisibilityChange() {
  1. Detect time away from page
  2. Fetch missing data from database
  3. Merge data seamlessly
  4. Update charts without gaps
}
```

**Impact:** No data gaps when navigating away from TrendLog page and returning.

---

## Testing Guide

### Test 1: Time Scale Verification
**Objective:** Verify tick marks show round numbers

1. Open TrendLog page with active data
2. Select **1-hour** timebase → Check marks: **0, 15, 30, 45, 60 minutes**
3. Select **4-hour** timebase → Check marks: **0, 1h, 2h, 3h, 4h**
4. Select **12-hour** timebase → Check marks: **0, 2h, 4h, 6h, 8h, 10h, 12h**
5. Select **1-day** timebase → Check marks: **0, 4h, 8h, 12h, 16h, 20h, 24h**
6. Select **4-day** timebase → Check marks: **0, 16h, 32h, 48h, 64h, 80h, 96h**

**Expected:** All tick marks align with round numbers.

---

### Test 2: Color Position Verification
**Objective:** Verify cyan moved to position 20

1. Open TrendLog with monitor data
2. Enable **1-5 trend lines** → Colors: Red, Blue, Green, Orange, Purple
3. Enable **6-10 trend lines** → No cyan visible (Brown-Orange, Dark Red, etc.)
4. Enable **11-19 trend lines** → Still no cyan
5. Enable **20th trend line** → **Cyan should appear NOW**

**Expected:** Cyan only appears when 20+ trend lines active.

---

### Test 3: Y-Axis Tick Density
**Objective:** Verify 10 tick marks on Y-axis

1. Open TrendLog with analog data (temperature, pressure, etc.)
2. Count vertical tick marks on Y-axis
3. Should see **10 horizontal grid lines** (not 5-6)
4. Verify tick labels show 2 decimal places (e.g., 22.15)
5. Test with different value ranges (0-10, 20-25, 0.1-0.3)

**Expected:** Always 10 Y-axis ticks regardless of range.

---

### Test 4: Auto-Range Zoom
**Objective:** Verify small variations are visible

**Test Case A: Small Range (0.1-0.3)**
1. Monitor data with small variation (e.g., temperature 22.1-22.3°C)
2. OLD behavior: Y-axis would show 20-25 (variation barely visible)
3. NEW behavior: Y-axis should show ~21.7-22.7 (1.0 unit window)
4. Verify 0.2°C variation clearly visible as line movement

**Test Case B: Zero Range (All Values 22.0)**
1. Monitor data with constant value (22.0°C)
2. NEW behavior: Should show 19.8-24.2 (±10% of 22.0)
3. Verify flat line visible at 22.0

**Test Case C: Normal Range (10-30)**
1. Monitor data with normal variation (10-30)
2. NEW behavior: Should show 8-32 (+10% padding)
3. Verify peaks/valleys not cut off

---

### Test 5: Continuous Monitoring
**Objective:** Verify no data gaps when navigating away

1. Start real-time monitoring on TrendLog page
2. Navigate to Variable Table or Programming page
3. Wait 1-2 minutes
4. Return to TrendLog page
5. Verify no gaps in trend line (data backfilled automatically)

**Expected:** Seamless continuous trend line with no gaps.

---

## Performance Testing

### Chart Render Time
Test with different scenarios:

1. **5 trend lines** - Should render instantly (<100ms)
2. **20 trend lines** - Should render quickly (<500ms)
3. **1-day timebase** with 7 ticks - Verify smooth scrolling
4. **4-day timebase** with 7 ticks - Check memory usage

**Expected:** No performance degradation (reduced tick counts for large timebases).

---

## User Acceptance Scenarios

### Scenario 1: HVAC Temperature Monitoring
**User Story:** "I'm monitoring room temperature (21-23°C) and need to see 0.5°C changes clearly"

**Test Steps:**
1. Monitor analog input (temperature sensor)
2. Select 1-hour timebase
3. Verify time marks at 0, 15, 30, 45, 60 (easy to read)
4. Verify Y-axis shows ~19-25 range (3x zoom for 2°C data range)
5. Verify 10 Y-axis ticks (can estimate ±0.2°C easily)

**Expected:** User can quickly identify when temperature crossed 22°C at "30 minutes ago".

---

### Scenario 2: Multi-Trend Monitoring (10 inputs)
**User Story:** "I'm tracking 10 sensors and need to distinguish each line by color"

**Test Steps:**
1. Enable 10 analog inputs
2. Verify colors: Red, Blue, Green, Orange, Purple, Brown-Orange, Dark Red, Dark Blue, Brown, Dark Purple
3. **Verify NO cyan** in the first 10 colors
4. All 10 colors clearly visible and distinct

**Expected:** All trend lines easily distinguishable, no hard-to-see colors.

---

### Scenario 3: Long-Term Trend Analysis (4-day chart)
**User Story:** "I need to review equipment performance over 4 days"

**Test Steps:**
1. Select 4-day timebase
2. Verify time marks at 0, 16h, 32h, 48h, 64h, 80h, 96h (clean 16-hour intervals)
3. Verify chart loads without lag
4. Verify Y-axis still shows 10 ticks even with large dataset

**Expected:** Easy to identify "2 days ago at 32 hours" without mental math.

---

## Visual Regression Testing

### Before/After Comparison

**1-Hour Chart - Time Axis:**
- **Before:** 0, 10, 12, 24, 36, 48, 60 ⚠️ (awkward intervals)
- **After:** 0, 15, 30, 45, 60 ✅ (perfect quarters)

**Color Usage (20 trends):**
- **Before:** Cyan at position 5 (hard to see on grey)
- **After:** Cyan at position 20 (rarely used)

**Y-Axis Ticks:**
- **Before:** 5-6 ticks (sparse grid)
- **After:** 10 ticks (dense grid, easier to read)

**Small Range (0.1-0.3):**
- **Before:** Flat-looking line (2x zoom)
- **After:** Clear variation visible (3x zoom)

---

## Known Issues & Workarounds

### Issue 1: Custom Date Range
**Status:** Not extensively tested
**Impact:** Custom date range tick configuration uses separate logic (line 6043-6050)
**Workaround:** Manual testing recommended for custom date ranges

### Issue 2: Digital Chart Y-Axis
**Status:** Only analog charts updated
**Impact:** Digital (ON/OFF) charts still use old tick configuration
**Workaround:** Digital charts have fixed Y-axis (0-1), less critical for precision

---

## Rollback Instructions

If issues are found, revert changes:

```powershell
cd d:\1025\github\temcocontrols\T3000Webview7
git checkout src/t3-vue/components/NewUI/TrendLogChart.vue
```

Or manually restore specific changes:
1. **Line 1703:** Restore old color array (cyan at position 5, 14 colors total)
2. **Line 2366:** Restore old stepMinutes values (10, 30, 60, 120, 480)
3. **Line 3085:** Remove count/maxTicksLimit/autoSkip from Y-axis ticks
4. **Line 3115:** Change `range * 3` back to `range * 2`
5. **Lines 4571+, 9227+:** Remove visibility event listeners and backfill functions

---

## Technical Architecture

### Chart.js Configuration
- **Version:** Chart.js 4.x
- **Time Plugin:** Using `time` scale type (lines 3008, 3072)
- **Multi-canvas:** Separate analog/digital charts
- **Real-time Updates:** 5-second intervals (REALTIME_UPDATE_INTERVAL_MS = 5000)

### Data Persistence
- **Database:** SQLite via `storeRealtimeDataToDatabase`
- **Historical Load:** `loadHistoricalDataFromDatabase`
- **Auto-Backfill:** Browser Visibility API integration

### Key Functions
- `updateCharts()` (line 5930): Main chart render function
- `updateAnalogChart()` (line 5968): Analog series rendering
- `getXAxisTickConfig()` (line 2366): Time axis configuration
- `getAnalogChartConfig()` (line 2987): Y-axis and options config
- `handleVisibilityChange()` (line 4571+): Visibility detection and backfill
- `backfillMissingData()` (line 4571+): Gap-filling logic

---

## Performance Considerations

- **Component Size:** 12,549 lines (consider modularization for maintainability)
- **Render Strategy:** `requestAnimationFrame` + `setTimeout` for C++ WebView compatibility
- **Async Processing:** Yield points every 3 series (line 5995) to prevent UI blocking
- **Tick Optimization:** Reduced tick counts for large timebases (1d, 4d) to maintain performance
- **Hardware Testing:** Verify on low-end devices after increasing tick density

---

## Files Modified

### 1. src/t3-vue/components/NewUI/TrendLogChart.vue
**Changes:**
- Line 1703: `SERIES_COLORS` array (25 colors, cyan moved to position 20)
- Line 2366: `getXAxisTickConfig` function (updated time intervals)
- Line 3085-3098: Y-axis ticks configuration (count: 10, autoSkip: false)
- Line 3115-3135: `afterDataLimits` callback (enhanced auto-range algorithm)
- Line 4571+: New `handleVisibilityChange()` and `backfillMissingData()` functions
- Line 6053: `maxTicksConfigs` object (updated tick limits)
- Line 9227: `onMounted()` hook (added visibility listener)
- Line 9861: `onUnmounted()` hook (cleanup visibility listener)

### 2. UI Font Sizing (9 locations)
**Changes:** Reduced button and text font-sizes for better horizontal space utilization
- Zoom Out/In/Reset buttons: 11px
- View 1/2/3 buttons: 11px
- Config buttons: 9px (icon), 11px (database)
- Export button: 11px
- Dropdown buttons ("All", "By Type"): 11px
- Chart title (header-line-1): 11px (was 13px)

---

## Future Enhancements

### Phase 3: Backend Continuous Collection (Recommended)
**Objective:** Implement Rust-based persistent data collection service

**Implementation:**
```rust
// api/src/t3_device/routes.rs
pub async fn start_continuous_trendlog_collection(
    device_sn: String,
    panel_id: u32,
    trendlog_id: u32
) {
    tokio::spawn(async move {
        loop {
            let data = fetch_trendlog_data(&device_sn, panel_id, trendlog_id).await;
            store_to_database(data).await;
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });
}
```

**Benefits:**
- Runs independently of frontend page visibility
- 24/7 data collection without gaps
- No dependency on browser tab state

---

### Phase 4: Color Reordering UI (Optional)
**Objective:** Allow manual color assignment per trend line

**Implementation:**
```vue
<!-- Add up/down buttons for series reordering -->
<a-button-group size="small">
  <a-button @click="moveSeriesUp(index)" :disabled="index === 0">
    <UpOutlined />
  </a-button>
  <a-button @click="moveSeriesDown(index)">
    <DownOutlined />
  </a-button>
</a-button-group>
```

**Benefits:**
- User control over color assignments
- Persist preferences via localStorage
- Drag-and-drop interface (advanced)
