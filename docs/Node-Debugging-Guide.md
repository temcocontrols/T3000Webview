# Node Debugging Guide for T3000

## Overview
This guide helps debug and fix "TypeError: node is undefined" errors in the T3000 application.

## Common Causes

### 1. DOM Element Access Before Mounting
```javascript
// ❌ Bad - accessing DOM before it's ready
const element = document.querySelector('#my-element');
element.style.display = 'none'; // node is undefined

// ✅ Good - using safe access
import { safeNodeAccess } from 'src/lib/T3000/Hvac/Util/ErrorHandler';

const element = safeNodeAccess(
  () => document.querySelector('#my-element'),
  { component: 'MyComponent', function: 'initializeUI' }
);
if (element) {
  element.style.display = 'none';
}
```

### 2. Vue Ref Access Before Component Mount
```javascript
// ❌ Bad - accessing ref before mount
setup() {
  const myRef = ref(null);

  // This might run before component is mounted
  myRef.value.focus(); // node is undefined

  return { myRef };
}

// ✅ Good - using onMounted or validation
import { ref, onMounted } from 'vue';
import { NodeDebugger } from 'src/lib/debug/NodeDebugger.js';

setup() {
  const myRef = ref(null);

  onMounted(() => {
    if (NodeDebugger.validateRef(myRef, 'myRef')) {
      myRef.value.focus();
    }
  });

  return { myRef };
}
```

### 3. Progressive Image Loading Issues
```javascript
// ❌ Bad - assuming image element exists
function loadImage(img) {
  img.src = 'new-source.jpg'; // node is undefined
}

// ✅ Good - using safe progressive loading
import { progressiveLoader } from 'src/lib/performance/ProgressiveLoader.js';

// The progressiveLoader now validates elements automatically
progressiveLoader.registerImage(img, {
  placeholder: '/assets/placeholder.png',
  onLoad: () => console.log('Image loaded safely')
});
```

## Debugging Tools

### 1. Error Handler Integration
The ErrorHandler now captures unhandled promise rejections automatically:

```javascript
import { ErrorHandler } from 'src/lib/T3000/Hvac/Util/ErrorHandler';

// Initialize global error handling (done automatically in boot)
ErrorHandler.initializeGlobalHandling();

// Manual error reporting
try {
  // risky DOM operation
} catch (error) {
  ErrorHandler.getInstance().handleNodeError(error, someNode, {
    component: 'MyComponent',
    function: 'riskyOperation'
  });
}
```

### 2. Node Debugger Panel
Add the debugging panel to your component:

```vue
<template>
  <div>
    <!-- Your app content -->
    <NodeDebuggerPanel v-if="$q.dev" />
  </div>
</template>

<script setup>
import NodeDebuggerPanel from 'src/components/NodeDebuggerPanel.vue';
</script>
```

### 3. Safe DOM Operations
Use the NodeDebugger utilities for safe DOM access:

```javascript
import { useNodeDebugger } from 'src/lib/debug/NodeDebugger.js';

const { safeQuery, safeAddEventListener, waitForElement } = useNodeDebugger();

// Safe element query
const element = safeQuery('#my-element');

// Safe event listener
safeAddEventListener(element, 'click', handleClick);

// Wait for element to exist
try {
  const element = await waitForElement('#dynamic-element', 5000);
  // element is guaranteed to exist
} catch (error) {
  console.warn('Element not found within timeout');
}
```

## Common Fixes Applied

### 1. ProgressiveLoader Enhancements
- Added element validation in `registerImage()`
- Added DOM connection checks in `loadImage()`
- Safe style property access with fallbacks

### 2. Global Error Handling
- Automatic unhandled promise rejection capturing
- Enhanced node error reporting with context
- Safe node access wrapper methods

### 3. Boot Process Improvements
- Error handling initialized first
- DOM mutation monitoring in development
- Comprehensive error context logging

## Monitoring and Debugging

### Development Mode Features
- Real-time error tracking in NodeDebuggerPanel
- DOM mutation monitoring
- Automatic stack trace collection
- Export functionality for error reports

### Production Mode Features
- Silent error collection
- Basic error reporting
- Performance impact minimized

## Usage Examples

### Safe Vue Component Setup
```vue
<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useNodeDebugger } from 'src/lib/debug/NodeDebugger.js';

const myRef = ref(null);
const { validateRef, safeQuery, logCallStack } = useNodeDebugger();

onMounted(async () => {
  await nextTick();

  // Validate Vue ref
  if (validateRef(myRef, 'myRef')) {
    console.log('Ref is ready');
  }

  // Safe DOM query within component
  const element = safeQuery('.my-class', myRef.value);

  // Log call stack for debugging
  if (process.env.NODE_ENV === 'development') {
    logCallStack('Component mounted');
  }
});
</script>
```

### Safe Intersection Observer Usage
```javascript
import { progressiveLoader } from 'src/lib/performance/ProgressiveLoader.js';

// The progressiveLoader now handles all validation internally
export function setupLazyImages(container) {
  const images = container.querySelectorAll('img[data-src]');

  images.forEach(img => {
    // This is now safe - validation is built-in
    progressiveLoader.registerImage(img, {
      placeholder: '/assets/placeholder.png',
      onError: (error) => console.warn('Image failed to load:', error)
    });
  });
}
```

## Troubleshooting Checklist

1. **Check Console for Debugger Output**: Look for "[Node Debugger]" prefixed messages
2. **Verify Element Exists**: Use `safeQuery` instead of direct `querySelector`
3. **Check DOM Ready State**: Ensure operations happen after DOM is ready
4. **Validate Vue Refs**: Use `validateRef` before accessing ref values
5. **Use Safe Event Listeners**: Use `safeAddEventListener` for dynamic elements
6. **Enable Mutation Observer**: Turn on DOM mutation monitoring in development
7. **Export Error Reports**: Use the debugger panel to export detailed error reports

## Performance Impact

- **Development**: Full debugging enabled, some performance overhead
- **Production**: Minimal overhead, basic error collection only
- **Memory**: Bounded error queues, automatic cleanup
- **Monitoring**: Optional real-time monitoring that can be disabled

This comprehensive debugging system should help identify and resolve "node is undefined" errors efficiently while providing detailed context for debugging.
