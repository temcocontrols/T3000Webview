/**
 * Control Messages Page
 * Tabbed interface for browsing WebView control messages by category
 */

import React, { useState } from 'react';
import styles from './ControlMessagesPage.module.css';

type MessageCategory = 'all' | 'data-retrieval' | 'updates' | 'graphics' | 'discovery';

interface Message {
  name: string;
  action: string;
  description: string;
  usage: string;
  path: string;
}

const messages: Message[] = [
  {
    name: 'GET_PANEL_DATA',
    action: 'GET_PANEL_DATA',
    description: 'Load all cached data for a panel',
    usage: 'Initial panel view load',
    path: 't3000/building-platform/control-messages/message-get-panel-data',
  },
  {
    name: 'GET_WEBVIEW_LIST',
    action: 'GET_WEBVIEW_LIST',
    description: 'Read specific entry type with range',
    usage: 'Loading inputs, outputs, programs, etc.',
    path: 't3000/building-platform/control-messages/message-17',
  },
  {
    name: 'GET_ENTRIES',
    action: 'GET_ENTRIES',
    description: 'Get multiple specific entries',
    usage: 'Batch data retrieval',
    path: 't3000/building-platform/control-messages/message-get-entries',
  },
  {
    name: 'UPDATE_WEBVIEW_LIST',
    action: 'UPDATE_WEBVIEW_LIST',
    description: 'Write values to device entries',
    usage: 'Updating setpoints, outputs, variables',
    path: 't3000/building-platform/control-messages/message-update-webview-list',
  },
  {
    name: 'UPDATE_ENTRY',
    action: 'UPDATE_ENTRY',
    description: 'Update single entry field',
    usage: 'Quick field update',
    path: 't3000/building-platform/control-messages/message-update-entry',
  },
  {
    name: 'GET_INITIAL_DATA',
    action: 'GET_INITIAL_DATA',
    description: 'Load graphics screen data',
    usage: 'Opening graphics editor',
    path: 't3000/building-platform/control-messages/message-get-initial-data',
  },
  {
    name: 'LOAD_GRAPHIC_ENTRY',
    action: 'LOAD_GRAPHIC_ENTRY',
    description: 'Load specific graphic entry',
    usage: 'Graphics screen display',
    path: 't3000/building-platform/control-messages/message-get-initial-data',
  },
  {
    name: 'SAVE_GRAPHIC_DATA',
    action: 'SAVE_GRAPHIC_DATA',
    description: 'Save graphics screen changes',
    usage: 'Saving graphics edits',
    path: 't3000/building-platform/control-messages/message-save-graphic-data',
  },
  {
    name: 'GET_PANELS_LIST',
    action: 'GET_PANELS_LIST',
    description: 'Get all online panels',
    usage: 'Device list refresh',
    path: 't3000/building-platform/control-messages/message-get-panels-list',
  },
];

const messageCategories: Record<string, MessageCategory[]> = {
  'GET_PANEL_DATA': ['data-retrieval'],
  'GET_WEBVIEW_LIST': ['data-retrieval'],
  'GET_ENTRIES': ['data-retrieval'],
  'UPDATE_WEBVIEW_LIST': ['updates'],
  'UPDATE_ENTRY': ['updates'],
  'GET_INITIAL_DATA': ['graphics'],
  'LOAD_GRAPHIC_ENTRY': ['graphics'],
  'SAVE_GRAPHIC_DATA': ['graphics'],
  'GET_PANELS_LIST': ['discovery'],
};

interface ControlMessagesPageProps {
  onNavigate: (path: string) => void;
}

export const ControlMessagesPage: React.FC<ControlMessagesPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<MessageCategory>('all');

  const filteredMessages = activeTab === 'all'
    ? messages
    : messages.filter((msg) => messageCategories[msg.action]?.includes(activeTab));

  const categoryInfo: Record<MessageCategory, { title: string; description: string }> = {
    'all': {
      title: 'All Control Messages',
      description: 'Complete list of all WebView control messages for frontend-backend communication.',
    },
    'data-retrieval': {
      title: 'Data Retrieval Messages',
      description: 'Messages for reading device data and configuration from panels.',
    },
    'updates': {
      title: 'Data Update Messages',
      description: 'Messages for writing values and configurations to devices.',
    },
    'graphics': {
      title: 'Graphics Messages',
      description: 'Messages for loading and saving HMI graphic screens.',
    },
    'discovery': {
      title: 'Discovery Messages',
      description: 'Messages for discovering and listing available devices.',
    },
  };

  return (
    <div className={styles.container}>
      {/* Tab Bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Messages
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'data-retrieval' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('data-retrieval')}
        >
          Data Retrieval
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'updates' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('updates')}
        >
          Updates
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'graphics' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('graphics')}
        >
          Graphics
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'discovery' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('discovery')}
        >
          Discovery
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>{categoryInfo[activeTab].title}</h1>
          <p className={styles.description}>{categoryInfo[activeTab].description}</p>
        </div>

        <div className={styles.messageGrid}>
          {filteredMessages.map((message) => (
            <div
              key={message.action}
              className={styles.messageCard}
              onClick={() => onNavigate(message.path)}
            >
              <div className={styles.messageHeader}>
                <h3>{message.name}</h3>
                <span className={styles.messageAction}>{message.action}</span>
              </div>
              <p className={styles.messageDescription}>{message.description}</p>
              <div className={styles.messageFooter}>
                <span className={styles.messageUsage}>
                  <strong>Use case:</strong> {message.usage}
                </span>
                <span className={styles.messageLink}>View details →</span>
              </div>
            </div>
          ))}
        </div>

        {filteredMessages.length === 0 && (
          <div className={styles.emptyState}>
            <p>No messages in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};
