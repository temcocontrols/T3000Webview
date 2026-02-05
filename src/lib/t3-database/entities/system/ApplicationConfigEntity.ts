/**
 * ApplicationConfigEntity - APPLICATION_CONFIG table operations
 * Standard CRUD entity with Config_Key as primary key
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { ApplicationConfig } from '../../types/system.types';

export class ApplicationConfigEntity extends BaseEntity<ApplicationConfig> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/application_config`;
  }

  async get(configKey: string): Promise<ApplicationConfig | null> {
    const url = this.buildUrl(configKey);
    try {
      return await this.getData<ApplicationConfig>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(): Promise<ApplicationConfig[]> {
    const url = this.buildUrl('');
    return await this.getData<ApplicationConfig[]>(url);
  }

  async update(configKey: string, data: Partial<ApplicationConfig>): Promise<void> {
    const url = this.buildUrl(configKey);
    await this.putData<void>(url, data);
  }

  async upsert(configKey: string, data: Partial<ApplicationConfig>): Promise<void> {
    const url = this.buildUrl(configKey);
    await this.putData<void>(url, { ...data, Config_Key: configKey });
  }

  async delete(configKey: string): Promise<void> {
    const url = this.buildUrl(configKey);
    await this.deleteData<void>(url);
  }
}
