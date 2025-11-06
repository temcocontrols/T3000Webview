/**
 * Bootstrap file to initialize both Vue and React applications
 * This file is imported in the Quasar boot process
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@t3-react/App';

/**
 * Initialize React Application
 * This runs after Vue is initialized by Quasar
 */
export function initializeReactApp() {
  // Check if React root element exists
  const rootElement = document.getElementById('t3000-react-root');

  if (!rootElement) {
    console.warn('T3000 React root element not found. React app will not be initialized.');
    return;
  }

  try {
    // Create React root and render app
    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log('✅ T3000 React application initialized');
  } catch (error) {
    console.error('Failed to initialize T3000 React application:', error);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeReactApp);
} else {
  // DOM already loaded
  initializeReactApp();
}
