/**
 * MobilePageContext — lets mobile feature pages register their title
 * and refresh handler with the shell's AppBar without needing MobileLayout wrapper.
 *
 * Usage in pages:  useMobilePage({ title: 'Inputs (42)', onRefresh: handleRefresh })
 * Usage in shell:  const { title, onRefresh } = useMobilePageMeta()
 */

import React, { createContext, useCallback, useContext, useState } from 'react';

interface MobilePageMeta {
  title: string;
  onRefresh?: () => void;
}

interface MobilePageContextValue {
  meta: MobilePageMeta;
  setMeta: (meta: MobilePageMeta) => void;
}

const MobilePageContext = createContext<MobilePageContextValue>({
  meta: { title: 'T3000' },
  setMeta: () => undefined,
});

export const MobilePageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meta, setMetaState] = useState<MobilePageMeta>({ title: 'T3000' });

  const setMeta = useCallback((m: MobilePageMeta) => {
    setMetaState(m);
  }, []);

  return (
    <MobilePageContext.Provider value={{ meta, setMeta }}>
      {children}
    </MobilePageContext.Provider>
  );
};

/** Shell reads this to drive the AppBar */
export const useMobilePageMeta = () => useContext(MobilePageContext).meta;

/** Pages call this to register their title + refresh handler */
export const useMobilePage = (meta: MobilePageMeta) => {
  const { setMeta } = useContext(MobilePageContext);
  React.useEffect(() => {
    setMeta(meta);
    // Reset on unmount
    return () => setMeta({ title: 'T3000' });
    // deps: only re-run when title or refresh fn identity changes
  }, [meta.title, meta.onRefresh]);
};
