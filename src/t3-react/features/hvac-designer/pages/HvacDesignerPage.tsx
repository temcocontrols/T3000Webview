/**
 * HVAC Designer Page
 * Main page for HVAC drawing editor
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hvac from '@/lib/t3-hvac';
import T3Gv from '@/lib/t3-hvac/Data/T3Gv';
import UIUtil from '@/lib/t3-hvac/Opt/UI/UIUtil';
import {
  Spinner,
  Text,
  MessageBar,
  MessageBarBody,
  makeStyles
} from '@fluentui/react-components';
import { TopToolbar } from '../components/toolbar/TopToolbar';
import { ToolsPanel } from '../components/toolbar/ToolsPanel';
import { HvacDrawingArea } from '../components/HvacDrawingArea';
import { useDrawing } from '../hooks/useDrawing';

const useStyles = makeStyles({
  mainApp: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  mainPanel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  mainArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    width: '115px',
    flexShrink: 0,
    borderRight: '1px solid #e1e1e1',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  drawingArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  messageBar: {
    borderTop: '1px solid #e1e1e1',
    backgroundColor: '#ffffff',
    padding: '4px 8px',
    fontSize: '11px',
    minHeight: '28px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
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
  const navigate = useNavigate();
  const { graphicId } = useParams<{ graphicId?: string }>();
  const { loadDrawing: loadDrawingFromDB, createNew, isLoading, error } = useDrawing();
  const [showMessageBar, setShowMessageBar] = useState(true);
  const [message, setMessage] = useState('Ready');
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  // Initialize HVAC UI system once when page mounts
  useEffect(() => {
    try {
      Hvac.UI.Initialize(null);

      const svgEl = document.querySelector('#svg-area svg');
      if (!svgEl && T3Gv?.docUtil) {
        (T3Gv.docUtil as any).svgDoc = null;
        (T3Gv.docUtil as any).InitSvgArea({});
        UIUtil.InitT3GvOpt();
      }

      Hvac.IdxPageReact.initQuasar(null);
      Hvac.IdxPageReact.initPageReact();

      const refreshLayout = () => {
        try {
          const svgDoc = T3Gv?.docUtil?.svgDoc;
          if (svgDoc && svgDoc.docInfo) {
            svgDoc.CalcWorkArea();
            svgDoc.ApplyDocumentTransform();
            if (T3Gv.docUtil) T3Gv.docUtil.HandleResizeEvent();
          }
        } catch (e) { /* ignore */ }
      };
      setTimeout(refreshLayout, 150);
      setTimeout(refreshLayout, 400);

      setMessage('Ready');
    } catch (err) {
      console.error('[HvacDesigner] Init failed:', err);
      setMessage(`Init error: ${err instanceof Error ? err.message : String(err)}`);
    }

    return () => {
      try {
        Hvac.IdxPageReact.clearAutoSaveInterval();
        Hvac.IdxPageReact.clearIdx();
      } catch { /* ignore cleanup errors */ }
    };
  }, []);

  useEffect(() => {
    if (graphicId) {
      loadDrawingFromDB(graphicId).catch((err) => {
        console.error('Failed to load drawing:', err);
        setMessage('Failed to load drawing');
      });
    } else {
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

  return (
    <div id="main-app" className={styles.mainApp}>
      <div id="main-panel" className={styles.mainPanel}>
        {/* Top Bar - Toolbar (full width) */}
        <TopToolbar
          onToggleLeftPanel={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          onNavigateBack={() => navigate('/t3000')}
        />

        <div className={styles.mainArea}>
          {/* Left Panel - Tools */}
          {!isLeftPanelCollapsed && (
            <div id="left-panel" className={styles.leftPanel}>
              <ToolsPanel />
            </div>
          )}

          {/* Right Workspace - Drawing Area */}
          <div id="work-area" className={styles.drawingArea}>
            <HvacDrawingArea />
          </div>
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
