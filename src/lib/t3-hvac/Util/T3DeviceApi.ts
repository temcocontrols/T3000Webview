// import { Cookies } from "quasar";
// Placeholder: Quasar Cookies not used in React
const Cookies: any = { get: () => null, set: () => {}, remove: () => {} };
import ky from "ky";

export interface T3DeviceRecord {
  id?: number;
  [key: string]: any;
}

export interface T3DeviceApiResponse<T = any> {
  data?: T[];
  count?: number;
  message?: string;
  total?: number;
  id?: number; // For create operations
  table?: string;
}

export interface T3DeviceCountResponse {
  count: number;
  table: string;
  message: string;
}

export interface T3DeviceQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
}

/**
 * WebView T3000 Database API Client
 * Provides CRUD operations for webview T3000 database tables
 */
export class T3DeviceApi {
  private api: typeof ky;
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.api = ky.create({
      prefixUrl: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        auth: Cookies.get("token") || ''
      },
      hooks: {
        beforeRequest: [
          (request) => {
            const token = Cookies.get("token");
            if (token) {
              request.headers.set("auth", token);
            }
          },
        ],
        afterResponse: [
          (request, options, response) => {
            if (response.status === 401) {
              Cookies.remove("token");
            }
          },
        ],
      },
    });
  }

  /**
   * Get all records from a specific table
   * @param table - Table name (e.g., 'buildings', 'devices', 'input_points')
   * @param params - Query parameters for pagination and search
   */
  async getTableRecords(table: string, params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.per_page) {
      searchParams.set('per_page', params.per_page.toString());
    }
    if (params?.search) {
      searchParams.set('search', params.search);
    }

    const url = `api/t3_device/${table}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await this.api.get(url).json<T3DeviceApiResponse>();

    return {
      data: response.data || [],
      total: response.total || response.count || response.data?.length || 0,
      message: response.message || `Retrieved ${response.total || response.count || response.data?.length || 0} records from ${table}`,
      count: response.total || response.count || response.data?.length || 0
    };
  }

  /**
   * Get count of records in a specific table
   * @param table - Table name
   */
  async getTableCount(table: string): Promise<T3DeviceCountResponse> {
    return await this.api.get(`api/t3_device/${table}/count`).json<T3DeviceCountResponse>();
  }

  /**
   * Create a new record in a specific table
   * @param table - Table name
   * @param data - Record data to create
   */
  async createRecord(table: string, data: T3DeviceRecord): Promise<T3DeviceApiResponse> {
    return await this.api.post(`api/t3_device/${table}`, {
      json: data
    }).json<T3DeviceApiResponse>();
  }

  /**
   * Update an existing record in a specific table
   * @param table - Table name
   * @param id - Record ID
   * @param data - Updated record data
   */
  async updateRecord(table: string, id: number, data: T3DeviceRecord): Promise<T3DeviceApiResponse> {
    return await this.api.put(`api/t3_device/${table}/${id}`, {
      json: data
    }).json<T3DeviceApiResponse>();
  }

  /**
   * Delete a record from a specific table
   * @param table - Table name
   * @param id - Record ID
   */
  async deleteRecord(table: string, id: number): Promise<T3DeviceApiResponse> {
    return await this.api.delete(`api/t3_device/${table}/${id}`).json<T3DeviceApiResponse>();
  }

  /**
   * Get all buildings with statistics
   */
  async getBuildings(params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    return this.getTableRecords('buildings', params);
  }

  /**
   * Get building count
   */
  async getBuildingsCount(): Promise<T3DeviceCountResponse> {
    return this.getTableCount('buildings');
  }

  /**
   * Get all devices
   */
  async getDevices(params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    return this.getTableRecords('devices', params);
  }

  /**
   * Get device count
   */
  async getDevicesCount(): Promise<T3DeviceCountResponse> {
    return this.getTableCount('devices');
  }

  /**
   * Get all input points
   */
  async getInputPoints(params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    return this.getTableRecords('input_points', params);
  }

  /**
   * Get input points count
   */
  async getInputPointsCount(): Promise<T3DeviceCountResponse> {
    return this.getTableCount('input_points');
  }

  /**
   * Get all output points
   */
  async getOutputPoints(params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    return this.getTableRecords('output_points', params);
  }

  /**
   * Get output points count
   */
  async getOutputPointsCount(): Promise<T3DeviceCountResponse> {
    return this.getTableCount('output_points');
  }

  /**
   * Get all variables
   */
  async getVariables(params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    return this.getTableRecords('variables', params);
  }

  /**
   * Get variables count
   */
  async getVariablesCount(): Promise<T3DeviceCountResponse> {
    return this.getTableCount('variables');
  }

  /**
   * Get all programs
   */
  async getPrograms(params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    return this.getTableRecords('programs', params);
  }

  /**
   * Get programs count
   */
  async getProgramsCount(): Promise<T3DeviceCountResponse> {
    return this.getTableCount('programs');
  }

  /**
   * Get all schedules
   */
  async getSchedules(params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    return this.getTableRecords('schedules', params);
  }

  /**
   * Get schedules count
   */
  async getSchedulesCount(): Promise<T3DeviceCountResponse> {
    return this.getTableCount('schedules');
  }

  /**
   * Get all holidays
   */
  async getHolidays(params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    return this.getTableRecords('holidays', params);
  }

  /**
   * Get holidays count
   */
  async getHolidaysCount(): Promise<T3DeviceCountResponse> {
    return this.getTableCount('holidays');
  }

  /**
   * Get all trendlogs
   */
  async getTrendlogs(params?: T3DeviceQueryParams): Promise<T3DeviceApiResponse> {
    return this.getTableRecords('trendlogs', params);
  }

  /**
   * Get trendlogs count
   */
  async getTrendlogsCount(): Promise<T3DeviceCountResponse> {
    return this.getTableCount('trendlogs');
  }
}

// Create a default instance
export const t3DeviceApi = new T3DeviceApi('http://localhost:9103');

// Export for direct usage
export default T3DeviceApi;
