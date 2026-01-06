# Performance Tuning

Optimize T3000 system performance and responsiveness.

## Database Optimization

### Retry Settings
Current configuration:
- Max retries: 10
- Base delay: 100ms
- Exponential backoff
- Total wait: ~51 seconds

### Data Retention
- Real-time data: 24 hours
- Historical data: 1 year
- Archive older data to reduce database size

## Network Tuning

### Polling Rates
**Recommended:**
- Critical points: 5 seconds
- Normal points: 10 seconds
- Slow-changing: 60 seconds

### Concurrent Requests
- Limit: 10 concurrent requests
- Queue additional requests
- Batch operations when possible

## Browser Optimization

### Chart Performance
- Limit charts to 10 maximum
- Use appropriate time ranges
- Reduce displayed points
- Close unused tabs

### Memory Management
- Clear cache periodically
- Reload page if sluggish
- Use latest browser version

## Server Optimization

### API Server
- Monitor CPU/memory usage
- Restart if memory leak
- Use release build (not debug)
- Check logs for errors

### Database
- Vacuum SQLite regularly
- Optimize indexes
- Archive old data
- Monitor file size

