# Installation Guide

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
