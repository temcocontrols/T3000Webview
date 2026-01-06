/**
 * Hook to manage documentation navigation state
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
    new Set(['Quick Start'])
  );

  // Auto-expand section based on current path
  useEffect(() => {
    const pathFromUrl = getDocPathFromUrl();
    setCurrentPath(pathFromUrl);

    // Auto-expand the section containing the current page
    if (pathFromUrl.includes('quick-start')) {
      setExpandedSections(prev => new Set(prev).add('Quick Start'));
    } else if (pathFromUrl.includes('device-management')) {
      setExpandedSections(prev => new Set(prev).add('Device Management'));
    } else if (pathFromUrl.includes('data-points')) {
      setExpandedSections(prev => new Set(prev).add('Data Points'));
    } else if (pathFromUrl.includes('features')) {
      setExpandedSections(prev => new Set(prev).add('Features'));
    } else if (pathFromUrl.includes('api-reference')) {
      setExpandedSections(prev => new Set(prev).add('API Reference'));
    } else if (pathFromUrl.includes('guides')) {
      setExpandedSections(prev => new Set(prev).add('Guides'));
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
