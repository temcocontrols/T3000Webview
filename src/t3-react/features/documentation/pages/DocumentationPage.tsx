/**
 * Documentation Page
 * Main layout with sidebar, breadcrumb, and content area
 */

import React from 'react';
import { DocSidebar, DocContent, DocBreadcrumb } from '../components';
import { useDocNavigation } from '../hooks/useDocNavigation';
import styles from './DocumentationPage.module.css';

export const DocumentationPage: React.FC = () => {
  const {
    currentPath,
    navigateToDoc,
    toggleSection,
    isSectionExpanded,
  } = useDocNavigation();

  // Get all expanded sections as a Set
  const expandedSections = new Set(
    ['Quick Start', 'Device Management', 'Data Points', 'Features', 'API Reference', 'Guides'].filter(
      (title) => isSectionExpanded(title)
    )
  );

  return (
    <div className={styles.container}>
      <DocSidebar
        currentPath={currentPath}
        onNavigate={navigateToDoc}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
      />

      <div className={styles.main}>
        <DocBreadcrumb currentPath={currentPath} onNavigate={navigateToDoc} />
        <DocContent path={currentPath} />
      </div>
    </div>
  );
};
