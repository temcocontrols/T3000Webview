<template>
  <div v-if="showDebugger && (errorReports.length > 0 || isEnabled)" class="node-debugger-panel">
    <div class="debugger-header">
      <h4>🔍 Node Debugger</h4>
      <button @click="toggleExpanded" class="toggle-btn">
        {{ isExpanded ? '−' : '+' }}
      </button>
      <button @click="clearReports" class="clear-btn">Clear</button>
    </div>

    <div v-if="isExpanded" class="debugger-content">
      <div class="stats">
        <div class="stat-item">
          <span class="label">Total Errors:</span>
          <span class="value">{{ totalErrors }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Node Errors:</span>
          <span class="value">{{ nodeErrors }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Last Error:</span>
          <span class="value">{{ lastErrorTime }}</span>
        </div>
      </div>

      <div class="error-list">
        <div
          v-for="(report, index) in recentReports"
          :key="index"
          :class="['error-item', `severity-${report.severity}`]"
        >
          <div class="error-header">
            <span class="error-time">{{ formatTime(report.timestamp) }}</span>
            <span class="error-severity">{{ report.severity.toUpperCase() }}</span>
            <span class="error-component">{{ report.context.component }}.{{ report.context.function }}</span>
          </div>
          <div class="error-message">{{ report.error.message }}</div>
          <div v-if="report.context.nodeInfo" class="node-info">
            <strong>Node Info:</strong>
            <pre>{{ JSON.stringify(report.context.nodeInfo, null, 2) }}</pre>
          </div>
          <div v-if="showStackTrace" class="stack-trace">
            <button @click="toggleStackTrace(index)" class="stack-toggle">
              {{ expandedStacks.has(index) ? 'Hide' : 'Show' }} Stack
            </button>
            <pre v-if="expandedStacks.has(index)">{{ report.stackTrace }}</pre>
          </div>
        </div>
      </div>

      <div class="actions">
        <button @click="exportReports" class="export-btn">Export Reports</button>
        <button @click="runDiagnostics" class="diagnostics-btn">Run Diagnostics</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ErrorHandler } from '../../lib/T3000/Hvac/Util/ErrorHandler';
import { NodeDebugger } from '../../lib/debug/NodeDebugger.js';

// Props
const props = defineProps({
  enabled: {
    type: Boolean,
    default: () => process.env.NODE_ENV === 'development'
  },
  maxReports: {
    type: Number,
    default: 20
  },
  showStackTrace: {
    type: Boolean,
    default: false
  }
});

// Reactive state
const isEnabled = ref(props.enabled);
const isExpanded = ref(false);
const errorReports = ref([]);
const expandedStacks = ref(new Set());

// Computed properties
const showDebugger = computed(() => isEnabled.value && process.env.NODE_ENV === 'development');

const recentReports = computed(() =>
  errorReports.value.slice(-props.maxReports).reverse()
);

const totalErrors = computed(() => errorReports.value.length);

const nodeErrors = computed(() =>
  errorReports.value.filter(report =>
    report.error.message.toLowerCase().includes('node') ||
    report.context.nodeInfo
  ).length
);

const lastErrorTime = computed(() => {
  if (errorReports.value.length === 0) return 'None';
  const lastReport = errorReports.value[errorReports.value.length - 1];
  return formatTime(lastReport.timestamp);
});

// Methods
function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function clearReports() {
  errorReports.value = [];
  expandedStacks.value.clear();
  ErrorHandler.getInstance().clearHistory();
}

function toggleStackTrace(index) {
  if (expandedStacks.value.has(index)) {
    expandedStacks.value.delete(index);
  } else {
    expandedStacks.value.add(index);
  }
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

function exportReports() {
  const data = {
    timestamp: new Date().toISOString(),
    reports: errorReports.value,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `t3000-error-reports-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function runDiagnostics() {
  console.log('🔍 Running T3000 Node Diagnostics...');

  // Check common DOM elements
  const diagnostics = {
    timestamp: Date.now(),
    domReady: document.readyState,
    bodyExists: !!document.body,
    elementsCount: document.querySelectorAll('*').length,
    commonSelectors: {}
  };

  // Test common selectors that might fail
  const commonSelectors = [
    '#app',
    '.q-page',
    '.hvac-editor',
    '.viewport',
    '.toolbar',
    'canvas',
    'svg'
  ];

  commonSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      diagnostics.commonSelectors[selector] = {
        found: elements.length,
        elements: Array.from(elements).map(el => ({
          id: el.id,
          className: el.className,
          connected: el.isConnected
        }))
      };
    } catch (error) {
      diagnostics.commonSelectors[selector] = { error: error.message };
    }
  });

  console.log('📊 Diagnostics Results:', diagnostics);

  // Log to error handler for tracking
  ErrorHandler.getInstance().handleError(
    new Error('Diagnostics completed'),
    {
      component: 'NodeDebugger',
      function: 'runDiagnostics',
      userAction: 'Manual diagnostics run',
      diagnostics
    }
  );
}

// Error handler subscription
let unsubscribe = null;

onMounted(() => {
  if (isEnabled.value) {
    // Subscribe to error reports
    unsubscribe = ErrorHandler.getInstance().subscribe((report) => {
      errorReports.value.push(report);

      // Auto-expand if it's a node-related error
      if (report.error.message.toLowerCase().includes('node') ||
          report.context.nodeInfo) {
        isExpanded.value = true;
      }
    });

    // Load existing error history
    const existingReports = ErrorHandler.getInstance().getErrorHistory();
    errorReports.value = [...existingReports];

    console.log('🔍 Node Debugger initialized');
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>

<style scoped>
.node-debugger-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 400px;
  max-height: 80vh;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  border: 1px solid #444;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  z-index: 10000;
  overflow: hidden;
}

.debugger-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #333;
  border-bottom: 1px solid #444;
}

.debugger-header h4 {
  margin: 0;
  font-size: 14px;
}

.toggle-btn, .clear-btn {
  background: #555;
  border: none;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 4px;
}

.toggle-btn:hover, .clear-btn:hover {
  background: #666;
}

.debugger-content {
  max-height: 70vh;
  overflow-y: auto;
  padding: 12px;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-item {
  text-align: center;
  padding: 4px;
  background: #222;
  border-radius: 4px;
}

.stat-item .label {
  display: block;
  font-size: 10px;
  color: #888;
}

.stat-item .value {
  display: block;
  font-weight: bold;
  color: #fff;
}

.error-list {
  max-height: 300px;
  overflow-y: auto;
}

.error-item {
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 4px;
  border-left: 3px solid;
}

.error-item.severity-low {
  border-left-color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

.error-item.severity-medium {
  border-left-color: #FF9800;
  background: rgba(255, 152, 0, 0.1);
}

.error-item.severity-high {
  border-left-color: #F44336;
  background: rgba(244, 67, 54, 0.1);
}

.error-item.severity-critical {
  border-left-color: #9C27B0;
  background: rgba(156, 39, 176, 0.1);
}

.error-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 10px;
}

.error-time {
  color: #888;
}

.error-severity {
  font-weight: bold;
}

.error-component {
  color: #64B5F6;
}

.error-message {
  margin-bottom: 4px;
  font-weight: bold;
}

.node-info {
  margin: 4px 0;
  font-size: 10px;
}

.node-info pre {
  background: #111;
  padding: 4px;
  border-radius: 2px;
  margin: 2px 0;
  font-size: 10px;
  overflow-x: auto;
}

.stack-trace {
  margin-top: 4px;
}

.stack-toggle {
  background: #444;
  border: none;
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 10px;
}

.stack-toggle:hover {
  background: #555;
}

.stack-trace pre {
  background: #111;
  padding: 6px;
  border-radius: 2px;
  margin: 4px 0;
  font-size: 9px;
  overflow-x: auto;
  max-height: 100px;
  overflow-y: auto;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #444;
}

.export-btn, .diagnostics-btn {
  flex: 1;
  background: #2196F3;
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.export-btn:hover, .diagnostics-btn:hover {
  background: #1976D2;
}
</style>
