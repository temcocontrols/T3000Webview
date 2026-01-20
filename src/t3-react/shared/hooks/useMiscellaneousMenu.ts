/**
 * Miscellaneous Menu Hook
 * Provides handlers for Miscellaneous menu actions
 */

import { useState } from 'react';
import { MiscellaneousMenuService } from '@t3-react/services/miscellaneousMenuService';

export function useMiscellaneousMenu() {
  const [loading, setLoading] = useState(false);

  /**
   * Handle Load Descriptors action
   */
  const handleLoadDescriptors = async () => {
    try {
      setLoading(true);
      await MiscellaneousMenuService.loadDescriptors();
    } catch (error) {
      console.error('Failed to load descriptors:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Write into Flash action
   */
  const handleWriteIntoFlash = async () => {
    try {
      setLoading(true);
      await MiscellaneousMenuService.writeIntoFlash();
    } catch (error) {
      console.error('Failed to write into flash:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle GSM Connection action
   */
  const handleGSMConnection = async () => {
    try {
      setLoading(true);
      await MiscellaneousMenuService.gsmConnection();
    } catch (error) {
      console.error('Failed to open GSM connection:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handlers: {
      handleLoadDescriptors,
      handleWriteIntoFlash,
      handleGSMConnection,
    },
  };
}
