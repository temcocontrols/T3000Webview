/**
 * Tstat10 Simulator State Hook
 * Manages thermostat data, 7-screen navigation, and menu state.
 * Follows the Tstat10_Simulator prototype screen structure.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import rs485Data from '../data/menuNetworkSettings.json';
import setupData from '../data/menuSetup.json';
import wifiData from '../data/menuWifiSetup.json';
import clockData from '../data/menuClockSetup.json';
import oatData from '../data/menuOatSetup.json';
import tbdData from '../data/menuTbdSetup.json';

/** Thermostat sensor/display data */
export interface Tstat10Data {
  temp: number;
  stp: number;
  hum: number;
  modbus: number;
  baud: number;
  fan: string;
  sys: string;
}

/** A single menu row widget from the JSON config */
export interface MenuRowWidget {
  type: 'menu_row';
  id: string;
  label: string;
  register?: number;
  value?: string | number;
  options?: (string | number)[];
  maxValue?: number;
  is_focused?: boolean;
  navigateTo?: string;
  lcdRow?: number;
}

export type ScreenMode = 'main' | 'setup' | 'wifi' | 'rs485' | 'clock' | 'oat' | 'tbd';

const SCREEN_LABELS: Record<ScreenMode, string> = {
  main: 'Main Display',
  setup: 'Setup Menu',
  wifi: 'WiFi Setup',
  rs485: 'RS485 Settings',
  clock: 'Clock Setup',
  oat: 'Outside Air Temp',
  tbd: 'To Be Done',
};

const DEFAULT_DATA: Tstat10Data = {
  stp: 22.0,
  temp: 22.4,
  hum: 45,
  modbus: 133,
  baud: 115200,
  fan: 'AUTO',
  sys: 'AUTO',
};

/** Main display row configs for SET/FAN/SYS navigation */
interface MainRowConfig {
  field: keyof Tstat10Data;
  step?: number;
  min?: number;
  max?: number;
  options?: string[];
}

const MAIN_ROWS: MainRowConfig[] = [
  { field: 'stp', step: 0.5, min: 10, max: 35 },
  { field: 'fan', options: ['OFF', 'LOW', 'MED', 'HIGH', 'AUTO'] },
  { field: 'sys', options: ['OFF', 'HEAT', 'COOL', 'AUTO'] },
];

/** JSON data for each menu screen */
const SCREEN_JSON: Record<string, any> = {
  setup: setupData,
  wifi: wifiData,
  rs485: rs485Data,
  clock: clockData,
  oat: oatData,
  tbd: tbdData,
};

/** Parent screen for BACK navigation */
const SCREEN_PARENT: Partial<Record<ScreenMode, ScreenMode>> = {
  setup: 'main',
  wifi: 'setup',
  rs485: 'setup',
  clock: 'setup',
  oat: 'setup',
  tbd: 'setup',
};

function initScreenRows(): Record<string, MenuRowWidget[]> {
  const result: Record<string, MenuRowWidget[]> = {};
  for (const [key, data] of Object.entries(SCREEN_JSON)) {
    const rows = ((data as any).widgets as any[])
      .filter((w: any) => w.type === 'menu_row') as MenuRowWidget[];
    result[key] = rows.map((row) => {
      if (Array.isArray(row.options) && row.options.every((v) => typeof v === 'number')) {
        return { ...row, options: [...row.options].sort((a, b) => (a as number) - (b as number)) };
      }
      return { ...row };
    });
  }
  return result;
}

export function useSimulatorState() {
  const [data, setData] = useState<Tstat10Data>(DEFAULT_DATA);
  const [screen, setScreen] = useState<ScreenMode>('main');
  const [driftEnabled, setDriftEnabled] = useState(false);
  const driftRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Main display focus (0=SET, 1=FAN, 2=SYS)
  const [mainFocusedIndex, setMainFocusedIndex] = useState(0);

  // Menu screen rows and focus index per screen
  const [allScreenRows, setAllScreenRows] = useState<Record<string, MenuRowWidget[]>>(initScreenRows);
  const [focusIndices, setFocusIndices] = useState<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    for (const key of Object.keys(SCREEN_JSON)) result[key] = 0;
    return result;
  });

  // Derived: active menu data for current screen
  const menuRows = screen !== 'main' ? (allScreenRows[screen] || []) : [];
  const menuFocusedIndex = screen !== 'main' ? (focusIndices[screen] || 0) : 0;
  const menuTitle = screen !== 'main' ? ((SCREEN_JSON[screen] as any)?.title || SCREEN_LABELS[screen] || '') : '';
  const menuStyles = screen !== 'main' ? ((SCREEN_JSON[screen] as any)?.styles || {}) : {};

  /** Update UI from external source (C++ WebView2 bridge compatibility) */
  const updateUI = useCallback((patch: Partial<Tstat10Data>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  // Expose updateUI globally for C++ bridge compatibility
  useEffect(() => {
    (window as any).updateUI = updateUI;
    return () => {
      delete (window as any).updateUI;
    };
  }, [updateUI]);

  /** Toggle temperature drift simulation */
  const toggleDrift = useCallback(() => {
    setDriftEnabled((prev) => {
      if (!prev) {
        driftRef.current = setInterval(() => {
          setData((d) => ({
            ...d,
            temp: parseFloat((d.temp + (Math.random() * 0.4 - 0.2)).toFixed(1)),
          }));
        }, 2000);
      } else {
        if (driftRef.current) {
          clearInterval(driftRef.current);
          driftRef.current = null;
        }
      }
      return !prev;
    });
  }, []);

  // Cleanup drift on unmount
  useEffect(() => {
    return () => {
      if (driftRef.current) clearInterval(driftRef.current);
    };
  }, []);

  // --- Navigation (stable ref pattern) ---
  const navImpl = useRef<(dir: 'left' | 'right' | 'up' | 'down') => void>(() => {});

  navImpl.current = (direction) => {
    if (screen === 'main') {
      // Main display: left/right = cycle SET/FAN/SYS, up/down = change value
      if (direction === 'right') {
        setMainFocusedIndex((prev) => (prev + 1) % MAIN_ROWS.length);
      } else if (direction === 'left') {
        setMainFocusedIndex((prev) => (prev - 1 + MAIN_ROWS.length) % MAIN_ROWS.length);
      } else {
        const rowCfg = MAIN_ROWS[mainFocusedIndex];
        setData((prev) => {
          const next = { ...prev };
          if (rowCfg.step !== undefined) {
            const v = prev[rowCfg.field] as number;
            if (direction === 'up') (next as any)[rowCfg.field] = Math.min(v + rowCfg.step, rowCfg.max!);
            else (next as any)[rowCfg.field] = Math.max(v - rowCfg.step, rowCfg.min!);
          } else if (rowCfg.options) {
            const cur = String(prev[rowCfg.field]);
            let idx = rowCfg.options.indexOf(cur);
            if (idx === -1) idx = 0;
            if (direction === 'up') idx = Math.min(idx + 1, rowCfg.options.length - 1);
            else idx = Math.max(idx - 1, 0);
            (next as any)[rowCfg.field] = rowCfg.options[idx];
          }
          return next;
        });
      }
    } else if (screen === 'setup') {
      // Setup menu: up/down = move selection, right = enter sub-screen, left = back to main
      const rows = allScreenRows.setup || [];
      if (direction === 'down') {
        setFocusIndices((prev) => ({ ...prev, setup: ((prev.setup || 0) + 1) % rows.length }));
      } else if (direction === 'up') {
        setFocusIndices((prev) => ({ ...prev, setup: ((prev.setup || 0) - 1 + rows.length) % rows.length }));
      } else if (direction === 'right') {
        const focused = rows[focusIndices.setup || 0];
        if (focused?.navigateTo) {
          setScreen(focused.navigateTo as ScreenMode);
        }
      } else if (direction === 'left') {
        setScreen('main');
      }
    } else {
      // Sub-screens: right = next row, left = back to setup, up/down = change value
      const rows = allScreenRows[screen] || [];
      const idx = focusIndices[screen] || 0;
      if (direction === 'right') {
        setFocusIndices((prev) => ({ ...prev, [screen]: (idx + 1) % rows.length }));
      } else if (direction === 'left') {
        setScreen((SCREEN_PARENT[screen] || 'setup') as ScreenMode);
      } else {
        setAllScreenRows((prev) => {
          const sRows = [...(prev[screen] || [])];
          const row = { ...sRows[idx] };
          if (row.options) {
            let ci = row.options.indexOf(row.value as any);
            if (ci === -1) ci = 0;
            if (direction === 'up') ci = Math.min(ci + 1, row.options.length - 1);
            else ci = Math.max(ci - 1, 0);
            row.value = row.options[ci];
          } else if (row.maxValue !== undefined) {
            let v = Number(row.value) || 0;
            if (direction === 'up') v = Math.min(v + 1, row.maxValue);
            else v = Math.max(v - 1, 0);
            row.value = v;
          }
          sRows[idx] = row;
          return { ...prev, [screen]: sRows };
        });
      }
    }
  };

  /** Universal navigation handler (stable reference) */
  const navigate = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    navImpl.current(direction);
  }, []);

  /** Enter setup menu (triggered by long press left+right) */
  const enterSetup = useCallback(() => {
    setScreen('setup');
  }, []);

  /** Reset simulator to defaults */
  const reset = useCallback(() => {
    setData(DEFAULT_DATA);
    setScreen('main');
    setMainFocusedIndex(0);
    setFocusIndices((prev) => {
      const result: Record<string, number> = {};
      for (const key of Object.keys(prev)) result[key] = 0;
      return result;
    });
    setAllScreenRows(initScreenRows());
    if (driftRef.current) {
      clearInterval(driftRef.current);
      driftRef.current = null;
    }
    setDriftEnabled(false);
  }, []);

  return {
    data,
    screen,
    setScreen,
    mainFocusedIndex,
    menuRows,
    menuFocusedIndex,
    menuTitle,
    menuStyles,
    navigate,
    enterSetup,
    driftEnabled,
    toggleDrift,
    reset,
    updateUI,
    screenLabel: SCREEN_LABELS[screen],
  };
}
