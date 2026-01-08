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
  number: number;
  description: string;
  usage: string;
  path: string;
}

const messages: Message[] = [
  {
    name: 'GET_PANEL_DATA',
    action: 'GET_PANEL_DATA',
    number: 0,
    description: 'Load all cached data for a panel',
    usage: 'Initial panel view load',
    path: 't3000/building-platform/control-messages/message-get-panel-data',
  },
  {
    name: 'GET_INITIAL_DATA',
    action: 'GET_INITIAL_DATA',
    number: 1,
    description: 'Load graphics screen data',
    usage: 'Opening graphics editor',
    path: 't3000/building-platform/control-messages/message-get-initial-data',
  },
  {
    name: 'SAVE_GRAPHIC_DATA',
    action: 'SAVE_GRAPHIC_DATA',
    number: 2,
    description: 'Save graphics screen changes',
    usage: 'Saving graphics edits',
    path: 't3000/building-platform/control-messages/message-save-graphic-data',
  },
  {
    name: 'UPDATE_ENTRY',
    action: 'UPDATE_ENTRY',
    number: 3,
    description: 'Update single entry field',
    usage: 'Quick field update',
    path: 't3000/building-platform/control-messages/message-update-entry',
  },
  {
    name: 'GET_PANELS_LIST',
    action: 'GET_PANELS_LIST',
    number: 4,
    description: 'Get all online panels',
    usage: 'Device list refresh',
    path: 't3000/building-platform/control-messages/message-get-panels-list',
  },
  {
    name: 'GET_PANEL_RANGE_INFO',
    action: 'GET_PANEL_RANGE_INFO',
    number: 5,
    description: 'Get panel range information',
    usage: 'Panel capability detection',
    path: 't3000/building-platform/control-messages/message-5-get-panel-range-info',
  },
  {
    name: 'GET_ENTRIES',
    action: 'GET_ENTRIES',
    number: 6,
    description: 'Get multiple specific entries',
    usage: 'Batch data retrieval',
    path: 't3000/building-platform/control-messages/message-get-entries',
  },
  {
    name: 'LOAD_GRAPHIC_ENTRY',
    action: 'LOAD_GRAPHIC_ENTRY',
    number: 7,
    description: 'Load specific graphic entry',
    usage: 'Graphics screen display',
    path: 't3000/building-platform/control-messages/message-get-initial-data',
  },
  {
    name: 'OPEN_ENTRY_EDIT_WINDOW',
    action: 'OPEN_ENTRY_EDIT_WINDOW',
    number: 8,
    description: 'Open entry edit dialog',
    usage: 'UI interaction',
    path: 't3000/building-platform/control-messages/message-8-open-entry-edit-window',
  },
  {
    name: 'SAVE_IMAGE',
    action: 'SAVE_IMAGE',
    number: 9,
    description: 'Save graphic image file',
    usage: 'Graphics asset management',
    path: 't3000/building-platform/control-messages/message-9-save-image',
  },
  {
    name: 'SAVE_LIBRARY_DATA',
    action: 'SAVE_LIBRARY_DATA',
    number: 10,
    description: 'Save library data',
    usage: 'Library management',
    path: 't3000/building-platform/control-messages/message-10-save-library-data',
  },
  {
    name: 'DELETE_IMAGE',
    action: 'DELETE_IMAGE',
    number: 11,
    description: 'Delete graphic image file',
    usage: 'Graphics asset cleanup',
    path: 't3000/building-platform/control-messages/message-11-delete-image',
  },
  {
    name: 'GET_SELECTED_DEVICE_INFO',
    action: 'GET_SELECTED_DEVICE_INFO',
    number: 12,
    description: 'Get selected device information',
    usage: 'Device context retrieval',
    path: 't3000/building-platform/control-messages/message-12-get-selected-device-info',
  },
  {
    name: 'BIND_DEVICE',
    action: 'BIND_DEVICE',
    number: 13,
    description: 'Bind device to panel',
    usage: 'Device association',
    path: 't3000/building-platform/control-messages/message-13-bind-device',
  },
  {
    name: 'SAVE_NEW_LIBRARY_DATA',
    action: 'SAVE_NEW_LIBRARY_DATA',
    number: 14,
    description: 'Save new library data',
    usage: 'Library creation',
    path: 't3000/building-platform/control-messages/message-14-save-new-library-data',
  },
  {
    name: 'LOGGING_DATA',
    action: 'LOGGING_DATA',
    number: 15,
    description: 'Bulk data collection (Action 15)',
    usage: 'Comprehensive data logging',
    path: 't3000/building-platform/control-messages/message-15-logging-data',
  },
  {
    name: 'UPDATE_WEBVIEW_LIST',
    action: 'UPDATE_WEBVIEW_LIST',
    number: 16,
    description: 'Write values to device entries',
    usage: 'Updating setpoints, outputs, variables',
    path: 't3000/building-platform/control-messages/message-update-webview-list',
  },
  {
    name: 'GET_WEBVIEW_LIST',
    action: 'GET_WEBVIEW_LIST',
    number: 17,
    description: 'Read specific entry type with range',
    usage: 'Loading inputs, outputs, programs, etc.',
    path: 't3000/building-platform/control-messages/message-17',
  },
];

const messageCategories: Record<string, MessageCategory[]> = {
  'GET_PANEL_DATA': ['data-retrieval'],
  'GET_INITIAL_DATA': ['graphics'],
  'SAVE_GRAPHIC_DATA': ['graphics'],
  'UPDATE_ENTRY': ['updates'],
  'GET_PANELS_LIST': ['discovery'],
  'GET_PANEL_RANGE_INFO': ['discovery'],
  'GET_ENTRIES': ['data-retrieval'],
  'LOAD_GRAPHIC_ENTRY': ['graphics'],
  'OPEN_ENTRY_EDIT_WINDOW': ['updates'],
  'SAVE_IMAGE': ['graphics'],
  'SAVE_LIBRARY_DATA': ['updates'],
  'DELETE_IMAGE': ['graphics'],
  'GET_SELECTED_DEVICE_INFO': ['discovery'],
  'BIND_DEVICE': ['discovery'],
  'SAVE_NEW_LIBRARY_DATA': ['updates'],
  'LOGGING_DATA': ['data-retrieval'],
  'UPDATE_WEBVIEW_LIST': ['updates'],
  'GET_WEBVIEW_LIST': ['data-retrieval'],
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
            >
              <div className={styles.cardBody} onClick={() => onNavigate(message.path)}>
                <div className={styles.messageHeader}>
                  <h3>
                    <span className={styles.messageNumber}>{message.number}</span>
                    {message.name}
                  </h3>
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
              <div className={styles.cardActions}>
                <a
                  href="/#/t3000/develop/transport"
                  className={styles.testButton}
                  onClick={(e) => e.stopPropagation()}
                >
                  Test in Transport
                </a>
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
