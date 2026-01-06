# Alarms

Alarm monitoring, configuration, and notification system.

## Overview

The alarm system monitors critical conditions and notifies operators when values exceed limits or equipment fails.

## Alarm Types

**Value Alarms:**
- High limit exceeded
- Low limit exceeded
- Rate of change alarm
- Deviation alarm

**Status Alarms:**
- Equipment failure
- Communication loss
- Sensor fault
- Override active

**System Alarms:**
- Database errors
- Server issues
- License expiration

## Alarm Priorities

- 🔴 **High**: Critical safety/equipment issues
- 🟠 **Medium**: Important but not critical
- 🟡 **Low**: Information/warnings
- ⚪ **Info**: Status changes

## Alarm Page

View active and historical alarms:

| Priority | Point | Message | Time | Status |
|----------|-------|---------|------|--------|
| High | Zone_Temp | High Temperature | 10:23 AM | Active |
| Medium | Fan_Status | Feedback Error | 10:15 AM | Acknowledged |

## Alarm Actions

- **Acknowledge**: Confirm awareness
- **Clear**: Resolve alarm condition
- **Silence**: Mute audio alerts
- **Filter**: View by priority/status

## Notification Settings

Configure alarm notifications:

**Email:**
- Recipient addresses
- Subject line format
- Include alarm details

**SMS:**
- Phone numbers
- Message template
- Priority filtering

**Browser:**
- Desktop notifications
- Audio alerts
- Popup windows

## Best Practices

- Set appropriate thresholds
- Use priority levels wisely
- Respond promptly
- Review alarm history
- Tune to reduce false alarms

## Next Steps

- [Inputs](../data-points/inputs.md) - Input alarms
- [Monitoring](../device-management/device-monitoring.md) - Real-time monitoring
- [Troubleshooting](../device-management/device-troubleshooting.md) - Resolve issues
