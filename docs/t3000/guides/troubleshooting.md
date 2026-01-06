# Troubleshooting Guide

Quick reference for common issues and solutions.

## Quick Checklist

### System Not Responding
1. Check API server running (port 9103)
2. Verify database accessible
3. Check browser console (F12)
4. Restart API server
5. Clear browser cache

### Data Not Updating
1. Verify device connection (green status)
2. Check auto-refresh enabled
3. Click manual refresh
4. Review communication logs
5. Check network connectivity

### Slow Performance
1. Reduce displayed points
2. Increase refresh interval
3. Close unused browser tabs
4. Check system resources
5. Archive old data

## Error Messages

### Database Locked
**Solution:** Wait for retry (up to 51s), reduce concurrent operations

### Connection Timeout
**Solution:** Increase timeout, check network, verify device online

### JSON Parse Error
**Solution:** API endpoint missing or returning HTML error page

## Getting Help

See [Device Troubleshooting](../device-management/device-troubleshooting.md) for detailed solutions.

