# Status Bar Component

## Overview

The Status Bar is a persistent bottom bar component that displays connection information, communication statistics, and status messages throughout the T3000 application. It matches the C++ T3000 desktop application's status bar implementation.

## Architecture

Based on `MainFrm.cpp` from the C++ codebase, the status bar has 4 panes:

| Pane | Width | Purpose | Example |
|------|-------|---------|---------|
| **Pane 0** | 200px | RX/TX Statistics | `RX: 1234 TX: 5678` |
| **Pane 1** | 250px | Building/Device Info | `Main Building / Tstat-101` |
| **Pane 2** | Flex | Protocol Info | `BACnet IP / 192.168.1.100` |
| **Pane 3** | 400px | Status Messages | `Device connected successfully` |

## Usage

### 1. Import the Store

```typescript
import { useStatusBarStore } from '@t3-react/store';
```

### 2. Use in Components

```typescript
export const MyComponent: React.FC = () => {
  // Get store actions
  const setMessage = useStatusBarStore((state) => state.setMessage);
  const setConnection = useStatusBarStore((state) => state.setConnection);
  const setProtocol = useStatusBarStore((state) => state.setProtocol);
  const incrementRx = useStatusBarStore((state) => state.incrementRx);
  const incrementTx = useStatusBarStore((state) => state.incrementTx);

  // Update status when connecting to device
  const handleConnect = async () => {
    try {
      await connectToDevice();
      setConnection('Main Building', 'Tstat-101');
      setProtocol('BACnet IP', '192.168.1.100');
      setMessage('Connected successfully');
    } catch (error) {
      setMessage('Connection failed');
    }
  };

  // Increment counters when sending/receiving data
  const handleDataTransfer = () => {
    incrementRx(); // Increment receive counter
    incrementTx(); // Increment transmit counter
    setMessage('Data synced');
  };

  return (
    <div>
      <Button onClick={handleConnect}>Connect</Button>
    </div>
  );
};
```

## Store API

### State

- `rxCount: number` - Number of packets/messages received
- `txCount: number` - Number of packets/messages transmitted
- `buildingName: string` - Current building name
- `deviceName: string` - Current device name
- `protocol: string` - Current protocol (e.g., "BACnet IP", "Modbus RTU")
- `connectionType: string` - Connection details (e.g., IP address, COM port)
- `message: string` - Current status message

### Actions

#### `incrementRx()`
Increment the RX counter by 1.

```typescript
incrementRx();
```

#### `incrementTx()`
Increment the TX counter by 1.

```typescript
incrementTx();
```

#### `setRxTx(rx: number, tx: number)`
Set both RX and TX counters at once.

```typescript
setRxTx(100, 200);
```

#### `setConnection(building: string, device: string)`
Update the building and device name.

```typescript
setConnection('Main Building', 'Tstat-101');
```

#### `setProtocol(protocol: string, connectionType: string)`
Update the protocol and connection details.

```typescript
setProtocol('BACnet IP', '192.168.1.100:47808');
setProtocol('Modbus RTU', 'COM5 @ 19200');
```

#### `setMessage(message: string)`
Update the status message.

```typescript
setMessage('Device connected successfully');
setMessage('Scanning for devices...');
setMessage('Ready');
```

#### `reset()`
Reset all status bar values to defaults.

```typescript
reset();
```

## Common Patterns

### Device Connection Flow

```typescript
// When connecting
setMessage('Connecting to device...');
setConnection('', ''); // Clear previous connection

// After successful connection
setConnection(buildingName, deviceName);
setProtocol('BACnet IP', ipAddress);
setMessage('Connected successfully');

// When disconnecting
setConnection('', '');
setProtocol('', '');
setMessage('Disconnected');
```

### Data Polling/Syncing

```typescript
const pollDevice = async () => {
  try {
    setMessage('Polling device data...');

    const data = await fetchDeviceData();
    incrementRx(); // Received data

    await updateDatabase(data);
    incrementTx(); // Sent acknowledgment

    setMessage(`Last poll: ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    setMessage('Polling failed');
  }
};
```

### Bulk Operations

```typescript
const syncAllDevices = async () => {
  setMessage(`Syncing ${devices.length} devices...`);

  for (const device of devices) {
    await syncDevice(device);
    incrementRx();
    incrementTx();
  }

  setMessage('All devices synced');
};
```

## Styling

The status bar uses the following styling to match Azure Portal and C++ T3000:

- Height: 24px
- Font: Segoe UI, 11px
- Background: #f0f0f0
- Border: 1px solid #d1d1d1

The status bar is automatically rendered at the bottom of every page by the `MainLayout` component.

## Demo

See `DashboardPage.tsx` for a working demo with test buttons to update the status bar.
