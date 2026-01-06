# Configuration Guide

Learn how to configure T3000 for your building automation needs.

## Initial Configuration

After installation, configure these essential settings.

### Network Settings

Navigate to **Settings** → **Network**

**IP Configuration**
```
Network Adapter: [Select your adapter]
IP Address Range: 192.168.1.1 - 192.168.1.254
Subnet Mask: 255.255.255.0
Gateway: 192.168.1.1
```

**Protocol Settings**
- ✓ Enable Modbus TCP (Port 502)
- ✓ Enable BACnet (Port 47808)
- ○ Enable HTTP API (Port 8080)

### Database Settings

**Location**
```
Default: C:\ProgramData\Temco\T3000\Database
```

**Backup**
- Enable automatic backups: ✓
- Backup frequency: Daily at 2:00 AM
- Keep backups for: 30 days
- Backup location: `C:\Backups\T3000`

### User Management

Create user accounts with appropriate permissions.

**Administrator Account**
- Full access to all features
- Can create/modify users
- Can change system settings

**Operator Account**
- View and control data points
- Cannot modify device settings
- Cannot add/remove devices

**Viewer Account**
- Read-only access
- Can view dashboards and trends
- Cannot make changes

## Communication Protocols

### Modbus Configuration

**Modbus TCP/IP**
```yaml
Protocol: Modbus TCP
Port: 502
Timeout: 5000 ms
Retries: 3
Poll Rate: 1000 ms
```

**Modbus RTU (Serial)**
```yaml
Port: COM1
Baud Rate: 19200
Data Bits: 8
Parity: None
Stop Bits: 1
```

### BACnet Configuration

```yaml
Protocol: BACnet/IP
Port: 47808
Device Instance: 389001
Network Number: 0
Max APDU: 1476
```

## System Preferences

### Display Settings

- **Temperature Units**: °F / °C
- **Time Format**: 12-hour / 24-hour
- **Date Format**: MM/DD/YYYY
- **Decimal Places**: 1

### Alarm Settings

**Email Notifications**
```
SMTP Server: smtp.gmail.com
Port: 587
Username: alerts@yourdomain.com
Use TLS: ✓
```

**Alert Priorities**
- Critical: Immediate notification
- High: Within 5 minutes
- Medium: Within 15 minutes
- Low: Daily summary

### Data Logging

**Trend Log Settings**
- Sample interval: 1 minute (adjustable)
- Storage period: 1 year
- Auto-archive: Enabled
- Compression: Enabled

## Security Settings

### Password Policy

- Minimum length: 8 characters
- Require uppercase: ✓
- Require numbers: ✓
- Require symbols: ○
- Password expiry: 90 days

### Session Settings

- Timeout: 30 minutes
- Concurrent logins: Allowed
- Remember last login: ✓

## Performance Optimization

### Polling Optimization

Balance between real-time updates and network load:

| Device Count | Recommended Poll Rate |
|--------------|----------------------|
| 1-10         | 1000 ms             |
| 11-50        | 2000 ms             |
| 51-100       | 5000 ms             |
| 100+         | 10000 ms            |

### Database Maintenance

Schedule regular maintenance:
- **Compact database**: Weekly
- **Rebuild indexes**: Monthly
- **Clear old logs**: Quarterly

## Exporting/Importing Configuration

### Export Settings

1. Go to **Settings** → **System**
2. Click **Export Configuration**
3. Save as `T3000_Config_Backup.json`

### Import Settings

1. Go to **Settings** → **System**
2. Click **Import Configuration**
3. Select saved `.json` file
4. Restart application when prompted

## Next Steps

- [Connecting Devices](../device-management/connecting-devices)
- [Creating Graphics](../features/graphics)
- [Setting Up Schedules](../features/schedules)

## Configuration Best Practices

✅ **Do:**
- Back up configuration regularly
- Use strong passwords
- Enable audit logging
- Test network connectivity before adding devices

❌ **Don't:**
- Use default passwords in production
- Disable security features without reason
- Set poll rates too aggressively
- Ignore backup alerts
