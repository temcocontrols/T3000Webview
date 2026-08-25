/**
 * useEditorCommands
 * Subscribes a handler to the DesignMenuBar command bus (`t3-editor-command`).
 * Engines (HVAC, EEZ, Simulator) use this to react to File/Edit/View/Draw… items.
 */
import { useEffect } from 'react';

export function useEditorCommands(
  handler: (command: string) => void,
  deps: unknown[] = []
): void {
  useEffect(() => {
    const listener = (event: Event) => {
      const command = (event as CustomEvent).detail?.command as string | undefined;
      if (command) handler(command);
    };
    window.addEventListener('t3-editor-command', listener);
    return () => window.removeEventListener('t3-editor-command', listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Publish a status snapshot for the shared EditorStatusBar. */
export function emitEditorStatus(status: {
  name?: string;
  coords?: string;
  message?: string;
  zoom?: number;
  saved?: boolean;
}): void {
  window.dispatchEvent(new CustomEvent('t3-editor-status', { detail: status }));
}
