/**
 * T3Database - Main Database Access Class
 * Unified API for all 44 database entities
 *
 * Usage:
 *   const db = new T3Database('/api');
 *   const inputs = await db.inputs.getAll(12345);
 *   await db.inputs.update(12345, 5, { fValue: 25.5 });
 */

import { createHttpClient, HttpClient } from '../utils/T3ApiClient';

// Core entities
import { DeviceEntity } from '../entities/device/DeviceEntity';
import { InputEntity } from '../entities/points/InputEntity';
import { OutputEntity } from '../entities/points/OutputEntity';
import { VariableEntity } from '../entities/points/VariableEntity';

// Device settings entities (1:1 relationships)
import { DeviceNetworkEntity } from '../entities/device/DeviceNetworkEntity';
import { DeviceCommunicationEntity } from '../entities/device/DeviceCommunicationEntity';
import { DeviceProtocolEntity } from '../entities/device/DeviceProtocolEntity';
import { DeviceTimeEntity } from '../entities/device/DeviceTimeEntity';
import { DeviceDynDnsEntity } from '../entities/device/DeviceDynDnsEntity';
import { DeviceHardwareEntity } from '../entities/device/DeviceHardwareEntity';
import { DeviceFeatureEntity } from '../entities/device/DeviceFeatureEntity';
import { DeviceWifiEntity } from '../entities/device/DeviceWifiEntity';
import { DeviceMiscEntity } from '../entities/device/DeviceMiscEntity';
import { RemoteTstatDbEntity } from '../entities/device/RemoteTstatDbEntity';

// Control entities
import { ProgramEntity } from '../entities/control/ProgramEntity';
import { ScheduleEntity } from '../entities/control/ScheduleEntity';
import { PidEntity } from '../entities/control/PidEntity';
import { HolidayEntity } from '../entities/control/HolidayEntity';
import { ArrayEntity } from '../entities/control/ArrayEntity';
import { ConversionTableEntity } from '../entities/control/ConversionTableEntity';
import { CustomUnitEntity } from '../entities/control/CustomUnitEntity';
import { VariableUnitEntity } from '../entities/control/VariableUnitEntity';

// Graphics entities
import { GraphicEntity } from '../entities/graphics/GraphicEntity';
import { GraphicLabelEntity } from '../entities/graphics/GraphicLabelEntity';
import { MsvEntity } from '../entities/graphics/MsvEntity';

// Alarm entities
import { AlarmEntity } from '../entities/alarms/AlarmEntity';
import { AlarmSettingEntity } from '../entities/alarms/AlarmSettingEntity';
import { EmailAlarmEntity } from '../entities/alarms/EmailAlarmEntity';

// Monitoring entities
import { MonitorDataEntity } from '../entities/monitoring/MonitorDataEntity';

// Trendlog entities
import { TrendlogEntity } from '../entities/trendlog/TrendlogEntity';
import { TrendlogInputEntity } from '../entities/trendlog/TrendlogInputEntity';
import { TrendlogViewEntity } from '../entities/trendlog/TrendlogViewEntity';
import { TrendlogDataEntity } from '../entities/trendlog/TrendlogDataEntity';
import { TrendlogDataDetailEntity } from '../entities/trendlog/TrendlogDataDetailEntity';
import { TrendlogSyncMetadataEntity } from '../entities/trendlog/TrendlogSyncMetadataEntity';

// User entities
import { UserEntity } from '../entities/user/UserEntity';
import { RemotePointEntity } from '../entities/user/RemotePointEntity';

// Expansion entities
import { ExtIoDeviceEntity } from '../entities/expansion/ExtIoDeviceEntity';
import { TstatScheduleEntity } from '../entities/expansion/TstatScheduleEntity';

// System entities
import { ApplicationConfigEntity } from '../entities/system/ApplicationConfigEntity';
import { ApplicationConfigHistoryEntity } from '../entities/system/ApplicationConfigHistoryEntity';
import { DatabasePartitionConfigEntity } from '../entities/system/DatabasePartitionConfigEntity';
import { DatabaseFileEntity } from '../entities/system/DatabaseFileEntity';
import { DatabasePartitionEntity } from '../entities/system/DatabasePartitionEntity';

export class T3Database {
  private httpClient: HttpClient;
  private baseUrl: string;

  // Core device entity
  public devices: DeviceEntity;

  // Point entities (64 inputs, 64 outputs, 128 variables)
  public inputs: InputEntity;
  public outputs: OutputEntity;
  public variables: VariableEntity;

  // Device settings entities (1:1 with DEVICES)
  public deviceNetwork: DeviceNetworkEntity;
  public deviceCommunication: DeviceCommunicationEntity;
  public deviceProtocol: DeviceProtocolEntity;
  public deviceTime: DeviceTimeEntity;
  public deviceDynDns: DeviceDynDnsEntity;
  public deviceHardware: DeviceHardwareEntity;
  public deviceFeature: DeviceFeatureEntity;
  public deviceWifi: DeviceWifiEntity;
  public deviceMisc: DeviceMiscEntity;
  public remoteTstatDb: RemoteTstatDbEntity;

  // Control entities
  public programs: ProgramEntity;
  public schedules: ScheduleEntity;
  public pids: PidEntity;
  public holidays: HolidayEntity;
  public arrays: ArrayEntity;
  public conversionTables: ConversionTableEntity;
  public customUnits: CustomUnitEntity;
  public variableUnits: VariableUnitEntity;

  // Graphics entities
  public graphics: GraphicEntity;
  public graphicLabels: GraphicLabelEntity;
  public msvData: MsvEntity;

  // Alarm entities
  public alarms: AlarmEntity;
  public alarmSettings: AlarmSettingEntity;
  public emailAlarms: EmailAlarmEntity;

  // Monitoring entities
  public monitorData: MonitorDataEntity;
  public remotePoints: RemotePointEntity;

  // Trendlog entities
  public trendlogs: TrendlogEntity;
  public trendlogInputs: TrendlogInputEntity;
  public trendlogViews: TrendlogViewEntity;
  public trendlogData: TrendlogDataEntity;
  public trendlogDataDetail: TrendlogDataDetailEntity;
  public trendlogSyncMetadata: TrendlogSyncMetadataEntity;

  // User entities
  public users: UserEntity;

  // Expansion entities
  public extIoDevices: ExtIoDeviceEntity;
  public tstatSchedules: TstatScheduleEntity;

  // System entities
  public applicationConfig: ApplicationConfigEntity;
  public applicationConfigHistory: ApplicationConfigHistoryEntity;
  public databasePartitionConfig: DatabasePartitionConfigEntity;
  public databaseFiles: DatabaseFileEntity;
  public databasePartitions: DatabasePartitionEntity;

  /**
   * Create new T3Database instance
   * @param baseUrl - Base URL for API endpoints (default: '/api')
   * @param timeout - Request timeout in milliseconds (default: 30000)
   */
  constructor(baseUrl: string = '/api', timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.httpClient = createHttpClient(baseUrl, { timeout });

    // Initialize core entities
    this.devices = new DeviceEntity(this.httpClient, baseUrl);
    this.inputs = new InputEntity(this.httpClient, baseUrl);
    this.outputs = new OutputEntity(this.httpClient, baseUrl);
    this.variables = new VariableEntity(this.httpClient, baseUrl);

    // Initialize device settings entities
    this.deviceNetwork = new DeviceNetworkEntity(this.httpClient, baseUrl);
    this.deviceCommunication = new DeviceCommunicationEntity(this.httpClient, baseUrl);
    this.deviceProtocol = new DeviceProtocolEntity(this.httpClient, baseUrl);
    this.deviceTime = new DeviceTimeEntity(this.httpClient, baseUrl);
    this.deviceDynDns = new DeviceDynDnsEntity(this.httpClient, baseUrl);
    this.deviceHardware = new DeviceHardwareEntity(this.httpClient, baseUrl);
    this.deviceFeature = new DeviceFeatureEntity(this.httpClient, baseUrl);
    this.deviceWifi = new DeviceWifiEntity(this.httpClient, baseUrl);
    this.deviceMisc = new DeviceMiscEntity(this.httpClient, baseUrl);
    this.remoteTstatDb = new RemoteTstatDbEntity(this.httpClient, baseUrl);

    // Initialize control entities
    this.programs = new ProgramEntity(this.httpClient, baseUrl);
    this.schedules = new ScheduleEntity(this.httpClient, baseUrl);
    this.pids = new PidEntity(this.httpClient, baseUrl);
    this.holidays = new HolidayEntity(this.httpClient, baseUrl);
    this.arrays = new ArrayEntity(this.httpClient, baseUrl);
    this.conversionTables = new ConversionTableEntity(this.httpClient, baseUrl);
    this.customUnits = new CustomUnitEntity(this.httpClient, baseUrl);
    this.variableUnits = new VariableUnitEntity(this.httpClient, baseUrl);

    // Initialize graphics entities
    this.graphics = new GraphicEntity(this.httpClient, baseUrl);
    this.graphicLabels = new GraphicLabelEntity(this.httpClient, baseUrl);
    this.msvData = new MsvEntity(this.httpClient, baseUrl);

    // Initialize alarm entities
    this.alarms = new AlarmEntity(this.httpClient, baseUrl);
    this.alarmSettings = new AlarmSettingEntity(this.httpClient, baseUrl);
    this.emailAlarms = new EmailAlarmEntity(this.httpClient, baseUrl);

    // Initialize monitoring entities
    this.monitorData = new MonitorDataEntity(this.httpClient, baseUrl);
    this.remotePoints = new RemotePointEntity(this.httpClient, baseUrl);

    // Initialize trendlog entities
    this.trendlogs = new TrendlogEntity(this.httpClient, baseUrl);
    this.trendlogInputs = new TrendlogInputEntity(this.httpClient, baseUrl);
    this.trendlogViews = new TrendlogViewEntity(this.httpClient, baseUrl);
    this.trendlogData = new TrendlogDataEntity(this.httpClient, baseUrl);
    this.trendlogDataDetail = new TrendlogDataDetailEntity(this.httpClient, baseUrl);
    this.trendlogSyncMetadata = new TrendlogSyncMetadataEntity(this.httpClient, baseUrl);

    // Initialize user entities
    this.users = new UserEntity(this.httpClient, baseUrl);

    // Initialize expansion entities
    this.extIoDevices = new ExtIoDeviceEntity(this.httpClient, baseUrl);
    this.tstatSchedules = new TstatScheduleEntity(this.httpClient, baseUrl);

    // Initialize system entities
    this.applicationConfig = new ApplicationConfigEntity(this.httpClient, baseUrl);
    this.applicationConfigHistory = new ApplicationConfigHistoryEntity(this.httpClient, baseUrl);
    this.databasePartitionConfig = new DatabasePartitionConfigEntity(this.httpClient, baseUrl);
    this.databaseFiles = new DatabaseFileEntity(this.httpClient, baseUrl);
    this.databasePartitions = new DatabasePartitionEntity(this.httpClient, baseUrl);
  }

  /**
   * Get the underlying HTTP client for advanced usage
   */
  getHttpClient(): HttpClient {
    return this.httpClient;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.devices.getAll();
      return true;
    } catch (error) {
      console.error('[T3Database] Connection test failed:', error);
      return false;
    }
  }
}

/**
 * Factory function for creating T3Database instance
 * @param baseUrl - Base URL for API endpoints
 * @param timeout - Request timeout in milliseconds
 */
export function createT3Database(baseUrl: string = '/api', timeout?: number): T3Database {
  return new T3Database(baseUrl, timeout);
}
