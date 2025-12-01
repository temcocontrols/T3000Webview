/**
 * ProjectPointTree Component
 *
 * Renders Project Point View tree structure:
 * Point List → System List → Devices → Point Types (with capacity indicators)
 *
 * Matches C++ Project Point View (DLG_DIALOG_BUILDING_MANAGEMENT mode)
 */

import React, { useEffect } from 'react';
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
  DatabaseRegular,
  GaugeRegular,
  CalendarRegular,
  CalendarLtrRegular,
  CodeRegular,
  ImageRegular,
  ChartMultipleRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
import { CapacityBar } from './CapacityBar';
import styles from './ProjectPointTree.module.css';

/**
 * Get icon for point type
 */
const getPointTypeIcon = (pointType: string) => {
  switch (pointType) {
    case 'inputs':
      return <DatabaseRegular className={styles.icon} />;
    case 'outputs':
      return <DatabaseRegular className={styles.icon} />;
    case 'variables':
      return <DatabaseRegular className={styles.icon} />;
    case 'pid':
      return <GaugeRegular className={styles.icon} />;
    case 'schedules':
      return <CalendarRegular className={styles.icon} />;
    case 'holidays':
      return <CalendarLtrRegular className={styles.icon} />;
    case 'programs':
      return <CodeRegular className={styles.icon} />;
    case 'graphics':
      return <ImageRegular className={styles.icon} />;
    case 'trendlogs':
      return <ChartMultipleRegular className={styles.icon} />;
    default:
      return <DatabaseRegular className={styles.icon} />;
  }
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
const ProjectTreeNode: React.FC<{ node: any; level: number }> = React.memo(({ node, level }) => {
  const hasChildren = node.children && node.children.length > 0;

  // Point type node with capacity bar
  if (node.node_type === 'point_type') {
    return (
      <TreeItem itemType="leaf" value={node.name}>
        <TreeItemLayout className={styles.pointTypeItem}>
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
        <TreeItemLayout>
          <ServerRegular className={styles.icon} />
          <span>{node.name}</span>
          {node.status && <StatusIcon status={node.status} />}
        </TreeItemLayout>
        {hasChildren && (
          <Tree>
            {node.children.map((child: any, index: number) => (
              <ProjectTreeNode key={`${child.name}-${index}`} node={child} level={level + 1} />
            ))}
          </Tree>
        )}
      </TreeItem>
    );
  }

  // System or root nodes
  return (
    <TreeItem itemType="branch" value={node.name}>
      <TreeItemLayout>
        <FolderRegular className={styles.icon} />
        <span>{node.name}</span>
      </TreeItemLayout>
      {hasChildren && (
        <Tree>
          {node.children.map((child: any, index: number) => (
            <ProjectTreeNode key={`${child.name}-${index}`} node={child} level={level + 1} />
          ))}
        </Tree>
      )}
    </TreeItem>
  );
});

/**
 * ProjectPointTree Component
 */
export const ProjectPointTree: React.FC = () => {
  const { projectTreeData, isLoading, error, fetchProjectPointTree } = useDeviceTreeStore();

  useEffect(() => {
    if (!projectTreeData) {
      fetchProjectPointTree();
    }
  }, [projectTreeData, fetchProjectPointTree]);

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
      <Tree>
        <ProjectTreeNode node={projectTreeData} level={0} />
      </Tree>
    </div>
  );
};

export default ProjectPointTree;
