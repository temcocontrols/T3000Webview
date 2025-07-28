# T3000 Library Bug Analysis Report

## Critical Bugs and Issues Found

### 1. Memory Leaks and Resource Management

#### WebSocketClient.ts - Critical Memory Leak
**File:** `src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts`
**Lines:** 100-160
**Severity:** 🚨 CRITICAL

```typescript
// BUG: Event listeners never removed - MEMORY LEAK
this.socket.onopen = this.onOpen.bind(this);
this.socket.onmessage = this.onMessage.bind(this);
this.socket.onclose = this.onClose.bind(this);
this.socket.onerror = this.onError.bind(this);

// BUG: Multiple onopen handlers assigned without cleanup
this.socket.onopen = null; // Previous handler lost
this.socket.onopen = (event: Event) => { /* new handler */ };
```

**Fix:**
```typescript
// Proper cleanup pattern
private cleanup() {
  if (this.socket) {
    this.socket.onopen = null;
    this.socket.onmessage = null;
    this.socket.onclose = null;
    this.socket.onerror = null;
    this.socket.close();
    this.socket = null;
  }
}

// Clear intervals
if (this.reloadInitialDataInterval) {
  clearInterval(this.reloadInitialDataInterval);
  this.reloadInitialDataInterval = null;
}
```

#### EvtUtil.ts - Event Listener Cleanup Missing
**File:** `src/lib/T3000/Hvac/Event/EvtUtil.ts`
**Lines:** Various
**Severity:** 🚨 CRITICAL

```typescript
// BUG: jQuery event handlers never removed
$('#svg-area').on('mousemove', handler); // No corresponding .off()

// BUG: Hammer.js events not properly cleaned up
T3Gv.opt.WorkAreaHammer.on('drag', EvtUtil.Evt_WorkAreaHammerDrag);
// Missing: T3Gv.opt.WorkAreaHammer.off('drag');
```

### 2. Null/Undefined Reference Errors

#### Utils1.ts - Multiple Null Reference Risks
**File:** `src/lib/T3000/Hvac/Util/Utils1.ts`
**Lines:** 25-45, 150-200
**Severity:** 🚨 MAJOR

```typescript
// BUG: No null check before method calls
static Alert(message, additionalText, okCallback) {
  // message could be null/undefined
  let displayMessage = message; // DANGEROUS - could be null

  if (typeof okCallback === 'function') {
    okCallback(); // Could throw if okCallback is not properly defined
  }
}

// BUG: No validation in DeepCopy
static DeepCopy(source) {
  if (source == null) { // Uses == instead of === (allows undefined through)
    return null;
  }
  // Missing validation for circular references
  const copy = new source.constructor(); // Could fail if constructor is undefined
}
```

**Fix:**
```typescript
static Alert(message?: string, additionalText?: string, okCallback?: () => void) {
  let displayMessage = message || "Error: ";

  if (additionalText) {
    displayMessage += additionalText;
  }

  // Validate callback before use
  if (okCallback && typeof okCallback === 'function') {
    try {
      okCallback();
    } catch (error) {
      LogUtil.Error('Alert callback failed:', error);
    }
  }
}
```

#### T3Data.ts - Global State Mutations Without Validation
**File:** `src/lib/T3000/Hvac/Data/T3Data.ts`
**Lines:** 564-650
**Severity:** 🚨 MAJOR

```typescript
// BUG: Direct mutations without validation
export const appState = ref(cloneDeep(emptyProject));
export const user = ref(null); // Could be assigned invalid data
export const T3000_Data = ref({
  // No schema validation
  // No type checking
  // No mutation guards
});
```

### 3. Type Safety Issues

#### Multiple Files - TypeScript `any` Usage
**Severity:** ⚠️ MEDIUM

```typescript
// utils1.ts - Line 25
static Alert(message, additionalText, okCallback) {
  // Parameters should be typed
}

// EvtUtil.ts - Multiple functions
static Evt_MouseMove(mouseEvent) {
  // Should be: mouseEvent: MouseEvent
}

static Evt_WorkAreaHammerClick(event) {
  // Should be: event: HammerInput
}
```

### 4. Error Handling Deficiencies

#### WebSocketClient.ts - Inadequate Error Recovery
**File:** `src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts`
**Lines:** 60-80
**Severity:** 🚨 MAJOR

```typescript
// BUG: No error handling for connection failures
private onError(event: Event) {
  T3Util.Error('= ws: onError/', event);
  const errorMsg = `Load device data failed...`;
  T3UIUtil.ShowWebSocketError(errorMsg);
  this.attemptReconnect(); // Could loop infinitely
}

// BUG: No validation of message format
private onMessage(event: MessageEvent) {
  this.processMessage(event.data); // No validation - could crash
}

// BUG: Infinite reconnection without backoff
private attemptReconnect() {
  if (this.retries < this.maxRetries) {
    setTimeout(() => {
      this.retries++;
      this.connect(); // Could fail immediately and retry again
    }, 5000); // Fixed delay - should use exponential backoff
  }
}
```

**Fix:**
```typescript
private attemptReconnect() {
  if (this.retries < this.maxRetries) {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const delay = Math.min(1000 * Math.pow(2, this.retries), 30000);

    setTimeout(() => {
      this.retries++;
      try {
        this.connect();
      } catch (error) {
        LogUtil.Error('Reconnection failed:', error);
      }
    }, delay);
  }
}
```

### 5. Performance Issues

#### Utils1.ts - Inefficient Deep Copy
**File:** `src/lib/T3000/Hvac/Util/Utils1.ts`
**Lines:** 160-240
**Severity:** ⚠️ MEDIUM

```typescript
// BUG: Recursive deep copy without circular reference protection
static DeepCopy(source) {
  // No circular reference detection - could cause stack overflow
  // Inefficient for large objects
  // No optimization for common types

  if (sourceType === "object") {
    const copy = new source.constructor(); // Could be expensive

    for (const key in source) { // Iterates all enumerable properties
      // Recursive call without depth limit
      copy[key] = Utils1.DeepCopy(value[i]);
    }
  }
}
```

#### T3Data.ts - Large Reactive Objects
**File:** `src/lib/T3000/Hvac/Data/T3Data.ts`
**Lines:** 621-650
**Severity:** ⚠️ MEDIUM

```typescript
// BUG: Huge reactive objects causing performance issues
export const T3000_Data = ref({
  // This object could be massive and all properties are reactive
  // Should be split into smaller, focused reactive objects
});

// BUG: Unnecessary deep cloning on every state change
export const appState = ref(cloneDeep(emptyProject));
// cloneDeep is expensive and called frequently
```

### 6. Race Conditions

#### WebSocketClient.ts - Connection State Race
**File:** `src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts`
**Lines:** 120-160
**Severity:** 🚨 MAJOR

```typescript
// BUG: Race condition between send and connect
sendMessage(message: string) {
  if (this.socket && this.socket.readyState === WebSocket.OPEN) {
    this.socket?.send(message);
  } else {
    // Connection could close between this check and the reconnection
    this.connect();

    this.socket.onopen = (event: Event) => {
      // Race condition: onopen could be overwritten by another call
      this.onOpen(event);
      // Message might be lost if connection fails again
      this.socket.send(pendingMessage);
    };
  }
}
```

### 7. Security Issues

#### Utils1.ts - Unsafe Object Construction
**File:** `src/lib/T3000/Hvac/Util/Utils1.ts`
**Lines:** 70-100
**Severity:** ⚠️ MEDIUM

```typescript
// BUG: Unsafe object instantiation
static GetObjectInstance(storedObject) {
  // No validation of constructor
  result = new storedObject.constructor({}); // Could execute malicious code
}

// BUG: No input sanitization
static CloneBlock(sourceObject) {
  if (sourceObject === null || typeof sourceObject !== "object") {
    throw new Error("Parameter is not an object");
  }

  // No validation of object properties
  // Could contain prototype pollution vectors
  const clonedObject = Utils1.DeepCopy({ ...objectInstance, ...sourceObject });
}
```

### 8. Inconsistent Error Handling Patterns

#### Multiple Files - Pattern Inconsistencies
**Severity:** ⚠️ MEDIUM

```typescript
// Pattern 1: Silent failures (Utils1.ts)
static RoundCoord(value) {
  const roundedValue = Math.round(1000 * Number(value)) / 1000;
  return isNaN(roundedValue) ? value : roundedValue; // Silent failure
}

// Pattern 2: Exception throwing (Utils1.ts)
static CloneBlock(sourceObject) {
  if (sourceObject === null || typeof sourceObject !== "object") {
    throw new Error("Parameter is not an object"); // Throws exception
  }
}

// Pattern 3: Logging only (WebSocketClient.ts)
private onError(event: Event) {
  T3Util.Error('= ws: onError/', event); // Only logs
}
```

### 9. Global State Management Issues

#### T3Gv.ts and T3Data.ts - Architectural Problems
**Files:** Multiple
**Severity:** 🚨 MAJOR

```typescript
// BUG: Direct global state mutations without validation
T3Gv.currentObjSeqId += 1; // Direct mutation from multiple files
T3Gv.opt.svgDoc = newDoc; // No validation or notifications

// BUG: Reactive state mixed with non-reactive global state
export const appState = ref(cloneDeep(emptyProject)); // Vue reactive
// vs
T3Gv.state.currentStateId = 5; // Direct mutation

// BUG: No state synchronization between reactive and global state
```

### 10. DOM Manipulation Without Error Handling

#### EvtUtil.ts - Unsafe DOM Operations
**File:** `src/lib/T3000/Hvac/Event/EvtUtil.ts`
**Lines:** 200-250
**Severity:** ⚠️ MEDIUM

```typescript
// BUG: No null checks for DOM elements
static Evt_WorkAreaMouseWheel(event) {
  const svgArea = $('#svg-area'); // Could return empty jQuery object
  const scrollLeft = svgArea.scrollLeft(); // Could fail if element doesn't exist
  const scrollTop = svgArea.scrollTop();

  T3Gv.docUtil.SetScroll(scrollLeft - xOffset, scrollTop - yOffset);
  // No validation of calculated values
}
```

## Summary of Critical Issues

### Immediate Action Required (🚨 CRITICAL)
1. **Memory Leaks in WebSocketClient** - Event listeners and intervals not cleaned up
2. **Memory Leaks in EvtUtil** - jQuery and Hammer.js events not removed
3. **Null Reference Errors** - Multiple functions missing null checks
4. **Race Conditions** - WebSocket connection state management
5. **Global State Mutations** - No validation or synchronization

### High Priority (🚨 MAJOR)
1. **Error Handling** - Inconsistent patterns across modules
2. **Type Safety** - Missing TypeScript types
3. **Performance Issues** - Inefficient deep copying and large reactive objects

### Medium Priority (⚠️ MEDIUM)
1. **Security Issues** - Unsafe object construction
2. **DOM Operations** - Missing error handling
3. **Code Organization** - Large files violating single responsibility

## Recommendations

### Immediate Fixes (Week 1-2)
1. Add proper cleanup methods to WebSocketClient and EvtUtil
2. Add null/undefined checks to all utility functions
3. Implement proper error boundaries
4. Fix WebSocket race conditions

### Short-term Improvements (Month 1-2)
1. Add comprehensive TypeScript types
2. Implement consistent error handling patterns
3. Add input validation and sanitization
4. Split large files (T3Data.ts)

### Long-term Refactoring (Month 3-6)
1. Replace global state with proper state management
2. Implement comprehensive test coverage
3. Add performance monitoring and optimization
4. Create proper separation of concerns

This analysis identifies concrete, actionable bugs that need immediate attention to improve the stability and maintainability of the T3000 library.
