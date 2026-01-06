# Device Monitoring

Monitor real-time device status, data points, and system health.

## Overview

The T3000 monitoring system provides comprehensive visibility into device operation, data collection, and system performance.

## Real-Time Dashboard

The main dashboard displays key metrics:

### Device Status Panel

- **Connection State**: Online/Offline status
- **Last Communication**: Timestamp of last successful poll
- **CPU Usage**: Device processor utilization
- **Memory Usage**: RAM consumption
- **Uptime**: Time since last restart

### Data Point Summary

Quick view of critical points:
- **Inputs**: Sensor readings (temperature, pressure, etc.)
- **Outputs**: Control signals and actuator states
- **Variables**: Calculated values
- **Alarms**: Active alarm count

## Data Point Monitoring

### Inputs Page

Monitor all input points:

| Point | Description | Value | Units | Status | Last Update |
|-------|-------------|-------|-------|--------|-------------|
| IN1 | Zone Temperature | 72.5 | °F | ✅ Valid | 2s ago |
| IN2 | Supply Pressure | 45.2 | PSI | ✅ Valid | 2s ago |
| IN3 | CO2 Level | 650 | PPM | ✅ Valid | 2s ago |

**Features:**
- Real-time value updates (2-5 second refresh)
- Color-coded status indicators
- Trend sparklines
- Quick filters and search
- Export to CSV/Excel

### Outputs Page

Monitor control outputs:

| Point | Description | Command | Feedback | Mode | Override |
|-------|-------------|---------|----------|------|----------|
| OUT1 | Damper Position | 45% | 44% | Auto | No |
| OUT2 | Fan Speed | 75% | 75% | Auto | No |
| OUT3 | Valve Position | 0% | 0% | Off | Yes |

### Variables Page

Monitor calculated variables:

- Setpoints
- Differential values
- Status flags
- Timers and counters

## Trend Visualization

### Real-Time Charts

View live data trends:

1. Navigate to **Trend Logs** page
2. Select points to monitor
3. Choose time range (1 hour, 4 hours, 24 hours)
4. View interactive charts with zoom/pan

**Chart Types:**
- Line charts (analog values)
- Step charts (digital states)
- Multi-axis plots (different units)
- Stacked area charts

### Historical Data

Access stored trend data:

- **Time Range Selection**: Custom date/time picker
- **Data Export**: Download CSV, Excel, JSON
- **Statistics**: Min, max, average, standard deviation
- **Annotations**: Add notes to specific timestamps

## Alarm Monitoring

### Active Alarms

View current alarm conditions:

| Priority | Point | Message | Time | Acknowledge |
|----------|-------|---------|------|-------------|
| High | IN1 | High Temperature | 10:23 AM | ☐ |
| Medium | OUT2 | Fan Feedback Error | 10:15 AM | ☑️ |

**Alarm Actions:**
- Acknowledge individual alarms
- Acknowledge all alarms
- Filter by priority/type
- View alarm history

### Notification Settings

Configure alarm notifications:

- **Email Alerts**: Send to specified addresses
- **SMS Notifications**: Text message alerts
- **Audio Alerts**: Browser notification sounds
- **Popup Windows**: Desktop notifications

## System Health

### Performance Metrics

Monitor system performance:

```
API Response Time:    45ms (avg)
Database Queries:     150/sec
Active Connections:   12
Memory Usage:         245MB / 512MB
CPU Load:            15%
```

### Communication Stats

Track data collection:

- **Successful Polls**: Count of successful data requests
- **Failed Polls**: Error count and types
- **Average Response Time**: Communication latency
- **Retry Count**: Number of automatic retries

## Auto-Refresh

Data automatically refreshes at configurable intervals:

- **Inputs/Outputs**: 5 seconds (default)
- **Variables**: 5 seconds (default)
- **Trends**: 10 seconds (real-time mode)
- **Alarms**: 3 seconds (high priority)

**Manual Refresh:**
Click the 🔄 **Refresh from Device** button to force immediate update.

## Filters and Search

### Quick Filters

- **Status**: Show only online/offline/error devices
- **Type**: Filter by point type (AI, AO, AV, BI, BO, BV)
- **Alarm**: Show only alarmed points
- **Override**: Show only overridden points

### Search

Use the search box to find specific points:
- Search by name, description, or ID
- Case-insensitive matching
- Wildcard support (*, ?)

## Data Export

Export monitored data:

### Point List Export
1. Select points to export
2. Click **Export** button
3. Choose format (CSV, Excel, JSON)
4. Save file

### Trend Data Export
1. Set time range
2. Select points
3. Choose interval (1s, 5s, 1m, etc.)
4. Export with timestamps

## Best Practices

1. **Set Appropriate Refresh Rates**: Balance responsiveness vs. network load
2. **Use Filters**: Focus on critical points
3. **Monitor Trends**: Watch for unusual patterns
4. **Review Alarms Daily**: Don't ignore persistent alarms
5. **Export Regular Reports**: Keep historical records
6. **Configure Thresholds**: Set appropriate alarm limits

## Performance Tips

- Limit number of simultaneous trend charts (max 10)
- Use longer refresh intervals for non-critical points
- Archive old trend data regularly
- Close unused browser tabs
- Use modern browsers (Chrome, Edge, Firefox)

## Next Steps

- [Trend Logs](../features/trendlogs) - Detailed trend analysis
- [Alarms](../features/alarms) - Alarm configuration
- [Troubleshooting](./device-troubleshooting) - Resolve monitoring issues
