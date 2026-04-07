/**
 * Tstat10SimulatorPageMobile — Mobile-optimized layout for the Tstat10 simulator.
 * Scales the LCD to fit viewport, uses large touch-friendly buttons,
 * and collapses debug panel into an expandable section.
 */

import React, { useState, useCallback } from 'react';
import { LcdContainer } from '../../../../t3-react/features/tstat10-simulator/components/LcdContainer';
import { ThermostatDisplay } from '../../../../t3-react/features/tstat10-simulator/components/ThermostatDisplay';
import { NetworkSettingsMenu } from '../../../../t3-react/features/tstat10-simulator/components/NetworkSettingsMenu';
import { DebugPanel } from '../../../../t3-react/features/tstat10-simulator/components/DebugPanel';
import { useSimulatorState } from '../../../../t3-react/features/tstat10-simulator/hooks/useSimulatorState';
import { useKeyboardNavigation } from '../../../../t3-react/features/tstat10-simulator/hooks/useKeyboardNavigation';
import simStyles from '../../../../t3-react/features/tstat10-simulator/styles/simulator.module.css';

export const Tstat10SimulatorPageMobile: React.FC = () => {
  const sim = useSimulatorState();

  const [showGrid, setShowGrid] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [lastEvent, setLastEvent] = useState('');

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
    enabled: true,
  });

  return (
    <div className={simStyles.simulatorWrapperMobile}>
      <div className={simStyles.mobileBezel}>
        <LcdContainer mobile>
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
      </div>

      {/* Touch-friendly directional buttons */}
      <div className={simStyles.mobileButtons}>
        <button className={simStyles.mobileHwBtn} onClick={() => handleButtonPress('left')} aria-label="Left">
          ◀
        </button>
        <button className={simStyles.mobileHwBtn} onClick={() => handleButtonPress('down')} aria-label="Down">
          ▼
        </button>
        <button className={simStyles.mobileHwBtn} onClick={() => handleButtonPress('up')} aria-label="Up">
          ▲
        </button>
        <button className={simStyles.mobileHwBtn} onClick={() => handleButtonPress('right')} aria-label="Right">
          ▶
        </button>
      </div>

      {/* Collapsible debug section */}
      <div className={simStyles.mobileDebugWrapper}>
        <button
          onClick={() => setShowDebug((v) => !v)}
          className={simStyles.mobileDebugToggle}
        >
          {showDebug ? '▾ Debug Panel' : '▸ Debug Panel'}
        </button>
        {showDebug && (
          <div className={simStyles.mobileDebugContent}>
            <DebugPanel
              mobile
              showGrid={showGrid}
              onToggleGrid={setShowGrid}
              showCoords={showCoords}
              onToggleCoords={setShowCoords}
              driftEnabled={sim.driftEnabled}
              onToggleDrift={sim.toggleDrift}
              onReset={sim.reset}
              focusedRow={sim.menuRows[sim.focusedIndex]}
              lastEvent={lastEvent}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Tstat10SimulatorPageMobile;
