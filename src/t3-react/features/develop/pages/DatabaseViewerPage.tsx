/**
 * Database Viewer Page
 *
 * SQL Server Management Studio inspired database tool for SQLite
 */

import React, { useState, useEffect } from 'react';
import { Text, Button, Spinner, Tooltip, Dropdown, Option, Drawer, DrawerHeader, DrawerBody } from '@fluentui/react-components';
import Editor from '@monaco-editor/react';
import * as databaseApi from '../services/databaseApi';
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
  TableLightningRegular,
  ChatRegular,
  WindowMultipleRegular,
  ChevronDoubleLeftRegular,
  ChevronDoubleRightRegular,
  ArrowExpand20Regular,
  DismissRegular,
  ArrowUpRegular,
  ArrowDownRegular,
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
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('webview_t3_device.db');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Database', 'Tables']));
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('results');
  const [objectExplorerWidth, setObjectExplorerWidth] = useState(280);
  const [queryEditorHeight, setQueryEditorHeight] = useState(200);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Load databases and tables on mount
  useEffect(() => {
    loadDatabases();
  }, []);

  useEffect(() => {
    if (selectedDb) {
      loadTables();
    }
  }, [selectedDb]);

  // Resize handler for query editor height
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const queryArea = document.querySelector(`.${styles.queryArea}`) as HTMLElement;
      if (!queryArea) return;

      const queryAreaRect = queryArea.getBoundingClientRect();
      const newHeight = e.clientY - queryAreaRect.top;

      // Min height 100px, max height 80% of query area
      const minHeight = 100;
      const maxHeight = queryAreaRect.height * 0.8;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setQueryEditorHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const loadDatabases = async () => {
    try {
      const dbList = await databaseApi.getDatabases();
      const dbNames = dbList.map(db => db.name);
      setDatabases(dbNames);
      if (dbNames.length > 0 && !selectedDb) {
        setSelectedDb(dbNames[0]);
      }
    } catch (err) {
      console.error('Failed to load databases:', err);
    }
  };

  const loadTables = async () => {
    try {
      setLoading(true);
      const fetchedTables = await databaseApi.getTables(selectedDb);

      // Fetch detailed schema for tables with columns
      const tablesWithSchema = await Promise.all(
        fetchedTables.map(async (table) => {
          try {
            const schema = await databaseApi.getTableSchema(table.name, selectedDb);
            return schema;
          } catch (err) {
            console.error(`Failed to fetch schema for ${table.name}:`, err);
            return table;
          }
        })
      );

      setTables(tablesWithSchema);

      // Set default query to first table if query is empty
      if (!query && tablesWithSchema.length > 0) {
        const firstTable = tablesWithSchema[0].name;
        setQuery(`SELECT * FROM ${firstTable} LIMIT 100;`);
        setSelectedTable(firstTable);
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tables');
      setMessages([`Error loading tables: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      setMessages(['Please enter a query']);
      setActiveTab('messages');
      return;
    }

    setLoading(true);
    setError(null);
    setMessages([]);

    try {
      const queryResult = await databaseApi.executeQuery({
        database: selectedDb,
        query: query,
      });

      setResult(queryResult);
      setMessages([
        `Query executed successfully`,
        `Rows: ${queryResult.rowCount}`,
        `Execution time: ${queryResult.executionTimeMs.toFixed(2)}ms`,
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

  const handleNewQuery = () => {
    setQuery('');
    setResult(null);
    setMessages([]);
    setSelectedTable(null);
    setActiveTab('results');
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

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      // Toggle direction or clear sort
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnIndex);
      setSortDirection('asc');
    }
  };

  const getSortedRows = (rows: any[][]) => {
    if (sortColumn === null) return rows;

    return [...rows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <DatabaseRegular style={{ fontSize: '16px', color: '#0078d4' }} />
          <Text size={300} weight="semibold">Database</Text>
          <Text size={200} style={{ color: '#605e5c', marginLeft: '4px' }}>({databases.length})</Text>
          <Dropdown
            value={selectedDb}
            selectedOptions={[selectedDb]}
            onOptionSelect={(_, data) => setSelectedDb(data.optionValue as string)}
            size="small"
            style={{ minWidth: '200px', marginLeft: '8px' }}
          >
            {databases.map((db) => (
              <Option key={db} value={db}>
                {db}
              </Option>
            ))}
          </Dropdown>
        </div>
        <div className={styles.toolbarRight}>
          <Tooltip content="New Query" relationship="label">
            <Button appearance="subtle" icon={<AddRegular style={{ fontSize: '14px' }} />} size="small" onClick={handleNewQuery}>
              New Query
            </Button>
          </Tooltip>
          <Tooltip content="Execute (F5)" relationship="label">
            <Button
              appearance="primary"
              icon={<PlayRegular style={{ fontSize: '14px' }} />}
              onClick={executeQuery}
              disabled={loading}
              size="small"
            >
              Execute
            </Button>
          </Tooltip>
          <Tooltip content="Refresh" relationship="label">
            <Button appearance="subtle" icon={<ArrowSyncRegular style={{ fontSize: '14px' }} />} onClick={loadTables} size="small">
              Refresh
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Left: Object Explorer */}
        <div className={`${styles.objectExplorer} ${isExplorerCollapsed ? styles.collapsed : ''}`} style={{ width: isExplorerCollapsed ? '40px' : `${objectExplorerWidth}px` }}>
          <div className={styles.explorerHeader}>
            {!isExplorerCollapsed && (
              <>
                <FolderOpenRegular style={{ fontSize: '16px' }} />
                <Text size={300} weight="semibold">Object Explorer</Text>
              </>
            )}
            <button
              className={styles.collapseButton}
              onClick={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
              title={isExplorerCollapsed ? 'Expand Object Explorer' : 'Collapse Object Explorer'}
            >
              {isExplorerCollapsed ? <ChevronDoubleRightRegular /> : <ChevronDoubleLeftRegular />}
            </button>
          </div>

          {!isExplorerCollapsed && (
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
          )}

          {/* Properties Panel */}
          {!isExplorerCollapsed && selectedTable && (
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
            <Editor
              height="100%"
              defaultLanguage="sql"
              value={query}
              onChange={(value) => setQuery(value || '')}
              theme="vs"
              options={{
                minimap: { enabled: false },
                fontSize: 11,
                lineHeight: 18,
                fontFamily: 'Consolas, "Courier New", monospace',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                wrappingIndent: 'same',
                lineNumbers: 'on',
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'all',
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'hidden',
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
              }}
            />
          </div>

          {/* Resize Handle */}
          <div
            className={styles.horizontalResizeHandle}
            onMouseDown={() => setIsResizing(true)}
            style={{ cursor: 'row-resize' }}
          />

          {/* Results Panel */}
          <div className={styles.resultsPanel}>
            {/* Results Tabs */}
            <div className={styles.resultsTabs}>
              <button
                className={`${styles.resultsTab} ${activeTab === 'results' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('results')}
              >
                <TableLightningRegular style={{ fontSize: '14px', marginRight: '6px' }} />
                Results
              </button>
              <button
                className={`${styles.resultsTab} ${activeTab === 'messages' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('messages')}
              >
                <ChatRegular style={{ fontSize: '14px', marginRight: '6px' }} />
                Messages
              </button>
              <button
                className={`${styles.resultsTab} ${activeTab === 'execution-plan' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('execution-plan')}
              >
                <WindowMultipleRegular style={{ fontSize: '14px', marginRight: '6px' }} />
                Execution Plan
              </button>
              {result && activeTab === 'results' && (
                <Tooltip content="View in Larger Panel" relationship="label">
                  <button
                    className={styles.resultsTab}
                    onClick={() => setIsDrawerOpen(true)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <ArrowExpand20Regular style={{ fontSize: '10px' }} />
                  </button>
                </Tooltip>
              )}
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
                        {result.columns.map((col, idx) => (
                          <th key={col} onClick={() => handleSort(idx)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {col}
                              {sortColumn === idx ? (
                                sortDirection === 'asc' ?
                                  <ArrowUpRegular style={{ fontSize: '10px' }} /> :
                                  <ArrowDownRegular style={{ fontSize: '10px' }} />
                              ) : (
                                <ArrowUpRegular style={{ fontSize: '10px', opacity: 0.3 }} />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedRows(result.rows).map((row, i) => (
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
                <>
                  {messages.length > 0 ? (
                    <div className={styles.messagesContent}>
                      {messages.map((msg, i) => (
                        <div key={i} className={styles.messageItem}>
                          <Text size={200} family="monospace">{msg}</Text>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.resultsPlaceholder}>
                      <Text size={200}>No messages</Text>
                    </div>
                  )}
                </>
              )}

              {!loading && activeTab === 'execution-plan' && (
                <div className={styles.resultsPlaceholder}>
                  <Text size={200}>Execution plan not available for this query</Text>
                </div>
              )}

              {!loading && !result && activeTab === 'results' && (
                <div className={styles.resultsPlaceholder}>
                  <Text size={200}>Execute a query to see results</Text>
                </div>
              )}
            </div>
          </div>

          {/* Status Bar - Under Query Area */}
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
      </div>

      {/* Results Drawer */}
      <Drawer
        open={isDrawerOpen}
        onOpenChange={(_, { open }) => setIsDrawerOpen(open)}
        position="end"
        size="large"
        style={{ width: '90vw', maxWidth: '2000px' }}
      >
        <DrawerHeader style={{ minHeight: '32px', padding: '8px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TableLightningRegular style={{ fontSize: '16px', color: '#0078d4' }} />
              <Text size={400} weight="semibold">Query Results</Text>
              {result && (
                <Text size={200} style={{ color: '#605e5c' }}>
                  {result.rowCount} rows • {result.executionTimeMs}ms
                </Text>
              )}
            </div>
            <Button
              appearance="subtle"
              icon={<DismissRegular />}
              onClick={() => setIsDrawerOpen(false)}
              size="small"
            />
          </div>
        </DrawerHeader>
        <DrawerBody style={{ padding: 0 }}>
          {result && (
            <div className={styles.resultsTable} style={{ height: '100%' }}>
              <table>
                <thead>
                  <tr>
                    {result.columns.map((col, idx) => (
                      <th key={col} onClick={() => handleSort(idx)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {col}
                          {sortColumn === idx ? (
                            sortDirection === 'asc' ?
                              <ArrowUpRegular style={{ fontSize: '10px' }} /> :
                              <ArrowDownRegular style={{ fontSize: '10px' }} />
                          ) : (
                            <ArrowUpRegular style={{ fontSize: '10px', opacity: 0.3 }} />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getSortedRows(result.rows).map((row, i) => (
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
        </DrawerBody>
      </Drawer>
    </div>
  );
};

export default DatabaseViewerPage;
