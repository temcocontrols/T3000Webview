/**
 * Transport Tester Page
 *
 * Test t3-transport library messages
 */

import React, { useState } from 'react';
import {
  Text,
  Button,
  Dropdown,
  Option,
  Input,
  Textarea,
  Spinner
} from '@fluentui/react-components';
import { SendRegular, DismissRegular } from '@fluentui/react-icons';
import styles from './TransportTesterPage.module.css';

type TransportType = 'websocket' | 'ffi' | 'webview2';

interface MessageHistoryItem {
  id: string;
  timestamp: Date;
  action: string;
  request: any;
  response: any;
  duration: number;
  status: 'success' | 'error';
}

export const TransportTesterPage: React.FC = () => {
  const [transport, setTransport] = useState<TransportType>('websocket');
  const [action, setAction] = useState<string>('get_device_status');
  const [panelId, setPanelId] = useState<string>('237219');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [customData, setCustomData] = useState<string>('{}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [history, setHistory] = useState<MessageHistoryItem[]>([]);

  const actions = [
    'get_device_status',
    'read_inputs',
    'read_outputs',
    'read_variables',
    'write_output',
    'get_trendlog_data',
    'custom',
  ];

  const sendMessage = async () => {
    setLoading(true);
    setResponse('');

    try {
      const startTime = Date.now();

      // Build request
      const request = {
        action,
        panel_id: parseInt(panelId),
        serial_number: serialNumber || undefined,
        ...(customData !== '{}' ? JSON.parse(customData) : {}),
      };

      // Simulate transport call
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockResponse = {
        status: 'success',
        data: {
          panel_id: parseInt(panelId),
          online: true,
          response_time_ms: 45,
          result: 'Mock response data',
        },
      };

      const duration = Date.now() - startTime;

      setResponse(JSON.stringify(mockResponse, null, 2));

      // Add to history
      const historyItem: MessageHistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date(),
        action,
        request,
        response: mockResponse,
        duration,
        status: 'success',
      };

      setHistory(prev => [historyItem, ...prev].slice(0, 50));
    } catch (err) {
      const errorResponse = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Request failed',
      };
      setResponse(JSON.stringify(errorResponse, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.topBarControls}>
          <div className={styles.controlGroup}>
            <Text size={200} weight="semibold">Transport Type:</Text>
            <Dropdown
              placeholder="Transport Type"
              value={transport}
              onOptionSelect={(_, data) => setTransport(data.optionValue as TransportType)}
              style={{ minWidth: '150px' }}
              size="small"
            >
              <Option value="websocket">WebSocket</Option>
              <Option value="ffi">FFI</Option>
              <Option value="webview2">WebView2</Option>
            </Dropdown>
          </div>
          <div className={styles.controlGroup}>
            <Text size={200} weight="semibold">Message Type:</Text>
            <Dropdown
              placeholder="Select message type"
              value={action}
              onOptionSelect={(_, data) => data.optionValue && setAction(data.optionValue)}
              style={{ minWidth: '200px' }}
              size="small"
            >
              {actions.map((act) => (
                <Option key={act} value={act}>{act}</Option>
              ))}
            </Dropdown>
          </div>
          <Button
            appearance="primary"
            icon={<SendRegular />}
            onClick={sendMessage}
            disabled={loading}
            size="small"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.bottomArea}>
          {/* Left: Message Panel */}
          <div className={styles.messagePanel}>
            <div className={styles.panelHeader}>
              <Text size={200} weight="semibold">Message</Text>
            </div>

            <div className={styles.formGroup}>
              <Text size={200} weight="semibold">Panel ID</Text>
              <Input
                value={panelId}
                onChange={(_, data) => setPanelId(data.value)}
                placeholder="237219"
                size="small"
              />
            </div>

            <div className={styles.formGroup}>
              <Text size={200} weight="semibold">Serial Number (optional)</Text>
              <Input
                value={serialNumber}
                onChange={(_, data) => setSerialNumber(data.value)}
                placeholder="Leave empty for broadcast"
                size="small"
              />
            </div>

            <div className={styles.formGroup}>
              <Text size={200} weight="semibold">Custom Data (JSON)</Text>
              <Textarea
                value={customData}
                onChange={(_, data) => setCustomData(data.value)}
                className={styles.jsonTextarea}
                resize="vertical"
                size="small"
              />
            </div>
          </div>

          {/* Middle: Response Panel */}
          <div className={styles.responsePanel}>
            <div className={styles.panelHeader}>
              <Text size={200} weight="semibold">Response</Text>
            </div>

            {loading && (
              <div className={styles.responsePlaceholder}>
                <Spinner size="small" label="Waiting for response..." />
              </div>
            )}

            {!loading && !response && (
              <div className={styles.responsePlaceholder}>
                <Text size={300}>Send a message to see response</Text>
              </div>
            )}

            {!loading && response && (
              <pre className={styles.responseText}>{response}</pre>
            )}
          </div>

          {/* Right: History Panel */}
          <div className={styles.historyPanel}>
            <div className={styles.panelHeader}>
              <Text size={200} weight="semibold">History</Text>
              <Button
                appearance="subtle"
                size="small"
                icon={<DismissRegular />}
                onClick={clearHistory}
              >
                Clear
              </Button>
            </div>

            <div className={styles.historyList}>
              {history.length === 0 && (
                <div className={styles.historyPlaceholder}>
                  <Text size={300}>No messages sent yet</Text>
                </div>
              )}

              {history.map((item) => (
                <div key={item.id} className={styles.historyItem}>
                  <div className={styles.historyItemHeader}>
                    <Text size={200} weight="semibold">{item.action}</Text>
                    <Text size={200} style={{ color: item.status === 'success' ? '#107c10' : '#d13438' }}>
                      {item.duration}ms
                    </Text>
                  </div>
                  <Text size={100} style={{ color: '#605e5c' }}>
                    {item.timestamp.toLocaleTimeString()}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportTesterPage;
