# Connecting Devices

Learn how to discover and connect T3000 BACnet devices to your network.

## Overview

The T3000 Web application provides multiple methods to discover and connect to BACnet devices on your network. This guide covers the different connection methods and best practices.

## Discovery Methods

### Auto Discovery

The application automatically scans your network for BACnet devices:

1. Navigate to the **Discover** page from the main menu
2. Click **Scan Network** to start the discovery process
3. Wait for the scan to complete (typically 10-30 seconds)
4. All discovered devices will appear in the device list

**Supported Protocols:**
- BACnet/IP (UDP port 47808)
- BACnet MSTP (serial communication)
- Modbus TCP/IP
- Modbus RTU (serial)

### Manual Connection

To add a device manually:

1. Go to **Devices** > **Add Device**
2. Enter the device information:
   - **IP Address**: Device network address (e.g., 192.168.1.100)
   - **Port**: BACnet port (default: 47808)
   - **Device ID**: BACnet device instance number
   - **Protocol**: Select connection protocol
3. Click **Connect**

## Connection Status

Device connection states:

- 🟢 **Online**: Device is connected and responding
- 🟡 **Connecting**: Attempting to establish connection
- 🔴 **Offline**: Device is not responding
- ⚠️ **Error**: Connection error occurred

## Network Configuration

### IP Address Setup

Ensure your device and computer are on the same network:

```
Device IP:     192.168.1.100
Subnet Mask:   255.255.255.0
Gateway:       192.168.1.1
```

### Firewall Settings

Allow the following ports through your firewall:

- **UDP 47808**: BACnet/IP communication
- **TCP 502**: Modbus TCP
- **TCP 9103**: T3000 API server
- **TCP 3003**: T3000 Web UI

## Troubleshooting

### Device Not Found

1. Verify the device is powered on
2. Check network connectivity (ping the device IP)
3. Ensure firewall allows BACnet traffic
4. Verify correct subnet configuration

### Connection Timeout

- Increase timeout settings in **Settings** > **Communication**
- Check for network congestion
- Verify device is not overloaded with requests

### Authentication Errors

- Verify device password (if authentication enabled)
- Check user permissions
- Ensure device firmware is up to date

## Best Practices

1. **Use Static IP Addresses**: Assign fixed IPs to devices for consistent connectivity
2. **Document Device IDs**: Maintain a list of device IDs and locations
3. **Regular Health Checks**: Monitor connection status regularly
4. **Backup Configuration**: Export device settings periodically
5. **Network Segmentation**: Use VLANs to organize devices by zone/function

## Next Steps

- [Device Configuration](./device-configuration) - Configure device settings
- [Device Monitoring](./device-monitoring) - Monitor device status and data
- [Troubleshooting](./device-troubleshooting) - Resolve common issues
