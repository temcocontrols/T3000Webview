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

const BEZEL_WIDTH = 400;
const BEZEL_HEIGHT = 620;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  leftPanel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    width: '440px',
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
  },
  middlePanel: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    width: '280px',
    flexShrink: 0,
    height: '100%',
    overflowY: 'auto',
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
});

export const Tstat10SimulatorPage: React.FC = () => {
  const styles = useStyles();
  const sim = useSimulatorState();
  const leftRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = leftRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height - 16;
      const w = entry.contentRect.width - 16;
      const s = Math.min(1, h / BEZEL_HEIGHT, w / BEZEL_WIDTH);
      setScale(Math.max(0.3, s));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [showGrid, setShowGrid] = useState(true);
  const [showCoords, setShowCoords] = useState(false);
  const [lastEvent, setLastEvent] = useState('');
  const [simulatedKeypad, setSimulatedKeypad] = useState(false);
  const [showRedbox, setShowRedbox] = useState(false);
  const [showKeypadDebug, setShowKeypadDebug] = useState(true);

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
    enabled: true,
  });

  return (
    <div className={styles.root}>
      {/* Left Panel — Simulator */}
      <div className={styles.leftPanel} ref={leftRef}>
        <div
          style={{
            width: BEZEL_WIDTH * scale,
            height: BEZEL_HEIGHT * scale,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: BEZEL_WIDTH,
              height: BEZEL_HEIGHT,
            }}
          >
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
                  />
                )}
              </LcdContainer>
            </ThermostatBezel>
          </div>
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
          redboxCoords={{ x: 1, y: 3 }}
          showKeypadDebug={showKeypadDebug}
          onToggleKeypadDebug={setShowKeypadDebug}
        />
      </div>

      {/* Right Panel — Register Browser (placeholder) */}
      <div className={`${styles.rightPanel} ${simStyles.thinScroll}`} />
    </div>
  );
};

export default Tstat10SimulatorPage;
