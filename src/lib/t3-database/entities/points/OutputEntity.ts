/**
 * OutputEntity - OUTPUTS table operations
 * 64 outputs per device (index 0-63)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Output, BatchSaveRequest, BatchSaveResponse } from '../../types/points.types';

export class OutputEntity extends BaseEntity<Output> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/outputs`;
  }

  /**
   * Get single output by serial number and output index
   */
  async get(serialNumber: number, outputIndex: number): Promise<Output | null> {
    const outputs = await this.getAll(serialNumber);
    return outputs.find(output => output.Output_Index === outputIndex) || null;
  }

  /**
   * Get all outputs for a device (0-63)
   */
  async getAll(serialNumber: number): Promise<Output[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Output[]>(url);
  }

  /**
   * Get range of outputs (e.g., outputs 0-15)
   */
  async getRange(serialNumber: number, start: number, count: number): Promise<Output[]> {
    const outputs = await this.getAll(serialNumber);
    return outputs.filter(output =>
      output.Output_Index >= start && output.Output_Index < start + count
    );
  }

  /**
   * Get specific outputs by indices
   */
  async getByIndices(serialNumber: number, indices: number[]): Promise<Output[]> {
    const outputs = await this.getAll(serialNumber);
    const indexSet = new Set(indices);
    return outputs.filter(output => indexSet.has(output.Output_Index));
  }

  /**
   * Update single output
   */
  async update(serialNumber: number, outputIndex: number, data: Partial<Output>): Promise<void> {
    const url = `${this.buildUrl(String(serialNumber))}/${outputIndex}`;
    await this.putData<void>(url, data);
  }

  /**
   * Batch save outputs (NEW ENDPOINT - uses batch_save route)
   */
  async batchSave(serialNumber: number, outputs: Output[]): Promise<BatchSaveResponse> {
    const url = `${this.buildUrl(String(serialNumber))}/batch_save`;
    const request = { outputs }; // Backend expects {outputs: [...]}
    return await this.postData<BatchSaveResponse>(url, request);
  }
}
