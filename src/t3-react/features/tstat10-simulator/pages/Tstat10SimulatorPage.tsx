/**
 * Tstat10SimulatorPage — Desktop layout for the Tstat10 simulator.
 * Design mode: Toolbox | Canvas | Properties (3-panel LCD designer)
 * View mode:   Bezel+LCD | Debug panel (2-panel simulator)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { makeStyles, tokens, ToggleButton, Tooltip } from '@fluentui/react-components';
import { EditRegular, EyeRegular } from '@fluentui/react-icons';
import { ThermostatBezel } from '../components/ThermostatBezel';
import { LcdContainer } from '../components/LcdContainer';
import { ThermostatDisplay } from '../components/ThermostatDisplay';
import { NetworkSettingsMenu } from '../components/NetworkSettingsMenu';
import { DebugPanel } from '../components/DebugPanel';
import { DesignCanvas } from '../components/DesignCanvas';
import { WidgetToolbox } from '../components/WidgetToolbox';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { PageTabs } from '../components/PageTabs';
import { useSimulatorState } from '../hooks/useSimulatorState';
import { useDesignerState } from '../hooks/useDesignerState';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import simStyles from '../styles/simulator.module.css';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  modeToggle: {
    display: 'flex',
    gap: '2px',
    flexShrink: 0,
  },
  body: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  /* --- Design mode panels --- */
  designCenter: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    padding: '12px',
    gap: '8px',
    overflowY: 'auto',
  },
  debugBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '4px 8px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  /* --- View mode panels (existing) --- */
  leftPanel: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '10px 8px',
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
  },
  middlePanel: {
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
    width: '300px',
    flexShrink: 0,
    height: '100%',
    overflowY: 'hidden',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  opsSection: {
    marginTop: '10px',
    padding: '10px 12px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  opsTitle: {
    fontWeight: 600,
    fontSize: '12px',
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground1,
    marginBottom: '2px',
  },
  opsBtnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
  },
  opsBtn: {
    padding: '4px 6px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: tokens.colorBrandForeground1,
    backgroundColor: 'transparent',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'center',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  /* --- View mode right panel --- */
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    padding: '12px',
    gap: '10px',
    overflowY: 'auto',
    height: '100%',
  },
  rpSection: {
    padding: '10px 12px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  rpTitle: {
    fontWeight: 600,
    fontSize: '13px',
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground1,
    marginBottom: '2px',
  },
  rpRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  rpLabel: {
    color: tokens.colorNeutralForeground3,
  },
  rpValue: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  rpStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground3,
  },
  rpDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
});

export const Tstat10SimulatorPage: React.FC = () => {
  const styles = useStyles();
  const sim = useSimulatorState();
  const designer = useDesignerState();
  const leftRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  /* ---------- View mode scaling ---------- */
  useEffect(() => {
    if (designer.mode !== 'view') return;
    const el = leftRef.current;
    if (!el) return;
    const BEZEL_W = 440;
    const BEZEL_H = 587;
    const observer = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height - 24;
      const w = entry.contentRect.width - 16;
      const s = Math.min(h / BEZEL_H, w / BEZEL_W, 1);
      setScale(Math.max(0.3, s));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [designer.mode]);

  /* ---------- Debug state ---------- */
  const [showGrid, setShowGrid] = useState(true);
  const [showCoords, setShowCoords] = useState(false);
  const [lastEvent, setLastEvent] = useState('');
  const [simulatedKeypad, setSimulatedKeypad] = useState(false);
  const [showRedbox, setShowRedbox] = useState(false);
  const [showKeypadDebug, setShowKeypadDebug] = useState(false);
  const [redboxCoords, setRedboxCoords] = useState({ x: 1, y: 3 });

  const NUM_COLS = 17;
  const NUM_ROWS = 10;

  const handleMoveRedbox = useCallback((direction: 'w' | 'a' | 's' | 'd') => {
    setRedboxCoords((prev) => {
      switch (direction) {
        case 'w': return { ...prev, y: Math.max(0, prev.y - 1) };
        case 's': return { ...prev, y: Math.min(NUM_ROWS - 1, prev.y + 1) };
        case 'a': return { ...prev, x: Math.max(0, prev.x - 1) };
        case 'd': return { ...prev, x: Math.min(NUM_COLS - 1, prev.x + 1) };
        default: return prev;
      }
    });
  }, []);

  /* ---------- View mode: simulated keypad ---------- */
  const simKeypadRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simKeypadPhase = useRef<'right' | 'up'>('right');

  useEffect(() => {
    if (simulatedKeypad) {
      simKeypadPhase.current = 'right';
      simKeypadRef.current = setInterval(() => {
        const dir = simKeypadPhase.current;
        setLastEvent(`Arrow${dir === 'right' ? 'Right' : 'Up'}`);
        sim.navigate(dir);
        simKeypadPhase.current = dir === 'right' ? 'up' : 'right';
      }, 3000);
    } else if (simKeypadRef.current) {
      clearInterval(simKeypadRef.current);
      simKeypadRef.current = null;
    }
    return () => {
      if (simKeypadRef.current) clearInterval(simKeypadRef.current);
    };
  }, [simulatedKeypad, sim]);

  const handleNavigate = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      setLastEvent(`Arrow${direction.charAt(0).toUpperCase() + direction.slice(1)}`);
      sim.navigate(direction);
    },
    [sim],
  );

  const { handleButtonPress } = useKeyboardNavigation({
    onNavigate: handleNavigate,
    onEnterSetup: sim.enterSetup,
    onToggleDrift: sim.toggleDrift,
    onMoveRedbox: showRedbox ? handleMoveRedbox : undefined,
    enabled: designer.mode === 'view',
  });

  /* ---------- Keyboard shortcuts for designer ---------- */
  useEffect(() => {
    if (designer.mode !== 'design') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) designer.redo();
        else designer.undo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (designer.selectedWidgetId && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          designer.removeWidget(designer.selectedWidgetId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [designer]);

  /* ---------- Sample data for the canvas preview ---------- */
  const sampleData: Record<string, any> = {
    temp: sim.data.temp,
    stp: sim.data.stp,
    hum: sim.data.hum,
    modbus: sim.data.modbus,
    baud: sim.data.baud,
    fan: sim.data.fan,
    sys: sim.data.sys,
    protocol: 'MODBUS',
  };

  /* ---------- Portal target for injecting controls into PageHeader ---------- */
  const portalTarget = document.getElementById('page-header-actions');

  /** Shared header controls rendered via portal into the PageHeader bar */
  const headerControls = portalTarget
    ? createPortal(
        <>
          <div className={styles.modeToggle}>
            <Tooltip content="Design Mode" relationship="label">
              <ToggleButton
                size="small"
                appearance="subtle"
                icon={<EditRegular />}
                checked={designer.mode === 'design'}
                onClick={() => designer.setMode('design')}
              >
                Design
              </ToggleButton>
            </Tooltip>
            <Tooltip content="View Mode" relationship="label">
              <ToggleButton
                size="small"
                appearance="subtle"
                icon={<EyeRegular />}
                checked={designer.mode === 'view'}
                onClick={() => designer.setMode('view')}
              >
                View
              </ToggleButton>
            </Tooltip>
          </div>
        </>,
        portalTarget,
      )
    : null;

  /* =================================================================
   *  DESIGN MODE
   * ================================================================= */
  if (designer.mode === 'design') {
    return (
      <div className={styles.root}>
        {headerControls}

        {/* Body: Toolbox | PageTabs | Canvas | Properties */}
        <div className={styles.body}>
          {/* Left: Widget Toolbox */}
          <WidgetToolbox
            onDragStart={(type) => designer.setDragItem({ source: 'toolbox', widgetType: type })}
          />

          {/* Page list (vertical) */}
          <PageTabs
            pages={designer.pages}
            selectedPageId={designer.selectedPageId}
            onSelectPage={designer.setSelectedPageId}
            onAddPage={designer.addPage}
            onRemovePage={designer.removePage}
            onRenamePage={designer.renamePage}
            vertical
            showGrid={showGrid}
            onShowGridChange={setShowGrid}
            showCoords={showCoords}
            onShowCoordsChange={setShowCoords}
            widgetCount={designer.currentPage.widgets.length}
          />

          {/* Center: Canvas + debug bar */}
          <div className={`${styles.designCenter} ${simStyles.thinScroll}`}>
            {/* Canvas with LcdPageRenderer underneath */}
            <DesignCanvas
              page={designer.currentPage}
              data={sampleData}
              selectedWidgetId={designer.selectedWidgetId}
              onSelectWidget={designer.setSelectedWidgetId}
              onMoveWidget={designer.moveWidget}
              onAddWidget={designer.addWidget}
              onDragEnd={() => designer.setDragItem(null)}
              showGrid={showGrid}
              showCoords={showCoords}
            />
          </div>

          {/* Right: Properties Panel */}
          <PropertiesPanel
            selectedWidget={designer.selectedWidget}
            pageStyles={designer.currentPage.styles}
            onUpdateWidget={designer.updateWidget}
            onRemoveWidget={designer.removeWidget}
            onUpdatePageStyles={designer.updatePageStyles}
            onExportJSON={designer.exportJSON}
            onImportJSON={designer.importJSON}
          />
        </div>
      </div>
    );
  }

  /* =================================================================
   *  VIEW MODE (existing simulator)
   * ================================================================= */
  return (
    <div className={styles.root}>
      {headerControls}

      <div className={styles.body}>
        {/* Left Panel — Simulator */}
        <div className={styles.leftPanel} ref={leftRef}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            <ThermostatBezel onButtonPress={handleButtonPress}>
              <LcdContainer>
                {sim.screen === 'main' ? (
                  <ThermostatDisplay
                    data={sim.data}
                    focusedIndex={sim.mainFocusedIndex}
                  />
                ) : (
                  <NetworkSettingsMenu
                    title={sim.menuTitle}
                    menuRows={sim.menuRows}
                    focusedIndex={sim.menuFocusedIndex}
                    menuStyles={sim.menuStyles}
                    isSetupMenu={sim.screen === 'setup'}
                    showGrid={showGrid}
                    showCoords={showCoords}
                    showRedbox={showRedbox}
                    redboxCoords={redboxCoords}
                  />
                )}
              </LcdContainer>
            </ThermostatBezel>
          </div>
        </div>

        {/* Middle Panel — Debug */}
        <div className={`${styles.middlePanel} ${simStyles.thinScroll}`}>
          <DebugPanel
            showGrid={showGrid}
            onToggleGrid={setShowGrid}
            showCoords={showCoords}
            onToggleCoords={setShowCoords}
            driftEnabled={sim.driftEnabled}
            onToggleDrift={sim.toggleDrift}
            onReset={sim.reset}
            focusedRow={sim.menuRows[sim.menuFocusedIndex]}
            lastEvent={lastEvent}
            simulatedKeypad={simulatedKeypad}
            onToggleSimulatedKeypad={setSimulatedKeypad}
            showRedbox={showRedbox}
            onToggleRedbox={setShowRedbox}
            redboxCoords={redboxCoords}
            showKeypadDebug={showKeypadDebug}
            onToggleKeypadDebug={setShowKeypadDebug}
          />

          {/* Operations */}
          <div className={styles.opsSection}>
            <div className={styles.opsTitle}>Operations</div>
            <div className={styles.opsBtnGrid}>
              <button className={styles.opsBtn} onClick={designer.exportJSON}>Export JSON</button>
              <button className={styles.opsBtn}>Sync Device</button>
              <button className={styles.opsBtn} onClick={() => designer.setMode('design')}>
                Edit Mode
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel — Live Registers & Info */}
        <div className={`${styles.rightPanel} ${simStyles.thinScroll}`}>
          {/* Live Registers */}
          <div className={styles.rpSection}>
            <div className={styles.rpTitle}>Live Registers</div>
            <div className={styles.rpRow}>
              <span className={styles.rpLabel}>Temperature</span>
              <span className={styles.rpValue}>{sim.data.temp.toFixed(1)}°C</span>
            </div>
            <div className={styles.rpRow}>
              <span className={styles.rpLabel}>Setpoint</span>
              <span className={styles.rpValue}>{sim.data.stp.toFixed(1)}°C</span>
            </div>
            <div className={styles.rpRow}>
              <span className={styles.rpLabel}>Humidity</span>
              <span className={styles.rpValue}>{sim.data.hum}%</span>
            </div>
            <div className={styles.rpRow}>
              <span className={styles.rpLabel}>Modbus ID</span>
              <span className={styles.rpValue}>{sim.data.modbus}</span>
            </div>
            <div className={styles.rpRow}>
              <span className={styles.rpLabel}>Baud Rate</span>
              <span className={styles.rpValue}>{sim.data.baud}</span>
            </div>
            <div className={styles.rpRow}>
              <span className={styles.rpLabel}>Fan</span>
              <span className={styles.rpValue}>{sim.data.fan}</span>
            </div>
            <div className={styles.rpRow}>
              <span className={styles.rpLabel}>System</span>
              <span className={styles.rpValue}>{sim.data.sys}</span>
            </div>
          </div>

          {/* Device Status */}
          <div className={styles.rpSection}>
            <div className={styles.rpTitle}>Device Status</div>
            <div className={styles.rpStatus}>
              <span className={styles.rpDot} style={{ backgroundColor: '#008080' }} />
              <span>Screen: {sim.screenLabel}</span>
            </div>
            <div className={styles.rpStatus}>
              <span className={styles.rpDot} style={{ backgroundColor: sim.driftEnabled ? '#e8912d' : '#a0a0a0' }} />
              <span>Drift: {sim.driftEnabled ? 'Active' : 'Off'}</span>
            </div>
            <div className={styles.rpStatus}>
              <span className={styles.rpDot} style={{ backgroundColor: lastEvent ? '#0078d4' : '#a0a0a0' }} />
              <span>Last key: {lastEvent || 'None'}</span>
            </div>
          </div>

          {/* Page Layout Summary */}
          <div className={styles.rpSection}>
            <div className={styles.rpTitle}>LCD Pages</div>
            {designer.pages.map((p) => (
              <div key={p.id} className={styles.rpRow}>
                <span className={styles.rpLabel}>{p.label}</span>
                <span className={styles.rpValue}>{p.widgets.length} widgets</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tstat10SimulatorPage;
