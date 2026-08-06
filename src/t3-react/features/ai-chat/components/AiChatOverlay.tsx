/**
 * AiChatOverlay — Floating sidebar chat panel that overlays any T3000 page.
 *
 * Three modes, controlled by uiStore.chatMode:
 *   'hidden'  — Not visible
 *   'sidebar' — Fixed 420px right panel with backdrop
 *   'full'    — Navigates to /t3000/ai-chat full-page route
 *
 * The overlay header contains a visible segmented mode toggle:
 *   [Full Screen] [Chat Sidebar] [Hide AI]
 */

import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DismissRegular,
  ArrowExpandRegular,
} from '@fluentui/react-icons';
import { useUIStore } from '../../../store/uiStore';
import { ChatPanel } from './ChatPanel';
import styles from '../AiChat.module.css';

type ChatMode = 'full' | 'sidebar' | 'hidden';

const MODES: { mode: ChatMode; label: string }[] = [
  { mode: 'full', label: 'Full Screen' },
  { mode: 'sidebar', label: 'Chat Sidebar' },
  { mode: 'hidden', label: 'Hide AI' },
];

export const AiChatOverlay: React.FC = () => {
  const chatMode = useUIStore((s) => s.chatMode);
  const setChatMode = useUIStore((s) => s.setChatMode);
  const navigate = useNavigate();

  // Listen for the custom event from the menu config
  useEffect(() => {
    const handler = () => setChatMode('sidebar');
    window.addEventListener('t3-open-ai-chat', handler);
    return () => window.removeEventListener('t3-open-ai-chat', handler);
  }, [setChatMode]);

  const handleGoFull = useCallback(() => {
    setChatMode('full');
    navigate('/t3000/ai-chat');
  }, [setChatMode, navigate]);

  const handleGoSidebar = useCallback(() => {
    setChatMode('sidebar');
    // If currently on the full-page route, go back to dashboard first
    if (window.location.hash.includes('/ai-chat')) {
      navigate('/t3000/dashboard');
    }
  }, [setChatMode, navigate]);

  const handleClose = useCallback(() => {
    setChatMode('hidden');
  }, [setChatMode]);

  if (chatMode === 'hidden') {
    return null; // No floating button — user opens from top menu
  }

  if (chatMode === 'sidebar') {
    return (
      <>
        {/* Backdrop */}
        <div className={styles.overlayBackdrop} onClick={handleClose} />

        {/* Sidebar panel */}
        <div className={styles.overlayPanel}>
          {/* ── Header: mode toggle + actions ── */}
          <div className={styles.overlayHeader}>
            <div className={styles.overlayModeToggle}>
              {MODES.map(({ mode, label }) => (
                <button
                  key={mode}
                  className={`${styles.overlayModeBtn} ${chatMode === mode ? styles.overlayModeBtnActive : ''}`}
                  onClick={() => {
                    if (mode === 'full') {
                      handleGoFull();
                    } else if (mode === 'sidebar') {
                      handleGoSidebar();
                    } else {
                      setChatMode(mode);
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
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

          {/* ── Body ── */}
          <div className={styles.overlayBody}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <ChatPanel hideSidebar />
            </div>
          </div>
        </div>
      </>
    );
  }

  // 'full' mode — handled by the route, render nothing here
  return null;
};
