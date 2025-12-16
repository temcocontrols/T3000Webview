/**
 * Base Entity Class
 * Provides common CRUD operations for all database entities
 */

import { HttpClient } from '../../utils/T3ApiClient';

export abstract class BaseEntity<T> {
  protected httpClient: HttpClient;
  protected baseUrl: string;

  constructor(httpClient: HttpClient, baseUrl: string) {
    this.httpClient = httpClient;
    this.baseUrl = baseUrl;
  }

  /**
   * Get endpoint path for this entity
   * Must be implemented by derived classes
   */
  protected abstract getEndpoint(): string;

  /**
   * Build full URL with endpoint
   */
  protected buildUrl(path: string = ''): string {
    const endpoint = this.getEndpoint();
    return path ? `${endpoint}/${path}` : endpoint;
  }

  /**
   * Generic GET request
   */
  protected async getData<R = T>(url: string): Promise<R> {
    try {
      return await this.httpClient.get<R>(url);
    } catch (error) {
      console.error(`[BaseEntity] GET error at ${url}:`, error);
      throw error;
    }
  }

  /**
   * Generic POST request
   */
  protected async postData<R = T>(url: string, data: any): Promise<R> {
    try {
      return await this.httpClient.post<R>(url, data);
    } catch (error) {
      console.error(`[BaseEntity] POST error at ${url}:`, error);
      throw error;
    }
  }

  /**
   * Generic PUT request
   */
  protected async putData<R = T>(url: string, data: any): Promise<R> {
    try {
      return await this.httpClient.put<R>(url, data);
    } catch (error) {
      console.error(`[BaseEntity] PUT error at ${url}:`, error);
      throw error;
    }
  }

  /**
   * Generic PATCH request
   */
  protected async patchData<R = T>(url: string, data: any): Promise<R> {
    try {
      return await this.httpClient.patch<R>(url, data);
    } catch (error) {
      console.error(`[BaseEntity] PATCH error at ${url}:`, error);
      throw error;
    }
  }

  /**
   * Generic DELETE request
   */
  protected async deleteData<R = void>(url: string): Promise<R> {
    try {
      return await this.httpClient.delete<R>(url);
    } catch (error) {
      console.error(`[BaseEntity] DELETE error at ${url}:`, error);
      throw error;
    }
  }
}

/**
 * Base Entity with standard CRUD operations
 * For entities with simple id-based access
 */
export abstract class CrudEntity<T> extends BaseEntity<T> {
  /**
   * Get single record by ID
   */
  async get(id: string | number): Promise<T | null> {
    const url = this.buildUrl(String(id));
    try {
      return await this.getData<T>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all records
   */
  async getAll(): Promise<T[]> {
    const url = this.buildUrl();
    return await this.getData<T[]>(url);
  }

  /**
   * Create new record
   */
  async create(data: Partial<T>): Promise<T> {
    const url = this.buildUrl();
    return await this.postData<T>(url, data);
  }

  /**
   * Update existing record
   */
  async update(id: string | number, data: Partial<T>): Promise<void> {
    const url = this.buildUrl(String(id));
    await this.putData<void>(url, data);
  }

  /**
   * Delete record
   */
  async delete(id: string | number): Promise<void> {
    const url = this.buildUrl(String(id));
    await this.deleteData<void>(url);
  }
}
