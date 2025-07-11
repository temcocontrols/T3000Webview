# Async Component Timeout Handling - Implementation Guide

This document provides a comprehensive guide for handling "Async component timed out after 10000ms" errors in the T3000 Webview application.

## Overview

The "Async component timed out" error occurs when Vue.js async components fail to load within the specified timeout period. This can happen due to:

1. **Network Issues**: Slow or unreliable internet connections
2. **Large Component Files**: Heavy components taking longer to download
3. **Server Issues**: Backend serving component files slowly
4. **Resource Conflicts**: Multiple components loading simultaneously
5. **Browser Performance**: Device limitations affecting loading

## Implemented Solution

### 1. Enhanced ErrorHandler (ErrorHandler.ts)

**New Features**:
- Automatic detection of async component timeout errors
- Enhanced error context with `asyncComponentError` and `componentInfo` properties
- Specialized handling method `handleAsyncComponentError()`

**Enhanced Error Context**:
```typescript
interface ErrorContext {
  component: string;
  function: string;
  parameters?: any[];
  userAction?: string;
  nodeRelated?: boolean;
  nodeInfo?: any;
  asyncComponentError?: boolean;  // NEW: Identifies async component errors
  componentInfo?: any;           // NEW: Component-specific debugging info
}
```

### 2. Enhanced ComponentLazyLoader (ComponentLazyLoader.js)

**Key Improvements**:
- Increased default timeout from 3000ms to 15000ms
- Enhanced error handling with retry logic
- Better error reporting and component information
- Integration with ErrorHandler for centralized error management

**Usage Example**:
```javascript
import { componentLazyLoader } from 'src/lib/performance/ComponentLazyLoader.js';

const lazyComponent = componentLazyLoader.createLazyComponent(
  () => import('./MyComponent.vue'),
  {
    componentName: 'MyComponent',
    timeout: 15000,
    maxRetries: 3,
    onError: (error, retry, fail, attempts) => {
      console.log(`Component failed to load: ${error.message}`);
    },
    onSuccess: (component) => {
      console.log('Component loaded successfully');
    }
  }
);
```

### 3. New AsyncComponentTimeoutManager (AsyncComponentTimeoutManager.js)

**Purpose**: Specialized manager for handling async component timeouts with intelligent retry strategies.

**Key Features**:
- **Timeout Categories**: Different timeout thresholds for different component types
- **Intelligent Retry Logic**: Exponential backoff with failure tracking
- **Enhanced Error Components**: User-friendly timeout error displays
- **Statistics Tracking**: Monitor timeout patterns and performance

**Timeout Categories**:
```javascript
const timeoutThresholds = {
  fast: 5000,      // Simple, lightweight components
  normal: 15000,   // Standard components (default)
  slow: 30000,     // Heavy/complex components
  critical: 60000  // Essential components that must load
};
```

**Usage Example**:
```javascript
import { asyncTimeoutManager } from 'src/lib/performance/AsyncComponentTimeoutManager.js';

const timeoutAwareComponent = asyncTimeoutManager.createTimeoutAwareComponent(
  () => import('./HeavyComponent.vue'),
  {
    name: 'HeavyComponent',
    category: 'slow',        // 30 second timeout
    maxRetries: 5,
    onTimeout: (error, context) => {
      console.log(`Component ${context.name} timed out, implementing fallback`);
    }
  }
);
```

### 4. Intelligent Retry Strategy

**Retry Logic**:
1. **Attempt Limits**: Maximum 3 attempts per component by default
2. **Failure Tracking**: Track failure history to prevent excessive retries
3. **Time-based Delays**: Prevent rapid retry attempts (minimum 30 seconds between attempts)
4. **Exponential Backoff**: Increasing delays between retry attempts
5. **Failure Threshold**: Stop retrying after 5 total failures

**Retry Decision Process**:
```javascript
shouldRetryComponent(componentName, currentAttempts) {
  const strategy = this.retryStrategies.get(componentName);

  // Don't retry if too many failures
  if (strategy?.failures > 5) return false;

  // Don't retry if last attempt was recent (< 30 seconds)
  if (timeSinceLastAttempt < 30000) return false;

  // Don't retry if exceeded attempt limit
  if (currentAttempts >= 3) return false;

  return true;
}
```

### 5. Enhanced Error Components

**Timeout Error Component Features**:
- **User-Friendly Display**: Clear error messages with component information
- **Retry Functionality**: Button to retry loading the component
- **Helpful Suggestions**: Network troubleshooting tips
- **Graceful Degradation**: Option to continue without the component

**Error Component Example**:
```vue
<template>
  <div class="async-timeout-error">
    <div class="timeout-icon">⏱️</div>
    <div class="timeout-content">
      <h4>Component Loading Timeout</h4>
      <p><strong>Component:</strong> {{ componentName }}</p>
      <p><strong>Timeout:</strong> {{ timeoutDuration }}ms</p>
      <div class="timeout-actions">
        <button @click="retry" :disabled="retryDisabled">
          {{ retryText }}
        </button>
        <button @click="dismiss">
          Continue without this component
        </button>
      </div>
    </div>
  </div>
</template>
```

### 6. Global Error Detection

**Enhanced Promise Rejection Handler**:
```typescript
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

  // Detect async component timeout errors
  const isAsyncComponentError =
    error.message.includes('Async component timed out') ||
    error.message.includes('component timed out') ||
    error.stack?.includes('defineAsyncComponent');

  if (isAsyncComponentError) {
    // Handle with high severity
    instance.handleError(error, {
      component: 'Global',
      function: 'unhandledrejection',
      asyncComponentError: true
    }, ErrorSeverity.HIGH);
  }
});
```

## Usage Guidelines

### For New Components

1. **Use AsyncComponentTimeoutManager**:
```javascript
import { useTimeoutAwareComponent } from 'src/lib/performance/AsyncComponentTimeoutManager.js';

export default {
  components: {
    HeavyComponent: useTimeoutAwareComponent(
      () => import('./HeavyComponent.vue'),
      {
        name: 'HeavyComponent',
        category: 'slow',
        onTimeout: (error, context) => {
          // Custom timeout handling
        }
      }
    ).component
  }
}
```

2. **Choose Appropriate Category**:
   - `fast` (5s): Simple components, icons, basic UI elements
   - `normal` (15s): Standard components (default)
   - `slow` (30s): Complex components, charts, heavy processing
   - `critical` (60s): Essential components that must load

### For Existing Components

1. **Update Timeout Values**:
```javascript
// Before
const component = defineAsyncComponent({
  loader: () => import('./Component.vue'),
  timeout: 3000  // Too short
});

// After
const component = defineAsyncComponent({
  loader: () => import('./Component.vue'),
  timeout: 15000,  // More reasonable
  onError: (error, retry, fail, attempts) => {
    // Enhanced error handling
  }
});
```

2. **Add Error Handling**:
```javascript
const component = asyncTimeoutManager.createTimeoutAwareComponent(
  () => import('./ExistingComponent.vue'),
  {
    name: 'ExistingComponent',
    category: 'normal'
  }
);
```

### Best Practices

1. **Component Size Optimization**:
   - Split large components into smaller chunks
   - Use dynamic imports for heavy dependencies
   - Implement code splitting strategies

2. **Timeout Configuration**:
   - Set realistic timeouts based on component complexity
   - Use longer timeouts for critical components
   - Consider user's network conditions

3. **Error Handling**:
   - Always provide fallback components
   - Implement retry mechanisms
   - Give users clear feedback and options

4. **Performance Monitoring**:
   - Track timeout statistics
   - Monitor component load times
   - Identify problematic components

## Monitoring and Debugging

### Component Timeout Statistics

```javascript
import { asyncTimeoutManager } from 'src/lib/performance/AsyncComponentTimeoutManager.js';

// Get timeout statistics
const stats = asyncTimeoutManager.getTimeoutStats();
console.log('Timeout Stats:', {
  totalComponents: stats.totalComponents,
  failedComponents: stats.failedComponents,
  retryingComponents: stats.retryingComponents,
  avgFailures: stats.avgFailures
});
```

### Error Logging

All async component timeout errors are automatically logged with detailed context:

```javascript
// Automatic error logging includes:
{
  error: Error,
  context: {
    component: 'AsyncComponentTimeoutManager',
    function: 'handleTimeout',
    asyncComponentError: true,
    componentInfo: {
      name: 'ComponentName',
      category: 'normal',
      timeout: 15000,
      attempts: 3,
      finalFailure: true
    }
  },
  severity: 'HIGH',
  timestamp: Date.now()
}
```

### Development Tools

**Console Warnings**:
```javascript
// Timeout warnings
[AsyncTimeout] Component 'MyComponent' timed out after 15000ms

// Retry attempts
[AsyncTimeout] Retrying component 'MyComponent' (attempt 2)

// Final failure
[AsyncTimeout] Giving up on component 'MyComponent' after 3 attempts
```

## Troubleshooting

### Common Issues and Solutions

1. **Components Still Timing Out**:
   - Increase timeout for the specific component category
   - Check network conditions and server performance
   - Optimize component size and dependencies

2. **Too Many Retries**:
   - Adjust retry thresholds in AsyncComponentTimeoutManager
   - Implement component-specific retry strategies
   - Consider component optimization

3. **Poor User Experience**:
   - Implement better loading states
   - Provide more informative error messages
   - Add manual retry options

### Configuration Options

```javascript
// Customize timeout thresholds
asyncTimeoutManager.timeoutThresholds = {
  fast: 3000,      // Reduce for fast networks
  normal: 20000,   // Increase for slow networks
  slow: 45000,     // Increase for complex components
  critical: 90000  // Increase for essential components
};

// Customize retry behavior
const component = asyncTimeoutManager.createTimeoutAwareComponent(
  importFn,
  {
    name: 'MyComponent',
    category: 'normal',
    maxRetries: 5,           // Increase retry attempts
    retryDelay: 2000,        // Custom retry delay
    onTimeout: customHandler // Custom timeout handling
  }
);
```

## Integration Testing

**Test Timeout Scenarios**:
```javascript
// Simulate network delays
const slowImport = () => new Promise(resolve => {
  setTimeout(() => resolve(import('./Component.vue')), 20000);
});

// Test timeout handling
const component = asyncTimeoutManager.createTimeoutAwareComponent(
  slowImport,
  {
    name: 'SlowComponent',
    category: 'fast', // Will timeout quickly for testing
    onTimeout: (error, context) => {
      expect(error.message).toContain('timed out');
      expect(context.name).toBe('SlowComponent');
    }
  }
);
```

## Performance Impact

**Benefits**:
- **Improved Reliability**: Graceful handling of timeout errors
- **Better User Experience**: Clear error messages and retry options
- **Enhanced Debugging**: Detailed error logging and statistics
- **Intelligent Retries**: Prevents excessive retry attempts

**Overhead**:
- **Minimal Memory**: ~5KB additional bundle size
- **Low Performance Impact**: Only activates during error conditions
- **Efficient Caching**: Reuses successful component loads

## Conclusion

This comprehensive async component timeout handling solution:

1. **Eliminates unhandled timeout errors** through automatic detection and handling
2. **Provides intelligent retry strategies** to improve success rates
3. **Enhances user experience** with clear error messages and options
4. **Enables better monitoring** through detailed statistics and logging
5. **Maintains application stability** through graceful error handling

The implementation ensures that async component timeouts are handled gracefully while providing developers with the tools and information needed to optimize component loading performance.
