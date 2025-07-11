# T3000.rc Units Analysis and TimeSeriesModal Updates

## Overview
Analysis of the T3000.rc file has revealed the complete and up-to-date unit definitions for both Digital Units and Variable Analog Units. This document compares the current TimeSeriesModal implementation with the T3000.rc definitions and provides recommended updates.

## T3000.rc Digital Units (Complete List)

From the resource file analysis, the digital units are:

```
0. No Units
1. Off/On
2. Close/Open
3. Stop/Start
4. Disable/Enable
5. Normal/Alarm
6. Normal/High
7. Normal/Low
8. No/Yes
9. Cool/Heat
10. Unoccupy/Occupy
11. Low/High
12. On/Off
13. Open/Close
14. Start/Stop
15. Enable/Disable
16. Alarm/Normal
17. High/Normal
18. Low/Normal
19. Yes/No
20. Heat/Cool
21. Occupy/Unoccupy
22. High/Low
```

**Custom Digital Units:**
- Custom ranges 23-30 (user-definable)

**Multi State Variables (MSV):**
- Additional multi-state options

## T3000.rc Variable Analog Units (Complete List)

From the resource file analysis, the analog units are:

```
0. Unused
31. deg.Celsius
32. deg.Fahrenheit
33. Feet per Min
34. Pascals
35. KPascals
36. lbs/sqr.inch
37. inches of WC
38. Watts
39. KWatts
40. KWH
41. Volts
42. KV
43. Amps
44. ma
45. CFM
46. Seconds
47. Minutes
48. Hours
49. Days
50. Time
51. Ohms
52. %
53. %RH
54. p/min
55. Counts
56. %Open
57. Kg
58. L/Hour
59. GPH
60. GAL
61. CF
62. BTU
63. CMH
64-68. Custom Variable Units (user-definable)
```

## T3000.rc Input Analog Units (Additional Units)

From the resource file analysis, there are additional input-specific units:

```
41. 0.0 to 5.0 Volts
42. 0.0 to 100 Amps
43. 4.0 to 20 ma
44. 0.0 to 20 psi
45. Pulse Count (Slow 1Hz)
46. 0 to 100 %(0-10V)
47. 0 to 100 %(0-5V)
48. 0 to 100 %(4-20ma)
49. 0.0 to 10.0 Volts
50. Table 1-5 (custom sensor tables)
55. Pulse Count (Fast 100Hz)
56. Hz
57. Humidity %
58. CO2 PPM
59. Revolutions Per Minute
60. TVOC PPB
61. ug/m3
62. #/cm3
63. dB
64. Lux
65-69. Custom units
```

## Temperature Sensor Units

```
PT100 -40 to 1000°C
10K Type2
PT1000 -200 to 600°C
10K Type3
PT 1K -200 to 300°C
```

## Output Analog Units

```
31. 0.0 -> 10 Volts
32. 0.0 -> 100 %Open
33. 0.0 -> 20 psi
34. 0.0 -> 100 % (0-10V)
35. 0.0 -> 100 %Cls
36. 0.0 -> 20 ma
37. 0.0 -> 100 PWM
38. 0.0 -> 100 % (2-10V)
```

## Key Differences Found

### Digital Units Issues:
1. **Order discrepancies**: Current TimeSeriesModal has some units in different order
2. **Missing variations**: Some digital units have variations (e.g., "On/Off" vs "Off/On")
3. **State order**: Some digital states are in reverse order in current implementation
4. **Missing units**: Some digital units from T3000.rc are missing

### Analog Units Issues:
1. **Missing units**: Several analog units from T3000.rc are missing in current implementation
2. **Different symbols**: Some unit symbols don't match T3000 conventions
3. **Missing ranges**: Input-specific units with ranges are not represented
4. **Incomplete coverage**: Only covers 31-63 when T3000.rc has more variations

## Recommended Updates

### 1. Digital Units Update
Update DIGITAL_UNITS to match T3000.rc exactly:

```typescript
const DIGITAL_UNITS = {
  0: { label: 'No Units', states: ['', ''] as [string, string] },
  1: { label: 'Off/On', states: ['Off', 'On'] as [string, string] },
  2: { label: 'Close/Open', states: ['Close', 'Open'] as [string, string] },
  3: { label: 'Stop/Start', states: ['Stop', 'Start'] as [string, string] },
  4: { label: 'Disable/Enable', states: ['Disable', 'Enable'] as [string, string] },
  5: { label: 'Normal/Alarm', states: ['Normal', 'Alarm'] as [string, string] },
  6: { label: 'Normal/High', states: ['Normal', 'High'] as [string, string] },
  7: { label: 'Normal/Low', states: ['Normal', 'Low'] as [string, string] },
  8: { label: 'No/Yes', states: ['No', 'Yes'] as [string, string] },
  9: { label: 'Cool/Heat', states: ['Cool', 'Heat'] as [string, string] },
  10: { label: 'Unoccupy/Occupy', states: ['Unoccupy', 'Occupy'] as [string, string] },
  11: { label: 'Low/High', states: ['Low', 'High'] as [string, string] },
  12: { label: 'On/Off', states: ['On', 'Off'] as [string, string] },
  13: { label: 'Open/Close', states: ['Open', 'Close'] as [string, string] },
  14: { label: 'Start/Stop', states: ['Start', 'Stop'] as [string, string] },
  15: { label: 'Enable/Disable', states: ['Enable', 'Disable'] as [string, string] },
  16: { label: 'Alarm/Normal', states: ['Alarm', 'Normal'] as [string, string] },
  17: { label: 'High/Normal', states: ['High', 'Normal'] as [string, string] },
  18: { label: 'Low/Normal', states: ['Low', 'Normal'] as [string, string] },
  19: { label: 'Yes/No', states: ['Yes', 'No'] as [string, string] },
  20: { label: 'Heat/Cool', states: ['Heat', 'Cool'] as [string, string] },
  21: { label: 'Occupy/Unoccupy', states: ['Occupy', 'Unoccupy'] as [string, string] },
  22: { label: 'High/Low', states: ['High', 'Low'] as [string, string] }
} as const
```

### 2. Analog Units Update
Update ANALOG_UNITS to include all T3000.rc units:

```typescript
const ANALOG_UNITS = {
  0: { label: 'Unused', symbol: '' },
  31: { label: 'deg.Celsius', symbol: '°C' },
  32: { label: 'deg.Fahrenheit', symbol: '°F' },
  33: { label: 'Feet per Min', symbol: 'ft/min' },
  34: { label: 'Pascals', symbol: 'Pa' },
  35: { label: 'KPascals', symbol: 'kPa' },
  36: { label: 'lbs/sqr.inch', symbol: 'psi' },
  37: { label: 'inches of WC', symbol: 'inWC' },
  38: { label: 'Watts', symbol: 'W' },
  39: { label: 'KWatts', symbol: 'kW' },
  40: { label: 'KWH', symbol: 'kWh' },
  41: { label: 'Volts', symbol: 'V' },
  42: { label: 'KV', symbol: 'kV' },
  43: { label: 'Amps', symbol: 'A' },
  44: { label: 'ma', symbol: 'mA' },
  45: { label: 'CFM', symbol: 'CFM' },
  46: { label: 'Seconds', symbol: 's' },
  47: { label: 'Minutes', symbol: 'min' },
  48: { label: 'Hours', symbol: 'h' },
  49: { label: 'Days', symbol: 'days' },
  50: { label: 'Time', symbol: 'time' },
  51: { label: 'Ohms', symbol: 'Ω' },
  52: { label: '%', symbol: '%' },
  53: { label: '%RH', symbol: '%RH' },
  54: { label: 'p/min', symbol: 'p/min' },
  55: { label: 'Counts', symbol: 'counts' },
  56: { label: '%Open', symbol: '%Open' },
  57: { label: 'Kg', symbol: 'kg' },
  58: { label: 'L/Hour', symbol: 'L/h' },
  59: { label: 'GPH', symbol: 'GPH' },
  60: { label: 'GAL', symbol: 'gal' },
  61: { label: 'CF', symbol: 'ft³' },
  62: { label: 'BTU', symbol: 'BTU' },
  63: { label: 'CMH', symbol: 'm³/h' },
  // Extended units for input-specific ranges
  100: { label: '0-5V', symbol: 'V' },
  101: { label: '0-100A', symbol: 'A' },
  102: { label: '4-20mA', symbol: 'mA' },
  103: { label: '0-20psi', symbol: 'psi' },
  104: { label: 'Pulse(1Hz)', symbol: 'pulses' },
  105: { label: '0-100%(0-10V)', symbol: '%' },
  106: { label: '0-100%(0-5V)', symbol: '%' },
  107: { label: '0-100%(4-20mA)', symbol: '%' },
  108: { label: '0-10V', symbol: 'V' },
  109: { label: 'Table1', symbol: '' },
  110: { label: 'Table2', symbol: '' },
  111: { label: 'Table3', symbol: '' },
  112: { label: 'Table4', symbol: '' },
  113: { label: 'Table5', symbol: '' },
  114: { label: 'Pulse(100Hz)', symbol: 'pulses' },
  115: { label: 'Hz', symbol: 'Hz' },
  116: { label: 'Humidity%', symbol: '%RH' },
  117: { label: 'CO2 PPM', symbol: 'ppm' },
  118: { label: 'RPM', symbol: 'rpm' },
  119: { label: 'TVOC PPB', symbol: 'ppb' },
  120: { label: 'ug/m3', symbol: 'μg/m³' },
  121: { label: '#/cm3', symbol: '#/cm³' },
  122: { label: 'dB', symbol: 'dB' },
  123: { label: 'Lux', symbol: 'lx' }
} as const
```

### 3. Updated getUnitInfo Function
```typescript
const getUnitInfo = (unitCode: number) => {
  if (unitCode >= 0 && unitCode <= 22) {
    return {
      type: 'digital' as const,
      info: DIGITAL_UNITS[unitCode as keyof typeof DIGITAL_UNITS]
    }
  } else if ((unitCode >= 31 && unitCode <= 63) || (unitCode >= 100 && unitCode <= 123)) {
    return {
      type: 'analog' as const,
      info: ANALOG_UNITS[unitCode as keyof typeof ANALOG_UNITS]
    }
  }
  return {
    type: 'analog' as const,
    info: { label: 'Unknown', symbol: '' }
  }
}
```

## Implementation Priority

1. **High Priority**: Update digital units to match T3000.rc exactly (fixes state order issues)
2. **Medium Priority**: Add missing analog units that are commonly used (CFM, BTU, etc.)
3. **Low Priority**: Add extended input-specific unit codes for completeness

## Impact Assessment

- **Breaking Changes**: None (existing unit codes will continue to work)
- **New Features**: Support for more unit types and accurate state labels
- **Bug Fixes**: Corrects state order for several digital units
- **Compatibility**: Full backward compatibility with existing T3000 data structures

## Testing Recommendations

1. Test with all 22 digital unit types to ensure correct state visualization
2. Test with extended analog units to ensure proper symbol display
3. Verify tooltip and statistics calculations work with new unit definitions
4. Test integration with T3000 data input functions
