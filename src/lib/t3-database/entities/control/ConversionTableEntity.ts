/**
 * ConversionTableEntity - CONVERSION_TABLES table operations
 * Device-scoped entity (SerialNumber + Table_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { ConversionTable } from '../../types/control.types';

export class ConversionTableEntity extends BaseEntity<ConversionTable> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/conversion_tables`;
  }

  async get(serialNumber: number, tableId: number): Promise<ConversionTable | null> {
    const url = this.buildUrl(`${serialNumber}/${tableId}`);
    try {
      return await this.getData<ConversionTable>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<ConversionTable[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<ConversionTable[]>(url);
  }

  async update(serialNumber: number, tableId: number, data: Partial<ConversionTable>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${tableId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<ConversionTable, 'SerialNumber' | 'Table_ID'>): Promise<ConversionTable> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<ConversionTable>(url, data);
  }

  async delete(serialNumber: number, tableId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${tableId}`);
    await this.deleteData<void>(url);
  }
}
