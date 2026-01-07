/**
 * Documentation Page
 * Main layout with sidebar, breadcrumb, and content area
 */

import React, { useState } from 'react';
import { DocSidebar, DocContent, DocBreadcrumb } from '../components';
import { useDocNavigation } from '../hooks/useDocNavigation';
import styles from './DocumentationPage.module.css';

export const DocumentationPage: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    currentPath,
    navigateToDoc,
    toggleSection,
    isSectionExpanded,
  } = useDocNavigation();

  // Get all expanded sections as a Set
  const expandedSections = new Set(
    ['Quick Start', 'Device Management', 'Data Points', 'Features', 'API Reference', 'Guides', 'Building Platform'].filter(
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
