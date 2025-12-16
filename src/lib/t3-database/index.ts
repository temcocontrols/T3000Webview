/**
 * T3-Database Library - Public API
 * TypeScript database access library for T3000 WebView9
 *
 * @example
 * ```typescript
 * import { T3Database } from '@/lib/t3-database';
 *
 * const db = new T3Database('/api');
 *
 * // Get all inputs
 * const inputs = await db.inputs.getAll(12345);
 *
 * // Update single input
 * await db.inputs.update(12345, 5, { fValue: 25.5 });
 *
 * // Batch save
 * await db.inputs.batchSave(12345, inputsArray);
 * ```
 */

// Main class
export { T3Database, createT3Database } from './core/T3Database';

// Entities - Device and Points
export { DeviceEntity } from './entities/device/DeviceEntity';
export { InputEntity } from './entities/points/InputEntity';
export { OutputEntity } from './entities/points/OutputEntity';
export { VariableEntity } from './entities/points/VariableEntity';

// Entities - Device Settings (1:1)
export { DeviceNetworkEntity } from './entities/device/DeviceNetworkEntity';
export { DeviceCommunicationEntity } from './entities/device/DeviceCommunicationEntity';
export { DeviceProtocolEntity } from './entities/device/DeviceProtocolEntity';
export { DeviceTimeEntity } from './entities/device/DeviceTimeEntity';
export { DeviceDynDnsEntity } from './entities/device/DeviceDynDnsEntity';
export { DeviceHardwareEntity } from './entities/device/DeviceHardwareEntity';
export { DeviceFeatureEntity } from './entities/device/DeviceFeatureEntity';
export { DeviceWifiEntity } from './entities/device/DeviceWifiEntity';
export { DeviceMiscEntity } from './entities/device/DeviceMiscEntity';
export { RemoteTstatDbEntity } from './entities/device/RemoteTstatDbEntity';

// Entities - Control
export { ProgramEntity } from './entities/control/ProgramEntity';
export { ScheduleEntity } from './entities/control/ScheduleEntity';
export { PidEntity } from './entities/control/PidEntity';
export { HolidayEntity } from './entities/control/HolidayEntity';
export { ArrayEntity } from './entities/control/ArrayEntity';
export { ConversionTableEntity } from './entities/control/ConversionTableEntity';
export { CustomUnitEntity } from './entities/control/CustomUnitEntity';
export { VariableUnitEntity } from './entities/control/VariableUnitEntity';

// Entities - Graphics
export { GraphicEntity } from './entities/graphics/GraphicEntity';
export { GraphicLabelEntity } from './entities/graphics/GraphicLabelEntity';
export { MsvEntity } from './entities/graphics/MsvEntity';

// Entities - Alarms
export { AlarmEntity } from './entities/alarms/AlarmEntity';
export { AlarmSettingEntity } from './entities/alarms/AlarmSettingEntity';
export { EmailAlarmEntity } from './entities/alarms/EmailAlarmEntity';

// Entities - Monitoring
export { MonitorDataEntity } from './entities/monitoring/MonitorDataEntity';

// Entities - Trendlog
export { TrendlogEntity } from './entities/trendlog/TrendlogEntity';
export { TrendlogInputEntity } from './entities/trendlog/TrendlogInputEntity';
export { TrendlogViewEntity } from './entities/trendlog/TrendlogViewEntity';
export { TrendlogDataEntity } from './entities/trendlog/TrendlogDataEntity';
export { TrendlogDataDetailEntity } from './entities/trendlog/TrendlogDataDetailEntity';
export { TrendlogSyncMetadataEntity } from './entities/trendlog/TrendlogSyncMetadataEntity';

// Entities - User
export { UserEntity } from './entities/user/UserEntity';
export { RemotePointEntity } from './entities/user/RemotePointEntity';

// Entities - Expansion
export { ExtIoDeviceEntity } from './entities/expansion/ExtIoDeviceEntity';
export { TstatScheduleEntity } from './entities/expansion/TstatScheduleEntity';

// Entities - System
export { ApplicationConfigEntity } from './entities/system/ApplicationConfigEntity';
export { ApplicationConfigHistoryEntity } from './entities/system/ApplicationConfigHistoryEntity';
export { DatabasePartitionConfigEntity } from './entities/system/DatabasePartitionConfigEntity';
export { DatabaseFileEntity } from './entities/system/DatabaseFileEntity';
export { DatabasePartitionEntity } from './entities/system/DatabasePartitionEntity';

// Base classes (for extending)
export { BaseEntity, CrudEntity } from './entities/base/BaseEntity';

// Type definitions
export type {
  Device,
  NetworkSettings,
  CommunicationSettings,
  ProtocolSettings,
  TimeSettings,
  DynDnsSettings,
  HardwareInfo,
  FeatureFlags,
  WifiSettings,
  MiscSettings,
} from './types/device.types';

export type {
  Input,
  Output,
  Variable,
  BatchSaveRequest,
  BatchSaveResponse,
} from './types/points.types';

// Utilities
export { HttpClient, createHttpClient } from './utils/T3ApiClient';
export type { HttpClientConfig } from './utils/T3ApiClient';

// TODO: Export remaining 40 entities and their types as they are implemented
// export { ProgramEntity } from './entities/control/ProgramEntity';
// export { ScheduleEntity } from './entities/control/ScheduleEntity';
// ... etc

// Version
export const VERSION = '1.0.0';
