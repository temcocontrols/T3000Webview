/**
 * Tstat10 Simulator State Hook
 * Manages thermostat data (temperature, setpoint, humidity, modbus, baud)
 * and network settings menu state.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import menuData from '../data/menuNetworkSettings.json';

/** Thermostat sensor/display data */
export interface Tstat10Data {
  temp: number;
  stp: number;
  hum: number;
  modbus: number;
  baud: number;
}

/** A single menu row widget from the JSON config */
export interface MenuRowWidget {
  type: 'menu_row';
  id: string;
  label: string;
  register: number;
  value: string | number;
  options?: (string | number)[];
  maxValue?: number;
  is_focused?: boolean;
}

export type ScreenMode = 'main' | 'settings';

const DEFAULT_DATA: Tstat10Data = {
  stp: 15.5,
  temp: 23.3,
  hum: 45,
  modbus: 133,
  baud: 115200,
};

export function useSimulatorState() {
  const [data, setData] = useState<Tstat10Data>(DEFAULT_DATA);
  const [screen, setScreen] = useState<ScreenMode>('settings');
  const [driftEnabled, setDriftEnabled] = useState(false);
  const driftRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Network settings menu state
  const [menuRows, setMenuRows] = useState<MenuRowWidget[]>(() => {
    const rows = (menuData.widgets as any[])
      .filter((w) => w.type === 'menu_row')
      .reverse() as MenuRowWidget[];
    // Sort numeric options ascending
    return rows.map((row) => {
      if (Array.isArray(row.options) && row.options.every((v) => typeof v === 'number')) {
        return { ...row, options: [...row.options].sort((a, b) => (a as number) - (b as number)) };
      }
      return { ...row };
    });
  });
  const [focusedIndex, setFocusedIndex] = useState(0);

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
        // Start drift
        driftRef.current = setInterval(() => {
          setData((d) => ({
            ...d,
            temp: parseFloat((d.temp + (Math.random() * 0.4 - 0.2)).toFixed(1)),
          }));
        }, 2000);
      } else {
        // Stop drift
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

  /** Reset simulator to defaults */
  const reset = useCallback(() => {
    setData(DEFAULT_DATA);
    setScreen('settings');
    setFocusedIndex(0);
    if (driftRef.current) {
      clearInterval(driftRef.current);
      driftRef.current = null;
    }
    setDriftEnabled(false);
    // Re-init menu rows from JSON
    const rows = (menuData.widgets as any[])
      .filter((w) => w.type === 'menu_row')
      .reverse() as MenuRowWidget[];
    setMenuRows(
      rows.map((row) => {
        if (Array.isArray(row.options) && row.options.every((v) => typeof v === 'number')) {
          return { ...row, options: [...row.options].sort((a, b) => (a as number) - (b as number)) };
        }
        return { ...row };
      }),
    );
  }, []);

  /** Navigate menu: move focus left/right, change value up/down */
  const navigateMenu = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      if (direction === 'right') {
        setFocusedIndex((prev) => (prev + 1) % menuRows.length);
      } else if (direction === 'left') {
        setFocusedIndex((prev) => (prev - 1 + menuRows.length) % menuRows.length);
      } else if (direction === 'up' || direction === 'down') {
        setMenuRows((rows) => {
          const newRows = [...rows];
          const row = { ...newRows[focusedIndex] };

          if (row.options) {
            let currentIdx = row.options.indexOf(row.value);
            if (currentIdx === -1) currentIdx = 0;
            if (direction === 'up') {
              if (currentIdx < row.options.length - 1) currentIdx++;
            } else {
              if (currentIdx > 0) currentIdx--;
            }
            row.value = row.options[currentIdx];
          } else if (row.id === 'ui_item_addr') {
            let v = Number(row.value) || 1;
            const maxVal = row.maxValue || 247;
            if (direction === 'up') v = Math.min(v + 1, maxVal);
            else v = Math.max(v - 1, 1);
            row.value = v;
          }

          newRows[focusedIndex] = row;
          return newRows;
        });
      }
    },
    [focusedIndex, menuRows.length],
  );

  return {
    data,
    screen,
    setScreen,
    driftEnabled,
    toggleDrift,
    reset,
    updateUI,
    // Settings menu
    menuRows,
    focusedIndex,
    navigateMenu,
    menuStyles: menuData.styles,
  };
}
