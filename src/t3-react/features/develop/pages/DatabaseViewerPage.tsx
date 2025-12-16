/**
 * Database Viewer Page
 *
 * SQL query tool for SQLite databases
 */

import React, { useState, useEffect } from 'react';
import { Text, Button, Dropdown, Option, Textarea, Spinner } from '@fluentui/react-components';
import { PlayRegular, ArrowSyncRegular } from '@fluentui/react-icons';
import styles from './DatabaseViewerPage.module.css';

interface TableInfo {
  name: string;
  rowCount?: number;
}

interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTimeMs: number;
}

export const DatabaseViewerPage: React.FC = () => {
  const [databases, setDatabases] = useState<string[]>(['webview_t3_device.db']);
  const [selectedDb, setSelectedDb] = useState<string>('webview_t3_device.db');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [query, setQuery] = useState<string>('SELECT * FROM DEVICES LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data
  useEffect(() => {
    loadTables();
  }, [selectedDb]);

  const loadTables = async () => {
    // Mock tables
    const mockTables: TableInfo[] = [
      { name: 'DEVICES', rowCount: 45 },
      { name: 'INPUTS', rowCount: 320 },
      { name: 'OUTPUTS', rowCount: 160 },
      { name: 'VARIABLES', rowCount: 80 },
      { name: 'TRENDLOG_DATA', rowCount: 1250 },
    ];
    setTables(mockTables);
  };

  const executeQuery = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock query execution
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockResult: QueryResult = {
        columns: ['SerialNumber', 'Product_Name', 'IP_Address', 'Status'],
        rows: [
          [237219, 'T3-XX-ESP', '192.168.1.100', 'online'],
          [237451, 'T3-TB', '192.168.1.101', 'online'],
        ],
        rowCount: 2,
        executionTimeMs: 45,
      };

      setResult(mockResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTableClick = (tableName: string) => {
    setQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Text size={500} weight="semibold">🗄️ Database Viewer</Text>
        </div>
        <div className={styles.headerRight}>
          <Dropdown
            placeholder="Select database"
            value={selectedDb}
            onOptionSelect={(_, data) => data.optionValue && setSelectedDb(data.optionValue)}
            style={{ minWidth: '200px' }}
          >
            {databases.map((db) => (
              <Option key={db} value={db}>{db}</Option>
            ))}
          </Dropdown>
          <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={loadTables}>
            Refresh
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.dbSplitView}>
          {/* Tables List */}
          <div className={styles.tablesList}>
            <Text size={400} weight="semibold" style={{ padding: '8px 12px', display: 'block', borderBottom: '1px solid #edebe9' }}>
              Tables
            </Text>
            {tables.map((table) => (
              <div
                key={table.name}
                className={styles.tableItem}
                onClick={() => handleTableClick(table.name)}
              >
                <Text size={300} weight="semibold">{table.name}</Text>
                <Text size={200}>({table.rowCount} rows)</Text>
              </div>
            ))}
          </div>

          {/* Query Editor & Results */}
          <div className={styles.queryPanel}>
            <div className={styles.queryEditor}>
              <div className={styles.queryHeader}>
                <Text size={300} weight="semibold">SQL Query</Text>
                <Button
                  appearance="primary"
                  icon={<PlayRegular />}
                  onClick={executeQuery}
                  disabled={loading}
                >
                  Execute (F5)
                </Button>
              </div>
              <Textarea
                value={query}
                onChange={(_, data) => setQuery(data.value)}
                className={styles.sqlTextarea}
                resize="vertical"
              />
            </div>

            <div className={styles.queryResults}>
              <div className={styles.resultsHeader}>
                <Text size={300} weight="semibold">
                  {result ? `Results (${result.rowCount} rows, ${result.executionTimeMs}ms)` : 'Results'}
                </Text>
              </div>

              {loading && (
                <div className={styles.resultsPlaceholder}>
                  <Spinner size="small" label="Executing query..." />
                </div>
              )}

              {error && (
                <div className={styles.error}>
                  <Text size={300} style={{ color: '#d13438' }}>{error}</Text>
                </div>
              )}

              {!loading && !error && result && (
                <div className={styles.resultsTable}>
                  <table>
                    <thead>
                      <tr>
                        {result.columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{String(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && !error && !result && (
                <div className={styles.resultsPlaceholder}>
                  <Text size={300}>Execute a query to see results</Text>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseViewerPage;
