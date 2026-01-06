# Device Troubleshooting

Common issues and solutions for T3000 device connectivity and operation.

## Connection Issues

### Device Not Discovered

**Symptoms:**
- Device not appearing in discovery scan
- "No devices found" message

**Solutions:**

1. **Check Network Connectivity**
   ```bash
   # Ping device IP
   ping 192.168.1.100

   # Check port availability
   telnet 192.168.1.100 47808
   ```

2. **Verify Device Settings**
   - Confirm device IP address is correct
   - Check subnet mask matches network
   - Verify gateway configuration
   - Ensure BACnet port is 47808 (UDP)

3. **Check Firewall**
   - Allow UDP port 47808 (BACnet/IP)
   - Allow TCP port 502 (Modbus TCP)
   - Disable antivirus temporarily to test
   - Check Windows Firewall rules

4. **Network Broadcast Issues**
   - Some networks block broadcast packets
   - Try manual device addition instead
   - Contact IT to enable multicast

### Connection Timeout

**Symptoms:**
- "Connection timeout" error
- Slow response times
- Intermittent disconnections

**Solutions:**

1. **Increase Timeout Values**
   - Go to Settings > Communication
   - Increase timeout from 5s to 10s
   - Increase retry count

2. **Reduce Network Load**
   - Decrease polling frequency
   - Limit concurrent connections
   - Close other network applications

3. **Check Network Quality**
   - Test network latency: `ping -n 100 192.168.1.100`
   - Check for packet loss
   - Verify network switch/router health

### Authentication Failed

**Symptoms:**
- "Authentication error" message
- "Access denied" errors

**Solutions:**

1. **Verify Credentials**
   - Check username/password
   - Verify case sensitivity
   - Try default credentials (if applicable)

2. **Check User Permissions**
   - Ensure user has adequate permissions
   - Verify user account is not locked
   - Contact administrator for access

3. **Device Configuration**
   - Verify authentication is enabled
   - Check allowed IP addresses
   - Review security settings

## Data Reading Issues

### Points Not Updating

**Symptoms:**
- Data values frozen/stale
- "Last update" timestamp old
- No new trend data

**Solutions:**

1. **Check Connection Status**
   - Verify device is online (green indicator)
   - Test communication with manual refresh
   - Review connection logs

2. **Verify Auto-Refresh**
   - Ensure auto-refresh is enabled
   - Check refresh interval setting
   - Try manual refresh (🔄 button)

3. **Clear Cache**
   ```javascript
   // Browser console
   localStorage.clear();
   location.reload();
   ```

4. **Restart Services**
   - Restart T3000 API server
   - Refresh browser page
   - Reconnect device

### Incorrect Values

**Symptoms:**
- Values don't match physical readings
- Negative values where impossible
- Out-of-range readings

**Solutions:**

1. **Check Calibration**
   - Review input calibration settings
   - Verify sensor type configuration
   - Check units conversion

2. **Verify Point Configuration**
   - Confirm correct input type (0-10V, 4-20mA)
   - Check scaling factors
   - Verify offset settings

3. **Test Hardware**
   - Check sensor wiring
   - Test with multimeter
   - Replace faulty sensors

## Performance Issues

### Slow Page Loading

**Symptoms:**
- Pages take long to load
- Browser freezes temporarily
- High CPU usage

**Solutions:**

1. **Reduce Data Load**
   - Decrease number of visible points
   - Increase refresh interval
   - Limit trend chart points

2. **Browser Optimization**
   - Use latest browser version
   - Clear browser cache
   - Close unused tabs
   - Disable browser extensions

3. **System Resources**
   - Close other applications
   - Check available RAM
   - Monitor CPU usage

### Database Errors

**Symptoms:**
- "Database locked" errors
- "Failed after X retries" messages
- Slow save operations

**Solutions:**

1. **Wait and Retry**
   - Database automatically retries with exponential backoff
   - Wait up to 51 seconds for retry completion
   - Operation should succeed eventually

2. **Check Server Load**
   - Monitor API server CPU/memory
   - Reduce concurrent operations
   - Close other connections

3. **Database Maintenance**
   - Vacuum database (if SQLite)
   - Archive old trend data
   - Optimize database indexes

## Trend Log Issues

### No Trend Data

**Symptoms:**
- Empty trend charts
- "No data available" message
- Missing historical data

**Solutions:**

1. **Verify Trend Logging Enabled**
   - Check point configuration
   - Enable trend logging
   - Set appropriate log interval

2. **Check Time Range**
   - Verify selected time range has data
   - Try different date range
   - Check data retention settings

3. **Database Storage**
   - Verify sufficient disk space
   - Check database permissions
   - Review database logs

### Gaps in Trend Data

**Symptoms:**
- Missing data segments
- Discontinuous charts
- Irregular timestamps

**Causes:**
- Network interruptions
- Device offline periods
- Database errors
- Polling failures

**Solutions:**
- Review connection logs for outages
- Check alarm history
- Verify continuous power supply

## Alarm Issues

### Alarms Not Triggering

**Symptoms:**
- No alarms despite out-of-range values
- Silent alarm conditions

**Solutions:**

1. **Verify Alarm Configuration**
   - Check alarm enable status
   - Verify threshold values
   - Review alarm priority

2. **Check Notification Settings**
   - Verify notification channels enabled
   - Test email/SMS configuration
   - Check browser notification permissions

### False Alarms

**Symptoms:**
- Alarms for normal conditions
- Nuisance alarms

**Solutions:**

1. **Adjust Thresholds**
   - Review alarm setpoints
   - Add deadband/hysteresis
   - Use time delays

2. **Filter Noise**
   - Increase sensor filter time
   - Use averaging
   - Check for electrical interference

## Browser Compatibility

### UI Elements Not Working

**Supported Browsers:**
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

**Not Supported:**
- ❌ Internet Explorer
- ❌ Old browser versions

**Solutions:**
1. Update to latest browser version
2. Clear browser cache
3. Disable conflicting extensions
4. Try incognito/private mode

## API Server Issues

### Server Not Running

**Check Server Status:**

```powershell
# Windows
Get-Process | Where-Object { $_.Path -like "*T3000*api*" }

# If not running, start server
cd api
cargo run --release
```

**Solutions:**
1. Ensure API server is running on port 9103
2. Check server logs for errors
3. Verify no port conflicts
4. Restart server if needed

### API Errors

**Common Error Codes:**
- **404**: Endpoint not found (check API path)
- **500**: Internal server error (check logs)
- **503**: Service unavailable (server overloaded)
- **timeout**: Server not responding

## Getting Help

If issues persist:

1. **Check Logs**
   - Browser console (F12)
   - API server logs
   - Device logs

2. **Collect Information**
   - Error messages (exact text)
   - Steps to reproduce
   - Browser/OS version
   - Device firmware version

3. **Contact Support**
   - Include all collected information
   - Attach relevant logs
   - Provide screenshots

## Next Steps

- [Best Practices](../guides/best-practices.md) - Preventive measures
- [Performance Tuning](../guides/performance-tuning.md) - Optimization tips
- [FAQ](../guides/faq.md) - Frequently asked questions
