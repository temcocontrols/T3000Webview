/**
 * AiChatOverlay — Floating sidebar chat panel that overlays any T3000 page.
 *
 * Three modes, controlled by uiStore.chatMode:
 *   'hidden'  — Not visible; small floating button to open
 *   'sidebar' — Fixed 420px right panel with backdrop
 *   'full'    — Navigates to /t3000/ai-chat full-page route
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DismissRegular,
  ChatRegular,
  ArrowExpandRegular,
} from '@fluentui/react-icons';
import { useUIStore } from '../../../store/uiStore';
import { ChatPanel } from './ChatPanel';
import styles from '../AiChat.module.css';

export const AiChatOverlay: React.FC = () => {
  const chatMode = useUIStore((s) => s.chatMode);
  const setChatMode = useUIStore((s) => s.setChatMode);
  const navigate = useNavigate();

  const handleOpenSidebar = useCallback(() => {
    setChatMode('sidebar');
  }, [setChatMode]);

  const handleClose = useCallback(() => {
    setChatMode('hidden');
  }, [setChatMode]);

  const handleGoFull = useCallback(() => {
    navigate('/t3000/ai-chat');
  }, [navigate]);

  if (chatMode === 'hidden') {
    return (
      <button
        className={styles.floatingChatButton}
        onClick={handleOpenSidebar}
        title="Open AI Chat"
        aria-label="Open AI Chat"
      >
        <ChatRegular style={{ fontSize: 20 }} />
      </button>
    );
  }

  if (chatMode === 'sidebar') {
    return (
      <>
        {/* Backdrop — closes on click */}
        <div className={styles.overlayBackdrop} onClick={handleClose} />

        {/* Sidebar panel */}
        <div className={styles.overlayPanel}>
          {/* Top bar */}
          <div className={styles.overlayHeader}>
            <span className={styles.overlayTitle}>AI Assistant</span>
            <div className={styles.overlayActions}>
              <button
                className={styles.overlayActionBtn}
                onClick={handleGoFull}
                title="Open full screen"
                aria-label="Open full screen"
              >
                <ArrowExpandRegular style={{ fontSize: 16 }} />
              </button>
              <button
                className={styles.overlayActionBtn}
                onClick={handleClose}
                title="Close"
                aria-label="Close AI chat"
              >
                <DismissRegular style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>

          {/* Chat panel */}
          <div className={styles.overlayBody}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <ChatPanel />
            </div>
          </div>
        </div>
      </>
    );
  }

  // 'full' mode — handled by the route, render nothing here
  return null;
};
