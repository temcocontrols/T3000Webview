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
    console.log('📘 Vue route detected - skipping React initialization');
    return;
  }

  console.log('⚛️ React route detected - initializing React app...');

  // Prevent multiple initializations
  if (isInitialized) {
    console.log('⚠️ React already initialized, skipping...');
    return;
  }

  // Check if React root element exists
  const rootElement = document.getElementById('t3000-react-root');

  if (!rootElement) {
    console.warn('T3000 React root element not found. React app will not be initialized.');
    return;
  }

  try {
    // Lazy load React app (code splitting)
    import('../t3-react/app/App').then(({ App }) => {
      console.log('📦 React App module loaded, rootElement:', rootElement);
      console.log('📦 rootElement innerHTML before mount:', rootElement.innerHTML);
      console.log('📦 rootElement parent:', rootElement.parentElement);

      // Create React root and render app
      reactRoot = ReactDOM.createRoot(rootElement);

      console.log('📦 React root created:', reactRoot);

      reactRoot.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );

      isInitialized = true;
      console.log('📦 React render called');

      // Check after a brief delay
      setTimeout(() => {
        console.log('📦 rootElement innerHTML after mount:', rootElement.innerHTML);
        console.log('📦 rootElement children count:', rootElement.children.length);
      }, 100);

      // Check again after 500ms to see if Vue cleared it
      setTimeout(() => {
        console.log('🔍 rootElement innerHTML after 500ms:', rootElement.innerHTML);
        console.log('🔍 rootElement children count after 500ms:', rootElement.children.length);
        console.log('🔍 rootElement still in DOM?', document.contains(rootElement));
      }, 500);

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
 * NOTE: React is now initialized by ReactContainer.vue's onMounted hook
 * This ensures the DOM element exists before React tries to mount
 */
export default () => {
  console.log('⚛️ React boot file loaded (initialization handled by ReactContainer)');
};
