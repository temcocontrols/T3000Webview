# Events

Event system for alarms, state changes, and notifications.

## Event Types

### Alarm Events
- Alarm activated
- Alarm acknowledged
- Alarm cleared

### Device Events
- Device connected
- Device disconnected
- Communication error

### Data Events
- Value changed
- Limit exceeded
- Override activated

## Event Structure
``json
{
  "id": "evt_001",
  "type": "alarm",
  "severity": "high",
  "message": "High temperature",
  "timestamp": 1704582000,
  "source": "Zone_Temp",
  "value": 85.2
}
``

## Subscribing to Events
Use WebSocket API to receive real-time events.

