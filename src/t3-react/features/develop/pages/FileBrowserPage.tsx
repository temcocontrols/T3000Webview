/**
 * File Browser Page
 *
 * Browse runtime folder structure and preview files
 */

import React, { useState, useEffect } from 'react';
import { Text, Button, Spinner, DataGrid, DataGridHeader, DataGridHeaderCell, DataGridBody, DataGridRow, DataGridCell, TableColumnDefinition, createTableColumn } from '@fluentui/react-components';
import { ArrowSyncRegular, FolderRegular, DocumentRegular, ChevronUpRegular } from '@fluentui/react-icons';
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
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async (path?: string) => {
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
      setCurrentPath(path || '');
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
      setPathStack([...pathStack, currentPath]);
      loadFiles(newPath);
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

  const handleGoUp = () => {
    if (pathStack.length > 0) {
      const newStack = [...pathStack];
      const parentPath = newStack.pop()!;
      setPathStack(newStack);
      loadFiles(parentPath);
    }
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
      renderHeaderCell: () => 'Name',
      renderCell: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {item.isDirectory ? <FolderRegular /> : <DocumentRegular />}
          <span>{item.name}</span>
        </div>
      ),
    }),
    createTableColumn<FileNode>({
      columnId: 'modified',
      renderHeaderCell: () => 'Date Modified',
      renderCell: (item) => formatDate(item.modified),
    }),
    createTableColumn<FileNode>({
      columnId: 'type',
      renderHeaderCell: () => 'Type',
      renderCell: (item) => item.fileType,
    }),
    createTableColumn<FileNode>({
      columnId: 'size',
      renderHeaderCell: () => 'Size',
      renderCell: (item) => formatFileSize(item.size),
    }),
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Text size={500} weight="semibold">📁 Runtime Folder Browser</Text>
        </div>
        <div className={styles.headerRight}>
          <Button
            appearance="subtle"
            icon={<ChevronUpRegular />}
            onClick={handleGoUp}
            disabled={loading || pathStack.length === 0}
          >
            Up
          </Button>
          <Button
            appearance="subtle"
            icon={<ArrowSyncRegular />}
            onClick={() => loadFiles(currentPath)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className={styles.pathBar}>
        <Text size={300}>Path: {currentPath || 'Root'}</Text>
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
                focusMode="composite"
                size="small"
                style={{ minWidth: '100%' }}
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
