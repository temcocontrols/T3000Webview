/**
 * View Menu Service
 * Handles view-related operations matching C++ T3000 View menu
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ViewState {
  toolBarVisible: boolean;
  buildingPaneVisible: boolean;
  statusBarVisible: boolean;
  theme: 'office-2003' | 'office-2007-blue' | 'office-2007-silver';
}

/**
 * Show/hide toolbar
 */
export const toggleToolBar = async (visible: boolean): Promise<void> => {
  // Store in local state/settings
  localStorage.setItem('view.toolBar', JSON.stringify(visible));
};

/**
 * Show/hide building pane
 */
export const toggleBuildingPane = async (visible: boolean): Promise<void> => {
  localStorage.setItem('view.buildingPane', JSON.stringify(visible));
};

/**
 * Show/hide status bar
 */
export const toggleStatusBar = async (visible: boolean): Promise<void> => {
  localStorage.setItem('view.statusBar', JSON.stringify(visible));
};

/**
 * Set application theme
 */
export const setTheme = async (theme: ViewState['theme']): Promise<void> => {
  localStorage.setItem('view.theme', theme);
  // Apply theme to application
  document.documentElement.setAttribute('data-theme', theme);
};

/**
 * Refresh view (F2)
 */
export const refreshView = async (): Promise<void> => {
  // Trigger refresh event
  window.dispatchEvent(new CustomEvent('view-refresh'));
  // Could also reload data from backend if needed
};

/**
 * Get current view state
 */
export const getViewState = (): ViewState => {
  return {
    toolBarVisible: JSON.parse(localStorage.getItem('view.toolBar') || 'true'),
    buildingPaneVisible: JSON.parse(localStorage.getItem('view.buildingPane') || 'true'),
    statusBarVisible: JSON.parse(localStorage.getItem('view.statusBar') || 'true'),
    theme: (localStorage.getItem('view.theme') as ViewState['theme']) || 'office-2007-blue',
  };
};

export const ViewMenuService = {
  toggleToolBar,
  toggleBuildingPane,
  toggleStatusBar,
  setTheme,
  refreshView,
  getViewState,
};
