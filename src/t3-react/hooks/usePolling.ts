/**
 * usePolling Hook
 * 
 * Provides polling functionality for auto-refreshing data
 * Manages polling intervals and lifecycle
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface PollingOptions {
  enabled?: boolean;
  interval?: number; // milliseconds
  onPoll: () => void | Promise<void>;
  onError?: (error: Error) => void;
  immediate?: boolean; // Run immediately on mount
}

export function usePolling(options: PollingOptions) {
  const {
    enabled = true,
    interval = 5000,
    onPoll,
    onError,
    immediate = true,
  } = options;

  const [isPolling, setIsPolling] = useState(enabled);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onPollRef = useRef(onPoll);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onPollRef.current = onPoll;
    onErrorRef.current = onError;
  }, [onPoll, onError]);

  // Execute polling function
  const executePoll = useCallback(async () => {
    try {
      setError(null);
      await onPollRef.current();
      setLastPollTime(new Date());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Polling failed');
      setError(error);
      onErrorRef.current?.(error);
    }
  }, []);

  // Start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling

    setIsPolling(true);

    // Run immediately if requested
    if (immediate) {
      executePoll();
    }

    // Set up interval
    intervalRef.current = setInterval(() => {
      executePoll();
    }, interval);
  }, [interval, immediate, executePoll]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Toggle polling
  const togglePolling = useCallback(() => {
    if (isPolling) {
      stopPolling();
    } else {
      startPolling();
    }
  }, [isPolling, startPolling, stopPolling]);

  // Manual poll (outside of interval)
  const manualPoll = useCallback(async () => {
    await executePoll();
  }, [executePoll]);

  // Effect to handle enabled state changes
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // State
    isPolling,
    lastPollTime,
    error,

    // Actions
    startPolling,
    stopPolling,
    togglePolling,
    manualPoll,
  };
}
