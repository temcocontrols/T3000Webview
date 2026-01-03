/**
 * Documentation Sidebar
 * Left navigation tree with collapsible sections
 */

import React from 'react';
import { Text, Button } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular, ChevronDoubleLeftRegular, ChevronDoubleRightRegular } from '@fluentui/react-icons';
import { docStructure } from '../utils/docStructure';
import styles from './DocSidebar.module.css';

interface DocSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  expandedSections: Set<string>;
  onToggleSection: (title: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DocSidebar: React.FC<DocSidebarProps> = ({
  currentPath,
  onNavigate,
  expandedSections,
  onToggleSection,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {!isCollapsed && <Text weight="semibold" size={400}>Documentation</Text>}
        {onToggleCollapse && (
          <button className={styles.collapseButton} onClick={onToggleCollapse} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {isCollapsed ? <ChevronDoubleRightRegular /> : <ChevronDoubleLeftRegular />}
          </button>
        )}
      </div>

      {!isCollapsed && <nav className={styles.nav}>
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
                <Text weight="semibold" size={200}>{section.title}</Text>
              </button>

              {isExpanded && (
                <div className={styles.items}>
                  {section.items.map((item) => {
                    const isActive = currentPath === item.path;

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
      </nav>}
    </div>
  );
};
