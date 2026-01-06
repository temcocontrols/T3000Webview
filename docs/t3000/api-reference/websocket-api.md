# WebSocket API

Real-time bi-directional communication for live data updates.

## Connection
``javascript
const ws = new WebSocket('ws://localhost:9103/ws');
``

## Messages

### Subscribe to Updates
``json
{
  "type": "subscribe",
  "serial": 237219,
  "points": ["IN1", "IN2"]
}
``

### Receive Data
``json
{
  "type": "data",
  "point": "IN1",
  "value": 72.5,
  "timestamp": 1704582000
}
``

## Best Practices
- Reconnect on disconnect
- Limit subscriptions
- Handle backpressure

