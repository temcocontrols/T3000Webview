/**
 * The command channel between the report bar and the report page.
 *
 * The bar renders above the page, so it cannot call the page's functions directly. The page
 * registers its handlers here and publishes what the bar needs to enable or disable a button;
 * the bar reads both. Kept in React context rather than a window event so the types are checked
 * and nothing has to be unsubscribed by hand.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface ReportCommandHandlers {
  capture: () => void;
  copyShot: () => void;
  check: () => void;
  draft: () => void;
  clearShots: () => void;
  toggleDetails: () => void;
  aiSettings: () => void;
}

export interface ReportCommandState {
  hasScreenshots: boolean;
  busy: boolean;
  canDraft: boolean;
  detailsOpen: boolean;
  insideT3000: boolean;
}

interface ReportCommandChannel {
  state: ReportCommandState;
  /** Latest handlers; a ref so updating them never re-renders the bar. */
  handlers: React.MutableRefObject<ReportCommandHandlers | null>;
  publish: (patch: Partial<ReportCommandState>) => void;
  register: (handlers: ReportCommandHandlers) => void;
}

const INITIAL: ReportCommandState = {
  hasScreenshots: false,
  busy: false,
  canDraft: false,
  detailsOpen: false,
  insideT3000: false,
};

const ReportCommandsContext = createContext<ReportCommandChannel | null>(null);

/*
 * The application menu bar renders above the layout, outside the provider, so its Report menu
 * cannot read the context. The provider mirrors the mounted page's handlers here; when no report
 * page is mounted a command is simply a no-op.
 */
let mountedHandlers: ReportCommandHandlers | null = null;

export function runReportCommand(name: keyof ReportCommandHandlers): void {
  mountedHandlers?.[name]();
}

export const ReportCommandsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ReportCommandState>(INITIAL);
  const handlers = useRef<ReportCommandHandlers | null>(null);

  const publish = useCallback((patch: Partial<ReportCommandState>) => {
    setState((previous) => ({ ...previous, ...patch }));
  }, []);

  const register = useCallback((next: ReportCommandHandlers) => {
    handlers.current = next;
    mountedHandlers = next;
  }, []);

  useEffect(
    () => () => {
      mountedHandlers = null;
    },
    []
  );

  const value = useMemo<ReportCommandChannel>(
    () => ({ state, handlers, publish, register }),
    [state, publish, register]
  );

  return <ReportCommandsContext.Provider value={value}>{children}</ReportCommandsContext.Provider>;
};

export function useReportCommands(): ReportCommandChannel {
  const channel = useContext(ReportCommandsContext);
  if (!channel) {
    throw new Error('useReportCommands must be used inside <ReportCommandsProvider>');
  }
  return channel;
}
