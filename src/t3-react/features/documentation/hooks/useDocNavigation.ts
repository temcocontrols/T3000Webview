/**
 * Hook to manage documentation navigation state
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { docStructure } from '../utils/docStructure';

export function useDocNavigation(initialPath: string = 't3000/quick-start/overview') {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract doc path from URL
  const getDocPathFromUrl = useCallback(() => {
    const match = location.pathname.match(/\/t3000\/documentation\/(.*)/);
    if (match && match[1]) {
      // Ensure path starts with t3000/ if it doesn't already
      const path = match[1];
      return path.startsWith('t3000/') ? path : `t3000/${path}`;
    }
    return initialPath;
  }, [location.pathname, initialPath]);

  const [currentPath, setCurrentPath] = useState<string>(getDocPathFromUrl());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Shared DB'])
  );

  // Auto-expand the section that contains the current page. Resolved from
  // docStructure so every section (including newly added ones) is covered.
  useEffect(() => {
    const pathFromUrl = getDocPathFromUrl();
    setCurrentPath(pathFromUrl);

    const containingSection = docStructure.find((section) =>
      section.items.some(
        (item) =>
          pathFromUrl === item.path || pathFromUrl.startsWith(item.path + '/')
      )
    );

    if (containingSection) {
      setExpandedSections((prev) =>
        prev.has(containingSection.title)
          ? prev
          : new Set(prev).add(containingSection.title)
      );
    }
  }, [getDocPathFromUrl]);

  const navigateToDoc = useCallback((path: string) => {
    setCurrentPath(path);
    // Update URL without the 't3000/' prefix since route already has it
    const urlPath = path.replace(/^t3000\//, '');
    navigate(`/t3000/documentation/${urlPath}`);
  }, [navigate]);

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
