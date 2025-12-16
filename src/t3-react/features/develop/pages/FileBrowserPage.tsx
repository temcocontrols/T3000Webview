/**
 * File Browser Page
 *
 * Browse runtime folder structure and preview files
 */

import React, { useState, useEffect } from 'react';
import { Text, Button, Spinner } from '@fluentui/react-components';
import { ArrowSyncRegular, FolderRegular, DocumentRegular } from '@fluentui/react-icons';
import styles from './FileBrowserPage.module.css';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
  extension?: string;
}

export const FileBrowserPage: React.FC = () => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for now (will be replaced with API calls)
  const loadFiles = async (path?: string) => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/develop/files/list?path=${path || ''}`);
      // const data = await response.json();

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockFiles: FileNode[] = [
        { name: 'Database', path: '/Database', isDirectory: true },
        { name: 'Images', path: '/Images', isDirectory: true },
        { name: 'Logs', path: '/Logs', isDirectory: true },
        { name: 'config.ini', path: '/config.ini', isDirectory: false, size: 1024, extension: 'ini' },
        { name: 'T3000.exe', path: '/T3000.exe', isDirectory: false, size: 15728640, extension: 'exe' },
      ];

      setFiles(mockFiles);
      setCurrentPath('D:\\T3000 Output\\Debug');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: FileNode) => {
    if (file.isDirectory) {
      loadFiles(file.path);
    } else {
      setSelectedFile(file);
      loadFileContent(file.path);
    }
  };

  const loadFileContent = async (path: string) => {
    try {
      // TODO: Replace with actual API call
      setFileContent('File content preview - API integration pending');
    } catch (err) {
      setFileContent('Error loading file content');
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
            onClick={() => loadFiles()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className={styles.pathBar}>
        <Text size={300}>Path: {currentPath}</Text>
      </div>

      <div className={styles.content}>
        <div className={styles.splitView}>
          {/* File List */}
          <div className={styles.fileList}>
            {loading && <Spinner size="small" label="Loading..." />}

            {error && (
              <div className={styles.error}>
                <Text size={300} style={{ color: '#d13438' }}>{error}</Text>
              </div>
            )}

            {!loading && !error && files.map((file) => (
              <div
                key={file.path}
                className={`${styles.fileItem} ${selectedFile?.path === file.path ? styles.fileItemSelected : ''}`}
                onClick={() => handleFileClick(file)}
              >
                <div className={styles.fileIcon}>
                  {file.isDirectory ? <FolderRegular /> : <DocumentRegular />}
                </div>
                <div className={styles.fileInfo}>
                  <Text size={300} weight="semibold">{file.name}</Text>
                  <Text size={200}>{formatFileSize(file.size)}</Text>
                </div>
              </div>
            ))}
          </div>

          {/* File Preview */}
          <div className={styles.filePreview}>
            {selectedFile ? (
              <div className={styles.previewContent}>
                <Text size={400} weight="semibold">{selectedFile.name}</Text>
                <div className={styles.previewMeta}>
                  <Text size={200}>Size: {formatFileSize(selectedFile.size)}</Text>
                  <Text size={200}>Type: {selectedFile.extension || 'Unknown'}</Text>
                </div>
                <div className={styles.previewText}>
                  <pre>{fileContent}</pre>
                </div>
              </div>
            ) : (
              <div className={styles.previewPlaceholder}>
                <Text size={300}>Select a file to preview</Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileBrowserPage;
