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
  if (!isReactRoute()) return;
  if (isInitialized) return;

  const rootElement = document.getElementById('t3000-react-root');
  if (!rootElement) {
    console.warn('T3000 React root element not found.');
    return;
  }

  // Determine which React app to load
  const hash = window.location.hash.replace('#', '');
  const path = hash || window.location.pathname;
  const isEez = path.startsWith('/t3000/eez');

  try {
    if (isEez) {
      import('../t3-react/app/EezStudioApp').then(({ EezStudioApp }) => {
        reactRoot = ReactDOM.createRoot(rootElement);
        reactRoot.render(<EezStudioApp />);
        isInitialized = true;
      }).catch((error) => {
        console.error('Failed to load EEZ Studio:', error);
      });
    } else {
      import('../t3-react/app/App').then(({ App }) => {
        reactRoot = ReactDOM.createRoot(rootElement);
        reactRoot.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
        isInitialized = true;
      }).catch((error) => {
        console.error('Failed to load React application:', error);
      });
    }
  } catch (error) {
    console.error('Failed to initialize T3000 React application:', error);
  }
}

/**
 * Quasar boot function export
 * NOTE: React is now initialized by ReactContainer.vue's onMounted hook
 * This ensures the DOM element exists before React tries to mount
 */
export default () => {
  //console.log('⚛️ React boot file loaded (initialization handled by ReactContainer)');
};
