# TrendLog Data Flow Analysis Summary

## What We've Identified

The complete data flow for TrendLog has been mapped from C++ backend to frontend display:

```
C++ CBacnetMonitor → URL Parameters → IndexPageSocket → TrendLogChart → Series Display
```

## Fixes Applied

### 1. Fixed Hardcoded Test Data
- **Problem**: Series names showing "BMC01E1E-xx" instead of real device names
- **Solution**: Changed from hardcoded pattern to: `description || ${pointTypeInfo.category}${pointNumber + 1} (P${panelId})`
- **Location**: `TrendLogChart.vue` → `generateDataSeries()` function

### 2. Added Comprehensive Diagnostic Logging

#### In TrendLogChart.vue
- `generateDataSeries()` - Logs series generation process
- `getDeviceDescription()` - Logs device lookup attempts
- Props watchers - Monitor data changes
- Real-time update logging

#### In IndexPageSocket.vue
- URL parameter parsing - Raw and decoded data
- Data source priority logging - JSON vs API vs T3000
- T3000_Data state monitoring - Panel data availability
- scheduleItemData changes - Props passed to TrendLogChart

## Key Investigation Points

Based on the flow analysis, here are the critical checkpoints:

### 1. T3000_Data Timing Issue
```javascript
// Check if device data loads before chart renders
T3000_Data.value.panelsData[45] // Should contain panel 45 data
```

### 2. Panel ID Mapping
```javascript
// Verify URL panel_id matches device structure
props.itemData.t3Entry.pid === 45 // Should match actual panel
```

### 3. Point Number Alignment
```javascript
// Ensure input/range arrays match device points
props.itemData.t3Entry.input = [1,2,3,4] // Should match device inputs
props.itemData.t3Entry.range = [5,6,7,8] // Should match device ranges
```

### 4. Description Availability
```javascript
// Check if device descriptions exist
T3000_Data.value.panelsData[45].inputs[0].description // Should have real name
```

## Expected Diagnostic Output

When working correctly, you should see logs like:

```
[IndexPageSocket] formatDataFromQueryParams - Raw URL params: {...}
[IndexPageSocket] formatDataFromQueryParams - Decoded all_data: {...}
[IndexPageSocket] scheduleItemData watcher triggered: {...}
[IndexPageSocket] initializeT3000Data - Current T3000_Data state: {...}
[TrendLogChart] Props received: {...}
[TrendLogChart] generateDataSeries - Starting generation: {...}
[TrendLogChart] getDeviceDescription - Looking up: panelId=45, pointNumber=1
[TrendLogChart] getDeviceDescription - Found description: "Supply Air Temp"
[TrendLogChart] generateDataSeries - Generated series: [{name: "Supply Air Temp", ...}]
```

## Quick Verification Commands

### Check if trend log page loads
1. Open T3000 application
2. Navigate to trend log with test data
3. Open browser DevTools → Console
4. Look for the diagnostic log entries

### Verify C++ data integrity
1. Check if C++ side returns correct panel data
2. Compare panel descriptions in C++ vs frontend logs
3. Verify panel ID and point number mappings

## Visual Flow Reference

The complete visual diagram is available at:
`docs/TrendLog-Data-Flow-Diagram.html`

This shows:
- Complete data transformation chain
- Critical checkpoints for debugging
- Common failure points
- Success validation steps

---

**Next Action**: Run the updated code and analyze the diagnostic console logs to identify where the data flow breaks down between correct C++ panel data and incorrect trend log display.
