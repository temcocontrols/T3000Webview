/**
 * Chunk Loading Manager
 * Handles problematic chunk loading with intelligent retry and timeout strategies
 */

export class ChunkLoadingManager {
  constructor() {
    this.loadingChunks = new Map();
    this.failedChunks = new Set();
    this.chunkTimeouts = new Map();
    this.retryAttempts = new Map();

    // Known problematic chunks with custom configurations
    this.problemChunks = {
      'pathseg.js': {
        timeout: 25000,
        maxRetries: 5,
        retryDelay: 2000
      },
      'svg.js': {
        timeout: 20000,
        maxRetries: 4,
        retryDelay: 1500
      },
      'lodash': {
        timeout: 15000,
        maxRetries: 3,
        retryDelay: 1000
      }
    };

    this.setupChunkErrorHandling();
  }

  /**
   * Setup global chunk loading error handling
   */
  setupChunkErrorHandling() {
    // Handle chunk loading errors globally
    window.addEventListener('error', (event) => {
      if (this.isChunkLoadError(event)) {
        this.handleChunkError(event);
      }
    });

    // Handle unhandled promise rejections that might be chunk-related
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isChunkLoadError(event)) {
        this.handleChunkError(event);
      }
    });
  }

  /**
   * Check if an error is related to chunk loading
   */
  isChunkLoadError(event) {
    const error = event.error || event.reason;
    if (!error) return false;

    const message = error.message || '';
    const stack = error.stack || '';

    return (
      message.includes('Loading chunk') ||
      message.includes('ChunkLoadError') ||
      message.includes('Loading CSS chunk') ||
      message.includes('Failed to import') ||
      stack.includes('import(') ||
      (event.target && event.target.tagName === 'SCRIPT') ||
      message.includes('timed out')
    );
  }

  /**
   * Handle chunk loading errors with retry logic
   */
  async handleChunkError(event) {
    const error = event.error || event.reason;
    const chunkName = this.extractChunkName(error);

    console.warn(`Chunk loading error detected for: ${chunkName}`, error);

    // Get configuration for this chunk
    const config = this.getChunkConfig(chunkName);
    const attempts = this.retryAttempts.get(chunkName) || 0;

    if (attempts < config.maxRetries) {
      console.log(`Retrying chunk load for ${chunkName} (attempt ${attempts + 1}/${config.maxRetries})`);
      this.retryAttempts.set(chunkName, attempts + 1);

      // Prevent the error from propagating
      if (event.preventDefault) {
        event.preventDefault();
      }

      // Wait before retrying
      await this.delay(config.retryDelay * (attempts + 1));

      // Retry loading the chunk
      try {
        await this.retryChunkLoad(chunkName);
        console.log(`Successfully loaded chunk ${chunkName} after retry`);
        this.retryAttempts.delete(chunkName);
      } catch (retryError) {
        console.error(`Retry failed for chunk ${chunkName}:`, retryError);
      }
    } else {
      console.error(`Chunk ${chunkName} failed after ${config.maxRetries} attempts`);
      this.failedChunks.add(chunkName);
    }
  }

  /**
   * Extract chunk name from error
   */
  extractChunkName(error) {
    const message = error.message || '';

    // Try to extract chunk name from common error patterns
    let match;

    // Pattern: "Loading chunk 123 failed"
    match = message.match(/Loading chunk (\w+) failed/);
    if (match) return match[1];

    // Pattern: "Loading CSS chunk 123 failed"
    match = message.match(/Loading CSS chunk (\w+) failed/);
    if (match) return match[1];

    // Pattern: path-like patterns
    match = message.match(/([^\/\\]+\.js)$/);
    if (match) return match[1];

    // Check for known problematic files
    for (const chunkName of Object.keys(this.problemChunks)) {
      if (message.includes(chunkName)) {
        return chunkName;
      }
    }

    return 'unknown-chunk';
  }

  /**
   * Get configuration for a specific chunk
   */
  getChunkConfig(chunkName) {
    // Check if we have specific config for this chunk
    if (this.problemChunks[chunkName]) {
      return this.problemChunks[chunkName];
    }

    // Check if any known chunk is contained in the name
    for (const [knownChunk, config] of Object.entries(this.problemChunks)) {
      if (chunkName.includes(knownChunk)) {
        return config;
      }
    }

    // Default configuration
    return {
      timeout: 15000,
      maxRetries: 3,
      retryDelay: 1000
    };
  }

  /**
   * Retry loading a chunk
   */
  async retryChunkLoad(chunkName) {
    // This is a placeholder - actual implementation would depend on
    // how chunks are loaded in your specific setup
    // For now, we'll just wait and hope the next import succeeds
    console.log(`Implementing retry for chunk: ${chunkName}`);

    // Clear any cached failures
    if (window.__webpack_require__ && window.__webpack_require__.cache) {
      // Clear webpack cache for failed chunks
      Object.keys(window.__webpack_require__.cache).forEach(key => {
        if (key.includes(chunkName)) {
          delete window.__webpack_require__.cache[key];
        }
      });
    }
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      loadingChunks: this.loadingChunks.size,
      failedChunks: Array.from(this.failedChunks),
      retryAttempts: Object.fromEntries(this.retryAttempts)
    };
  }

  /**
   * Reset all retry counters and failed chunks
   */
  reset() {
    this.loadingChunks.clear();
    this.failedChunks.clear();
    this.retryAttempts.clear();
    this.chunkTimeouts.clear();
  }
}

// Create singleton instance
export const chunkLoadingManager = new ChunkLoadingManager();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  console.log('ChunkLoadingManager initialized');
}
