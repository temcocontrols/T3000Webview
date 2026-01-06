# Variables

Calculated variables, setpoints, and derived values.

## Overview

Variables store calculated values, setpoints, intermediate results, and system status flags. They're used for complex control logic, data manipulation, and system coordination.

## Variable Types

### Analog Variables (AV)
- Setpoints (temperature, pressure)
- Calculated values (averages, differentials)
- Timers and counters
- Mathematical results

### Binary Variables (BV)
- Status flags
- Enable/disable switches
- Alarm conditions
- Mode selections

## Common Uses

- **Temperature Setpoints**: Heating/cooling targets
- **Differential Calculations**: Supply - Return temperature
- **Runtime Accumulators**: Equipment operating hours
- **Status Flags**: System mode indicators
- **Energy Calculations**: kW, BTU/hr

## Configuration

Variables can be:
- **Read-only**: Calculated by programs
- **Writable**: User-adjustable setpoints
- **Commandable**: Controlled by programs or operators

## Best Practices

- Name clearly (e.g., Zone_Temp_SP)
- Document calculations
- Set appropriate limits
- Use consistent units

## Next Steps

- [Programs](./programs) - Control logic
- [PID Loops](./pid-loops) - PID control
