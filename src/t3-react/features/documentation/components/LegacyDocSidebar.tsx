/**
 * Legacy Documentation Sidebar
 * Navigation for legacy docs from /docs folder
 */

import React from 'react';
import { Text } from '@fluentui/react-components';
import {
  ChevronDownRegular,
  ChevronRightRegular,
  DocumentSearchRegular,
  CodeRegular,
  PlugConnectedRegular,
  BugRegular,
  ArrowSyncRegular,
  DatabaseRegular,
  DeveloperBoardRegular,
  BuildingRegular,
  DesignIdeasRegular,
  FolderOpenRegular,
  ArchiveRegular,
  GlobeRegular,
  DataLineRegular,
  DocumentBulletListRegular,
} from '@fluentui/react-icons';
import { legacyDocsStructure, type LegacyDocSection } from '../utils/legacyDocsStructure';
import styles from './LegacyDocSidebar.module.css';

interface LegacyDocSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  expandedSections: Set<string>;
  onToggleSection: (folder: string) => void;
}

// Icon mapping
const iconMap: Record<string, React.ReactElement> = {
  DocumentSearch: <DocumentSearchRegular />,
  Code: <CodeRegular />,
  PlugConnected: <PlugConnectedRegular />,
  Bug: <BugRegular />,
  Flow: <ArrowSyncRegular />,
  Database: <DatabaseRegular />,
  DeveloperBoard: <DeveloperBoardRegular />,
  BuildingFactory: <BuildingRegular />,
  Design: <DesignIdeasRegular />,
  FolderOpen: <FolderOpenRegular />,
  Archive: <ArchiveRegular />,
  Globe: <GlobeRegular />,
  LineChart: <DataLineRegular />,
  DocumentBulletList: <DocumentBulletListRegular />,
};

export const LegacyDocSidebar: React.FC<LegacyDocSidebarProps> = ({
  currentPath,
  onNavigate,
  expandedSections,
  onToggleSection,
}) => {
  const renderSection = (section: LegacyDocSection) => {
    const isExpanded = expandedSections.has(section.folder);
    const hasItems = section.items && section.items.length > 0;

    return (
      <div key={section.folder} className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => onToggleSection(section.folder)}
          disabled={!hasItems}
        >
          {hasItems ? (
            isExpanded ? (
              <ChevronDownRegular className={styles.chevron} />
            ) : (
              <ChevronRightRegular className={styles.chevron} />
            )
          ) : (
            <div className={styles.chevronPlaceholder} />
          )}

          {section.icon && (
            <span className={styles.sectionIcon}>
              {iconMap[section.icon] || <DocumentSearchRegular />}
            </span>
          )}

          <Text weight="semibold" size={200} className={styles.sectionTitle}>
            {section.title}
          </Text>

          {hasItems && (
            <span className={styles.itemCount}>({section.items.length})</span>
          )}
        </button>

        {isExpanded && hasItems && (
          <div className={styles.items}>
            {section.items.map((item) => {
              const isActive = currentPath === `legacy/${item.path}`;

              return (
                <button
                  key={item.path}
                  className={`${styles.item} ${isActive ? styles.active : ''}`}
                  onClick={() => onNavigate(`legacy/${item.path}`)}
                  title={item.title}
                >
                  <Text size={200} className={styles.itemText}>{item.title}</Text>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text weight="semibold" size={300}>Legacy Documentation</Text>
        <Text size={100} className={styles.subtitle}>Technical & Historical Docs</Text>
      </div>

      <nav className={styles.nav}>
        {legacyDocsStructure
          .filter(section => !section.collapsed || section.items.length > 0)
          .map(renderSection)}
      </nav>
    </div>
  );
};
