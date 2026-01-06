# Device Configuration

Configure T3000 BACnet device settings and parameters.

## Overview

The device configuration interface allows you to modify device settings, network parameters, and operational modes.

## Settings Page

Access device settings via **Settings** page:

### Basic Information

- **Device Name**: User-friendly identifier
- **Device Description**: Detailed description
- **Location**: Physical location/zone
- **Firmware Version**: Current firmware (read-only)
- **Model**: Device model number

### Protocol Settings

Configure BACnet and Modbus parameters:

**BACnet Configuration:**
- Device Instance: Unique BACnet device ID (0-4194303)
- Network Number: BACnet network segment
- MAC Address: Device hardware address
- APDU Timeout: Application timeout (milliseconds)
- APDU Retries: Number of retry attempts

**Modbus Configuration:**
- Slave ID: Modbus device address (1-247)
- Baud Rate: Serial communication speed
- Parity: None/Even/Odd
- Stop Bits: 1 or 2

### Network Settings

Configure IP and communication settings:

```
IP Address:      192.168.1.100
Subnet Mask:     255.255.255.0
Default Gateway: 192.168.1.1
DNS Server:      8.8.8.8
```

### Time Synchronization

- **Time Zone**: Select local timezone
- **NTP Server**: Network time server address
- **Sync Interval**: Auto-sync frequency (hours)
- **Manual Time Set**: Set time manually

### Communication Settings

- **Polling Interval**: Data refresh rate (seconds)
- **Connection Timeout**: Maximum wait time (seconds)
- **Max Concurrent Requests**: Limit simultaneous queries
- **Auto-Reconnect**: Enable automatic reconnection

## Hardware Configuration

### Input/Output Settings

Configure physical I/O points:

- **Input Range**: Voltage/current range (0-10V, 4-20mA)
- **Filter Time**: Signal smoothing (seconds)
- **Calibration**: Offset and gain adjustments
- **Units**: Engineering units (°F, °C, PSI, etc.)

## Feature Flags

Enable/disable device features:

- ☑️ **Trend Logging**: Historical data collection
- ☑️ **Alarms**: Enable alarm notifications
- ☑️ **Schedules**: Time-based control
- ☑️ **Remote Access**: Allow remote connections
- ☑️ **DHCP**: Dynamic IP assignment

## Advanced Settings

### Security

- **Password Protection**: Enable device password
- **User Management**: Configure user accounts
- **Access Control**: Set permission levels
- **Encryption**: Enable data encryption

### Performance

- **Cache Duration**: Local data caching (seconds)
- **Buffer Size**: Communication buffer (bytes)
- **Priority Levels**: Request prioritization
- **Queue Management**: Request queue settings

## Saving Configuration

1. Make desired changes
2. Click **Apply** to test settings
3. Click **Save** to persist changes
4. Device may restart if required

⚠️ **Warning**: Some settings require device restart and may cause temporary disconnection.

## Configuration Backup

### Export Settings

1. Go to **Settings** > **Backup**
2. Click **Export Configuration**
3. Save JSON file to secure location

### Import Settings

1. Go to **Settings** > **Restore**
2. Click **Choose File**
3. Select previously exported JSON file
4. Click **Import** to restore settings

## Best Practices

1. **Document Changes**: Keep log of configuration modifications
2. **Test Before Production**: Verify settings in test environment
3. **Backup Regularly**: Export configuration before major changes
4. **Version Control**: Track firmware and configuration versions
5. **Review Logs**: Check system logs after configuration changes

## Next Steps

- [Device Monitoring](./device-monitoring) - Monitor device operation
- [Troubleshooting](./device-troubleshooting) - Resolve configuration issues
