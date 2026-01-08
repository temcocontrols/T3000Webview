/**
 * Database Viewer Page
 *
 * SQL Server Management Studio inspired database tool for SQLite
 */

import React, { useState, useEffect } from 'react';
import { Text, Button, Textarea, Spinner, Tooltip } from '@fluentui/react-components';
import {
  PlayRegular,
  ArrowSyncRegular,
  DocumentRegular,
  DatabaseRegular,
  TableRegular,
  EyeRegular,
  CodeRegular,
  SettingsRegular,
  ChevronRightRegular,
  ChevronDownRegular,
  AddRegular,
  SaveRegular,
  FolderOpenRegular,
} from '@fluentui/react-icons';
import styles from './DatabaseViewerPage.module.css';

interface TableInfo {
  name: string;
  rowCount?: number;
  columns?: ColumnInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
}

interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTimeMs: number;
}

type TabType = 'results' | 'messages' | 'execution-plan';

export const DatabaseViewerPage: React.FC = () => {
  const [selectedDb] = useState<string>('T3000.db');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Tables']));
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('SELECT * FROM panels LIMIT 100;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('results');
  const [objectExplorerWidth, setObjectExplorerWidth] = useState(280);
  const [queryEditorHeight, setQueryEditorHeight] = useState(300);

  // Mock data
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    // Mock tables with detailed structure
    const mockTables: TableInfo[] = [
      {
        name: 'panels',
        rowCount: 45,
        columns: [
          { name: 'id', type: 'INTEGER', notnull: true, pk: true },
          { name: 'serial_number', type: 'INTEGER', notnull: true, pk: false },
          { name: 'product_name', type: 'TEXT', notnull: false, pk: false },
          { name: 'ip_address', type: 'TEXT', notnull: false, pk: false },
          { name: 'location', type: 'TEXT', notnull: false, pk: false },
        ],
      },
      {
        name: 'inputs',
        rowCount: 320,
        columns: [
          { name: 'id', type: 'INTEGER', notnull: true, pk: true },
          { name: 'panel_id', type: 'INTEGER', notnull: true, pk: false },
          { name: 'number', type: 'INTEGER', notnull: true, pk: false },
          { name: 'label', type: 'TEXT', notnull: false, pk: false },
          { name: 'value', type: 'REAL', notnull: false, pk: false },
        ],
      },
      {
        name: 'outputs',
        rowCount: 160,
        columns: [
          { name: 'id', type: 'INTEGER', notnull: true, pk: true },
          { name: 'panel_id', type: 'INTEGER', notnull: true, pk: false },
          { name: 'number', type: 'INTEGER', notnull: true, pk: false },
          { name: 'label', type: 'TEXT', notnull: false, pk: false },
        ],
      },
      {
        name: 'variables',
        rowCount: 80,
      },
      {
        name: 'programs',
        rowCount: 24,
      },
      {
        name: 'schedules',
        rowCount: 52,
      },
      {
        name: 'holidays',
        rowCount: 12,
      },
      {
        name: 'graphics',
        rowCount: 8,
      },
      {
        name: 'users',
        rowCount: 5,
      },
      {
        name: 'trendlog_data',
        rowCount: 12504,
      },
    ];
    setTables(mockTables);
  };

  const executeQuery = async () => {
    setLoading(true);
    setError(null);
    setMessages([]);

    const startTime = Date.now();

    try {
      // Mock query execution
      await new Promise(resolve => setTimeout(resolve, 450));

      const mockResult: QueryResult = {
        columns: ['id', 'serial_number', 'product_name', 'ip_address', 'location', 'status'],
        rows: [
          [1, 237219, 'T3-BB', '192.168.1.100', 'Room 101', 'online'],
          [2, 237451, 'T3-TB', '192.168.1.101', 'Room 202', 'online'],
          [3, 245612, 'T3-LB', '192.168.1.102', 'Room 303', 'offline'],
        ],
        rowCount: 3,
        executionTimeMs: Date.now() - startTime,
      };

      setResult(mockResult);
      setMessages([
        `Query executed successfully`,
        `Rows affected: ${mockResult.rowCount}`,
        `Execution time: ${mockResult.executionTimeMs}ms`,
      ]);
      setActiveTab('results');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Query execution failed';
      setError(errorMsg);
      setMessages([`Error: ${errorMsg}`]);
      setActiveTab('messages');
    } finally {
      setLoading(false);
    }
  };

  const handleTableClick = (tableName: string) => {
    setSelectedTable(tableName);
    setQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <DatabaseRegular style={{ fontSize: '20px', color: '#0078d4' }} />
          <Text size={400} weight="semibold">Database</Text>
        </div>
        <div className={styles.toolbarRight}>
          <Tooltip content="New Query" relationship="label">
            <Button appearance="subtle" icon={<AddRegular />} size="small">
              New Query
            </Button>
          </Tooltip>
          <Tooltip content="Execute (F5)" relationship="label">
            <Button
              appearance="primary"
              icon={<PlayRegular />}
              onClick={executeQuery}
              disabled={loading}
              size="small"
            >
              Execute
            </Button>
          </Tooltip>
          <Tooltip content="Refresh" relationship="label">
            <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={loadTables} size="small">
              Refresh
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Left: Object Explorer */}
        <div className={styles.objectExplorer} style={{ width: `${objectExplorerWidth}px` }}>
          <div className={styles.explorerHeader}>
            <FolderOpenRegular style={{ fontSize: '16px' }} />
            <Text size={300} weight="semibold">Object Explorer</Text>
          </div>

          <div className={styles.explorerContent}>
            {/* Database Node */}
            <div className={styles.treeNode}>
              <div
                className={styles.treeNodeHeader}
                onClick={() => toggleSection('Database')}
              >
                {expandedSections.has('Database') ? <ChevronDownRegular /> : <ChevronRightRegular />}
                <DatabaseRegular style={{ fontSize: '14px', color: '#0078d4' }} />
                <Text size={200} weight="semibold">{selectedDb}</Text>
              </div>

              {expandedSections.has('Database') && (
                <div className={styles.treeNodeChildren}>
                  {/* Tables Section */}
                  <div className={styles.treeNode}>
                    <div
                      className={styles.treeNodeHeader}
                      onClick={() => toggleSection('Tables')}
                    >
                      {expandedSections.has('Tables') ? <ChevronDownRegular /> : <ChevronRightRegular />}
                      <TableRegular style={{ fontSize: '14px' }} />
                      <Text size={200} weight="semibold">Tables</Text>
                      <Text size={100} className={styles.itemCount}>({tables.length})</Text>
                    </div>

                    {expandedSections.has('Tables') && (
                      <div className={styles.treeNodeChildren}>
                        {tables.map((table) => (
                          <div key={table.name} className={styles.treeNode}>
                            <div
                              className={`${styles.treeNodeItem} ${selectedTable === table.name ? styles.selected : ''}`}
                              onClick={() => handleTableClick(table.name)}
                              onDoubleClick={() => toggleTable(table.name)}
                            >
                              {table.columns && (
                                <span onClick={(e) => { e.stopPropagation(); toggleTable(table.name); }}>
                                  {expandedTables.has(table.name) ? <ChevronDownRegular /> : <ChevronRightRegular />}
                                </span>
                              )}
                              <TableRegular style={{ fontSize: '12px', color: '#605e5c' }} />
                              <Text size={200}>{table.name}</Text>
                              {table.rowCount !== undefined && (
                                <Text size={100} className={styles.rowCount}>({table.rowCount})</Text>
                              )}
                            </div>

                            {/* Columns */}
                            {expandedTables.has(table.name) && table.columns && (
                              <div className={styles.treeNodeChildren}>
                                {table.columns.map((col) => (
                                  <div key={col.name} className={styles.columnItem}>
                                    <DocumentRegular style={{ fontSize: '10px', color: '#a19f9d' }} />
                                    <Text size={100}>{col.name}</Text>
                                    <Text size={100} className={styles.columnType}>({col.type})</Text>
                                    {col.pk && <Text size={100} className={styles.pkBadge}>PK</Text>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Views Section */}
                  <div className={styles.treeNode}>
                    <div className={styles.treeNodeHeader}>
                      <ChevronRightRegular />
                      <EyeRegular style={{ fontSize: '14px' }} />
                      <Text size={200}>Views</Text>
                      <Text size={100} className={styles.itemCount}>(0)</Text>
                    </div>
                  </div>

                  {/* Programmability Section */}
                  <div className={styles.treeNode}>
                    <div className={styles.treeNodeHeader}>
                      <ChevronRightRegular />
                      <CodeRegular style={{ fontSize: '14px' }} />
                      <Text size={200}>Programmability</Text>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className={styles.treeNode}>
                    <div className={styles.treeNodeHeader}>
                      <ChevronRightRegular />
                      <SettingsRegular style={{ fontSize: '14px' }} />
                      <Text size={200}>Security</Text>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          {selectedTable && (
            <div className={styles.propertiesPanel}>
              <div className={styles.propertiesPanelHeader}>
                <Text size={200} weight="semibold">Properties</Text>
              </div>
              <div className={styles.propertiesPanelContent}>
                <div className={styles.propertyRow}>
                  <Text size={100}>Table:</Text>
                  <Text size={100} weight="semibold">{selectedTable}</Text>
                </div>
                <div className={styles.propertyRow}>
                  <Text size={100}>Rows:</Text>
                  <Text size={100}>{tables.find(t => t.name === selectedTable)?.rowCount || 'N/A'}</Text>
                </div>
                <div className={styles.propertyRow}>
                  <Text size={100}>Columns:</Text>
                  <Text size={100}>{tables.find(t => t.name === selectedTable)?.columns?.length || 'N/A'}</Text>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div className={styles.resizeHandle} />

        {/* Right: Query Editor and Results */}
        <div className={styles.queryArea}>
          {/* Query Editor */}
          <div className={styles.queryEditor} style={{ height: `${queryEditorHeight}px` }}>
            <div className={styles.queryEditorHeader}>
              <Text size={200} weight="semibold">Query Editor</Text>
              <div className={styles.queryEditorActions}>
                <Tooltip content="Save Query" relationship="label">
                  <Button appearance="subtle" icon={<SaveRegular />} size="small" />
                </Tooltip>
              </div>
            </div>
            <Textarea
              value={query}
              onChange={(_, data) => setQuery(data.value)}
              className={styles.sqlTextarea}
              placeholder="-- Enter SQL query here"
              spellCheck={false}
            />
          </div>

          {/* Resize Handle */}
          <div className={styles.horizontalResizeHandle} />

          {/* Results Panel */}
          <div className={styles.resultsPanel}>
            {/* Results Tabs */}
            <div className={styles.resultsTabs}>
              <button
                className={`${styles.resultsTab} ${activeTab === 'results' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('results')}
              >
                ⚡ Results
              </button>
              <button
                className={`${styles.resultsTab} ${activeTab === 'messages' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('messages')}
              >
                📝 Messages
              </button>
              <button
                className={`${styles.resultsTab} ${activeTab === 'execution-plan' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('execution-plan')}
              >
                ℹ️ Execution Plan
              </button>
            </div>

            {/* Results Content */}
            <div className={styles.resultsContent}>
              {loading && (
                <div className={styles.resultsPlaceholder}>
                  <Spinner size="small" label="Executing query..." />
                </div>
              )}

              {!loading && activeTab === 'results' && result && (
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

              {!loading && activeTab === 'messages' && (
                <div className={styles.messagesContent}>
                  {messages.map((msg, i) => (
                    <div key={i} className={styles.messageItem}>
                      <Text size={200} family="monospace">{msg}</Text>
                    </div>
                  ))}
                </div>
              )}

              {!loading && activeTab === 'execution-plan' && (
                <div className={styles.resultsPlaceholder}>
                  <Text size={200}>Execution plan not available for this query</Text>
                </div>
              )}

              {!loading && !result && activeTab === 'results' && (
                <div className={styles.resultsPlaceholder}>
                  <Text size={300}>Execute a query to see results</Text>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusIndicator}>🟢</span>
          <Text size={200}>Connected: {selectedDb} • SQLite 3.x • Ready</Text>
        </div>
        <div className={styles.statusRight}>
          {result && (
            <Text size={200}>
              Query executed successfully • {result.rowCount} rows • {result.executionTimeMs}ms
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseViewerPage;
