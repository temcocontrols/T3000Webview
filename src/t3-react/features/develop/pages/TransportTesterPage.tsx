/**
 * Transport Tester Page
 *
 * Test t3-transport library messages
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { T3Transport } from '../../../../lib/t3-transport/core/T3Transport';
import { WebViewMessageType } from '../../../../lib/t3-transport/types/message-enums';
import styles from './TransportTesterPage.module.css';

type TransportType = 'websocket' | 'ffi' | 'webview2';

interface Panel {
  panel_number: number;
  object_instance: number;
  serial_number: number;
  online_time: number;
  pid: number;
  panel_name: string;
}

interface MessageHistoryItem {
  id: string;
  timestamp: Date;
  action: string;
  request: any;
  response: any;
  duration: number;
  status: 'success' | 'error';
}

interface MessageFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  helpText?: string;
}

interface MessageTypeConfig {
  id: string;
  label: string;
  description: string;
  requiresPanels: boolean;
  fields: MessageFieldConfig[];
  helpText: string;
}

export const TransportTesterPage: React.FC = () => {
  const [transport, setTransport] = useState<TransportType>('ffi');
  const [action, setAction] = useState<string>('GET_PANELS_LIST');
  const [availablePanels, setAvailablePanels] = useState<Panel[]>([]);
  const [panelId, setPanelId] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [customData, setCustomData] = useState<string>('{}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [history, setHistory] = useState<MessageHistoryItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const transportRef = useRef<T3Transport | null>(null);

  // Initialize transport on mount
  useEffect(() => {
    const initTransport = async () => {
      try {
        const t3transport = new T3Transport();

        // For browser development, prefer FFI (HTTP API calls)
        // FFI calls the Rust backend API at /api endpoints
        try {
          await t3transport.connect('ffi');
          setConnectionStatus(`Connected via FFI (HTTP API)`);
          setTransport('ffi');
        } catch (ffiError) {
          // If FFI fails, try auto-connect (webview → websocket → ffi)
          console.warn('FFI connection failed, trying auto-connect:', ffiError);
          const detectedType = await t3transport.autoConnect();
          setConnectionStatus(`Connected via ${detectedType}`);
          setTransport(detectedType as TransportType);
        }

        transportRef.current = t3transport;
      } catch (error) {
        console.error('Transport initialization error:', error);
        setConnectionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    initTransport();

    return () => {
      // Cleanup on unmount
      if (transportRef.current) {
        transportRef.current.disconnect();
      }
    };
  }, []);

  const messageConfigs: Record<string, MessageTypeConfig> = {
    GET_PANELS_LIST: {
      id: 'GET_PANELS_LIST',
      label: '4 - GET_PANELS_LIST',
      description: 'Retrieves the list of all available panels/devices in the network',
      requiresPanels: false,
      fields: [],
      helpText: 'This message requires no parameters. It will return all discovered panels with their panel numbers, serial numbers, panel names, object instances, and last online time. This is typically the first message you should send.'
    },
    GET_PANEL_DATA: {
      id: 'GET_PANEL_DATA',
      label: '0 - GET_PANEL_DATA',
      description: 'Get complete data for a specific panel',
      requiresPanels: true,
      fields: [
        { name: 'panelId', label: 'Panel ID', type: 'select', required: true, placeholder: 'Select a panel' }
      ],
      helpText: 'Retrieves all data (inputs, outputs, variables, programs, etc.) for the selected panel.'
    },
  };

  const actions = [
    { value: 'GET_PANEL_DATA', label: '0 - GET_PANEL_DATA' },
    { value: 'GET_INITIAL_DATA', label: '1 - GET_INITIAL_DATA' },
    { value: 'SAVE_GRAPHIC_DATA', label: '2 - SAVE_GRAPHIC_DATA' },
    { value: 'UPDATE_ENTRY', label: '3 - UPDATE_ENTRY' },
    { value: 'GET_PANELS_LIST', label: '4 - GET_PANELS_LIST' },
    { value: 'GET_PANEL_RANGE_INFO', label: '5 - GET_PANEL_RANGE_INFO' },
    { value: 'GET_ENTRIES', label: '6 - GET_ENTRIES' },
    { value: 'LOAD_GRAPHIC_ENTRY', label: '7 - LOAD_GRAPHIC_ENTRY' },
    { value: 'OPEN_ENTRY_EDIT_WINDOW', label: '8 - OPEN_ENTRY_EDIT_WINDOW' },
    { value: 'SAVE_IMAGE', label: '9 - SAVE_IMAGE' },
    { value: 'SAVE_LIBRAY_DATA', label: '10 - SAVE_LIBRAY_DATA' },
    { value: 'DELETE_IMAGE', label: '11 - DELETE_IMAGE' },
    { value: 'GET_SELECTED_DEVICE_INFO', label: '12 - GET_SELECTED_DEVICE_INFO' },
    { value: 'BIND_DEVICE', label: '13 - BIND_DEVICE' },
    { value: 'SAVE_NEW_LIBRARY_DATA', label: '14 - SAVE_NEW_LIBRARY_DATA' },
    { value: 'LOGGING_DATA', label: '15 - LOGGING_DATA' },
    { value: 'UPDATE_WEBVIEW_LIST', label: '16 - UPDATE_WEBVIEW_LIST' },
    { value: 'GET_WEBVIEW_LIST', label: '17 - GET_WEBVIEW_LIST' },
  ];

  const sendMessage = async () => {
    if (!transportRef.current) {
      setResponse(JSON.stringify({
        success: false,
        error: 'Transport not initialized. Please wait for connection.'
      }, null, 2));
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      const startTime = Date.now();

      // Map action string to WebViewMessageType enum
      const actionMap: Record<string, WebViewMessageType> = {
        'GET_PANEL_DATA': WebViewMessageType.GET_PANEL_DATA,
        'GET_INITIAL_DATA': WebViewMessageType.GET_INITIAL_DATA,
        'SAVE_GRAPHIC_DATA': WebViewMessageType.SAVE_GRAPHIC_DATA,
        'UPDATE_ENTRY': WebViewMessageType.UPDATE_ENTRY,
        'GET_PANELS_LIST': WebViewMessageType.GET_PANELS_LIST,
        'GET_PANEL_RANGE_INFO': WebViewMessageType.GET_PANEL_RANGE_INFO,
        'GET_ENTRIES': WebViewMessageType.GET_ENTRIES,
        'LOAD_GRAPHIC_ENTRY': WebViewMessageType.LOAD_GRAPHIC_ENTRY,
        'OPEN_ENTRY_EDIT_WINDOW': WebViewMessageType.OPEN_ENTRY_EDIT_WINDOW,
        'SAVE_IMAGE': WebViewMessageType.SAVE_IMAGE,
        'SAVE_LIBRAY_DATA': WebViewMessageType.SAVE_LIBRAY_DATA,
        'DELETE_IMAGE': WebViewMessageType.DELETE_IMAGE,
        'GET_SELECTED_DEVICE_INFO': WebViewMessageType.GET_SELECTED_DEVICE_INFO,
        'BIND_DEVICE': WebViewMessageType.BIND_DEVICE,
        'SAVE_NEW_LIBRARY_DATA': WebViewMessageType.SAVE_NEW_LIBRARY_DATA,
        'LOGGING_DATA': WebViewMessageType.LOGGING_DATA,
        'UPDATE_WEBVIEW_LIST': WebViewMessageType.UPDATE_WEBVIEW_LIST,
        'GET_WEBVIEW_LIST': WebViewMessageType.REFRESH_WEBVIEW_LIST,
      };

      const messageType = actionMap[action];
      if (messageType === undefined) {
        throw new Error(`Unknown action: ${action}`);
      }

      // Build payload based on message type
      let payload: any = {};

      if (action !== 'GET_PANELS_LIST') {
        if (panelId) {
          payload.panelId = parseInt(panelId);
        }
        if (serialNumber) {
          payload.serialNumber = parseInt(serialNumber);
        }

        // Merge custom JSON data
        if (customData !== '{}') {
          try {
            const customPayload = JSON.parse(customData);
            payload = { ...payload, ...customPayload };
          } catch (e) {
            console.warn('Invalid custom JSON data:', e);
          }
        }
      }

      // Call real transport
      const transportResponse = await transportRef.current.send(messageType, payload);

      const duration = Date.now() - startTime;

      // Special handling for GET_PANELS_LIST
      if (action === 'GET_PANELS_LIST' && transportResponse.success && transportResponse.data) {
        let panelsData = Array.isArray(transportResponse.data)
          ? transportResponse.data
          : transportResponse.data.panels || [];

        // Filter out invalid panel entries
        panelsData = panelsData.filter((panel: any) =>
          panel &&
          typeof panel === 'object' &&
          panel.panel_number !== undefined &&
          panel.panel_number !== null
        );

        setAvailablePanels(panelsData);
      }

      setResponse(JSON.stringify(transportResponse, null, 2));

      // Add to history
      const historyItem: MessageHistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date(),
        action,
        request: { action: messageType, ...payload },
        response: transportResponse,
        duration,
        status: transportResponse.success ? 'success' : 'error',
      };

      setHistory(prev => [historyItem, ...prev].slice(0, 50));
    } catch (err) {
      const duration = Date.now() - Date.now();
      const errorResponse = {
        success: false,
        error: err instanceof Error ? err.message : 'Request failed',
        details: err instanceof Error ? err.stack : undefined
      };

      setResponse(JSON.stringify(errorResponse, null, 2));

      // Add error to history
      const historyItem: MessageHistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date(),
        action,
        request: { action },
        response: errorResponse,
        duration: 0,
        status: 'error',
      };

      setHistory(prev => [historyItem, ...prev].slice(0, 50));
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
              value={transport === 'websocket' ? 'WebSocket' : transport === 'ffi' ? 'FFI' : 'WebView2'}
              disabled
              style={{ minWidth: '150px', fontSize: '12px' }}
              size="small"
            >
              <Option value="websocket" text="WebSocket"><span style={{ fontSize: '12px' }}>WebSocket</span></Option>
              <Option value="ffi" text="FFI"><span style={{ fontSize: '12px' }}>FFI</span></Option>
              <Option value="webview2" text="WebView2"><span style={{ fontSize: '12px' }}>WebView2</span></Option>
            </Dropdown>
            {connectionStatus && (
              <Text size={200} style={{ marginLeft: '8px', color: connectionStatus.includes('Error') ? '#d13438' : '#107c10' }}>
                {connectionStatus}
              </Text>
            )}
          </div>
          <div className={styles.controlGroup}>
            <Text size={200} weight="semibold">Message Type:</Text>
            <Dropdown
              placeholder="Select message type"
              value={actions.find(a => a.value === action)?.label || action}
              onOptionSelect={(_, data) => data.optionValue && setAction(data.optionValue)}
              style={{ minWidth: '280px', fontSize: '12px' }}
              size="small"
            >
              {actions.map((act) => (
                <Option key={act.value} value={act.value} text={act.label}>
                  <span style={{ fontSize: '12px' }}>{act.label}</span>
                </Option>
              ))}
            </Dropdown>
          </div>
          <Button
            appearance="primary"
            icon={<SendRegular fontSize={14} />}
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

            {action === 'GET_PANELS_LIST' ? (
              <div className={styles.messageInfo}>
                <div className={styles.infoSection}>
                  <Text size={300} weight="semibold" style={{ marginBottom: '8px' }}>Description</Text>
                  <Text size={200} style={{ color: '#605e5c', lineHeight: '1.5' }}>
                    Retrieves the list of all available panels/devices in the network.
                  </Text>
                </div>

                <div className={styles.infoSection}>
                  <Text size={300} weight="semibold" style={{ marginBottom: '8px' }}>Parameters</Text>
                  <Text size={200} style={{ color: '#605e5c' }}>None required</Text>
                </div>

                <div className={styles.infoSection}>
                  <Text size={300} weight="semibold" style={{ marginBottom: '8px' }}>Returns</Text>
                  <Text size={200} style={{ color: '#605e5c', lineHeight: '1.5' }}>
                    Array of panels with:
                  </Text>
                  <ul style={{ margin: '4px 0 0 0', padding: '0 0 0 20px', fontSize: '12px', color: '#605e5c' }}>
                    <li>Panel Number</li>
                    <li>Serial Number</li>
                    <li>Panel Name</li>
                    <li>Object Instance</li>
                    <li>Last Online Time</li>
                    <li>PID (Panel Type)</li>
                  </ul>
                </div>

                <div className={styles.infoSection}>
                  <Text size={200} style={{ color: '#0078d4', fontStyle: 'italic' }}>
                    💡 This is typically the first message you should send to discover available devices.
                  </Text>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <Text size={200} weight="semibold">Panel ID</Text>
                  {availablePanels.length > 0 ? (
                    <Dropdown
                      placeholder="Select a panel"
                      value={panelId}
                      onOptionSelect={(_, data) => data.optionValue && setPanelId(data.optionValue)}
                      size="small"
                    >
                      {availablePanels.filter(panel => panel && panel.panel_number !== undefined).map((panel) => (
                        <Option key={panel.panel_number} value={panel.panel_number.toString()}>
                          <span style={{ fontSize: '12px' }}>{panel.panel_number} - {panel.panel_name || 'Unknown'}</span>
                        </Option>
                      ))}
                    </Dropdown>
                  ) : (
                    <Input
                      value={panelId}
                      onChange={(_, data) => setPanelId(data.value)}
                      placeholder="Run GET_PANELS_LIST first"
                      size="small"
                      disabled
                    />
                  )}
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
              </>
            )}
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
