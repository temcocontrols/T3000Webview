/**
 * HVAC Designer Page
 * Main page for HVAC drawing editor
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hvac from '@/lib/t3-hvac';
import T3Gv from '@/lib/t3-hvac/Data/T3Gv';
import {
  Spinner,
  Text,
  MessageBar,
  MessageBarBody,
  makeStyles
} from '@fluentui/react-components';
import { CheckmarkCircle16Regular } from '@fluentui/react-icons';
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
    display: 'flex',
    flexDirection: 'column',
  },
  messageBar: {
    borderTop: '1px solid #e1e1e1',
    backgroundColor: '#ffffff',
    padding: '2px 8px',
    fontSize: '11px',
    minHeight: '24px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    '& .fui-MessageBar': {
      width: '100%',
      minHeight: 'unset',
      padding: '0 4px',
      border: 'none',
      backgroundColor: 'transparent',
    },
    '& .fui-MessageBarBody': {
      fontSize: '11px',
      padding: '0',
      gap: '0',
    },
    '& .fui-MessageBar__icon': {
      display: 'none',
    },
  },
});

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export const HvacDesignerPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { graphicId } = useParams<{ graphicId?: string }>();
  const { loadDrawing: loadDrawingFromDB, createNew, isLoading, error } = useDrawing();
  const [showMessageBar, setShowMessageBar] = useState(true);
  const [message, setMessage] = useState('Drawing editor initialized. Select a tool or shape to get started.');
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  // Initialize HVAC UI system once when page mounts
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setMessage('Initializing...');
        await delay(0); // yield to render

        // Clear residual SVG from Strict Mode remount — must clear ALL
        // SVG containers: #svg-area AND the ruler divs. SetUpRulers
        // creates new SVG elements inside h-ruler/v-ruler on each mount.
        document.getElementById('svg-area')?.replaceChildren();
        document.getElementById('h-ruler')?.replaceChildren();
        document.getElementById('v-ruler')?.replaceChildren();

        if (cancelled) return;
        setMessage('Loading HVAC engine...');
        await delay(0);
        Hvac.UI.Initialize(null);

        if (cancelled) return;
        setMessage('Starting page...');
        await delay(0);
        Hvac.IdxPageReact.initQuasar(null);
        Hvac.IdxPageReact.initPageReact();

        if (cancelled) return;
        setMessage('Rendering layout...');
        await delay(0);

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

        if (cancelled) return;
        setMessage('Drawing editor initialized. Select a tool or shape to get started.');
      } catch (err) {
        console.error('[HvacDesigner] Init failed:', err);
        setMessage(`Init error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    init();

    return () => {
      cancelled = true;
      try {
        Hvac.IdxPageReact.clearAutoSaveInterval();
        Hvac.IdxPageReact.clearIdx();
      } catch { /* ignore cleanup errors */ }
    };
  }, []);

  // Recalculate layout when left panel toggles
  useEffect(() => {
    setTimeout(() => {
      try {
        const svgDoc = T3Gv?.docUtil?.svgDoc;
        if (svgDoc && svgDoc.docInfo) {
          svgDoc.CalcWorkArea();
          svgDoc.ApplyDocumentTransform();
          if (T3Gv.docUtil) T3Gv.docUtil.HandleResizeEvent();
        }
      } catch { /* ignore */ }
    }, 50);
  }, [isLeftPanelCollapsed]);

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

          {/* Right Workspace - Drawing Area + Message Bar */}
          <div id="work-area" className={styles.drawingArea}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <HvacDrawingArea />
            </div>
            {showMessageBar && (
              <div className={styles.messageBar}>
                <MessageBar intent="success">
                  <MessageBarBody>
                    <CheckmarkCircle16Regular style={{ marginRight: 6, fontSize: 14, flexShrink: 0, alignSelf: 'center' }} />
                    {message}
                  </MessageBarBody>
                </MessageBar>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
