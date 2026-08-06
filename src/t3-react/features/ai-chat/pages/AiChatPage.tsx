/**
 * AiChatPage — Built-in AI chat page for the T3000 web interface.
 *
 * Route: /#/t3000/ai-chat
 *
 * Renders ChatPanel filling the available space. The MainLayout wrapper
 * provides the header, toolbar, and device tree.
 */

import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatPanel } from '../components/ChatPanel';
import { useUIStore } from '../../../store/uiStore';
import { PanelRightContractRegular } from '@fluentui/react-icons';
import styles from '../AiChat.module.css';

export const AiChatPage: React.FC = () => {
  const setChatMode = useUIStore((s) => s.setChatMode);
  const navigate = useNavigate();

  useEffect(() => {
    setChatMode('full');
  }, [setChatMode]);

  const handleBackToSidebar = useCallback(() => {
    setChatMode('sidebar');
    navigate(-1); // go back to previous page
  }, [setChatMode, navigate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Thin bar to switch back to sidebar */}
      <div className={styles.fullPageBar}>
        <button className={styles.fullPageBarBtn} onClick={handleBackToSidebar}>
          <PanelRightContractRegular style={{ fontSize: 14 }} />
          <span>Chat Sidebar</span>
        </button>
      </div>
      <ChatPanel />
    </div>
  );
};
