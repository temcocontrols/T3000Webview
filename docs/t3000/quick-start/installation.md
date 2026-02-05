# Installation Guide

<!-- USER-GUIDE -->

This guide walks you through installing T3000 Building Automation System on your Windows computer.

## System Requirements

### Minimum Requirements
- **OS**: Windows 10 (64-bit)
- **Processor**: Intel Core i3 or equivalent
- **RAM**: 4 GB
- **Storage**: 500 MB available space
- **Network**: Ethernet or Wi-Fi adapter

### Recommended Requirements
- **OS**: Windows 11 (64-bit)
- **Processor**: Intel Core i5 or better
- **RAM**: 8 GB or more
- **Storage**: 1 GB SSD space
- **Network**: Gigabit Ethernet adapter

## Installation Steps

### 1. Download the Installer

Visit the official website to download the latest version:
```
https://temcocontrols.com/downloads/t3000
```

Select the appropriate version for your system architecture (x64).

### 2. Run the Installer

1. Locate the downloaded file: `T3000_Setup_v9.0.exe`
2. Right-click and select **Run as Administrator**
3. If prompted by User Account Control, click **Yes**

### 3. Follow the Installation Wizard

**Welcome Screen**
- Click **Next** to continue

**License Agreement**
- Read the terms and conditions
- Select **I accept the agreement**
- Click **Next**

**Choose Install Location**
- Default: `C:\Program Files\Temco Controls\T3000`
- Click **Browse** to change location (optional)
- Click **Next**

**Select Components**
- ✓ T3000 Application (Required)
- ✓ USB Drivers (Recommended)
- ✓ Documentation (Optional)
- ✓ Sample Projects (Optional)
- Click **Next**

**Start Menu Folder**
- Default: `Temco Controls\T3000`
- Click **Next**

**Additional Tasks**
- ✓ Create desktop shortcut
- ✓ Create Quick Launch icon
- Click **Next**

**Ready to Install**
- Review your selections
- Click **Install**

### 4. Complete Installation

Wait for the installation to complete (typically 2-3 minutes).

When finished:
- Click **Finish** to exit the installer
- Optionally select **Launch T3000** to start the application

## Post-Installation Configuration

### First Launch

When you launch T3000 for the first time:

1. **License Activation**
   - Enter your license key (provided with purchase)
   - Or select **Trial Mode** for evaluation (30 days)

2. **Initial Configuration Wizard**
   - Select your network adapter
   - Choose default communication protocol
   - Set up database location

3. **User Account**
   - Create administrator account
   - Set password (minimum 8 characters)

### Verify Installation

To verify T3000 is installed correctly:

1. Click **Help** → **About**
2. Check version number matches downloaded version
3. Verify all components are listed

## Installing USB Drivers

If you need to connect via USB-RS485 adapters:

1. Connect the USB adapter
2. Windows will attempt to install drivers automatically
3. If manual installation is needed:
   - Open **Device Manager**
   - Locate the device under **Ports (COM & LPT)**
   - Right-click and select **Update Driver**
   - Browse to: `C:\Program Files\Temco Controls\T3000\Drivers\USB`

## Firewall Configuration

Add firewall exceptions for T3000:

1. Open **Windows Defender Firewall**
2. Click **Allow an app through firewall**
3. Click **Change settings**
4. Find **T3000** in the list
5. Check both **Private** and **Public** networks
6. Click **OK**

Or add manually:
- Port **502** (Modbus TCP)
- Port **47808** (BACnet)

## Updating T3000

To update to a newer version:

1. Download the latest installer
2. Run the installer (existing installation will be detected)
3. Select **Upgrade** when prompted
4. Your settings and data will be preserved

## Uninstalling

To remove T3000:

1. Go to **Settings** → **Apps** → **Installed apps**
2. Find **T3000 Building Automation System**
3. Click **Uninstall**
4. Follow the uninstall wizard

**Note**: Your project files and database will be preserved unless you explicitly choose to delete them.

## Troubleshooting Installation Issues

### Installation Fails

- Ensure you have administrator privileges
- Temporarily disable antivirus software
- Check available disk space
- Download installer again (may be corrupted)

### USB Drivers Not Working

- Try different USB port
- Reinstall USB drivers manually
- Check for Windows updates

### Application Won't Start

- Right-click and **Run as Administrator**
- Check Windows Event Viewer for errors
- Verify .NET Framework is installed

## Next Steps

- [Configuration Guide](configuration) - Set up your system
- [Connecting Devices](../device-management/connecting-devices) - Add your first device

## Support

For installation support:
- Email: support@temcocontrols.com
- Phone: 1-800-TEMCO-00
- Online: https://support.temcocontrols.com

<!-- TECHNICAL -->

# Installation Guide

## Automated Installation

### Silent Installation

```powershell
# Silent install with default options
.\T3000_Setup_v9.0.exe /S

# Silent install with custom path
.\T3000_Setup_v9.0.exe /S /D=C:\CustomPath\T3000

# Install with specific components
.\T3000_Setup_v9.0.exe /S /COMPONENTS="core,drivers,docs"
```

### Command-Line Parameters

```bash
/S              # Silent mode
/D=path         # Installation directory
/COMPONENTS=x   # Component selection
/NOICONS        # Don't create shortcuts
/PORTABLE       # Portable installation
/LOG=file.txt   # Enable installation logging
```

## System Dependencies

### Required Runtimes

```powershell
# Check .NET installation
dotnet --list-runtimes

# Install .NET 7.0 Runtime
winget install Microsoft.DotNet.Runtime.7

# Verify Windows version
[System.Environment]::OSVersion.Version
```

### Network Stack Requirements

```yaml
Required Services:
  - Windows Firewall Service (MpsSvc)
  - TCP/IP NetBIOS Helper (lmhosts)
  - Network Location Awareness (NlaSvc)

Required Protocols:
  - TCP/IPv4
  - UDP
  - IGMP (for BACnet broadcast)
```

## Docker Installation

```dockerfile
# Dockerfile for T3000 Server
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Install dependencies
RUN powershell -Command \
    Install-WindowsFeature -Name NET-Framework-45-Core

# Copy installer
COPY T3000_Setup_v9.0.exe C:\Temp\

# Run silent installation
RUN C:\Temp\T3000_Setup_v9.0.exe /S /D=C:\T3000

# Expose ports
EXPOSE 502 9103 47808/udp

# Start T3000 service
CMD ["C:\\T3000\\T3000Service.exe"]
```

Build and run:
```bash
docker build -t t3000-server .
docker run -d -p 502:502 -p 9103:9103 -p 47808:47808/udp t3000-server
```

## Registry Configuration

### Installation Registry Keys

```powershell
# Installation path
$regPath = "HKLM:\SOFTWARE\Temco Controls\T3000"
Get-ItemProperty -Path $regPath -Name "InstallPath"

# Version information
Get-ItemProperty -Path $regPath -Name "Version"
Get-ItemProperty -Path $regPath -Name "BuildNumber"

# License information
Get-ItemProperty -Path $regPath -Name "LicenseKey"
Get-ItemProperty -Path $regPath -Name "LicenseType"
```

### Firewall Rules via PowerShell

```powershell
# Create firewall rules programmatically
New-NetFirewallRule -DisplayName "T3000 Modbus TCP" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 502 `
  -Action Allow

New-NetFirewallRule -DisplayName "T3000 BACnet/IP" `
  -Direction Inbound `
  -Protocol UDP `
  -LocalPort 47808 `
  -Action Allow

New-NetFirewallRule -DisplayName "T3000 API Server" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 9103 `
  -Action Allow
```

## Database Initialization

### SQLite Database Setup

```sql
-- Default database location
-- C:\ProgramData\Temco\T3000\t3000.db

-- Initialize database schema
.read schema.sql

-- Create indexes for performance
CREATE INDEX idx_devices_serial ON devices(serial_number);
CREATE INDEX idx_points_device ON data_points(device_id);
CREATE INDEX idx_trends_time ON trend_data(timestamp);

-- Set database parameters
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
```

### Database Migration Script

```typescript
import Database from 'better-sqlite3';

const db = new Database('t3000.db');

// Run migrations
const migrations = [
  `CREATE TABLE IF NOT EXISTS devices (...)`,
  `CREATE TABLE IF NOT EXISTS data_points (...)`,
  `CREATE TABLE IF NOT EXISTS trend_data (...)`
];

for (const migration of migrations) {
  db.exec(migration);
}

console.log('Database initialized');
```

## Environment Variables

```powershell
# Set T3000 environment variables
[Environment]::SetEnvironmentVariable(
  "T3000_HOME",
  "C:\Program Files\Temco Controls\T3000",
  "Machine"
)

[Environment]::SetEnvironmentVariable(
  "T3000_DATA",
  "C:\ProgramData\Temco\T3000",
  "Machine"
)

[Environment]::SetEnvironmentVariable(
  "T3000_PORT",
  "9103",
  "Machine"
)
```

## Service Installation

### Install as Windows Service

```powershell
# Create service
New-Service -Name "T3000Service" `
  -BinaryPathName "C:\Program Files\Temco Controls\T3000\T3000Service.exe" `
  -DisplayName "T3000 Building Automation Service" `
  -Description "T3000 BACnet and Modbus communication service" `
  -StartupType Automatic

# Start service
Start-Service -Name "T3000Service"

# Check status
Get-Service -Name "T3000Service"
```

### Service Configuration

```xml
<!-- Service configuration file -->
<service>
  <id>T3000Service</id>
  <name>T3000 Building Automation</name>
  <description>BACnet/Modbus communication service</description>
  <executable>T3000Service.exe</executable>
  <startmode>Automatic</startmode>
  <delayedAutoStart>false</delayedAutoStart>
  <priority>Normal</priority>
  <stoptimeout>15000</stoptimeout>
</service>
```

## Verification Script

```powershell
# Post-installation verification
function Test-T3000Installation {
    $checks = @{
        "Installation Path" = Test-Path "C:\Program Files\Temco Controls\T3000"
        "Executable" = Test-Path "C:\Program Files\Temco Controls\T3000\T3000.exe"
        "Database" = Test-Path "C:\ProgramData\Temco\T3000\t3000.db"
        "Modbus Port" = Test-NetConnection -Port 502 -ComputerName localhost
        "BACnet Port" = Test-NetConnection -Port 47808 -ComputerName localhost
        "API Port" = Test-NetConnection -Port 9103 -ComputerName localhost
    }

    $checks.GetEnumerator() | ForEach-Object {
        Write-Host "$($_.Key): $($_.Value)"
    }
}

Test-T3000Installation
```

## Next Steps

- [Configuration API](configuration) - Programmatic configuration
- [REST API](../api-reference/rest-api) - API integration
- [WebSocket API](../api-reference/websocket-api) - Real-time communication

## System Requirements

### Minimum Requirements
- **OS**: Windows 10 (64-bit)
- **Processor**: Intel Core i3 or equivalent
- **RAM**: 4 GB
- **Storage**: 500 MB available space
- **Network**: Ethernet or Wi-Fi adapter

### Recommended Requirements
- **OS**: Windows 11 (64-bit)
- **Processor**: Intel Core i5 or better
- **RAM**: 8 GB or more
- **Storage**: 1 GB SSD space
- **Network**: Gigabit Ethernet adapter

## Installation Steps

### 1. Download the Installer

Visit the official website to download the latest version:
```
https://temcocontrols.com/downloads/t3000
```

Select the appropriate version for your system architecture (x64).

### 2. Run the Installer

1. Locate the downloaded file: `T3000_Setup_v9.0.exe`
2. Right-click and select **Run as Administrator**
3. If prompted by User Account Control, click **Yes**

### 3. Follow the Installation Wizard

**Welcome Screen**
- Click **Next** to continue

**License Agreement**
- Read the terms and conditions
- Select **I accept the agreement**
- Click **Next**

**Choose Install Location**
- Default: `C:\Program Files\Temco Controls\T3000`
- Click **Browse** to change location (optional)
- Click **Next**

**Select Components**
- ✓ T3000 Application (Required)
- ✓ USB Drivers (Recommended)
- ✓ Documentation (Optional)
- ✓ Sample Projects (Optional)
- Click **Next**

**Start Menu Folder**
- Default: `Temco Controls\T3000`
- Click **Next**

**Additional Tasks**
- ✓ Create desktop shortcut
- ✓ Create Quick Launch icon
- Click **Next**

**Ready to Install**
- Review your selections
- Click **Install**

### 4. Complete Installation

Wait for the installation to complete (typically 2-3 minutes).

When finished:
- Click **Finish** to exit the installer
- Optionally select **Launch T3000** to start the application

## Post-Installation Configuration

### First Launch

When you launch T3000 for the first time:

1. **License Activation**
   - Enter your license key (provided with purchase)
   - Or select **Trial Mode** for evaluation (30 days)

2. **Initial Configuration Wizard**
   - Select your network adapter
   - Choose default communication protocol
   - Set up database location

3. **User Account**
   - Create administrator account
   - Set password (minimum 8 characters)

### Verify Installation

To verify T3000 is installed correctly:

1. Click **Help** → **About**
2. Check version number matches downloaded version
3. Verify all components are listed

## Installing USB Drivers

If you need to connect via USB-RS485 adapters:

1. Connect the USB adapter
2. Windows will attempt to install drivers automatically
3. If manual installation is needed:
   - Open **Device Manager**
   - Locate the device under **Ports (COM & LPT)**
   - Right-click and select **Update Driver**
   - Browse to: `C:\Program Files\Temco Controls\T3000\Drivers\USB`

## Firewall Configuration

Add firewall exceptions for T3000:

1. Open **Windows Defender Firewall**
2. Click **Allow an app through firewall**
3. Click **Change settings**
4. Find **T3000** in the list
5. Check both **Private** and **Public** networks
6. Click **OK**

Or add manually:
- Port **502** (Modbus TCP)
- Port **47808** (BACnet)

## Updating T3000

To update to a newer version:

1. Download the latest installer
2. Run the installer (existing installation will be detected)
3. Select **Upgrade** when prompted
4. Your settings and data will be preserved

## Uninstalling

To remove T3000:

1. Go to **Settings** → **Apps** → **Installed apps**
2. Find **T3000 Building Automation System**
3. Click **Uninstall**
4. Follow the uninstall wizard

**Note**: Your project files and database will be preserved unless you explicitly choose to delete them.

## Troubleshooting Installation Issues

### Installation Fails

- Ensure you have administrator privileges
- Temporarily disable antivirus software
- Check available disk space
- Download installer again (may be corrupted)

### USB Drivers Not Working

- Try different USB port
- Reinstall USB drivers manually
- Check for Windows updates

### Application Won't Start

- Right-click and **Run as Administrator**
- Check Windows Event Viewer for errors
- Verify .NET Framework is installed

## Next Steps

- [Configuration Guide](configuration) - Set up your system
- [Connecting Devices](../device-management/connecting-devices) - Add your first device

## Support

For installation support:
- Email: support@temcocontrols.com
- Phone: 1-800-TEMCO-00
- Online: https://support.temcocontrols.com
