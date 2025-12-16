/**
 * EmailAlarmEntity - EMAIL_ALARMS table operations
 * Device-scoped entity (SerialNumber + Email_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { EmailAlarm } from '../../types/alarms.types';

export class EmailAlarmEntity extends BaseEntity<EmailAlarm> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/email_alarms`;
  }

  async get(serialNumber: number, emailId: number): Promise<EmailAlarm | null> {
    const url = this.buildUrl(`${serialNumber}/${emailId}`);
    try {
      return await this.getData<EmailAlarm>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<EmailAlarm[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<EmailAlarm[]>(url);
  }

  async update(serialNumber: number, emailId: number, data: Partial<EmailAlarm>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${emailId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<EmailAlarm, 'SerialNumber' | 'Email_ID'>): Promise<EmailAlarm> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<EmailAlarm>(url, data);
  }

  async delete(serialNumber: number, emailId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${emailId}`);
    await this.deleteData<void>(url);
  }
}
