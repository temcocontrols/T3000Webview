/**
 * T3000 React Entry Point
 *
 * Initializes the React application
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Initialize React app
const root = ReactDOM.createRoot(
  document.getElementById('t3000-react-root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
