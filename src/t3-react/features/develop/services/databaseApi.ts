/**
 * Database API Service
 *
 * Handles all communication with the backend database API.
 * Uses existing /api/develop/database/* endpoints.
 */

const API_BASE_URL = 'http://localhost:9103/api/develop/database';

export interface TableInfo {
  name: string;
  rowCount: number | null;
  columns?: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTimeMs: number;
}

export interface QueryRequest {
  database: string;
  query: string;
}

export interface DatabaseInfo {
  name: string;
  path: string;
  size: number;
  modified?: string;
}

/**
 * Get list of all tables in the database
 */
export async function getTables(database: string = 'T3000.db'): Promise<TableInfo[]> {
  const response = await fetch(`${API_BASE_URL}/tables?database=${encodeURIComponent(database)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to fetch tables');
  }

  const data = await response.json();

  // Convert snake_case to camelCase
  return data.tables.map((table: any) => ({
    name: table.name,
    rowCount: table.row_count,
  }));
}

/**
 * Get detailed schema for a specific table using PRAGMA
 */
export async function getTableSchema(tableName: string, database: string = 'T3000.db'): Promise<TableInfo> {
  // Execute PRAGMA table_info query to get schema
  const result = await executeQuery({
    database,
    query: `PRAGMA table_info("${tableName}")`,
  });

  const columns: ColumnInfo[] = result.rows.map((row: any[]) => ({
    name: row[1] as string,
    type: row[2] as string,
    notnull: row[3] === 1,
    pk: row[5] === 1,
  }));

  // Get row count
  const countResult = await executeQuery({
    database,
    query: `SELECT COUNT(*) as count FROM "${tableName}"`,
  });

  const rowCount = countResult.rows[0]?.[0] as number || 0;

  return {
    name: tableName,
    rowCount,
    columns,
  };
}

/**
 * Execute SQL query
 */
export async function executeQuery(request: QueryRequest): Promise<QueryResult> {
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Query execution failed');
  }

  const data = await response.json();

  // Convert snake_case to camelCase
  return {
    columns: data.columns,
    rows: data.rows,
    rowCount: data.row_count,
    executionTimeMs: data.execution_time_ms,
  };
}

/**
 * Get list of available databases
 */
export async function getDatabases(): Promise<DatabaseInfo[]> {
  const response = await fetch(`${API_BASE_URL}/list`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to fetch databases');
  }

  const data = await response.json();
  return data.databases;
}
