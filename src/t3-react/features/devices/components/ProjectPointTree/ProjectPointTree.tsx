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
  BuildingRegular,
  Checkmark20Regular,
  CircleFilled,
} from '@fluentui/react-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeviceTreeStore } from '../../store/deviceTreeStore';
import styles from './ProjectPointTree.module.css';

/**
 * Title-case labels matching C++ project view
 */
const POINT_TYPE_LABELS: Record<string, string> = {
  inputs: 'Input',
  outputs: 'Output',
  variables: 'Variable',
  programs: 'Program',
  pidloops: 'PID',
  schedules: 'Schedule',
  holidays: 'Holiday',
  graphics: 'Graphic',
  trendlogs: 'Trendlog',
};

/**
 * Get SVG icon for point type (matches toolbar SVG icons)
 */
const getPointTypeIcon = (pointType: string) => {
  const svgMap: Record<string, string> = {
    inputs: 'inputs',
    outputs: 'outputs',
    variables: 'variables',
    programs: 'programs',
    pidloops: 'pidloops',
    schedules: 'schedules',
    holidays: 'holidays',
    graphics: 'graphics',
    trendlogs: 'trendlogs',
  };
  const name = svgMap[pointType] || 'inputs';
  return <img src={`/assets/t3icon/toolbar/${name}.svg`} className={styles.icon} alt={pointType} />;
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
 * Map point type to route for navigation
 */
const getRouteFromPointType = (pointType: string): string => {
  const routeMap: Record<string, string> = {
    'inputs': '/t3000/inputs',
    'outputs': '/t3000/outputs',
    'variables': '/t3000/variables',
    'programs': '/t3000/programs',
    'pidloops': '/t3000/pidloops',
    'schedules': '/t3000/schedules',
    'holidays': '/t3000/holidays',
    'graphics': '/t3000/graphics',
    'trendlogs': '/t3000/trendlogs',
  };
  return routeMap[pointType] || '/t3000/dashboard';
};

/**
 * Status icon component
 */
const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'online') {
    return <Checkmark20Regular className={styles.statusOnline} />;
  }
  // return <CircleFilled className={styles.statusOffline} />;
  return <></>;
};

/**
 * Recursive tree node renderer for Project Point View
 */
const ProjectTreeNode: React.FC<{
  node: any;
  level: number;
  selectedPointType: string | null;
  onNavigate: (pointType: string) => void;
}> = React.memo(
  ({ node, level, selectedPointType, onNavigate }) => {
    const hasChildren = node.children && node.children.length > 0;

    // Point type node — uppercase label, aligned count, no percent bar
    if (node.node_type === 'point_type') {
      const isSelected = node.point_type === selectedPointType;
      const label = POINT_TYPE_LABELS[node.point_type] || node.name;
      const used = node.used ?? 0;
      const total = node.total ?? 0;

      const handleClick = () => {
        if (node.point_type) {
          onNavigate(node.point_type);
        }
      };

      return (
        <TreeItem itemType="leaf" value={node.name}>
          <TreeItemLayout
            className={`${isSelected ? styles.treeItemSelected : styles.treeItemNormal} ${styles.nodePointType} ${styles[`level${level}`] || ''}`}
            style={{ '--tree-level': level, cursor: 'pointer' } as React.CSSProperties}
            onClick={handleClick}
          >
            {getPointTypeIcon(node.point_type)}
            <span className={styles.pointTypeLabel}>{label}</span>
            <span className={styles.pointTypeCount}>({used}/{total})</span>
          </TreeItemLayout>
        </TreeItem>
      );
    }

    // Device node — skip Unknown / empty / placeholder names
    if (node.node_type === 'device') {
      const deviceName = node.name || '';
      if (!deviceName || deviceName.toLowerCase().includes('unknown') || deviceName.startsWith('Device ')) {
        return null;
      }

      return (
        <TreeItem itemType="branch" value={node.name}>
          <TreeItemLayout
            className={`${styles.treeItemNormal} ${styles.nodeDevice} ${styles[`level${level}`] || ''}`}
            style={{ '--tree-level': level } as React.CSSProperties}
            iconBefore={<BuildingRegular style={{ color: '#605e5c', width: '20px', height: '20px' }} />}
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
                  onNavigate={onNavigate}
                />
              ))}
            </Tree>
          )}
        </TreeItem>
      );
    }

    // System node — skip "System List", render children directly
    if (node.node_type === 'system') {
      return (
        <>
          {hasChildren &&
            node.children.map((child: any, index: number) => (
              <ProjectTreeNode
                key={`${child.name}-${index}`}
                node={child}
                level={level + 1}
                selectedPointType={selectedPointType}
                onNavigate={onNavigate}
              />
            ))}
        </>
      );
    }

    // Root node (Point List)
    return (
      <TreeItem itemType="branch" value={node.name}>
        <TreeItemLayout
          className={`${styles.treeItemNormal} ${styles.nodeRoot} ${styles[`level${level}`] || ''}`}
          style={{ '--tree-level': level } as React.CSSProperties}
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
                onNavigate={onNavigate}
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
  const navigate = useNavigate();
  const selectedPointType = getPointTypeFromRoute(location.pathname);

  const handleNavigate = (pointType: string) => {
    const route = getRouteFromPointType(pointType);
    navigate(route);
  };

  useEffect(() => {
    if (!projectTreeData && !isLoading) {
      fetchProjectPointTree();
    }
  }, [projectTreeData, isLoading]);

  // Auto-expand first device when tree data loads
  useEffect(() => {
    if (projectTreeData && openItems.length === 0) {
      const itemsToExpand: string[] = [];

      // Expand root "Point List"
      itemsToExpand.push(projectTreeData.name);

      // Flatten: skip "System List" → go directly to first device
      const children = projectTreeData.children || [];
      const systemList = children.find((c: any) => c.node_type === 'system');
      const deviceChildren = systemList?.children || children;
      const validDevices = deviceChildren.filter(
        (d: any) => {
          const name = d.name || '';
          return d.node_type === 'device' && name && !name.toLowerCase().includes('unknown') && !name.startsWith('Device ');
        }
      );

      if (validDevices.length > 0) {
        itemsToExpand.push(validDevices[0].name);
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
        <ProjectTreeNode
          node={projectTreeData}
          level={0}
          selectedPointType={selectedPointType}
          onNavigate={handleNavigate}
        />
      </Tree>
    </div>
  );
};

export default ProjectPointTree;
