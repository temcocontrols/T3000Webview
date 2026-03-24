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
  Spinner
} from '@fluentui/react-components';
import { SendRegular, DismissRegular, ChevronDownRegular, ChevronRightRegular, CodeTextEditRegular, CopyRegular } from '@fluentui/react-icons';
import { T3Transport } from '../../../../lib/t3-transport/core/T3Transport';
import { WebViewMessageType } from '../../../../lib/t3-transport/types/message-enums';
import styles from './TransportTesterPage.module.css';

// JSON Tree Viewer Component
const JsonTreeViewer: React.FC<{ json: string }> = ({ json }) => {
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(json);
  } catch {
    return <pre className={styles.responseText}>{json}</pre>;
  }

  // Collect all paths for initial expansion
  const getAllPaths = (obj: any, currentPath: string = 'root', paths: Set<string> = new Set()): Set<string> => {
    paths.add(currentPath);

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          getAllPaths(item, `${currentPath}.${index}`, paths);
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          getAllPaths(value, `${currentPath}.${key}`, paths);
        }
      });
    }

    return paths;
  };

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => getAllPaths(parsedJson));

  const togglePath = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderValue = (value: any, path: string, key?: string, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedPaths.has(path);
    const depthClass = (styles as Record<string, string>)[`jsonDepth${Math.min(depth, 15)}`] ?? '';

    if (value === null) {
      return (
        <div className={`${styles.jsonNode} ${depthClass}`}>
          {key !== undefined && <span className={styles.jsonKey}>"{key}": </span>}
          <span className={styles.jsonNull}>null</span>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <div className={`${styles.jsonNode} ${depthClass}`}>
          {key !== undefined && <span className={styles.jsonKey}>"{key}": </span>}
          <span className={styles.jsonBoolean}>{value.toString()}</span>
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <div className={`${styles.jsonNode} ${depthClass}`}>
          {key !== undefined && <span className={styles.jsonKey}>"{key}": </span>}
          <span className={styles.jsonNumber}>{value}</span>
        </div>
      );
    }

    if (typeof value === 'string') {
      return (
        <div className={`${styles.jsonNode} ${depthClass}`}>
          {key !== undefined && <span className={styles.jsonKey}>"{key}": </span>}
          <span className={styles.jsonString}>"{value}"</span>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div className={`${styles.jsonNode} ${depthClass}`}>
          <div className={styles.jsonToggle} onClick={() => togglePath(path)}>
            {isExpanded ? <ChevronDownRegular fontSize={12} /> : <ChevronRightRegular fontSize={12} />}
            {key !== undefined && <span className={styles.jsonKey}>"{key}": </span>}
            <span>[{value.length}]</span>
          </div>
          {isExpanded && (
            <div>
              {value.map((item, index) => renderValue(item, `${path}.${index}`, undefined, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return (
        <div className={`${styles.jsonNode} ${depthClass}`}>
          <div className={styles.jsonToggle} onClick={() => togglePath(path)}>
            {isExpanded ? <ChevronDownRegular fontSize={12} /> : <ChevronRightRegular fontSize={12} />}
            {key !== undefined && <span className={styles.jsonKey}>"{key}": </span>}
            <span>{`{${keys.length}}`}</span>
          </div>
          {isExpanded && (
            <div>
              {keys.map(k => renderValue(value[k], `${path}.${k}`, k, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`${styles.responseText} ${styles.jsonTreeRoot}`}>
      {renderValue(parsedJson, 'root')}
    </div>
  );
};

// API Configuration
import { API_BASE_URL as BASE_URL } from '../../../config/constants';
const API_BASE_URL = `${BASE_URL}/api`;

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

export const TransportTesterPage: React.FC = () => {
  const [transport, setTransport] = useState<TransportType>('ffi');
  const [action, setAction] = useState<string>('GET_PANELS_LIST');
  const [availablePanels, setAvailablePanels] = useState<Panel[]>([]);
  const [panelId, setPanelId] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [customData] = useState<string>('{}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [currentRequest, setCurrentRequest] = useState<string>('');
  const [history, setHistory] = useState<MessageHistoryItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [isTreeView, setIsTreeView] = useState<boolean>(false);

  const transportRef = useRef<T3Transport | null>(null);

  // Initialize transport on mount
  useEffect(() => {
    const initTransport = async () => {
      try {
        const t3transport = new T3Transport({
          apiBaseUrl: API_BASE_URL
        });

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
        'GET_WEBVIEW_LIST': WebViewMessageType.GET_WEBVIEW_LIST,
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

      // Build the actual request payload that will be sent to the API
      // Use same logic as FFI transport
      const getBrowserType = () => {
        const userAgent = navigator.userAgent;
        if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
        if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
        if (userAgent.indexOf('Safari') > -1) return 'Safari';
        if (userAgent.indexOf('Edge') > -1) return 'Edge';
        return 'Unknown';
      };

      // C++ expects flat JSON with action at top level (not nested in message)
      const actualRequestPayload = {
        action: messageType,
        msgId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        from: getBrowserType(), // For debugging/logging
        ...payload
      };

      // Display the exact payload being sent
      setCurrentRequest(JSON.stringify(actualRequestPayload, null, 2));

      // Call API directly with the actual payload so we can show exact request/response
      const response = await fetch(`${API_BASE_URL}/t3000/ffi/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(actualRequestPayload)
      });

      const transportResponse = await response.json();

      const duration = Date.now() - startTime;

      // Log what C++ actually returned for debugging
      console.log('C++ Response:', transportResponse);

      // Parse the response - C++ returns JSON directly (with action and data fields)
      const success = response.ok && !transportResponse.error;

      // Special handling for GET_PANELS_LIST
      if (action === 'GET_PANELS_LIST' && success && transportResponse.data) {
        let panelsData = Array.isArray(transportResponse.data) ? transportResponse.data : [];

        // Filter out invalid panel entries
        panelsData = panelsData.filter((panel: any) =>
          panel &&
          typeof panel === 'object' &&
          panel.panel_number !== undefined &&
          panel.panel_number !== null
        );

        setAvailablePanels(panelsData);
      }

      // Show the full C++ response including action field
      setResponse(JSON.stringify(transportResponse, null, 2));

      // Add to history
      const historyItem: MessageHistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date(),
        action,
        request: actualRequestPayload,
        response: transportResponse,
        duration,
        status: success ? 'success' : 'error',
      };

      setHistory(prev => [historyItem, ...prev].slice(0, 50));
    } catch (err) {
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
              <Option value="websocket" text="WebSocket"><span className={styles.optionSmall}>WebSocket</span></Option>
              <Option value="ffi" text="FFI"><span className={styles.optionSmall}>FFI</span></Option>
              <Option value="webview2" text="WebView2"><span className={styles.optionSmall}>WebView2</span></Option>
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
                  <span className={styles.optionSmall}>{act.label}</span>
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
                  <ul className={styles.paramList}>
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
                <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                  <Text size={200} weight="semibold">Panel ID</Text>
                  {availablePanels.length > 0 ? (
                    <Dropdown
                      placeholder="Select a panel"
                      value={(() => {
                        const panel = availablePanels.find(p => p.panel_number.toString() === panelId);
                        return panel ? `${panel.panel_name || 'Unknown'}, Panel Number: ${panel.panel_number}` : panelId;
                      })()}
                      onOptionSelect={(_, data) => data.optionValue && setPanelId(data.optionValue)}
                      size="small"
                      style={{ width: '100%' }}
                    >
                      {availablePanels.filter(panel => panel && panel.panel_number !== undefined).map((panel) => (
                        <Option key={panel.panel_number} value={panel.panel_number.toString()} text={`${panel.panel_name || 'Unknown'}, Panel Number: ${panel.panel_number}`}>
                          <span className={styles.optionSmall}>{panel.panel_name || 'Unknown'}, Panel Number: {panel.panel_number}</span>
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
                      style={{ width: '100%' }}
                    />
                  )}
                </div>

                <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                  <Text size={200} weight="semibold">Serial Number (optional)</Text>
                  <Input
                    value={serialNumber}
                    onChange={(_, data) => setSerialNumber(data.value)}
                    placeholder="Leave empty for broadcast"
                    size="small"
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Middle: Response Panel */}
          <div className={styles.responsePanel}>
            <div className={styles.panelHeader}>
              <Text size={200} weight="semibold">Response</Text>
              {response && (
                <div className={styles.flexGap4}>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<CopyRegular />}
                    onClick={() => {
                      navigator.clipboard.writeText(response);
                    }}
                    title="Copy JSON to clipboard"
                  />
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<CodeTextEditRegular />}
                    onClick={() => setIsTreeView(!isTreeView)}
                    title={isTreeView ? 'Switch to text view' : 'Switch to tree view'}
                  />
                </div>
              )}
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
              isTreeView ? (
                <JsonTreeViewer json={response} />
              ) : (
                <pre className={styles.responseText}>{response}</pre>
              )
            )}
          </div>

          {/* Right: Request & History Panel */}
          <div className={styles.rightPanel}>
            {/* Request Panel (Top) */}
            <div className={styles.requestPanel}>
              <div className={styles.panelHeader}>
                <Text size={200} weight="semibold">Request Payload</Text>
              </div>
              {!currentRequest && (
                <div className={styles.responsePlaceholder}>
                  <Text size={300}>Request details will appear here</Text>
                </div>
              )}
              {currentRequest && (
                <pre className={styles.requestText}>{currentRequest}</pre>
              )}
            </div>

            {/* History Panel (Bottom) */}
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
    </div>
  );
};

export default TransportTesterPage;
