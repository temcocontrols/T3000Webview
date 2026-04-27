/**
 * CsvOperationsContext
 *
 * Global context that allows the Tools menu to trigger "Export to CSV"
 * and "Import from CSV" on whichever page is currently active.
 * Each page registers/unregisters its handlers on mount/unmount.
 */

import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';

interface CsvOperationsContextType {
  /** Register the current page's export handler */
  registerExportHandler: (handler: () => void) => void;
  /** Register the current page's import handler */
  registerImportHandler: (handler: (file: File) => Promise<void>) => void;
  /** Unregister all handlers (call on unmount) */
  unregisterHandlers: () => void;
  /** Trigger the registered export handler (called from Tools menu) */
  triggerExport: () => void;
  /** Trigger the registered import handler (called from Tools menu) */
  triggerImport: () => void;
  /** Whether an export handler is registered (page supports export) */
  isExportAvailable: boolean;
  /** Whether an import handler is registered (page supports import) */
  isImportAvailable: boolean;
}

const CsvOperationsContext = createContext<CsvOperationsContextType>({
  registerExportHandler: () => {},
  registerImportHandler: () => {},
  unregisterHandlers: () => {},
  triggerExport: () => {},
  triggerImport: () => {},
  isExportAvailable: false,
  isImportAvailable: false,
});

export const useCsvOperations = () => useContext(CsvOperationsContext);

/**
 * Hook for pages to register their CSV export/import handlers.
 * Automatically unregisters on unmount.
 */
export function useRegisterCsvHandlers(
  exportHandler?: () => void,
  importHandler?: (file: File) => Promise<void>,
) {
  const { registerExportHandler, registerImportHandler, unregisterHandlers } =
    useCsvOperations();

  useEffect(() => {
    if (exportHandler) {
      registerExportHandler(exportHandler);
    }
    if (importHandler) {
      registerImportHandler(importHandler);
    }
    return () => {
      unregisterHandlers();
    };
  }, [exportHandler, importHandler]);
}

export const CsvOperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const exportRef = useRef<(() => void) | null>(null);
  const importRef = useRef<((file: File) => Promise<void>) | null>(null);
  const [isExportAvailable, setIsExportAvailable] = useState(false);
  const [isImportAvailable, setIsImportAvailable] = useState(false);

  const registerExportHandler = useCallback((handler: () => void) => {
    exportRef.current = handler;
    setIsExportAvailable(true);
  }, []);

  const registerImportHandler = useCallback((handler: (file: File) => Promise<void>) => {
    importRef.current = handler;
    setIsImportAvailable(true);
  }, []);

  const unregisterHandlers = useCallback(() => {
    exportRef.current = null;
    importRef.current = null;
    setIsExportAvailable(false);
    setIsImportAvailable(false);
  }, []);

  const triggerExport = useCallback(() => {
    if (exportRef.current) {
      exportRef.current();
    }
  }, []);

  const triggerImport = useCallback(() => {
    if (importRef.current) {
      // Open file picker, then pass file to handler
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && importRef.current) {
          await importRef.current(file);
        }
      };
      input.click();
    }
  }, []);

  return (
    <CsvOperationsContext.Provider
      value={{
        registerExportHandler,
        registerImportHandler,
        unregisterHandlers,
        triggerExport,
        triggerImport,
        isExportAvailable,
        isImportAvailable,
      }}
    >
      {children}
    </CsvOperationsContext.Provider>
  );
};
