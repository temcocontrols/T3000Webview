/**
 * Hybrid Architecture: Route-based React initialization
 * This boot file conditionally loads React app only for /t3000/* routes
 * Vue (Quasar) handles all other routes
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { isReactRoute } from '../shared/routes';

// Track if React has already been initialized
let reactRoot: ReactDOM.Root | null = null;
let isInitialized = false;

/**
 * Initialize React Application (conditionally based on route)
 * Only mounts React app when on /t3000/* routes
 */
export function initializeReactApp() {
  // Check if current route should be handled by React
  if (!isReactRoute()) {
    return;
  }

  // Prevent multiple initializations
  if (isInitialized) {
    return;
  }

  // Check if React root element exists
  const rootElement = document.getElementById('t3000-react-root');
  if (!rootElement) return;

  try {
    import('../t3-react/app/App').then(({ App }) => {
      reactRoot = ReactDOM.createRoot(rootElement);
      reactRoot.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      isInitialized = true;
    });
  } catch (error) {}
}

/**
 * Quasar boot function export
 * NOTE: React is now initialized by ReactContainer.vue's onMounted hook
 * This ensures the DOM element exists before React tries to mount
 */
export default () => {
  //console.log('⚛️ React boot file loaded (initialization handled by ReactContainer)');
};
