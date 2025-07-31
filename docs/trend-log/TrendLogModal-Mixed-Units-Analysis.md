# TrendLogModal Mixed Units Implementation Analysis

## Requirements Summary

### Data Types
1. **Digital Units (22 types)**: Binary states (0/1) with step-line visualization
2. **Variable Analog Units (33 types)**: Continuous values with smooth-line visualization

### Digital Units (1-22)
- Off/On, Close/Open, Stop/Start, etc.
- Values: 0 or 1
- Visualization: Step-line (horizontal + vertical segments)
- Example data: `[{time: 00:01, value: 1}, {time: 00:05, value: 1}, {time: 00:10, value: 0}]`

### Variable Analog Units (31-63)
- deg.Celsius, Pascals, Watts, %, etc.
- Values: Continuous range
- Visualization: Smooth/curved lines (current implementation)

## Technical Implementation Plan

### 1. Data Structure Updates
```typescript
interface SeriesConfig {
  name: string
  color: string
  data: DataPoint[]
  visible: boolean
  unit?: string
  isEmpty?: boolean
  unitType: 'digital' | 'analog'      // NEW
  unitCode: number                    // NEW
  digitalStates?: [string, string]   // NEW: ['Low', 'High']
}
```

### 2. Unit Type Mappings
```typescript
const DIGITAL_UNITS = {
  1: { label: 'Off/On', states: ['Off', 'On'] },
  2: { label: 'Close/Open', states: ['Close', 'Open'] },
  // ... 22 total
}

const ANALOG_UNITS = {
  31: { label: 'deg.Celsius', symbol: '°C' },
  32: { label: 'deg.Fahrenheit', symbol: '°F' },
  // ... 33 total
}
```

### 3. Chart.js Configuration Changes
- **Mixed Dataset Types**: Some datasets with `stepped: true`, others smooth
- **Y-axis Scaling**: Include negative values (-1 minimum)
- **Tooltip Formatting**: Context-aware based on unit type
- **Legend**: Show unit types and current states

### 4. Data Generation Logic
- **Digital**: Random state changes with step transitions
- **Analog**: Continuous values with appropriate ranges per unit type

### 5. Visualization Differences
- **Digital Step-line**: Horizontal segments + vertical transitions
- **Analog Smooth-line**: Current curved/smooth implementation

## Implementation Challenges

### Chart.js Mixed Visualization
- Single chart with different line types per dataset
- Unified Y-axis scaling for mixed data types
- Proper tooltip formatting for different value types

### State Management
- Track unit types per series
- Handle different statistics calculations
- Manage different export formats

### UI Updates
- Series list showing unit types
- Statistics appropriate for digital vs analog
- Export handling for mixed data types

## Validation Questions

1. **Y-axis Range**: Should digital (0/1) and analog values share the same Y-axis?
2. **Mixed Statistics**: How to calculate avg/min/max for digital binary data?
3. **Export Format**: Should CSV export show digital states as text or numeric?
4. **Unit Display**: Show unit codes or descriptive names in the UI?
5. **Real-time Updates**: Same update frequency for both digital and analog?

## Next Steps

1. Confirm analysis accuracy
2. Implement unit type system
3. Update chart configuration for mixed visualization
4. Test with sample digital and analog data
5. Validate step-line rendering for digital units

---

**Analysis Date**: July 10, 2025
**Status**: Pending Implementation Confirmation
