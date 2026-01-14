/**
 * GraphicEntity - GRAPHICS table operations
 * Device-scoped entity (SerialNumber + Graphic_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Graphic } from '../../types/graphics.types';
import { BatchSaveResponse } from '../../types/points.types';

export class GraphicEntity extends BaseEntity<Graphic> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/graphics`;
  }

  async get(serialNumber: number, graphicId: number): Promise<Graphic | null> {
    const url = this.buildUrl(`${serialNumber}/${graphicId}`);
    try {
      return await this.getData<Graphic>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<Graphic[]> {
    const url = this.buildUrl(String(serialNumber));
    const response = await this.getData<{ success: boolean; count: number; data: Graphic[]; timestamp: string }>(url);
    return response.data || [];
  }

  async update(serialNumber: number, graphicId: number, data: Partial<Graphic>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${graphicId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<Graphic, 'SerialNumber' | 'Graphic_ID'>): Promise<Graphic> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<Graphic>(url, data);
  }

  async delete(serialNumber: number, graphicId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${graphicId}`);
    await this.deleteData<void>(url);
  }

  /**
   * Batch save graphics (for efficient bulk updates from C++ GET_WEBVIEW_LIST)
   */
  async batchSave(serialNumber: number, graphics: Graphic[]): Promise<BatchSaveResponse> {
    const url = `${this.buildUrl(String(serialNumber))}/batch_save`;
    const request = { graphics }; // Backend expects {graphics: [...]}
    return await this.postData<BatchSaveResponse>(url, request);
  }
}
