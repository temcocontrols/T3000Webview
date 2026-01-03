/**
 * Hook to manage documentation navigation state
 */

import { useState, useCallback } from 'react';

export function useDocNavigation(initialPath: string = 'quick-start/overview') {
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Quick Start'])
  );

  const navigateToDoc = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const toggleSection = useCallback((sectionTitle: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionTitle)) {
        next.delete(sectionTitle);
      } else {
        next.add(sectionTitle);
      }
      return next;
    });
  }, []);

  const isSectionExpanded = useCallback(
    (sectionTitle: string) => {
      return expandedSections.has(sectionTitle);
    },
    [expandedSections]
  );

  return {
    currentPath,
    navigateToDoc,
    toggleSection,
    isSectionExpanded,
  };
}
