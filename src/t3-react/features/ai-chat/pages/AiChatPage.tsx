/**
 * AiChatPage — Built-in AI chat page for the T3000 web interface.
 *
 * Route: /#/t3000/ai-chat
 *
 * Renders ChatPanel filling the available space. The MainLayout wrapper
 * provides the header, toolbar, and device tree.
 */

import React from 'react';
import { ChatPanel } from '../components/ChatPanel';

export const AiChatPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <ChatPanel />
    </div>
  );
};
