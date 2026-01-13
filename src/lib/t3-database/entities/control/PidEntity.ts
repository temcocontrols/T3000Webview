/**
 * PidEntity - PID_TABLE table operations
 * Device-scoped entity (SerialNumber + Pid_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Pid } from '../../types/control.types';
import { BatchSaveResponse } from '../../types/points.types';

export class PidEntity extends BaseEntity<Pid> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/pids`;
  }

  async get(serialNumber: number, pidId: number): Promise<Pid | null> {
    const url = this.buildUrl(`${serialNumber}/${pidId}`);
    try {
      return await this.getData<Pid>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<Pid[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Pid[]>(url);
  }

  async update(serialNumber: number, pidId: number, data: Partial<Pid>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${pidId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<Pid, 'SerialNumber' | 'Pid_ID'>): Promise<Pid> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<Pid>(url, data);
  }

  async delete(serialNumber: number, pidId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${pidId}`);
    await this.deleteData<void>(url);
  }

  /**
   * Batch save PIDs (for efficient bulk updates from C++ GET_WEBVIEW_LIST)
   */
  async batchSave(serialNumber: number, pids: Pid[]): Promise<BatchSaveResponse> {
    const url = `${this.buildUrl(String(serialNumber))}/batch_save`;
    const request = { pids }; // Backend expects {pids: [...]}
    return await this.postData<BatchSaveResponse>(url, request);
  }
}
