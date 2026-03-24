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

  // Keep latest onRefresh in a ref so we never need it as an effect dep
  const onRefreshRef = React.useRef(meta.onRefresh);
  React.useLayoutEffect(() => {
    onRefreshRef.current = meta.onRefresh;
  });

  React.useEffect(() => {
    // Wrap in a stable callback that always delegates to the latest ref value
    const stableRefresh = meta.onRefresh
      ? () => onRefreshRef.current?.()
      : undefined;
    setMeta({ title: meta.title, onRefresh: stableRefresh });
    return () => setMeta({ title: 'T3000' });
  // Only re-run when the title changes (or setMeta, which is stable)
  }, [meta.title, setMeta]);
};
