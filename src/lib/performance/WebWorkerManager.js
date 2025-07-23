/**
 * Web Worker Manager for T3000 Background Processing
 * Handles communication with web workers for heavy computations
 */

import LogUtil from "../T3000/Hvac/Util/LogUtil";

export class WebWorkerManager {
  constructor() {
    this.worker = null;
    this.isSupported = typeof Worker !== 'undefined';
    this.messageQueue = [];
    this.pendingMessages = new Map();
    this.messageIdCounter = 0;
    this.isWorkerReady = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;

    if (this.isSupported) {
      this.initializeWorker();
    }
  }

  /**
   * Initialize the web worker
   */
  async initializeWorker() {
    try {
      this.worker = new Worker('/t3000-worker.js');

      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event);
      };

      this.worker.onerror = (error) => {
        LogUtil.Error('[Worker Manager] Worker error:', error);
        this.handleWorkerError(error);
      };

      this.isWorkerReady = true;

      // Process queued messages
      this.processMessageQueue();

      // LogUtil.Debug('[Worker Manager] Web Worker initialized');
    } catch (error) {
      LogUtil.Error('[Worker Manager] Failed to initialize worker:', error);
      this.isSupported = false;
    }
  }

  /**
   * Handle messages from the worker
   */
  handleWorkerMessage(event) {
    const { id, result, error, metadata } = event.data;

    if (this.pendingMessages.has(id)) {
      const { resolve, reject, retryCount } = this.pendingMessages.get(id);

      if (error) {
        if (retryCount < this.maxRetries) {
          // Retry the message
          // LogUtil.Debug(`[Worker Manager] Retrying message ${id}, attempt ${retryCount + 1}`);
          setTimeout(() => {
            this.retryMessage(id);
          }, this.retryDelay * Math.pow(2, retryCount));
        } else {
          reject(new Error(error));
          this.pendingMessages.delete(id);
        }
      } else {
        resolve({ result, metadata });
        this.pendingMessages.delete(id);
      }
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(error) {
    LogUtil.Error('[Worker Manager] Worker error:', error);

    // Reject all pending messages
    this.pendingMessages.forEach(({ reject }, id) => {
      reject(new Error('Worker encountered an error'));
    });

    this.pendingMessages.clear();

    // Attempt to restart worker
    this.restartWorker();
  }

  /**
   * Restart the worker
   */
  async restartWorker() {
    if (this.worker) {
      this.worker.terminate();
    }

    this.isWorkerReady = false;

    // Wait a bit before restarting
    setTimeout(() => {
      this.initializeWorker();
    }, 2000);
  }

  /**
   * Retry a failed message
   */
  retryMessage(messageId) {
    const pendingMessage = this.pendingMessages.get(messageId);
    if (pendingMessage) {
      pendingMessage.retryCount++;

      // Resend the original message
      if (this.worker && this.isWorkerReady) {
        this.worker.postMessage(pendingMessage.originalMessage);
      }
    }
  }

  /**
   * Send message to worker
   */
  sendMessage(type, data, options = {}) {
    const { priority = 'normal', timeout = 30000 } = options;

    return new Promise((resolve, reject) => {
      const messageId = ++this.messageIdCounter;
      const message = {
        id: messageId,
        type,
        data,
        priority,
        timestamp: Date.now()
      };

      // Store the promise handlers
      this.pendingMessages.set(messageId, {
        resolve,
        reject,
        retryCount: 0,
        originalMessage: message,
        timeout: setTimeout(() => {
          this.pendingMessages.delete(messageId);
          reject(new Error(`Worker message timeout: ${type}`));
        }, timeout)
      });

      if (this.worker && this.isWorkerReady) {
        this.worker.postMessage(message);
      } else {
        // Queue the message if worker is not ready
        this.messageQueue.push(message);

        if (!this.isSupported) {
          // Fallback to main thread processing
          this.processInMainThread(message)
            .then(result => resolve({ result }))
            .catch(reject);
        }
      }
    });
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isWorkerReady) {
      const message = this.messageQueue.shift();
      this.worker.postMessage(message);
    }
  }

  /**
   * Fallback processing in main thread
   */
  async processInMainThread(message) {
    // LogUtil.Debug('[Worker Manager] Processing in main thread (fallback)');

    const { type, data } = message;

    // Simplified fallback implementations
    switch (type) {
      case 'calculateHvacData':
        return this.calculateHvacDataFallback(data);
      case 'processModbusRegisters':
        return this.processModbusRegistersFallback(data);
      case 'optimizeDrawingData':
        return this.optimizeDrawingDataFallback(data);
      default:
        throw new Error(`No fallback implementation for: ${type}`);
    }
  }

  /**
   * Fallback HVAC calculation
   */
  calculateHvacDataFallback(data) {
    const { hvacData, calculationType, parameters } = data;

    // Simplified calculation
    return hvacData.map(item => ({
      ...item,
      calculated: true,
      timestamp: Date.now()
    }));
  }

  /**
   * Fallback Modbus processing
   */
  processModbusRegistersFallback(data) {
    const { registers, operation } = data;

    // Simplified processing
    return registers.map(register => ({
      ...register,
      processed: true,
      timestamp: Date.now()
    }));
  }

  /**
   * Fallback drawing optimization
   */
  optimizeDrawingDataFallback(data) {
    const { drawingData } = data;

    // Return as-is for fallback
    return drawingData;
  }

  // High-level API methods

  /**
   * Calculate HVAC data
   */
  async calculateHvacData(hvacData, calculationType, parameters = {}) {
    return this.sendMessage('calculateHvacData', {
      hvacData,
      calculationType,
      parameters
    });
  }

  /**
   * Process Modbus registers
   */
  async processModbusRegisters(registers, operation, config = {}) {
    return this.sendMessage('processModbusRegisters', {
      registers,
      operation,
      config
    });
  }

  /**
   * Optimize drawing data
   */
  async optimizeDrawingData(drawingData, optimizationType = 'simplify') {
    return this.sendMessage('optimizeDrawingData', {
      drawingData,
      optimizationType
    });
  }

  /**
   * Validate project data
   */
  async validateProjectData(projectData, validationRules) {
    return this.sendMessage('validateProjectData', {
      projectData,
      validationRules
    });
  }

  /**
   * Compress large dataset
   */
  async compressLargeDataset(dataset, compressionType = 'json') {
    return this.sendMessage('compressLargeDataset', {
      dataset,
      compressionType
    });
  }

  /**
   * Analyze performance data
   */
  async analyzePerformanceData(performanceData, analysisType = 'trends') {
    return this.sendMessage('analyzePerformanceData', {
      performanceData,
      analysisType
    });
  }

  /**
   * Batch process multiple operations
   */
  async batchProcess(operations) {
    const promises = operations.map(op =>
      this.sendMessage(op.type, op.data, op.options)
    );

    try {
      const results = await Promise.allSettled(promises);
      return results.map((result, index) => ({
        operation: operations[index],
        success: result.status === 'fulfilled',
        result: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      }));
    } catch (error) {
      LogUtil.Error('[Worker Manager] Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isSupported: this.isSupported,
      isWorkerReady: this.isWorkerReady,
      pendingMessages: this.pendingMessages.size,
      queuedMessages: this.messageQueue.length,
      workerExists: !!this.worker
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const now = Date.now();
    const recentMessages = Array.from(this.pendingMessages.values())
      .filter(msg => now - msg.originalMessage.timestamp < 60000); // Last minute

    return {
      totalPendingMessages: this.pendingMessages.size,
      recentMessages: recentMessages.length,
      averageResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate()
    };
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime() {
    // This would need to be implemented with actual timing data
    return 0;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate() {
    // This would need to be implemented with actual error tracking
    return 0;
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      // Clear all pending messages
      this.pendingMessages.forEach(({ reject, timeout }) => {
        clearTimeout(timeout);
        reject(new Error('Worker terminated'));
      });

      this.pendingMessages.clear();
      this.messageQueue = [];

      this.worker.terminate();
      this.worker = null;
      this.isWorkerReady = false;

      // LogUtil.Debug('[Worker Manager] Worker terminated');
    }
  }
}

// Create global instance
export const webWorkerManager = new WebWorkerManager();

// Vue composition API hook
export function useWebWorker() {
  return {
    isSupported: webWorkerManager.isSupported,
    calculateHvacData: webWorkerManager.calculateHvacData.bind(webWorkerManager),
    processModbusRegisters: webWorkerManager.processModbusRegisters.bind(webWorkerManager),
    optimizeDrawingData: webWorkerManager.optimizeDrawingData.bind(webWorkerManager),
    validateProjectData: webWorkerManager.validateProjectData.bind(webWorkerManager),
    compressLargeDataset: webWorkerManager.compressLargeDataset.bind(webWorkerManager),
    analyzePerformanceData: webWorkerManager.analyzePerformanceData.bind(webWorkerManager),
    batchProcess: webWorkerManager.batchProcess.bind(webWorkerManager),
    getStatus: webWorkerManager.getStatus.bind(webWorkerManager),
    getMetrics: webWorkerManager.getMetrics.bind(webWorkerManager)
  };
}

export default WebWorkerManager;
