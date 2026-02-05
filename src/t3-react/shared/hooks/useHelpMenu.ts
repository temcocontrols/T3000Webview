/**
 * Help Menu Hook
 * Provides handlers for Help menu actions
 */

import { useState } from 'react';
import { HelpMenuService } from '@t3-react/services/helpMenuService';

export function useHelpMenu() {
  const [loading, setLoading] = useState(false);

  /**
   * Handle Help Contents action
   */
  const handleContents = async () => {
    try {
      setLoading(true);
      await HelpMenuService.showContents();
    } catch (error) {
      console.error('Failed to open help contents:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Version History action
   */
  const handleVersionHistory = async () => {
    try {
      setLoading(true);
      await HelpMenuService.showVersionHistory();
    } catch (error) {
      console.error('Failed to open version history:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle About Software action
   */
  const handleAboutSoftware = async () => {
    try {
      setLoading(true);
      await HelpMenuService.showAboutSoftware();
    } catch (error) {
      console.error('Failed to open about software:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Check For Updates action
   */
  const handleCheckUpdates = async () => {
    try {
      setLoading(true);
      await HelpMenuService.checkForUpdates();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handlers: {
      handleContents,
      handleVersionHistory,
      handleAboutSoftware,
      handleCheckUpdates,
    },
  };
}
