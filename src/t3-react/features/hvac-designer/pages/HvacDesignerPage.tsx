/**
 * HVAC Designer Page
 * Main page for HVAC drawing editor
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Spinner,
  Text,
  MessageBar,
  MessageBarBody,
  Button,
  makeStyles
} from '@fluentui/react-components';
import {
  NavigationRegular,
  LockClosedRegular
} from '@fluentui/react-icons';
import { TopToolbar } from '../components/toolbar/TopToolbar';
import { ToolsPanel } from '../components/toolbar/ToolsPanel';
import { PropertiesPanel } from '../components/panels/PropertiesPanel';
import { DrawingArea } from '../components/canvas/DrawingArea';
import { useDrawing } from '../hooks/useDrawing';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #e1e1e1',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    transition: 'width 0.3s ease',
  },
  leftPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px',
    borderBottom: '1px solid #e1e1e1',
    backgroundColor: '#f5f5f5',
    height: '60px',
  },
  leftPanelTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#323130',
  },
  leftPanelContent: {
    flex: 1,
    overflow: 'auto',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  drawingArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  messageBar: {
    borderTop: '1px solid #e1e1e1',
    backgroundColor: '#ffffff',
    padding: '4px 8px',
    fontSize: '11px',
    minHeight: '28px',
    display: 'flex',
    alignItems: 'center',
    '& .fui-MessageBar': {
      width: '100%',
      minHeight: 'unset',
      padding: '0',
      border: 'none',
    },
    '& .fui-MessageBarBody': {
      fontSize: '11px',
      padding: '0',
    },
  },
});

export const HvacDesignerPage: React.FC = () => {
  const styles = useStyles();
  const { graphicId } = useParams<{ graphicId?: string }>();
  const { loadDrawing: loadDrawingFromDB, createNew, isLoading, error } = useDrawing();
  const [showMessageBar, setShowMessageBar] = useState(true);
  const [message, setMessage] = useState('Ready');
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(115); // Default width

  useEffect(() => {
    if (graphicId) {
      // Load existing drawing
      loadDrawingFromDB(graphicId).catch((err) => {
        console.error('Failed to load drawing:', err);
      });
    } else {
      // Create new drawing
      createNew();
    }
  }, [graphicId]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner label="Loading drawing..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <Text size={500} weight="semibold">Failed to load drawing</Text>
        <Text>{error}</Text>
      </div>
    );
  }

  const toggleLeftPanel = () => {
    setIsLeftPanelCollapsed(!isLeftPanelCollapsed);
  };

  return (
    <div className={styles.container}>
      {/* Left Panel - Tools with collapsible header */}
      <div
        className={styles.leftPanel}
        style={{
          width: isLeftPanelCollapsed ? '0px' : `${leftPanelWidth}px`,
        }}
      >
        {!isLeftPanelCollapsed && (
          <>
            {/* Left Panel Header */}
            <div className={styles.leftPanelHeader}>
              <span className={styles.leftPanelTitle}>T3 Hvac</span>
              <Button
                appearance="subtle"
                size="small"
                icon={<NavigationRegular />}
                onClick={toggleLeftPanel}
                title="Collapse panel"
              />
            </div>

            {/* Left Panel Content */}
            <div className={styles.leftPanelContent}>
              <ToolsPanel />
            </div>
          </>
        )}
      </div>

      {/* Expand button when collapsed */}
      {isLeftPanelCollapsed && (
        <div
          style={{
            width: '24px',
            borderRight: '1px solid #e1e1e1',
            backgroundColor: '#fafafa',
            display: 'flex',
            alignItems: 'flex-start',
            paddingTop: '8px',
          }}
        >
          <Button
            appearance="subtle"
            size="small"
            icon={<NavigationRegular />}
            onClick={toggleLeftPanel}
            title="Expand panel"
          />
        </div>
      )}

      {/* Right Panel - Main work area */}
      <div className={styles.rightPanel}>
        {/* Top Bar - Toolbar (2 rows) */}
        <TopToolbar />

        {/* Drawing Area */}
        <div className={styles.drawingArea}>
          <DrawingArea />
        </div>

        {/* Bottom Message Bar */}
        {showMessageBar && (
          <div className={styles.messageBar}>
            <MessageBar intent="info">
              <MessageBarBody>{message}</MessageBarBody>
            </MessageBar>
          </div>
        )}
      </div>
    </div>
  );
};
