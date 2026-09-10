/**
 * Documentation Page
 * Main layout with sidebar, breadcrumb, and content area
 */

import React, { useState } from 'react';
import { DocSidebar, DocContent, DocBreadcrumb } from '../components';
import { useDocNavigation } from '../hooks/useDocNavigation';
import { docStructure } from '../utils/docStructure';
import styles from './DocumentationPage.module.css';

export const DocumentationPage: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    currentPath,
    navigateToDoc,
    toggleSection,
    isSectionExpanded,
  } = useDocNavigation();

  // Get all expanded sections as a Set.
  // Derived from docStructure so a new navigation section is expandable without
  // also having to edit a hard-coded list here.
  const expandedSections = new Set(
    docStructure
      .map((section) => section.title)
      .filter((title) => isSectionExpanded(title))
  );

  return (
    <div className={styles.container}>
      <DocSidebar
        currentPath={currentPath}
        onNavigate={navigateToDoc}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <div className={styles.main}>
        <DocBreadcrumb currentPath={currentPath} onNavigate={navigateToDoc} />
        <DocContent path={currentPath} onNavigate={navigateToDoc} />
      </div>
    </div>
  );
};
