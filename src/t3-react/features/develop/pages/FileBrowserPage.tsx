/**
 * File Browser Page
 *
 * Browse runtime folder structure and preview files
 */

import React, { useState, useEffect } from 'react';
import { Text, Button, Spinner, DataGrid, DataGridHeader, DataGridHeaderCell, DataGridBody, DataGridRow, DataGridCell, TableColumnDefinition, createTableColumn } from '@fluentui/react-components';
import { ArrowSyncRegular, FolderRegular, DocumentRegular, ChevronUpRegular, ChevronLeftRegular, ChevronRightRegular, HomeRegular } from '@fluentui/react-icons';
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
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async (path?: string, addToHistory: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      const url = path
        ? `http://localhost:9103/api/develop/files/list?path=${encodeURIComponent(path)}`
        : 'http://localhost:9103/api/develop/files/list';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load files: ${response.statusText}`);
      }

      const data = await response.json();
      setFiles(data);
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

  const loadFileContent = async (filePath: string) => {
    try {
      const relativePath = filePath.replace(/\\/g, '/');
      const response = await fetch(`http://localhost:9103/api/develop/files/read?path=${encodeURIComponent(relativePath)}`);
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

  const columns: TableColumnDefinition<FileNode>[] = [
    createTableColumn<FileNode>({
      columnId: 'name',
      compare: (a, b) => a.name.localeCompare(b.name),
      renderHeaderCell: () => 'Name',
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
      renderHeaderCell: () => 'Date Modified',
      renderCell: (item) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(item.modified)}</span>,
    }),
    createTableColumn<FileNode>({
      columnId: 'type',
      compare: (a, b) => a.fileType.localeCompare(b.fileType),
      renderHeaderCell: () => 'Type',
      renderCell: (item) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.fileType}</span>,
    }),
    createTableColumn<FileNode>({
      columnId: 'size',
      compare: (a, b) => (a.size || 0) - (b.size || 0),
      renderHeaderCell: () => 'Size',
      renderCell: (item) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatFileSize(item.size)}</span>,
    }),
  ];

  const pathParts = currentPath ? currentPath.split('\\').filter(p => p) : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Text size={500} weight="semibold">📁 Runtime Folder Browser</Text>
        </div>
        <div className={styles.headerRight}>
          <Button
            appearance="subtle"
            icon={<ArrowSyncRegular />}
            onClick={() => loadFiles(currentPath, false)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

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
            icon={<HomeRegular />}
            onClick={handleGoHome}
            className={styles.breadcrumbButton}
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
      </div>

      <div className={styles.content}>
        <div className={styles.splitView}>
          {/* File Grid */}
          <div className={styles.fileGrid}>
            {loading && (
              <div className={styles.loadingContainer}>
                <Spinner size="medium" label="Loading..." />
              </div>
            )}

            {error && (
              <div className={styles.error}>
                <Text size={300} style={{ color: '#d13438' }}>{error}</Text>
              </div>
            )}

            {!loading && !error && (
              <DataGrid
                items={files}
                columns={columns}
                sortable
                resizableColumns
                focusMode="composite"
                size="small"
                style={{ minWidth: '100%' }}
                columnSizingOptions={{
                  name: {
                    minWidth: 300,
                    idealWidth: '55%',
                  },
                  modified: {
                    minWidth: 150,
                    idealWidth: '20%',
                  },
                  type: {
                    minWidth: 80,
                    idealWidth: '15%',
                  },
                  size: {
                    minWidth: 60,
                    idealWidth: '10%',
                  },
                }}
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
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
                <Text size={400} weight="semibold">Details</Text>
              </div>
              <div className={styles.detailsContent}>
                <div className={styles.detailRow}>
                  <Text size={300} weight="semibold">Name:</Text>
                  <Text size={300}>{selectedFile.name}</Text>
                </div>
                <div className={styles.detailRow}>
                  <Text size={300} weight="semibold">Type:</Text>
                  <Text size={300}>{selectedFile.fileType}</Text>
                </div>
                {selectedFile.size !== undefined && (
                  <div className={styles.detailRow}>
                    <Text size={300} weight="semibold">Size:</Text>
                    <Text size={300}>{formatFileSize(selectedFile.size)}</Text>
                  </div>
                )}
                {selectedFile.modified && (
                  <div className={styles.detailRow}>
                    <Text size={300} weight="semibold">Modified:</Text>
                    <Text size={300}>{formatDate(selectedFile.modified)}</Text>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <Text size={300} weight="semibold">Path:</Text>
                  <Text size={200}>{selectedFile.path}</Text>
                </div>

                {!selectedFile.isDirectory && fileContent && (
                  <>
                    <div className={styles.detailDivider} />
                    <div className={styles.previewSection}>
                      <Text size={300} weight="semibold">Preview:</Text>
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
    </div>
  );
};

export default FileBrowserPage;
