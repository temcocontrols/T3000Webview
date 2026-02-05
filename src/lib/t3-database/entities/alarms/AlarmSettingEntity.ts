/**
 * AlarmSettingEntity - ALARM_SETTINGS table operations
 * Device-scoped entity (SerialNumber + Setting_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { AlarmSetting } from '../../types/alarms.types';

export class AlarmSettingEntity extends BaseEntity<AlarmSetting> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/alarm_settings`;
  }

  async get(serialNumber: number, settingId: number): Promise<AlarmSetting | null> {
    const url = this.buildUrl(`${serialNumber}/${settingId}`);
    try {
      return await this.getData<AlarmSetting>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<AlarmSetting[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<AlarmSetting[]>(url);
  }

  async update(serialNumber: number, settingId: number, data: Partial<AlarmSetting>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${settingId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<AlarmSetting, 'SerialNumber' | 'Setting_ID'>): Promise<AlarmSetting> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<AlarmSetting>(url, data);
  }

  async delete(serialNumber: number, settingId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${settingId}`);
    await this.deleteData<void>(url);
  }
}
