/**
 * AiChatPage — Built-in AI chat page for the T3000 web interface.
 *
 * Route: /#/t3000/ai-chat
 *
 * Renders ChatPanel filling the available space. The MainLayout wrapper
 * provides the header, toolbar, and device tree.
 */

import React, { useEffect } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { useUIStore } from '../../../store/uiStore';

export const AiChatPage: React.FC = () => {
  const setChatMode = useUIStore((s) => s.setChatMode);

  useEffect(() => {
    setChatMode('full');
    return () => setChatMode('hidden');
  }, [setChatMode]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <ChatPanel />
    </div>
  );
};
