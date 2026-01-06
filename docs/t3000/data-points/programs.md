# Programs

Control programs for automation, sequences, and custom logic.

## Overview

Programs contain custom control logic written in a simplified programming language. They execute continuously to automate building control sequences, implement control strategies, and respond to conditions.

## Program Structure

### Basic Program

```basic
10 REM Zone Temperature Control
20 IF ZONE_TEMP > ZONE_SP + 1 THEN COOLING = ON
30 IF ZONE_TEMP < ZONE_SP - 1 THEN HEATING = ON
40 IF ZONE_TEMP >= ZONE_SP - 0.5 AND ZONE_TEMP <= ZONE_SP + 0.5 THEN GOTO 60
50 GOTO 20
60 COOLING = OFF
70 HEATING = OFF
80 GOTO 20
```

### Program Elements

**Commands:**
- `IF...THEN...ELSE`: Conditional logic
- `GOTO`: Jump to line number
- `GOSUB...RETURN`: Subroutine calls
- `FOR...NEXT`: Loops
- `REM`: Comments

**Operators:**
- Comparison: `>`, `<`, `>=`, `<=`, `=`, `<>`
- Logical: `AND`, `OR`, `NOT`
- Arithmetic: `+`, `-`, `*`, `/`

## Common Applications

### Occupancy Control

```basic
REM Office lighting and HVAC control
IF TIME > 0700 AND TIME < 1800 THEN
  OCC_MODE = TRUE
  LIGHTS = ON
  ZONE_SP = 72
ELSE
  OCC_MODE = FALSE
  LIGHTS = OFF
  ZONE_SP = 65
END IF
```

### Equipment Sequencing

```basic
REM Chiller staging
IF LOAD > 80% THEN
  IF CH1_STATUS = OFF THEN START_CH1
  WAIT 300  ' 5 minute delay
  IF LOAD > 95% THEN START_CH2
END IF
```

### Alarm Logic

```basic
REM High temperature alarm
IF ZONE_TEMP > HI_LIMIT THEN
  ALARM = ON
  SEND_EMAIL("High temp alert")
ELSE
  ALARM = OFF
END IF
```

## Program Management

### Program Table

View all programs in the Programs page:

| # | Label | Status | Last Run | Exec Time | Errors |
|---|-------|--------|----------|-----------|--------|
| 1 | Zone_Control | ✅ Running | 1s ago | 5ms | 0 |
| 2 | Schedule_Mgr | ✅ Running | 1s ago | 2ms | 0 |
| 3 | Alarm_Logic | ✅ Running | 1s ago | 3ms | 0 |

### Program Editor

Edit programs directly in the web interface:

1. Click on program row
2. Modify code in editor
3. Click **Validate** to check syntax
4. Click **Save** to store changes
5. Program automatically restarts

## Debugging

### Runtime Errors

Common errors:
- **Syntax Error**: Invalid command or syntax
- **Division by Zero**: Math error
- **Undefined Variable**: Reference to non-existent point
- **Timeout**: Program execution too long

### Troubleshooting

- Use `REM` comments to document logic
- Test in manual mode first
- Monitor execution time
- Check variable values
- Review error logs

## Best Practices

1. **Comment Your Code**
   ```basic
   REM Author: John Doe
   REM Date: 2026-01-06
   REM Purpose: Main AHU control
   ```

2. **Use Meaningful Names**
   - `ZONE_TEMP` not `V1`
   - `OCC_MODE` not `FLAG1`

3. **Error Handling**
   ```basic
   IF SENSOR_FAULT = TRUE THEN USE_DEFAULT
   ```

4. **Execution Time**
   - Keep programs short (<100 lines)
   - Avoid infinite loops
   - Use timers for delays

5. **Version Control**
   - Export programs regularly
   - Document changes
   - Test before deploying

## Next Steps

- [PID Loops](./pid-loops) - PID control
- [Schedules](../features/schedules) - Time-based control
- [Variables](./variables) - Program variables
