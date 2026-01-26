/**
 * File Browser Page
 *
 * Browse runtime folder structure and preview files
 */

import React, { useState, useEffect } from 'react';
import { Text, Button, Spinner, DataGrid, DataGridHeader, DataGridHeaderCell, DataGridBody, DataGridRow, DataGridCell, TableColumnDefinition, createTableColumn, Drawer, DrawerHeader, DrawerHeaderTitle, DrawerBody, Tooltip } from '@fluentui/react-components';
import { ArrowSyncRegular, FolderRegular, DocumentRegular, ChevronUpRegular, ChevronDownRegular, ChevronLeftRegular, ChevronRightRegular, FolderOpenRegular, InfoRegular, DismissRegular, ErrorCircleRegular } from '@fluentui/react-icons';
import styles from './FileBrowserPage.module.css';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  fileType: string;
  size?: number;
  modified?: string;
}

export const FileBrowserPage: React.FC = () => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [runtimeFolder, setRuntimeFolder] = useState<string>('Runtime Folder');
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFile, setDrawerFile] = useState<FileNode | null>(null);
  const [sortState, setSortState] = useState<{column: string | null, direction: 'asc' | 'desc' | null}>({column: null, direction: null});

  const loadFiles = async (path?: string, addToHistory: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      const url = path
        ? `${API_BASE_URL}/list?path=${encodeURIComponent(path)}`
        : `${API_BASE_URL}/list`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load files: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle new response format with runtimeFolder
      if (data.files && data.runtimeFolder) {
        setFiles(data.files);
        if (!path) {
          setRuntimeFolder(data.runtimeFolder);
        }
      } else {
        // Fallback for old format (array of files)
        setFiles(Array.isArray(data) ? data : []);
      }

      const newPath = path || '';
      setCurrentPath(newPath);

      if (addToHistory) {
        // Add to history, removing any forward history
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newPath);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDoubleClick = (file: FileNode) => {
    if (file.isDirectory) {
      const newPath = currentPath ? `${currentPath}\\${file.name}` : file.name;
      loadFiles(newPath, true);
    }
  };

  const handleFileClick = (file: FileNode) => {
    setSelectedFile(file);
    if (!file.isDirectory) {
      loadFileContent(file.path);
    } else {
      setFileContent('');
    }
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
      loadFiles(history[newIndex], false);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
      loadFiles(history[newIndex], false);
    }
  };

  const handleGoUp = () => {
    if (currentPath) {
      const parts = currentPath.split('\\');
      parts.pop();
      const parentPath = parts.join('\\');
      loadFiles(parentPath, true);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const parts = currentPath.split('\\').filter(p => p);
    const newPath = parts.slice(0, index + 1).join('\\');
    loadFiles(newPath, true);
  };

  const handleGoHome = () => {
    loadFiles('', true);
  };

  const handleViewDetails = (file: FileNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setDrawerFile(file);
    setDrawerOpen(true);
    if (!file.isDirectory) {
      loadFileContent(file.path);
    }
  };

  const handleSort = (columnId: string) => {
    if (sortState.column === columnId) {
      if (sortState.direction === 'asc') {
        setSortState({ column: columnId, direction: 'desc' });
      } else if (sortState.direction === 'desc') {
        setSortState({ column: null, direction: null }); // Reset to default
      }
    } else {
      setSortState({ column: columnId, direction: 'asc' });
    }
  };

  const getSortedFiles = () => {
    if (!sortState.column || !sortState.direction) {
      return files; // Return default order
    }

    return [...files].sort((a, b) => {
      let aVal: any = (a as any)[sortState.column!];
      let bVal: any = (b as any)[sortState.column!];

      if (sortState.column === 'size') {
        aVal = aVal || 0;
        bVal = bVal || 0;
        return sortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      aVal = aVal || '';
      bVal = bVal || '';
      const result = aVal.toString().localeCompare(bVal.toString());
      return sortState.direction === 'asc' ? result : -result;
    });
  };

  const loadFileContent = async (filePath: string) => {
    try {
      const relativePath = filePath.replace(/\\/g, '/');
      const response = await fetch(`${API_BASE_URL}/read?path=${encodeURIComponent(relativePath)}`);
      if (!response.ok) {
        throw new Error('Failed to load file content');
      }
      const data = await response.json();
      setFileContent(data.isBinary ? '<Binary file>' : data.content);
    } catch (err) {
      setFileContent('Error loading file content');
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return '';
    }
  };

  const getSortIcon = (columnId: string) => {
    if (sortState.column !== columnId) return null;
    return sortState.direction === 'asc' ? <ChevronUpRegular fontSize={12} /> : <ChevronDownRegular fontSize={12} />;
  };

  const columns: TableColumnDefinition<FileNode>[] = [
    createTableColumn<FileNode>({
      columnId: 'name',
      compare: (a, b) => a.name.localeCompare(b.name),
      renderHeaderCell: () => (
        <div onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px', width: '100%', height: '100%' }}>
          <span>Name</span>
          {getSortIcon('name')}
        </div>
      ),
      renderCell: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {item.isDirectory ? <FolderRegular style={{ flexShrink: 0 }} /> : <DocumentRegular style={{ flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
        </div>
      ),
    }),
    createTableColumn<FileNode>({
      columnId: 'modified',
      compare: (a, b) => (a.modified || '').localeCompare(b.modified || ''),
      renderHeaderCell: () => (
        <div onClick={() => handleSort('modified')} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px', width: '100%', height: '100%' }}>
          <span>Date Modified</span>
          {getSortIcon('modified')}
        </div>
      ),
      renderCell: (item) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(item.modified)}</span>,
    }),
    createTableColumn<FileNode>({
      columnId: 'type',
      compare: (a, b) => a.fileType.localeCompare(b.fileType),
      renderHeaderCell: () => (
        <div onClick={() => handleSort('type')} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px', width: '100%', height: '100%' }}>
          <span>Type</span>
          {getSortIcon('type')}
        </div>
      ),
      renderCell: (item) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.fileType}</span>,
    }),
    createTableColumn<FileNode>({
      columnId: 'size',
      compare: (a, b) => (a.size || 0) - (b.size || 0),
      renderHeaderCell: () => (
        <div onClick={() => handleSort('size')} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px', width: '100%', height: '100%' }}>
          <span>Size</span>
          {getSortIcon('size')}
        </div>
      ),
      renderCell: (item) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatFileSize(item.size)}</span>,
    }),
    createTableColumn<FileNode>({
      columnId: 'actions',
      renderHeaderCell: () => 'Actions',
      renderCell: (item) => (
        <Button
          appearance="subtle"
          size="small"
          icon={<InfoRegular />}
          onClick={(e) => handleViewDetails(item, e)}
          title="View details"
        />
      ),
    }),
  ];

  const pathParts = currentPath ? currentPath.split('\\').filter(p => p) : [];

  return (
    <div className={styles.container}>
      <div className={styles.navigationBar}>
        <div className={styles.navButtons}>
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronLeftRegular />}
            onClick={handleGoBack}
            disabled={loading || historyIndex === 0}
            title="Back"
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronRightRegular />}
            onClick={handleGoForward}
            disabled={loading || historyIndex >= history.length - 1}
            title="Forward"
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronUpRegular />}
            onClick={handleGoUp}
            disabled={loading || !currentPath}
            title="Up"
          />
        </div>
        <div className={styles.breadcrumb}>
          <Button
            appearance="subtle"
            size="small"
            icon={<FolderOpenRegular fontSize={16} />}
            onClick={handleGoHome}
            className={styles.breadcrumbButton}
            title="Home"
          />
          {pathParts.map((part, index) => (
            <React.Fragment key={index}>
              <span className={styles.breadcrumbSeparator}>›</span>
              <Button
                appearance="subtle"
                size="small"
                onClick={() => handleBreadcrumbClick(index)}
                className={styles.breadcrumbButton}
              >
                {part}
              </Button>
            </React.Fragment>
          ))}
        </div>
        <div className={styles.navDivider} />
        <div className={styles.headerRight}>
          <Text size={200}><FolderRegular fontSize={12} /> {runtimeFolder}</Text>
          <Tooltip content="Refresh current folder" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowSyncRegular fontSize={14} />}
              onClick={() => loadFiles(currentPath, false)}
              disabled={loading}
            />
          </Tooltip>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.splitView}>
          {/* File Grid */}
          <div className={styles.fileGrid}>
            {loading && (
              <div className={styles.loadingBar}>
                <Spinner size="tiny" />
                <Text size={200} weight="regular">Loading files...</Text>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#fef6f6', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ErrorCircleRegular style={{ color: '#d13438', fontSize: '16px', flexShrink: 0 }} />
                <Text style={{ color: '#d13438', fontWeight: 500, fontSize: '13px' }}>
                  {error}
                </Text>
              </div>
            )}

            {!loading && !error && (
              <DataGrid
                items={getSortedFiles()}
                columns={columns}
                sortable={false}
                resizableColumns
                focusMode="composite"
                size="small"
                style={{ minWidth: '100%' }}
                columnSizingOptions={{
                  name: {
                    minWidth: 250,
                    idealWidth: '43%',
                  },
                  modified: {
                    minWidth: 150,
                    idealWidth: '25%',
                  },
                  type: {
                    minWidth: 80,
                    idealWidth: '14%',
                  },
                  size: {
                    minWidth: 60,
                    idealWidth: '10%',
                  },
                  actions: {
                    minWidth: 70,
                    idealWidth: '8%',
                  },
                }}
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>
                        {renderHeaderCell()}
                      </DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<FileNode>>
                  {({ item, rowId }) => (
                    <DataGridRow<FileNode>
                      key={rowId}
                      onClick={() => handleFileClick(item)}
                      onDoubleClick={() => handleFileDoubleClick(item)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedFile?.path === item.path ? '#e1dfdd' : undefined
                      }}
                    >
                      {({ renderCell }) => (
                        <DataGridCell>{renderCell(item)}</DataGridCell>
                      )}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            )}
          </div>

          {/* File Details Panel */}
          {selectedFile && (
            <div className={styles.detailsPanel}>
              <div className={styles.detailsHeader}>
                <Text size={200} weight="semibold">Details</Text>
                <Button
                  appearance="subtle"
                  icon={<DismissRegular />}
                  size="small"
                  onClick={() => setSelectedFile(null)}
                />
              </div>
              <div className={styles.detailsContent}>
                <div className={styles.detailRow}>
                  <Text size={200} weight="semibold">Name:</Text>
                  <Text size={200}>{selectedFile.name}</Text>
                </div>
                <div className={styles.detailRow}>
                  <Text size={200} weight="semibold">Type:</Text>
                  <Text size={200}>{selectedFile.fileType}</Text>
                </div>
                {selectedFile.size !== undefined && (
                  <div className={styles.detailRow}>
                    <Text size={200} weight="semibold">Size:</Text>
                    <Text size={200}>{formatFileSize(selectedFile.size)}</Text>
                  </div>
                )}
                {selectedFile.modified && (
                  <div className={styles.detailRow}>
                    <Text size={200} weight="semibold">Modified:</Text>
                    <Text size={200}>{formatDate(selectedFile.modified)}</Text>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <Text size={200} weight="semibold">Path:</Text>
                  <Text size={200}>{selectedFile.path}</Text>
                </div>

                {!selectedFile.isDirectory && fileContent && (
                  <>
                    <div className={styles.detailDivider} />
                    <div className={styles.previewSection}>
                      <Text size={200} weight="semibold">Preview:</Text>
                      <div className={styles.previewText}>
                        <pre>{fileContent.substring(0, 5000)}{fileContent.length > 5000 ? '\n...(truncated)' : ''}</pre>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer for file details */}
      {drawerOpen && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />
          <div className={styles.drawerPanel}>
            <div className={styles.drawerHeader}>
              <Text size={300} weight="semibold">{drawerFile?.name}</Text>
              <Button
                appearance="subtle"
                icon={<DismissRegular />}
                onClick={() => setDrawerOpen(false)}
              />
            </div>
            <div className={styles.drawerBody}>
              {drawerFile && (
                <>
                  <div className={styles.detailRow}>
                    <Text size={200} weight="semibold">Name:</Text>
                    <Text size={200}>{drawerFile.name}</Text>
                  </div>
                  <div className={styles.detailRow}>
                    <Text size={200} weight="semibold">Type:</Text>
                    <Text size={200}>{drawerFile.fileType}</Text>
                  </div>
                  {drawerFile.size !== undefined && (
                    <div className={styles.detailRow}>
                      <Text size={200} weight="semibold">Size:</Text>
                      <Text size={200}>{formatFileSize(drawerFile.size)}</Text>
                    </div>
                  )}
                  {drawerFile.modified && (
                    <div className={styles.detailRow}>
                      <Text size={200} weight="semibold">Modified:</Text>
                      <Text size={200}>{formatDate(drawerFile.modified)}</Text>
                    </div>
                  )}
                  <div className={styles.detailRow}>
                    <Text size={200} weight="semibold">Path:</Text>
                    <Text size={200}>{drawerFile.path}</Text>
                  </div>

                  {!drawerFile.isDirectory && fileContent && (
                    <>
                      <div className={styles.detailDivider} />
                      <div className={styles.previewSection}>
                        <Text size={200} weight="semibold">Preview:</Text>
                        <div className={styles.previewText}>
                          <pre>{fileContent.substring(0, 10000)}{fileContent.length > 10000 ? '\n...(truncated)' : ''}</pre>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FileBrowserPage;
