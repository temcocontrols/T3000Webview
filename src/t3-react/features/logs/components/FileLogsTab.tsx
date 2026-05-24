/**
 * File Logs Tab
 *
 * Extracted from SystemLogsPage — browses T3WebLog/*.txt files by date
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  Button,
  Input,
  Checkbox,
  Spinner,
  Tag,
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
  ClipboardTextLtrRegular,
  GlobeRegular,
  SettingsRegular,
  MailRegular,
  DatabaseRegular,
  StorageRegular,
  PlugConnectedRegular,
  RocketRegular,
  PlugDisconnectedRegular,
} from '@fluentui/react-icons';
import { API_BASE_URL } from '../../../config/constants';
import styles from '../../develop/pages/SystemLogsPage.module.css';

const FILE_LOG_BASE = `${API_BASE_URL}/api/develop/logs`;

type LogLevel = 'all' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
type LogCategory = 'all' | 'api' | 'cpp_msg' | 'handler' | 'database' | 'partition' | 'ffi' | 'initialize' | 'socket';

interface LogFile {
  name: string;
  category: LogCategory;
  size: number;
  /** 4-digit hour-bucket suffix from filename, e.g. "0003" = 00:00-03:59 */
  timeBucket: string;
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
  fileCount: number;
  totalSize: number;
}

interface FileLogsTabProps {
  headerPrefix?: React.ReactNode;
}

export const FileLogsTab: React.FC<FileLogsTabProps> = ({ headerPrefix }) => {
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

  const getLogCategory = (filename: string): { category: LogCategory; icon: string; displayName: string } => {
    if (filename.includes('T3_Webview_API_')) return { category: 'api', icon: 'globe', displayName: 'API Logs' };
    if (filename.includes('T3_CppMsg_BacnetWebView_')) return { category: 'cpp_msg', icon: 'settings', displayName: 'C++ Messages' };
    if (filename.includes('T3_CppMsg_HandWebViewMsg_')) return { category: 'handler', icon: 'mail', displayName: 'Message Handler' };
    if (filename.includes('T3_DatabaseSizeMonitor_')) return { category: 'database', icon: 'database', displayName: 'Database Monitor' };
    if (filename.includes('T3_PartitionMonitor_')) return { category: 'partition', icon: 'storage', displayName: 'Partition Monitor' };
    if (filename.includes('T3_Webview_FFI_')) return { category: 'ffi', icon: 'plug', displayName: 'FFI Operations' };
    if (filename.includes('T3_Webview_Initialize_')) return { category: 'initialize', icon: 'rocket', displayName: 'Initialize' };
    if (filename.includes('T3_Webview_Socket_')) return { category: 'socket', icon: 'connector', displayName: 'Socket Logs' };
    return { category: 'all', icon: 'document', displayName: 'Other' };
  };

  /**
   * Extract the 4-digit hour-bucket from the filename (e.g. "T3_Webview_FFI_0003.txt" → "0003").
   * Format it as a readable time range: "0003" → "00:00-03:59".
   */
  const extractTimeBucket = (filename: string): string => {
    const match = filename.match(/_([0-9]{4})\.txt$/);
    if (!match) return '';
    const bucket = match[1];
    const startH = bucket.slice(0, 2);
    const endH = bucket.slice(2, 4);
    return `${startH}:00-${endH}:59`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const loadAvailableDates = async () => {
    try {
      const response = await fetch(`${FILE_LOG_BASE}/dates`);
      if (response.ok) {
        const dates: DateFolder[] = await response.json();
        setAvailableDates(dates);
        // Auto-select the most recent date only on first load
        setSelectedDate(prev => (prev || (dates.length > 0 ? dates[0].path : '')));
      }
    } catch (error) {
      console.error('Failed to load dates:', error);
    }
  };

  const loadLogFiles = async (datePath: string) => {
    if (!datePath) return;
    // Reset file state before loading new date
    setLogFiles([]);
    setSelectedFile(null);
    setLogContent('');
    setParsedLogs([]);
    setTotalSize(0);
    setLoading(true);
    try {
      const response = await fetch(`${FILE_LOG_BASE}/files?date=${encodeURIComponent(datePath)}`);
      if (response.ok) {
        const files: { name: string; size: number }[] = await response.json();
        const logFileList: LogFile[] = files.map(file => {
          const { category, icon, displayName } = getLogCategory(file.name);
          return { name: file.name, category, size: file.size, timeBucket: extractTimeBucket(file.name), icon, displayName };
        });
        setLogFiles(logFileList);
        setTotalSize(files.reduce((sum, f) => sum + f.size, 0));
        // Auto-select first file
        if (logFileList.length > 0) {
          setSelectedFile(logFileList[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load log files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogContent = async (file: LogFile, datePath: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${FILE_LOG_BASE}/content?date=${encodeURIComponent(datePath)}&file=${encodeURIComponent(file.name)}`
      );
      if (response.ok) {
        const content = await response.text();
        setLogContent(content);
        parseLogContent(content);
      } else {
        setLogContent('');
        setParsedLogs([]);
      }
    } catch (error) {
      console.error('Failed to load log content:', error);
      setLogContent('');
      setParsedLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const parseLogContent = (content: string) => {
    const lines = content.split('\n');
    const entries: LogEntry[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const match = line.match(/^\[([^\]]+)\]\s*\[(ERROR|WARN|INFO|DEBUG)\]\s*(.+)$/);
      if (match) {
        entries.push({ timestamp: match[1], level: match[2] as LogLevel, message: match[3], raw: line });
      } else {
        entries.push({ timestamp: '', level: 'INFO', message: line, raw: line });
      }
    }
    setParsedLogs(entries);
  };

  useEffect(() => {
    let filtered = parsedLogs;
    if (levelFilter !== 'all') filtered = filtered.filter(log => log.level === levelFilter);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => log.message.toLowerCase().includes(query) || log.raw.toLowerCase().includes(query));
    }
    setFilteredLogs(filtered);
  }, [parsedLogs, levelFilter, searchQuery]);

  useEffect(() => { loadAvailableDates(); }, []);
  useEffect(() => { if (selectedDate) loadLogFiles(selectedDate); }, [selectedDate]);
  useEffect(() => { if (selectedFile && selectedDate) loadLogContent(selectedFile, selectedDate); }, [selectedFile, selectedDate]);

  useEffect(() => {
    if (!autoRefresh || !selectedFile || !selectedDate) return;
    const interval = setInterval(() => loadLogContent(selectedFile, selectedDate), 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedFile, selectedDate]);

  const uniqueBuckets = Array.from(new Set(logFiles.map(f => f.timeBucket))).sort();
  const filteredFiles = logFiles.filter(file => {
    if (categoryFilter !== 'all' && file.category !== categoryFilter) return false;
    if (selectedPid !== 'all' && file.timeBucket !== selectedPid) return false;
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
      await fetch(`${FILE_LOG_BASE}/clear`, { method: 'POST' });
      setLogContent('');
      setParsedLogs([]);
      loadLogFiles(selectedDate);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const getLevelClass = (level: LogLevel) => styles[`level${level}`] || styles.levelINFO;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitleGroup}>
            <ClipboardTextLtrRegular style={{ fontSize: '18px', marginRight: '4px' }} />
            <Text size={400} weight="semibold">File Logs</Text>
            <Tag appearance="filled" color="informative" size="extra-small" style={{ fontSize: '11px', padding: '2px 6px' }}>
              {logFiles.length} files • {formatSize(totalSize)}
            </Tag>
          </div>
          {headerPrefix}
        </div>
        <div className={styles.headerActions}>
          <Text size={200}>Auto</Text>
          <Checkbox checked={autoRefresh} onChange={(_, data) => setAutoRefresh(!!data.checked)} />
          <Button appearance="subtle" icon={<ArrowSyncRegular fontSize={14} />}
            onClick={() => selectedFile && selectedDate && loadLogContent(selectedFile, selectedDate)}
            disabled={loading || !selectedFile} size="small" />
          <Button appearance="subtle" icon={<ArrowDownloadRegular fontSize={14} />}
            onClick={downloadLogFile} disabled={!selectedFile} size="small" />
          <Button appearance="subtle" icon={<DismissRegular fontSize={14} />} onClick={clearLogs} size="small" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" icon={<CalendarRegular />} size="small" style={{ fontSize: '12px' }}>
              {availableDates.find(d => d.path === selectedDate)?.displayDate || selectedDate || 'Select Date'}
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {availableDates.length === 0 ? (
                <MenuItem disabled style={{ fontSize: '12px' }}>No dates available</MenuItem>
              ) : (
                availableDates.map((date) => (
                  <MenuItem key={date.path} onClick={() => setSelectedDate(date.path)} style={{ fontSize: '12px' }}>
                    {date.displayDate}
                    {date.fileCount > 0 && (
                      <span style={{ color: '#605e5c', marginLeft: 6 }}>
                        {date.fileCount} file{date.fileCount !== 1 ? 's' : ''} • {formatSize(date.totalSize)}
                      </span>
                    )}
                  </MenuItem>
                ))
              )}
            </MenuList>
          </MenuPopover>
        </Menu>

        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" size="small" style={{ fontSize: '12px' }}>
              Category: {categoryFilter === 'all' ? 'All' : categoryFilter}
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => setCategoryFilter('all')} style={{ fontSize: '12px' }}>All Categories</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('api')} style={{ fontSize: '12px' }} icon={<GlobeRegular />}>API</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('cpp_msg')} style={{ fontSize: '12px' }} icon={<SettingsRegular />}>C++ Messages</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('handler')} style={{ fontSize: '12px' }} icon={<MailRegular />}>Handler</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('database')} style={{ fontSize: '12px' }} icon={<DatabaseRegular />}>Database</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('partition')} style={{ fontSize: '12px' }} icon={<StorageRegular />}>Partition</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('ffi')} style={{ fontSize: '12px' }} icon={<PlugConnectedRegular />}>FFI</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('initialize')} style={{ fontSize: '12px' }} icon={<RocketRegular />}>Initialize</MenuItem>
              <MenuItem onClick={() => setCategoryFilter('socket')} style={{ fontSize: '12px' }} icon={<PlugDisconnectedRegular />}>Socket</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>

        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" size="small" style={{ fontSize: '12px' }}>
              Level: {levelFilter === 'all' ? 'All' : levelFilter}
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => setLevelFilter('all')} style={{ fontSize: '12px' }}>All Levels</MenuItem>
              <MenuItem onClick={() => setLevelFilter('ERROR')} style={{ fontSize: '12px' }}>ERROR</MenuItem>
              <MenuItem onClick={() => setLevelFilter('WARN')} style={{ fontSize: '12px' }}>WARN</MenuItem>
              <MenuItem onClick={() => setLevelFilter('INFO')} style={{ fontSize: '12px' }}>INFO</MenuItem>
              <MenuItem onClick={() => setLevelFilter('DEBUG')} style={{ fontSize: '12px' }}>DEBUG</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>

        {uniqueBuckets.length > 1 && (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" size="small" style={{ fontSize: '12px' }}>
                Time: {selectedPid === 'all' ? 'All' : selectedPid}
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => setSelectedPid('all')} style={{ fontSize: '12px' }}>All Times</MenuItem>
                {uniqueBuckets.map(bucket => (
                  <MenuItem key={bucket} onClick={() => setSelectedPid(bucket)} style={{ fontSize: '12px' }}>{bucket}</MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        )}

        <Input placeholder="Search logs..." value={searchQuery} onChange={(_, data) => setSearchQuery(data.value)}
          size="small" style={{ flex: 1, minWidth: '200px' }} />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Panel */}
        <div className={styles.filePanel}>
          <div className={styles.filePanelHeader}>
            <Text size={200} weight="semibold">Log Categories</Text>
          </div>
          <div className={styles.fileList}>
            {loading && logFiles.length === 0 ? (
              <div className={styles.fileListPlaceholder}><Spinner size="tiny" /></div>
            ) : filteredFiles.length === 0 ? (
              <div className={styles.fileListPlaceholder}><Text size={200}>No log files</Text></div>
            ) : (
              filteredFiles.map((file) => (
                <div key={file.name}
                  className={`${styles.fileItem} ${selectedFile?.name === file.name ? styles.fileItemActive : ''}`}
                  onClick={() => setSelectedFile(file)}>
                  <div className={styles.fileIcon}>
                    {file.icon === 'globe' && <GlobeRegular />}
                    {file.icon === 'settings' && <SettingsRegular />}
                    {file.icon === 'mail' && <MailRegular />}
                    {file.icon === 'database' && <DatabaseRegular />}
                    {file.icon === 'storage' && <StorageRegular />}
                    {file.icon === 'plug' && <PlugConnectedRegular />}
                    {file.icon === 'rocket' && <RocketRegular />}
                    {file.icon === 'connector' && <PlugDisconnectedRegular />}
                    {file.icon === 'document' && <DocumentRegular />}
                  </div>
                  <div className={styles.fileInfo}>
                    <Text size={200} weight="semibold">{file.displayName}</Text>
                    <Text size={100} style={{ color: '#605e5c' }}>{formatSize(file.size)}{file.timeBucket ? ` • ${file.timeBucket}` : ''}</Text>
                  </div>
                  <ChevronRightRegular className={styles.fileChevron} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className={styles.logPanel}>
          {loading && !logContent ? (
            <div className={styles.logLoading}><Spinner size="tiny" /><Text size={200} weight="regular">Loading log content...</Text></div>
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
                  {log.timestamp && <span className={styles.logTimestamp}>[{log.timestamp}]</span>}
                  {log.level && log.level !== 'INFO' && (
                    <span className={`${styles.logLevel} ${getLevelClass(log.level)}`}>[{log.level}]</span>
                  )}
                  <span className={styles.logMessage}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
          <div className={styles.footer}>
            <Text size={200} style={{ color: '#605e5c' }}>
              {selectedFile
                ? <>{selectedFile.displayName} • {filteredLogs.length} entries{searchQuery && ` • Search: "${searchQuery}"`}</>
                : `${logFiles.length} log files available • ${formatSize(totalSize)} total`}
            </Text>
            {selectedDate && <Text size={200} style={{ color: '#605e5c' }}>{selectedDate}</Text>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileLogsTab;
