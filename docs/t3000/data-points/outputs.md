# Outputs

Control analog and digital output points for actuators, dampers, valves, and equipment.

## Overview

Output points represent physical control signals sent to actuators, variable frequency drives (VFDs), dampers, valves, and other controlled devices. Outputs can operate in automatic mode (controlled by programs) or manual override mode.

## Output Types

### Analog Outputs (AO)

Continuous control signals:

**Common Applications:**
- **Damper Control**: Modulating dampers (0-100%)
- **Valve Control**: Hot/cold water valves
- **VFD Speed Control**: Fan/pump speed (0-100%)
- **Setpoint Signals**: Temperature/pressure setpoints
- **4-20mA Signals**: Pneumatic transducers
- **0-10V Signals**: Electronic actuators

**Properties:**
- **Command Value**: Desired output (0-100%)
- **Feedback Value**: Actual position reading
- **Units**: % (percent), or engineering units
- **Range**: Min/max output limits
- **Override**: Manual control capability

### Binary Outputs (BO)

On/off control signals:

**Common Applications:**
- **Equipment Start/Stop**: Fans, pumps, heaters
- **Relay Control**: Contactors, solenoids
- **Enable/Disable**: System enable signals
- **Alarm Outputs**: Strobe lights, horns
- **Safety Shutoffs**: Emergency stops

**States:**
- **Active** (1, On, Energized)
- **Inactive** (0, Off, De-energized)

## Outputs Page Interface

### Table View

| # | Label | Description | Command | Feedback | Mode | Override | Status | Update |
|---|-------|-------------|---------|----------|------|----------|--------|--------|
| 1 | Damper_Pos | Supply Damper | 45% | 44% | Auto | No | ✅ Normal | 2s ago |
| 2 | Fan_Speed | Supply Fan VFD | 75% | 75% | Auto | No | ✅ Normal | 2s ago |
| 3 | HW_Valve | Hot Water Valve | 0% | 0% | Off | Yes | 🔧 Override | 2s ago |
| 4 | Pump_Run | Chilled Water Pump | On | On | Auto | No | ✅ Normal | 2s ago |

### Features

**Real-Time Control:**
- View current command values
- See actual feedback positions
- Monitor mode status (Auto/Manual/Off)
- Identify override conditions

**Manual Override:**
- Click output row to override
- Set manual value
- Return to automatic mode
- Emergency stop capability

**Batch Operations:**
- Select multiple outputs
- Batch mode changes
- Release all overrides
- Export configuration

## Output Control

### Operating Modes

**Automatic Mode:**
- Output controlled by programs
- Normal operating condition
- Responds to control algorithms
- Cannot be manually adjusted

**Manual Mode:**
- User sets output value directly
- Program control disabled
- Value held until released
- Indicated with 🔧 icon

**Off Mode:**
- Output disabled
- Fixed at 0% or Off state
- Safety/maintenance condition
- Must be manually enabled

### Manual Override

To override an output:

1. Click on output row
2. Select **Manual Override** tab
3. Set desired value (0-100% or On/Off)
4. Click **Apply Override**
5. Output shows 🔧 override indicator

**Release Override:**
1. Click overridden output
2. Click **Release Override** button
3. Output returns to automatic mode

⚠️ **Warning**: Manual overrides persist until explicitly released. Remember to return outputs to Auto mode after maintenance.

## Output Configuration

### Basic Settings

**Identification:**
- **Label**: Output name (e.g., "Supply_Damper")
- **Description**: Detailed description
- **Control Type**: Modulating/Two-Position
- **Panel**: Parent control panel

**Control Parameters:**
- **Range**: Output range (0-100%, 0-10V, 4-20mA)
- **Default**: Default value when disabled
- **Priority**: Control priority level
- **Relinquish**: Auto-release timeout

### Advanced Settings

**PID Tuning (if applicable):**
```
Proportional (P):  2.0
Integral (I):      0.5
Derivative (D):    0.1
Setpoint:          72°F
Deadband:          1°F
```

**Limits:**
- **High Limit**: Maximum allowed output
- **Low Limit**: Minimum allowed output
- **Rate Limit**: Maximum change per second
- **Deadband**: Minimum change threshold

**Safety:**
- **Failsafe Value**: Value on communication loss
- **Timeout**: Watchdog timer (seconds)
- **Lockout**: Disable manual override
- **Priority Array**: BACnet priority levels

## Feedback Monitoring

### Position Feedback

Many outputs have feedback sensors:

**Feedback Types:**
- **Position Sensor**: Actual damper/valve position
- **Speed Sensor**: VFD actual speed
- **Flow Switch**: Proof of flow
- **Status Contact**: Relay feedback

**Feedback Comparison:**
```
Command:    75%
Feedback:   73%
Error:      2%
Status:     ✅ Normal (within tolerance)
```

**Feedback Errors:**
- Command-feedback difference > tolerance
- Indicates mechanical issue
- Generates alarm
- May indicate:
  - Stuck actuator
  - Broken linkage
  - Sensor failure
  - Insufficient power

## Output Sequences

### Start/Stop Sequences

**Equipment Start Sequence:**
1. Pre-start checks
2. Enable output
3. Ramp to setpoint
4. Verify feedback
5. Confirm running status

**Equipment Stop Sequence:**
1. Ramp down gradually
2. Allow time delay
3. Disable output
4. Verify off status
5. Log stop event

### Interlocks

**Safety Interlocks:**
- Prevent unsafe conditions
- Require prerequisite states
- Automatic shutdown on fault
- Override prevention

Example: VFD Interlock
```
IF (Filter_Status == Dirty) THEN
    VFD_Enable = OFF
    Alarm_Active = TRUE
END IF
```

## Trending

### Output Trends

Monitor output behavior:

**Trend Charts:**
- Command vs. Feedback comparison
- Mode changes over time
- Override history
- Performance analysis

**Useful Metrics:**
- Average position
- Cycling frequency
- Override duration
- Error magnitude

## Alarms

### Output Alarms

Common alarm conditions:

**Feedback Error:**
```
Condition:   |Command - Feedback| > 10%
Duration:    > 60 seconds
Priority:    Medium
Action:      Notify, log event
```

**Override Active:**
```
Condition:   Output in manual mode
Duration:    > 2 hours
Priority:    Low
Action:      Remind to release
```

**Safety Limit:**
```
Condition:   Output at high/low limit
Duration:    > 5 minutes
Priority:    High
Action:      Alert maintenance
```

## Best Practices

### Naming Conventions

Use consistent output naming:
```
Format: [Equipment]_[Function]_[Type]

Examples:
- AHU1_Supply_Damper
- Boiler1_HW_Valve
- ExhFan_Speed_VFD
- Pump2_Run_Command
```

### Control Strategy

1. **Gradual Changes**
   - Use rate limiting
   - Avoid abrupt changes
   - Prevent equipment stress

2. **Feedback Verification**
   - Monitor feedback vs. command
   - Set appropriate tolerances
   - Investigate persistent errors

3. **Override Management**
   - Document override reason
   - Set time limit reminders
   - Review daily overrides
   - Release after maintenance

### Safety Considerations

1. **Emergency Override**
   - Know how to quickly disable outputs
   - Test emergency stop procedures
   - Document shutdown sequences

2. **Failsafe Settings**
   - Configure safe default values
   - Set appropriate timeouts
   - Test communication loss behavior

3. **Authorization**
   - Limit override permissions
   - Log all manual interventions
   - Review override history

## Troubleshooting

### Output Not Responding

**Symptoms**: Command changes but no response

**Solutions:**
1. Check device connection
2. Verify not in manual override
3. Test output in manual mode
4. Check wiring and power
5. Verify output enable status

### Feedback Mismatch

**Symptoms**: Command ≠ Feedback

**Solutions:**
1. Check feedback sensor wiring
2. Calibrate position feedback
3. Verify actuator is working
4. Check for mechanical binding
5. Test actuator manually

### Unstable Control

**Symptoms**: Output hunting/oscillating

**Solutions:**
1. Tune PID parameters
2. Increase deadband
3. Add rate limiting
4. Check sensor noise
5. Verify loop stability

## Next Steps

- [Variables](./variables) - Calculated variables
- [Programs](./programs) - Control programs
- [PID Loops](./pid-loops) - PID control
- [Schedules](../features/schedules) - Time-based control
