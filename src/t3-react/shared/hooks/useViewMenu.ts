/**
 * View Menu Hook
 * React hook for View menu operations
 */

import { useState, useCallback } from 'react';
import { ViewMenuService, type ViewState } from '../../services/viewMenuService';

export const useViewMenu = () => {
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState<ViewState>(ViewMenuService.getViewState());

  const handleShowToolBar = useCallback(async () => {
    setLoading(true);
    try {
      const newState = !viewState.toolBarVisible;
      await ViewMenuService.toggleToolBar(newState);
      setViewState((prev) => ({ ...prev, toolBarVisible: newState }));
    } catch (error) {
      console.error('Failed to toggle toolbar:', error);
    } finally {
      setLoading(false);
    }
  }, [viewState.toolBarVisible]);

  const handleShowBuildingPane = useCallback(async () => {
    setLoading(true);
    try {
      const newState = !viewState.buildingPaneVisible;
      await ViewMenuService.toggleBuildingPane(newState);
      setViewState((prev) => ({ ...prev, buildingPaneVisible: newState }));
    } catch (error) {
      console.error('Failed to toggle building pane:', error);
    } finally {
      setLoading(false);
    }
  }, [viewState.buildingPaneVisible]);

  const handleShowStatusBar = useCallback(async () => {
    setLoading(true);
    try {
      const newState = !viewState.statusBarVisible;
      await ViewMenuService.toggleStatusBar(newState);
      setViewState((prev) => ({ ...prev, statusBarVisible: newState }));
    } catch (error) {
      console.error('Failed to toggle status bar:', error);
    } finally {
      setLoading(false);
    }
  }, [viewState.statusBarVisible]);

  const handleThemeOffice2003 = useCallback(async () => {
    setLoading(true);
    try {
      await ViewMenuService.setTheme('office-2003');
      setViewState((prev) => ({ ...prev, theme: 'office-2003' }));
    } catch (error) {
      console.error('Failed to set theme:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleThemeOffice2007Blue = useCallback(async () => {
    setLoading(true);
    try {
      await ViewMenuService.setTheme('office-2007-blue');
      setViewState((prev) => ({ ...prev, theme: 'office-2007-blue' }));
    } catch (error) {
      console.error('Failed to set theme:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleThemeOffice2007Silver = useCallback(async () => {
    setLoading(true);
    try {
      await ViewMenuService.setTheme('office-2007-silver');
      setViewState((prev) => ({ ...prev, theme: 'office-2007-silver' }));
    } catch (error) {
      console.error('Failed to set theme:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await ViewMenuService.refreshView();
    } catch (error) {
      console.error('Failed to refresh view:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    viewState,
    handlers: {
      handleShowToolBar,
      handleShowBuildingPane,
      handleShowStatusBar,
      handleThemeOffice2003,
      handleThemeOffice2007Blue,
      handleThemeOffice2007Silver,
      handleRefresh,
    },
  };
};
