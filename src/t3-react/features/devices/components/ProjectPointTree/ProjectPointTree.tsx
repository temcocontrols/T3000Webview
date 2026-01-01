/**
 * ProjectPointTree Component
 *
 * Renders Project Point View tree structure:
 * Point List → System List → Devices → Point Types (with capacity indicators)
 *
 * Matches C++ Project Point View (DLG_DIALOG_BUILDING_MANAGEMENT mode)
 */

import React, { useEffect, useState } from 'react';
import {
  Tree,
  TreeItem,
  TreeItemLayout,
} from '@fluentui/react-components';
import {
  FolderRegular,
  ServerRegular,
  Checkmark20Regular,
  Dismiss20Regular,
  WrenchRegular,
  OptionsRegular,
  CircleMultipleConcentricRegular,
  DeveloperBoardRegular,
  FlowRegular,
  CalendarRegular,
  CalendarDateRegular,
  ImageRegular,
  ChartMultipleRegular,
} from '@fluentui/react-icons';
import { useLocation } from 'react-router-dom';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
import { CapacityBar } from './CapacityBar';
import styles from './ProjectPointTree.module.css';

/**
 * Get icon for point type (matching toolbar icons)
 */
const getPointTypeIcon = (pointType: string) => {
  switch (pointType) {
    case 'inputs':
      return <WrenchRegular className={styles.icon} />;
    case 'outputs':
      return <OptionsRegular className={styles.icon} />;
    case 'variables':
      return <CircleMultipleConcentricRegular className={styles.icon} />;
    case 'programs':
      return <DeveloperBoardRegular className={styles.icon} />;
    case 'pidloops':
      return <FlowRegular className={styles.icon} />;
    case 'schedules':
      return <CalendarRegular className={styles.icon} />;
    case 'holidays':
      return <CalendarDateRegular className={styles.icon} />;
    case 'graphics':
      return <ImageRegular className={styles.icon} />;
    case 'trendlogs':
      return <ChartMultipleRegular className={styles.icon} />;
    default:
      return <WrenchRegular className={styles.icon} />;
  }
};

/**
 * Map route to point type for selection
 */
const getPointTypeFromRoute = (pathname: string): string | null => {
  if (pathname.includes('/inputs')) return 'inputs';
  if (pathname.includes('/outputs')) return 'outputs';
  if (pathname.includes('/variables')) return 'variables';
  if (pathname.includes('/programs')) return 'programs';
  if (pathname.includes('/pidloops')) return 'pidloops';
  if (pathname.includes('/schedules')) return 'schedules';
  if (pathname.includes('/holidays')) return 'holidays';
  if (pathname.includes('/graphics')) return 'graphics';
  if (pathname.includes('/trendlogs')) return 'trendlogs';
  return null;
};

/**
 * Status icon component
 */
const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'online') {
    return <Checkmark20Regular className={styles.statusOnline} />;
  }
  return <Dismiss20Regular className={styles.statusOffline} />;
};

/**
 * Recursive tree node renderer for Project Point View
 */
const ProjectTreeNode: React.FC<{ node: any; level: number; selectedPointType: string | null }> = React.memo(
  ({ node, level, selectedPointType }) => {
    const hasChildren = node.children && node.children.length > 0;

    // Point type node with capacity bar
    if (node.node_type === 'point_type') {
      const isSelected = node.point_type === selectedPointType;
      return (
        <TreeItem itemType="leaf" value={node.name}>
          <TreeItemLayout
            className={isSelected ? styles.treeItemSelected : styles.treeItemNormal}
            style={{ '--tree-level': level } as React.CSSProperties}
          >
            {getPointTypeIcon(node.point_type)}
            <span className={styles.pointTypeName}>{node.name}</span>
            {node.used !== undefined && node.total !== undefined && (
              <CapacityBar
                used={node.used}
                total={node.total}
                percentage={node.percentage || 0}
              />
            )}
          </TreeItemLayout>
        </TreeItem>
      );
    }

    // Device node with status
    if (node.node_type === 'device') {
      return (
        <TreeItem itemType="branch" value={node.name}>
          <TreeItemLayout
            className={styles.treeItemNormal}
            style={{ '--tree-level': level } as React.CSSProperties}
            iconBefore={<ServerRegular style={{ color: '#605e5c', width: '20px', height: '20px' }} />}
            aside={node.status ? <StatusIcon status={node.status} /> : undefined}
          >
            {node.name}
          </TreeItemLayout>
          {hasChildren && (
            <Tree>
              {node.children.map((child: any, index: number) => (
                <ProjectTreeNode
                  key={`${child.name}-${index}`}
                  node={child}
                  level={level + 1}
                  selectedPointType={selectedPointType}
                />
              ))}
            </Tree>
          )}
        </TreeItem>
      );
    }

    // System or root nodes
    return (
      <TreeItem itemType="branch" value={node.name}>
        <TreeItemLayout
          className={styles.treeItemNormal}
          style={{ '--tree-level': level } as React.CSSProperties}
          iconBefore={<FolderRegular style={{ color: '#605e5c', width: '20px', height: '20px' }} />}
        >
          {node.name}
        </TreeItemLayout>
        {hasChildren && (
          <Tree>
            {node.children.map((child: any, index: number) => (
              <ProjectTreeNode
                key={`${child.name}-${index}`}
                node={child}
                level={level + 1}
                selectedPointType={selectedPointType}
              />
            ))}
          </Tree>
        )}
      </TreeItem>
    );
  }
);

/**
 * ProjectPointTree Component
 */
export const ProjectPointTree: React.FC = () => {
  const { projectTreeData, isLoading, error, fetchProjectPointTree } = useDeviceTreeStore();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const location = useLocation();
  const selectedPointType = getPointTypeFromRoute(location.pathname);

  useEffect(() => {
    if (!projectTreeData) {
      fetchProjectPointTree();
    }
  }, [projectTreeData, fetchProjectPointTree]);

  // Auto-expand first device when tree data loads
  useEffect(() => {
    if (projectTreeData && openItems.length === 0) {
      const itemsToExpand: string[] = [];

      // Expand root "Point List"
      itemsToExpand.push(projectTreeData.name);

      // Expand "System List" (first child)
      if (projectTreeData.children && projectTreeData.children.length > 0) {
        const systemList = projectTreeData.children[0];
        itemsToExpand.push(systemList.name);

        // Expand first device
        if (systemList.children && systemList.children.length > 0) {
          const firstDevice = systemList.children[0];
          itemsToExpand.push(firstDevice.name);
        }
      }

      setOpenItems(itemsToExpand);
    }
  }, [projectTreeData, openItems.length]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorTitle}>Failed to load project tree</div>
        <div className={styles.errorMessage}>{error}</div>
      </div>
    );
  }

  if (!projectTreeData) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>📊</div>
        <div className={styles.emptyTitle}>No Project Data</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Tree
        openItems={openItems}
        onOpenChange={(_, data) => setOpenItems(data.openItems as string[])}
      >
        <ProjectTreeNode node={projectTreeData} level={0} selectedPointType={selectedPointType} />
      </Tree>
    </div>
  );
};

export default ProjectPointTree;
