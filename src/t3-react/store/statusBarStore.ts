/**
 * Status Bar Store
 *
 * Zustand store for managing status bar state
 */

import { create } from 'zustand';

export interface StatusBarState {
  // RX/TX statistics
  rxCount: number;
  txCount: number;

  // Connection info
  buildingName: string;
  deviceName: string;

  // Protocol info
  protocol: string;
  connectionType: string;

  // Status message
  message: string;

  // Actions
  incrementRx: () => void;
  incrementTx: () => void;
  setRxTx: (rx: number, tx: number) => void;
  setConnection: (building: string, device: string) => void;
  setProtocol: (protocol: string, connectionType: string) => void;
  setMessage: (message: string) => void;
  reset: () => void;
}

export const useStatusBarStore = create<StatusBarState>((set) => ({
  // Initial state
  rxCount: 0,
  txCount: 0,
  buildingName: '',
  deviceName: '',
  protocol: '',
  connectionType: '',
  message: 'Ready',

  // Actions
  incrementRx: () => set((state) => ({ rxCount: state.rxCount + 1 })),
  incrementTx: () => set((state) => ({ txCount: state.txCount + 1 })),
  setRxTx: (rx, tx) => set({ rxCount: rx, txCount: tx }),
  setConnection: (building, device) => set({ buildingName: building, deviceName: device }),
  setProtocol: (protocol, connectionType) => set({ protocol, connectionType }),
  setMessage: (message) => set({ message }),
  reset: () => set({
    rxCount: 0,
    txCount: 0,
    buildingName: '',
    deviceName: '',
    protocol: '',
    connectionType: '',
    message: 'Ready',
  }),
}));
