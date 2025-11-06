/**
 * Hybrid Architecture: Route-based React initialization
 * This boot file conditionally loads React app only for /t3000/* routes
 * Vue (Quasar) handles all other routes
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { isReactRoute } from '../shared/routes';

/**
 * Initialize React Application (conditionally based on route)
 * Only mounts React app when on /t3000/* routes
 */
export function initializeReactApp() {
  // Check if current route should be handled by React
  if (!isReactRoute()) {
    console.log('📘 Vue route detected - skipping React initialization');
    return;
  }

  console.log('⚛️ React route detected - initializing React app...');

  // Check if React root element exists
  const rootElement = document.getElementById('t3000-react-root');

  if (!rootElement) {
    console.warn('T3000 React root element not found. React app will not be initialized.');
    return;
  }

  try {
    // Lazy load React app (code splitting)
    import('@t3-react/App').then(({ App }) => {
      // Create React root and render app
      const root = ReactDOM.createRoot(rootElement);

      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );

      console.log('✅ T3000 React application initialized');
    }).catch((error) => {
      console.error('Failed to load React application:', error);
    });
  } catch (error) {
    console.error('Failed to initialize T3000 React application:', error);
  }
}

/**
 * Quasar boot function export
 * This is called by Quasar during app initialization
 */
export default () => {
  // Initialize React app if on React route
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReactApp);
  } else {
    // DOM already loaded
    initializeReactApp();
  }
};
