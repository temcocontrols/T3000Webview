/**
 * useWebSocket Hook
 *
 * Provides WebSocket connection for real-time data updates
 * Manages connection state and message handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketOptions {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: any;
}

export function useWebSocket(options: WebSocketOptions) {
  const {
    url,
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
    onMessage,
    onOpen,
    onClose,
    onError,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Send message through WebSocket
  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setState({
          isConnected: true,
          isConnecting: false,
          error: null,
          lastMessage: null,
        });
        reconnectCountRef.current = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setState((prev) => ({ ...prev, lastMessage: data }));
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        setState((prev) => ({
          ...prev,
          error: 'WebSocket error occurred',
        }));
        onError?.(event);
      };

      ws.onclose = () => {
        setState({
          isConnected: false,
          isConnecting: false,
          error: null,
          lastMessage: null,
        });
        onClose?.();

        // Attempt reconnection
        if (reconnect && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, [url, reconnect, reconnectInterval, reconnectAttempts, onMessage, onOpen, onClose, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null,
    });
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Ping/pong to keep connection alive
  useEffect(() => {
    if (!state.isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Ping every 30 seconds

    return () => {
      clearInterval(pingInterval);
    };
  }, [state.isConnected, sendMessage]);

  return {
    // State
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    lastMessage: state.lastMessage,

    // Actions
    sendMessage,
    connect,
    disconnect,
  };
}
