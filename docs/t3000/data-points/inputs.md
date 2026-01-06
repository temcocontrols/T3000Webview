# Inputs

Monitor and manage analog and digital input points for sensors and measurements.

## Overview

Input points represent physical sensors connected to the BACnet device, including temperature sensors, pressure transducers, flow meters, and digital status inputs.

## Input Types

### Analog Inputs (AI)

Continuous measurement values:

**Common Sensor Types:**
- **Temperature**: Thermistors, RTDs, thermocouples
- **Pressure**: 4-20mA transducers, 0-10V sensors
- **Flow**: Differential pressure, ultrasonic
- **Humidity**: Relative humidity sensors
- **CO2**: Carbon dioxide sensors (PPM)
- **Voltage/Current**: Direct electrical measurements

**Properties:**
- **Present Value**: Current reading
- **Units**: Engineering units (°F, °C, PSI, CFM, etc.)
- **Range**: Min/max values (e.g., 0-100%)
- **Filter**: Averaging time constant
- **Calibration**: Offset and gain

### Binary Inputs (BI)

On/off status readings:

**Common Uses:**
- **Status Switches**: Proof of operation
- **Door Contacts**: Open/closed sensors
- **Limit Switches**: End-of-travel indicators
- **Alarm Contacts**: Safety signals
- **Occupancy Sensors**: Motion detection

**States:**
- **Active** (1, On, Closed)
- **Inactive** (0, Off, Open)

## Inputs Page Interface

### Table View

| # | Label | Description | Value | Units | Status | Auto/Manual | Last Update |
|---|-------|-------------|-------|-------|--------|-------------|-------------|
| 1 | Zone_Temp | Zone Temperature | 72.5 | °F | ✅ Valid | Auto | 2s ago |
| 2 | Supply_Press | Supply Pressure | 45.2 | PSI | ✅ Valid | Auto | 2s ago |
| 3 | Return_Temp | Return Air Temp | 68.0 | °F | ✅ Valid | Auto | 2s ago |
| 4 | CO2_Level | CO2 Concentration | 650 | PPM | ✅ Valid | Auto | 2s ago |
| 5 | Occupancy | Room Occupied | Active | - | ✅ Valid | Auto | 2s ago |

### Features

**Real-Time Updates:**
- Auto-refresh every 5 seconds (configurable)
- Manual refresh with 🔄 button
- Loading indicator during refresh

**Batch Operations:**
- Select multiple points
- Batch save changes
- Export selected points

**Filtering & Search:**
- Quick search by name/description
- Filter by type (AI/BI)
- Filter by status (valid/fault/override)
- Sort by any column

## Input Configuration

### Basic Settings

Click on an input row to configure:

**Identification:**
- **Label**: User-friendly name (e.g., "Zone Temperature")
- **Description**: Detailed description
- **Panel**: Associated control panel
- **Floor**: Physical location

**Hardware:**
- **Sensor Type**: Select sensor model
- **Range**: Measurement range (0-10V, 4-20mA, etc.)
- **Units**: Engineering units
- **Resolution**: Decimal places

### Advanced Settings

**Calibration:**
```
Raw Value:     5.25V
Offset:        -0.05V
Gain:          1.02
Calibrated:    5.26V
Scaled Value:  72.5°F
```

**Filtering:**
- **Filter Time**: Smoothing period (seconds)
- **Average Samples**: Number of readings to average
- **Deadband**: Minimum change to report

**Limits:**
- **High Limit**: Maximum acceptable value
- **Low Limit**: Minimum acceptable value
- **High Alarm**: Alarm threshold (upper)
- **Low Alarm**: Alarm threshold (lower)

## Data Quality

### Status Indicators

- ✅ **Valid**: Normal operation
- ⚠️ **Uncertain**: Questionable data quality
- ❌ **Fault**: Sensor error or out of range
- 🔧 **Override**: Manual override active

### Fault Detection

**Common Faults:**
- **Open Circuit**: Sensor disconnected
- **Short Circuit**: Wiring fault
- **Out of Range**: Value exceeds limits
- **Communication Loss**: No recent updates

**Fault Response:**
- Display fault status
- Generate alarm
- Use default value (if configured)
- Notify operators

## Input Trends

### Real-Time Monitoring

View input trends in real-time:

1. Navigate to **Trend Logs** page
2. Select input points to chart
3. View live updating graphs
4. Zoom/pan to analyze patterns

### Historical Data

Access stored input data:

- **Time Range**: Select date/time period
- **Export**: Download CSV/Excel
- **Statistics**: Min, max, avg, std dev
- **Comparison**: Plot multiple inputs

## Alarms

### Alarm Configuration

Set alarm thresholds for inputs:

**High Alarm:**
```
Setpoint:     80°F
Deadband:     2°F
Priority:     Medium
Delay:        60 seconds
```

**Low Alarm:**
```
Setpoint:     65°F
Deadband:     2°F
Priority:     Low
Delay:        60 seconds
```

### Alarm Actions

When alarm triggers:
- Visual indication in inputs table
- Entry in alarm log
- Email/SMS notification (if configured)
- Audible alert (if enabled)

## Best Practices

### Naming Conventions

Use consistent naming:
```
Format: [Location]_[Function]_[Measurement]

Examples:
- AHU1_Zone_Temp
- Boiler_Supply_Press
- Floor3_CO2_Level
```

### Calibration

- Calibrate sensors annually
- Document calibration date
- Compare to known reference
- Record offset/gain values

### Maintenance

1. **Regular Checks**
   - Verify readings match physical conditions
   - Check for drift over time
   - Test alarm functions

2. **Documentation**
   - Maintain sensor specifications
   - Record installation dates
   - Track maintenance history

3. **Spare Parts**
   - Stock common sensor types
   - Keep calibration tools available
   - Document sensor part numbers

## Troubleshooting

### Reading Errors

**Symptom**: Incorrect or unstable readings

**Solutions:**
1. Check sensor wiring
2. Verify sensor type configuration
3. Review calibration settings
4. Test with multimeter
5. Replace faulty sensor

### No Updates

**Symptom**: Stale data, no refresh

**Solutions:**
1. Check device connection
2. Verify auto-refresh enabled
3. Check polling interval
4. Review communication logs

### Alarm Nuisance

**Symptom**: False alarms

**Solutions:**
1. Adjust alarm thresholds
2. Increase deadband
3. Add time delay
4. Improve sensor filtering

## Next Steps

- [Outputs](./outputs) - Control output points
- [Variables](./variables) - Calculated variables
- [Trend Logs](../features/trendlogs) - Historical analysis
- [Alarms](../features/alarms) - Alarm management
