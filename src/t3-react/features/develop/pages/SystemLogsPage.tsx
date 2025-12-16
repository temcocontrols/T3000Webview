/**
 * System Logs Page
 *
 * View application logs with filtering
 */

import React, { useState, useEffect } from 'react';
import {
  Text,
  Button,
  Dropdown,
  Option,
  Input,
  Checkbox,
  Spinner
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  DismissRegular,
  ArrowDownloadRegular,
  FilterRegular
} from '@fluentui/react-icons';
import styles from './SystemLogsPage.module.css';

type LogLevel = 'all' | 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  source: string;
  message: string;
}

export const SystemLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load logs
  const loadLogs = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockLogs: LogEntry[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 5000),
          level: 'info',
          source: 'WebSocketManager',
          message: 'WebSocket connection established to 192.168.1.100:502',
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 10000),
          level: 'debug',
          source: 'DeviceScanner',
          message: 'Scanning subnet 192.168.1.0/24 for T3000 devices',
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 15000),
          level: 'warn',
          source: 'ModbusService',
          message: 'Timeout reading register 100 from device 237219 (attempt 1/3)',
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 20000),
          level: 'error',
          source: 'DatabaseService',
          message: 'Failed to execute query: SQLITE_BUSY - database is locked',
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 25000),
          level: 'info',
          source: 'FFIService',
          message: 'C++ FFI initialized successfully, loaded 45 functions',
        },
        {
          id: '6',
          timestamp: new Date(Date.now() - 30000),
          level: 'debug',
          source: 'TrendlogMonitor',
          message: 'Started monitoring trendlog updates for panel 237219',
        },
      ];

      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logs
  useEffect(() => {
    let filtered = logs;

    // Level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, levelFilter, searchQuery]);

  // Initial load
  useEffect(() => {
    loadLogs();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  const exportLogs = () => {
    const logText = filteredLogs
      .map(log => `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()} ${log.source}: ${log.message}`)
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `t3000-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelClass = (level: string) => {
    return styles[`level${level.charAt(0).toUpperCase() + level.slice(1)}`];
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Text size={500} weight="semibold">📝 System Logs</Text>
          <Text size={300} style={{ color: '#605e5c' }}>
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
          </Text>
        </div>

        <div className={styles.headerActions}>
          <Checkbox
            label="Auto-refresh"
            checked={autoRefresh}
            onChange={(_, data) => setAutoRefresh(!!data.checked)}
          />
          <Button
            appearance="subtle"
            icon={<ArrowSyncRegular />}
            onClick={loadLogs}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            appearance="subtle"
            icon={<ArrowDownloadRegular />}
            onClick={exportLogs}
            disabled={filteredLogs.length === 0}
          >
            Export
          </Button>
          <Button
            appearance="subtle"
            icon={<DismissRegular />}
            onClick={clearLogs}
            disabled={logs.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <FilterRegular style={{ color: '#605e5c' }} />
        <Dropdown
          placeholder="Level"
          value={levelFilter}
          onOptionSelect={(_, data) => setLevelFilter(data.optionValue as LogLevel)}
          style={{ width: '120px' }}
        >
          <Option value="all">All Levels</Option>
          <Option value="error">Error</Option>
          <Option value="warn">Warning</Option>
          <Option value="info">Info</Option>
          <Option value="debug">Debug</Option>
        </Dropdown>
        <Input
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(_, data) => setSearchQuery(data.value)}
          style={{ flex: 1 }}
        />
      </div>

      <div className={styles.content}>
        {loading && logs.length === 0 && (
          <div className={styles.logsPlaceholder}>
            <Spinner size="small" label="Loading logs..." />
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className={styles.logsPlaceholder}>
            <Text size={300}>No logs available</Text>
          </div>
        )}

        {filteredLogs.length === 0 && logs.length > 0 && (
          <div className={styles.logsPlaceholder}>
            <Text size={300}>No logs match the current filters</Text>
          </div>
        )}

        {filteredLogs.length > 0 && (
          <div className={styles.logsList}>
            {filteredLogs.map((log) => (
              <div key={log.id} className={styles.logEntry}>
                <div className={styles.logTimestamp}>
                  {log.timestamp.toLocaleTimeString()}
                </div>
                <div className={`${styles.logLevel} ${getLevelClass(log.level)}`}>
                  {log.level.toUpperCase()}
                </div>
                <div className={styles.logSource}>
                  {log.source}
                </div>
                <div className={styles.logMessage}>
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemLogsPage;
