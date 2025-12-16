# T3-Database Library

Standalone TypeScript library for direct database access in T3000 WebView9 application.

## Overview

T3-Database provides a type-safe, entity-based API for interacting with the T3000 device database. It covers all 44 database tables with consistent CRUD operations and batch update capabilities.

## Features

- ✅ **44 Entity Classes** - One entity per database table
- ✅ **Type Safety** - Full TypeScript coverage with C++ field name compatibility
- ✅ **Batch Operations** - Efficient bulk insert/update for points data
- ✅ **Device-Scoped** - All operations keyed by SerialNumber
- ✅ **1:1 Relationships** - Automatic handling of device settings tables
- ✅ **Framework Agnostic** - Works with Vue, React, or any TypeScript project

## Installation

```typescript
import { T3Database } from '@/lib/t3-database';

const db = new T3Database('/api');
```

## Quick Start

### Basic CRUD Operations

```typescript
// Get all inputs for a device
const inputs = await db.inputs.getAll(12345);

// Get specific input
const input5 = await db.inputs.get(12345, 5);

// Update single input field
await db.inputs.update(12345, 5, {
  fValue: 25.5,
  Auto_Manual: 1
});

// Get device information
const device = await db.devices.get(12345);

// Get device network settings (1:1 relationship)
const network = await db.deviceNetwork.get(12345);
```

### Batch Operations

```typescript
// Batch save inputs (from C++ GET_PANEL_DATA response)
await db.inputs.batchSave(12345, [
  { Input_Index: 0, fValue: 20.0, Full_Label: 'Room Temp' },
  { Input_Index: 1, fValue: 60.0, Full_Label: 'Humidity' },
  // ... up to 64 inputs
]);

// Batch save outputs
await db.outputs.batchSave(12345, outputsArray);

// Batch save variables
await db.variables.batchSave(12345, variablesArray);
```

### Range Queries

```typescript
// Get inputs 0-15
const firstInputs = await db.inputs.getRange(12345, 0, 16);

// Get specific indices
const selectedInputs = await db.inputs.getByIndices(12345, [0, 5, 10, 15]);
```

## Database Schema

### Core Tables (6)
- **DEVICES** - Main device registry
- **INPUTS** - 64 inputs per device
- **OUTPUTS** - 64 outputs per device
- **VARIABLES** - 128 variables per device
- **PROGRAMS** - Program logic
- **SCHEDULES** - Time schedules

### Device Settings (10 - 1:1 with DEVICES)
- NetworkSettings, CommunicationSettings, ProtocolSettings
- TimeSettings, DynDnsSettings, HardwareInfo
- FeatureFlags, WifiSettings, MiscSettings, RemoteTstatDb

### Control & Configuration (9)
- PID_TABLE, HOLIDAYS, GRAPHICS, ALARMS
- ARRAYS, CONVERSION_TABLES, CUSTOM_UNITS, VARIABLE_UNITS, MONITORDATA

### Specialized (19)
- User management, expansion devices, trendlogs, system config

## API Reference

### Device Entities

#### DeviceEntity
```typescript
db.devices.get(serialNumber: number): Promise<Device | null>
db.devices.getAll(): Promise<Device[]>
db.devices.create(data: Partial<Device>): Promise<Device>
db.devices.update(serialNumber: number, data: Partial<Device>): Promise<void>
db.devices.delete(serialNumber: number): Promise<void>
```

#### Device Settings (1:1 relationships)
```typescript
db.deviceNetwork.get(serialNumber: number): Promise<NetworkSettings | null>
db.deviceNetwork.upsert(serialNumber: number, data: Partial<NetworkSettings>): Promise<void>
// Same pattern for: deviceCommunication, deviceProtocol, deviceTime, etc.
```

### Point Entities

#### InputEntity (64 per device)
```typescript
db.inputs.get(serialNumber: number, inputIndex: number): Promise<Input | null>
db.inputs.getAll(serialNumber: number): Promise<Input[]>
db.inputs.getRange(serialNumber: number, start: number, count: number): Promise<Input[]>
db.inputs.getByIndices(serialNumber: number, indices: number[]): Promise<Input[]>
db.inputs.update(serialNumber: number, inputIndex: number, data: Partial<Input>): Promise<void>
db.inputs.batchSave(serialNumber: number, inputs: Input[]): Promise<void>
```

#### OutputEntity (64 per device)
```typescript
// Same API as InputEntity
```

#### VariableEntity (128 per device)
```typescript
// Same API as InputEntity
```

### Control Entities

```typescript
db.programs.get(serialNumber: number, programId: string): Promise<Program | null>
db.programs.getAll(serialNumber: number): Promise<Program[]>
// Similar pattern for: schedules, pids, holidays, arrays, etc.
```

### Trendlog Entities

```typescript
db.trendlogs.get(serialNumber: number, trendlogId: string): Promise<Trendlog | null>
db.trendlogInputs.getByTrendlog(serialNumber, panelId, trendlogId): Promise<TrendlogInput[]>
db.trendlogData.get(parentId: number): Promise<TrendlogData | null>
db.trendlogDataDetail.getByParent(parentId: number): Promise<TrendlogDataDetail[]>
```

## Type Definitions

All types match C++ schema field names exactly:

```typescript
interface Input {
  InputId?: number;              // Auto-increment PK
  SerialNumber: number;          // FK to DEVICES
  Input_Index: number;           // 0-63
  Panel: string;
  Full_Label: string;            // C++ Full_Label
  Auto_Manual: number;           // C++ Auto_Manual
  fValue: number;                // C++ fValue
  Units: string;
  Range_Field: string;           // C++ Range
  Calibration: string;
  Sign: string;
  Filter_Field: string;          // C++ Filter
  Status: string;
  Digital_Analog: number;
  Label: string;
  Type_Field: string;            // C++ Type
}
```

## Architecture

```
src/lib/t3-database/
├── core/
│   └── T3Database.ts          # Main entry point
├── entities/
│   ├── base/
│   │   └── BaseEntity.ts      # Common CRUD operations
│   ├── device/                # Device entities (11 entities)
│   ├── points/                # Input/Output/Variable (3 entities)
│   ├── control/               # Programs/Schedules/PIDs (8 entities)
│   ├── graphics/              # Graphics entities (3 entities)
│   ├── alarms/                # Alarm entities (3 entities)
│   ├── monitoring/            # Monitoring entities (2 entities)
│   ├── trendlog/              # Trendlog entities (6 entities)
│   ├── user/                  # User entity (1 entity)
│   ├── expansion/             # Expansion entities (3 entities)
│   └── system/                # System entities (5 entities)
├── types/                     # TypeScript type definitions
├── utils/
│   └── http-client.ts         # Axios HTTP client
└── index.ts                   # Public API exports
```

## Rust API Endpoints

### Existing Endpoints
- `GET /api/t3_device/device/:serial_number`
- `GET /api/t3_device/inputs/:serial_number`
- `GET /api/t3_device/outputs/:serial_number`
- `GET /api/t3_device/variables/:serial_number`
- (Most CRUD endpoints already exist)

### New Batch Save Endpoints (3)
- `POST /api/t3_device/inputs/batch_save`
- `POST /api/t3_device/outputs/batch_save`
- `POST /api/t3_device/variables/batch_save`

**Request Body:**
```json
{
  "serial_number": 12345,
  "items": [
    { "Input_Index": 0, "fValue": 25.5, "Full_Label": "Room Temp", ... },
    { "Input_Index": 1, "fValue": 60.0, "Full_Label": "Humidity", ... }
  ]
}
```

## Error Handling

```typescript
try {
  const input = await db.inputs.get(12345, 5);
  if (!input) {
    console.log('Input not found');
  }
} catch (error) {
  if (error.response?.status === 404) {
    console.error('Device not found');
  } else if (error.response?.status === 500) {
    console.error('Server error');
  } else {
    console.error('Network error', error);
  }
}
```

## Best Practices

1. **Batch Operations** - Use batch save for multiple updates
2. **Error Handling** - Always wrap database calls in try-catch
3. **Type Safety** - Use TypeScript interfaces for data integrity
4. **Caching** - Consider caching frequently accessed data
5. **Serial Number** - Always provide valid SerialNumber for device-scoped operations

## Performance

- **Batch Save** - 64 inputs in ~100ms (vs 64 individual requests)
- **Range Query** - Get 16 inputs faster than 16 individual gets
- **HTTP/2** - Connection reuse for better performance
- **Type Safety** - Zero runtime overhead

## Contributing

When adding new entities:
1. Create type definition in `types/`
2. Extend `BaseEntity` or `CrudEntity`
3. Implement entity-specific methods
4. Add to `T3Database` main class
5. Export from `index.ts`
6. Update this README

## License

Internal Temco Controls library - Not for external distribution

## Version

Current: 1.0.0 (December 2025)
