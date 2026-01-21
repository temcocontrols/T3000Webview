/**
 * System Logs Page
 *
 * View T3WebLog application logs with real-time monitoring
 * Displays logs from: T3WebLog/{YEAR-MONTH}/{MMDD}/T3_*.txt
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  Button,
  Input,
  Checkbox,
  Spinner,
  Badge,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  DismissRegular,
  ArrowDownloadRegular,
  FilterRegular,
  CalendarRegular,
  DocumentRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';
import styles from './SystemLogsPage.module.css';

type LogLevel = 'all' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

type LogCategory = 'all' | 'api' | 'cpp_msg' | 'handler' | 'database' | 'partition' | 'ffi' | 'initialize' | 'socket';

interface LogFile {
  name: string;
  category: LogCategory;
  size: number;
  pid: string;
  icon: string;
  displayName: string;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  raw: string;
}

interface DateFolder {
  path: string;
  displayDate: string;
}

export const SystemLogsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<DateFolder[]>([]);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<LogFile | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [parsedLogs, setParsedLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [categoryFilter, setCategoryFilter] = useState<LogCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPid, setSelectedPid] = useState<string>('all');
  const [totalSize, setTotalSize] = useState<number>(0);
  const logViewerRef = useRef<HTMLDivElement>(null);

  // Get log category from filename
  const getLogCategory = (filename: string): { category: LogCategory; icon: string; displayName: string } => {
    if (filename.includes('T3_Webview_API_')) return { category: 'api', icon: '🌐', displayName: 'API Logs' };
    if (filename.includes('T3_CppMsg_BacnetWebView_')) return { category: 'cpp_msg', icon: '⚙️', displayName: 'C++ Messages' };
    if (filename.includes('T3_CppMsg_HandWebViewMsg_')) return { category: 'handler', icon: '📨', displayName: 'Message Handler' };
    if (filename.includes('T3_DatabaseSizeMonitor_')) return { category: 'database', icon: '💾', displayName: 'Database Monitor' };
    if (filename.includes('T3_PartitionMonitor_')) return { category: 'partition', icon: '📊', displayName: 'Partition Monitor' };
    if (filename.includes('T3_Webview_FFI_')) return { category: 'ffi', icon: '🔌', displayName: 'FFI Operations' };
    if (filename.includes('T3_Webview_Initialize_')) return { category: 'initialize', icon: '🚀', displayName: 'Initialize' };
    if (filename.includes('T3_Webview_Socket_')) return { category: 'socket', icon: '🔗', displayName: 'Socket Logs' };
    return { category: 'all', icon: '📄', displayName: 'Other' };
  };

  // Extract PID from filename (e.g., T3_Webview_API_1619.txt -> 1619)
  const extractPid = (filename: string): string => {
    const match = filename.match(/_([0-9]+)\.txt$/);
    return match ? match[1] : 'unknown';
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Load available dates from T3WebLog folder
  const loadAvailableDates = async () => {
    try {
      const response = await fetch('http://localhost:9103/api/develop/logs/dates');
      if (response.ok) {
        const dates: DateFolder[] = await response.json();
        setAvailableDates(dates);
        if (dates.length > 0 && !selectedDate) {
          setSelectedDate(dates[0].path);
        }
      }
    } catch (error) {
      console.error('Failed to load dates:', error);
      // Fallback to today's date
      const today = new Date();
      const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const day = String(today.getDate()).padStart(2, '0');
      setSelectedDate(`${yearMonth}/${day.substring(2)}`);
    }
  };

  // Load log files for selected date
  const loadLogFiles = async (datePath: string) => {
    if (!datePath) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:9103/api/develop/logs/files?date=${encodeURIComponent(datePath)}`);
      if (response.ok) {
        const files: { name: string; size: number }[] = await response.json();

        const logFileList: LogFile[] = files.map(file => {
          const { category, icon, displayName } = getLogCategory(file.name);
          return {
            name: file.name,
            category,
            size: file.size,
            pid: extractPid(file.name),
            icon,
            displayName,
          };
        });

        setLogFiles(logFileList);
        setTotalSize(files.reduce((sum, f) => sum + f.size, 0));

        // Auto-select first file
        if (logFileList.length > 0 && !selectedFile) {
          setSelectedFile(logFileList[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load log files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load log file content
  const loadLogContent = async (file: LogFile, datePath: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:9103/api/develop/logs/content?date=${encodeURIComponent(datePath)}&file=${encodeURIComponent(file.name)}`
      );
      if (response.ok) {
        const content = await response.text();
        setLogContent(content);
        parseLogContent(content);
      }
    } catch (error) {
      console.error('Failed to load log content:', error);
      setLogContent('');
      setParsedLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Parse log content into entries
  const parseLogContent = (content: string) => {
    const lines = content.split('\n');
    const entries: LogEntry[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // Parse timestamp and level: [2026-01-21 16:16:10 UTC] [INFO] message
      const match = line.match(/^\[([^\]]+)\]\s*\[(ERROR|WARN|INFO|DEBUG)\]\s*(.+)$/);

      if (match) {
        entries.push({
          timestamp: match[1],
          level: match[2] as LogLevel,
          message: match[3],
          raw: line,
        });
      } else {
        // Non-standard format, add as raw
        entries.push({
          timestamp: '',
          level: 'INFO',
          message: line,
          raw: line,
        });
      }
    }

    setParsedLogs(entries);
  };

  // Filter logs
  useEffect(() => {
    let filtered = parsedLogs;

    // Level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.raw.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  }, [parsedLogs, levelFilter, searchQuery]);

  // Initial load
  useEffect(() => {
    loadAvailableDates();
  }, []);

  // Load files when date changes
  useEffect(() => {
    if (selectedDate) {
      loadLogFiles(selectedDate);
    }
  }, [selectedDate]);

  // Load content when file changes
  useEffect(() => {
    if (selectedFile && selectedDate) {
      loadLogContent(selectedFile, selectedDate);
    }
  }, [selectedFile, selectedDate]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !selectedFile || !selectedDate) return;

    const interval = setInterval(() => {
      loadLogContent(selectedFile, selectedDate);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedFile, selectedDate]);

  // Get unique PIDs
  const uniquePids = Array.from(new Set(logFiles.map(f => f.pid))).sort();

  // Filter files by category and PID
  const filteredFiles = logFiles.filter(file => {
    if (categoryFilter !== 'all' && file.category !== categoryFilter) return false;
    if (selectedPid !== 'all' && file.pid !== selectedPid) return false;
    return true;
  });

  const downloadLogFile = () => {
    if (!selectedFile) return;

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearLogs = async () => {
    try {
      await fetch('http://localhost:9103/api/develop/logs/clear', { method: 'POST' });
      setLogContent('');
      setParsedLogs([]);
      loadLogFiles(selectedDate);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const getLevelClass = (level: LogLevel) => {
    return styles[`level${level}`] || styles.levelINFO;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Text size={500} weight="semibold">📊 T3000 Logs - Live Monitor</Text>
          <Badge appearance="filled" color="informative">
            {logFiles.length} files • {formatSize(totalSize)}
          </Badge>
        </div>

        <div className={styles.headerActions}>
          <Checkbox
            label="Auto"
            checked={autoRefresh}
            onChange={(_, data) => setAutoRefresh(!!data.checked)}
          />
          <Button
            appearance="subtle"
            icon={<ArrowSyncRegular />}
            onClick={() => selectedFile && selectedDate && loadLogContent(selectedFile, selectedDate)}
            disabled={loading || !selectedFile}
            size="small"
          />
          <Button
            appearance="subtle"
            icon={<ArrowDownloadRegular />}
            onClick={clearLogs}
            size="small"
          />
          <Button
            appearance="subtle"
            icon={<DismissRegular />}
            onClick={clearLogs}
            size="small"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              icon={<CalendarRegular />}
              size="small"
            >
              {selectedDate || 'Select Date'}
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {availableDates.map((date) => (
                <MenuItem
                  key={date.path}
                  onClick={() => setSelectedDate(date.path)}
                >
                  {date.displayDate}
                </MenuItem>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>

        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" size="small">
              Category: {categoryFilter === 'all' ? 'All' : categoryFilter}
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => setCategoryFilter('all')}>All Categories</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('api')}>🌐 API</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('cpp_msg')}>⚙️ C++ Messages</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('handler')}>📨 Handler</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('database')}>💾 Database</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('partition')}>📊 Partition</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('ffi')}>🔌 FFI</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('initialize')}>🚀 Initialize</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('socket')}>🔗 Socket</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>

        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" size="small">
              Level: {levelFilter === 'all' ? 'All' : levelFilter}
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => setLevelFilter('all')}>All Levels</MenuItem>
              <MenuItem onClick={() => setLevelFilter('ERROR')}>ERROR</MenuItem>
              <MenuItem onClick={() => setLevelFilter('WARN')}>WARN</MenuItem>
              <MenuItem onClick={() => setLevelFilter('INFO')}>INFO</MenuItem>
              <MenuItem onClick={() => setLevelFilter('DEBUG')}>DEBUG</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>

        {uniquePids.length > 1 && (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" size="small">
                PID: {selectedPid === 'all' ? 'All' : selectedPid}
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => setSelectedPid('all')}>All PIDs</MenuItem>
                {uniquePids.map(pid => (
                  <MenuItem key={pid} onClick={() => setSelectedPid(pid)}>
                    {pid}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        )}

        <Input
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(_, data) => setSearchQuery(data.value)}
          size="small"
          style={{ flex: 1, minWidth: '200px' }}
        />
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className={styles.mainContent}>
        {/* Left Panel - File Browser */}
        <div className={styles.filePanel}>
          <div className={styles.filePanelHeader}>
            <DocumentRegular />
            <Text size={300} weight="semibold">Log Categories</Text>
          </div>

          <div className={styles.fileList}>
            {loading && logFiles.length === 0 ? (
              <div className={styles.fileListPlaceholder}>
                <Spinner size="tiny" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className={styles.fileListPlaceholder}>
                <Text size={200}>No log files</Text>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.name}
                  className={`${styles.fileItem} ${selectedFile?.name === file.name ? styles.fileItemActive : ''}`}
                  onClick={() => setSelectedFile(file)}
                >
                  <div className={styles.fileIcon}>{file.icon}</div>
                  <div className={styles.fileInfo}>
                    <Text size={200} weight="semibold">
                      {file.displayName}
                    </Text>
                    <Text size={100} style={{ color: '#605e5c' }}>
                      {formatSize(file.size)} • PID {file.pid}
                    </Text>
                  </div>
                  <ChevronRightRegular className={styles.fileChevron} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Log Viewer */}
        <div className={styles.logPanel}>
          {loading && !logContent ? (
            <div className={styles.logPlaceholder}>
              <Spinner label="Loading log content..." />
            </div>
          ) : !selectedFile ? (
            <div className={styles.logPlaceholder}>
              <DocumentRegular style={{ fontSize: '48px', color: '#d2d0ce' }} />
              <Text size={300}>Select a log file to view</Text>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className={styles.logPlaceholder}>
              <FilterRegular style={{ fontSize: '48px', color: '#d2d0ce' }} />
              <Text size={300}>No logs match the current filters</Text>
            </div>
          ) : (
            <div className={styles.logViewer} ref={logViewerRef}>
              {filteredLogs.map((log, index) => (
                <div key={index} className={styles.logLine}>
                  {log.timestamp && (
                    <span className={styles.logTimestamp}>[{log.timestamp}]</span>
                  )}
                  {log.level && log.level !== 'INFO' && (
                    <span className={`${styles.logLevel} ${getLevelClass(log.level)}`}>
                      [{log.level}]
                    </span>
                  )}
                  <span className={styles.logMessage}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className={styles.footer}>
        <Text size={200} style={{ color: '#605e5c' }}>
          {selectedFile ? (
            <>
              {selectedFile.displayName} • {filteredLogs.length} entries
              {searchQuery && ` • Search: "${searchQuery}"`}
            </>
          ) : (
            `${logFiles.length} log files available • ${formatSize(totalSize)} total`
          )}
        </Text>
        {selectedDate && (
          <Text size={200} style={{ color: '#605e5c' }}>
            {selectedDate}
          </Text>
        )}
      </div>
    </div>
  );
};

export default SystemLogsPage;
