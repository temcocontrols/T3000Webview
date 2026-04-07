/**
 * Tstat10SimulatorPage — Desktop layout for the Tstat10 simulator.
 * 3-panel layout: Left (simulator), Middle (debug), Right (register browser).
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ThermostatBezel } from '../components/ThermostatBezel';
import { LcdContainer } from '../components/LcdContainer';
import { ThermostatDisplay } from '../components/ThermostatDisplay';
import { NetworkSettingsMenu } from '../components/NetworkSettingsMenu';
import { DebugPanel } from '../components/DebugPanel';
import { useSimulatorState } from '../hooks/useSimulatorState';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import simStyles from '../styles/simulator.module.css';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  leftPanel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 8px',
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
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    flex: 1,
    minWidth: 0,
    height: '100%',
    overflowY: 'auto',
  },
  rightTitle: {
    fontWeight: 600,
    fontSize: '14px',
    color: tokens.colorNeutralForeground1,
    marginBottom: '8px',
  },
  rightPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
    gap: '8px',
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: '8px',
    padding: '24px',
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
    fontSize: '14px',
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
    padding: '5px 8px',
    fontSize: '13px',
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
});

export const Tstat10SimulatorPage: React.FC = () => {
  const styles = useStyles();
  const sim = useSimulatorState();
  const leftRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
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
  }, []);

  const [showGrid, setShowGrid] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [lastEvent, setLastEvent] = useState('');
  const [simulatedKeypad, setSimulatedKeypad] = useState(false);
  const [showRedbox, setShowRedbox] = useState(false);
  const [showKeypadDebug, setShowKeypadDebug] = useState(false);
  const [redboxCoords, setRedboxCoords] = useState({ x: 1, y: 3 });
  const [editMode, setEditMode] = useState(false);

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

  // Simulated Keypad auto-tester: ArrowRight every 3s, then ArrowUp every 3s
  const simKeypadRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simKeypadPhase = useRef<'right' | 'up'>('right');

  useEffect(() => {
    if (simulatedKeypad) {
      simKeypadPhase.current = 'right';
      simKeypadRef.current = setInterval(() => {
        const dir = simKeypadPhase.current;
        setLastEvent(`Arrow${dir === 'right' ? 'Right' : 'Up'}`);
        if (sim.screen === 'settings') {
          sim.navigateMenu(dir);
        }
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
      if (sim.screen === 'settings') {
        sim.navigateMenu(direction);
      }
    },
    [sim],
  );

  const { handleButtonPress } = useKeyboardNavigation({
    onNavigate: handleNavigate,
    onToggleDrift: sim.toggleDrift,
    onMoveRedbox: showRedbox ? handleMoveRedbox : undefined,
    enabled: true,
  });

  return (
    <div className={styles.root}>
      {/* Left Panel — Simulator */}
      <div className={styles.leftPanel} ref={leftRef}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
            <ThermostatBezel onButtonPress={handleButtonPress}>
              <LcdContainer>
                {sim.screen === 'main' ? (
                  <ThermostatDisplay
                    data={sim.data}
                    onNavigateToSettings={() => sim.setScreen('settings')}
                  />
                ) : (
                  <NetworkSettingsMenu
                    menuRows={sim.menuRows}
                    focusedIndex={sim.focusedIndex}
                    menuStyles={sim.menuStyles}
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
          focusedRow={sim.menuRows[sim.focusedIndex]}
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
            <button className={styles.opsBtn} onClick={() => {
              const data = { menuRows: sim.menuRows, screen: sim.screen, data: sim.data };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'tstat10-config.json'; a.click();
              URL.revokeObjectURL(url);
            }}>Export JSON</button>
            <button className={styles.opsBtn}>Sync Device</button>
            <button className={styles.opsBtn} onClick={() => setEditMode(m => !m)}>
              {editMode ? 'View Mode' : 'Edit Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel — Register Browser (placeholder) */}
      <div className={`${styles.rightPanel} ${simStyles.thinScroll}`} />
    </div>
  );
};

export default Tstat10SimulatorPage;
