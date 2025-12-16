/**
 * ApplicationConfigHistoryEntity - APPLICATION_CONFIG_HISTORY table operations
 * Read-only entity (no create/update/delete)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { ApplicationConfigHistory } from '../../types/system.types';

export class ApplicationConfigHistoryEntity extends BaseEntity<ApplicationConfigHistory> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/application_config_history`;
  }

  async get(historyId: number): Promise<ApplicationConfigHistory | null> {
    const url = this.buildUrl(String(historyId));
    try {
      return await this.getData<ApplicationConfigHistory>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(): Promise<ApplicationConfigHistory[]> {
    const url = this.buildUrl('');
    return await this.getData<ApplicationConfigHistory[]>(url);
  }

  async getByKey(configKey: string): Promise<ApplicationConfigHistory[]> {
    const url = this.buildUrl(`key/${configKey}`);
    return await this.getData<ApplicationConfigHistory[]>(url);
  }
}
