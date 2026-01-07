/**
 * Documentation Sidebar
 * Left navigation tree with collapsible sections and tab switching
 */

import React, { useState } from 'react';
import { Text, Button } from '@fluentui/react-components';
import {
  ChevronDownRegular,
  ChevronRightRegular,
  ChevronDoubleLeftRegular,
  ChevronDoubleRightRegular,
  BookRegular,
  ArchiveRegular,
  RocketRegular,
  DesktopRegular,
  DataUsageRegular,
  AppsListRegular,
  CodeRegular,
  BookOpenRegular,
  ChevronDoubleDownRegular,
  ChevronDoubleUpRegular,
} from '@fluentui/react-icons';
import { docStructure } from '../utils/docStructure';
import { legacyDocsStructure } from '../utils/legacyDocsStructure';
import { LegacyDocSidebar } from './LegacyDocSidebar';
import styles from './DocSidebar.module.css';

interface DocSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  expandedSections: Set<string>;
  onToggleSection: (title: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type DocTab = 'user-guide' | 'legacy';

export const DocSidebar: React.FC<DocSidebarProps> = ({
  currentPath,
  onNavigate,
  expandedSections,
  onToggleSection,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<DocTab>(
    currentPath.startsWith('legacy/') ? 'legacy' : 'user-guide'
  );

  const [legacyExpandedSections, setLegacyExpandedSections] = useState<Set<string>>(
    new Set(['api', 'bacnet', 'bugs'])  // Default expanded sections
  );

  const handleLegacyToggleSection = (folder: string) => {
    const newExpanded = new Set(legacyExpandedSections);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setLegacyExpandedSections(newExpanded);
  };

  // Handle expand/collapse all for user guide
  const handleExpandCollapseAll = () => {
    if (activeTab === 'user-guide') {
      // Check if all sections are expanded
      const allExpanded = docStructure.every(section => expandedSections.has(section.title));

      if (allExpanded) {
        // Collapse all
        docStructure.forEach(section => onToggleSection(section.title));
      } else {
        // Expand all
        docStructure.forEach(section => {
          if (!expandedSections.has(section.title)) {
            onToggleSection(section.title);
          }
        });
      }
    } else {
      // Legacy docs - expand/collapse all
      const allExpanded = legacyDocsStructure
        .filter(section => section.items.length > 0)
        .every(section => legacyExpandedSections.has(section.folder));

      if (allExpanded) {
        // Collapse all
        setLegacyExpandedSections(new Set());
      } else {
        // Expand all
        const allFolders = legacyDocsStructure
          .filter(section => section.items.length > 0)
          .map(section => section.folder);
        setLegacyExpandedSections(new Set(allFolders));
      }
    }
  };

  // Check if all are expanded
  const allExpanded = activeTab === 'user-guide'
    ? docStructure.every(section => expandedSections.has(section.title))
    : legacyDocsStructure
        .filter(section => section.items.length > 0)
        .every(section => legacyExpandedSections.has(section.folder));

  // Icon mapping
  const iconMap: Record<string, React.ReactElement> = {
    Rocket: <RocketRegular />,
    Desktop: <DesktopRegular />,
    DataUsage: <DataUsageRegular />,
    AppsList: <AppsListRegular />,
    Code: <CodeRegular />,
    BookOpen: <BookOpenRegular />,
  };

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {!isCollapsed && <Text weight="semibold" size={400}>Documentation</Text>}
        <div className={styles.headerButtons}>
          {!isCollapsed && (
            <button
              className={styles.expandCollapseButton}
              onClick={handleExpandCollapseAll}
              title={allExpanded ? 'Collapse all sections' : 'Expand all sections'}
            >
              {allExpanded ? <ChevronDoubleUpRegular /> : <ChevronDoubleDownRegular />}
            </button>
          )}
          {onToggleCollapse && (
            <button className={styles.collapseButton} onClick={onToggleCollapse} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {isCollapsed ? <ChevronDoubleRightRegular /> : <ChevronDoubleLeftRegular />}
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'user-guide' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('user-guide')}
          >
            <BookRegular className={styles.tabIcon} />
            <span>T3000</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'legacy' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('legacy')}
          >
            <ArchiveRegular className={styles.tabIcon} />
            <span>Legacy</span>
          </button>
        </div>
      )}

      {!isCollapsed && activeTab === 'user-guide' && (
        <nav className={styles.nav}>
          {docStructure.map((section) => {
            const isExpanded = expandedSections.has(section.title);

            return (
              <div key={section.title} className={styles.section}>
                <button
                  className={styles.sectionHeader}
                  onClick={() => onToggleSection(section.title)}
                >
                  {isExpanded ? (
                    <ChevronDownRegular className={styles.chevron} />
                  ) : (
                    <ChevronRightRegular className={styles.chevron} />
                  )}

                  {section.icon && (
                    <span className={styles.sectionIcon}>
                      {iconMap[section.icon] || <BookRegular />}
                    </span>
                  )}

                  <Text weight="semibold" size={200} className={styles.sectionTitle}>{section.title}</Text>

                  <span className={styles.itemCount}>({section.items.length})</span>
                </button>

                {isExpanded && (
                  <div className={styles.items}>
                    {section.items.map((item) => {
                      // Highlight menu item if exact match OR if current path contains key part of item path
                      const isActive = currentPath === item.path ||
                                     currentPath.startsWith(item.path + '/') ||
                                     (item.path.includes('control-messages') && currentPath.includes('control-messages'));

                      return (
                        <button
                          key={item.path}
                          className={`${styles.item} ${isActive ? styles.active : ''}`}
                          onClick={() => onNavigate(item.path)}
                        >
                          <Text size={200}>{item.title}</Text>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      )}

      {!isCollapsed && activeTab === 'legacy' && (
        <LegacyDocSidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          expandedSections={legacyExpandedSections}
          onToggleSection={handleLegacyToggleSection}
        />
      )}
    </div>
  );
};
