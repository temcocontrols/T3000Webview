/**
 * Documentation Breadcrumb
 * Shows navigation path
 */

import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbButton } from '@fluentui/react-components';
import { getBreadcrumbs } from '../utils/docStructure';
import styles from './DocBreadcrumb.module.css';

interface DocBreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const DocBreadcrumb: React.FC<DocBreadcrumbProps> = ({ currentPath, onNavigate }) => {
  const breadcrumbs = getBreadcrumbs(currentPath);

  return (
    <div className={styles.container}>
      <Breadcrumb size="small">
        {breadcrumbs.map((crumb, index) => (
          <BreadcrumbItem key={index}>
            {crumb.path !== undefined ? (
              <BreadcrumbButton onClick={() => onNavigate(crumb.path || '')}>
                {crumb.title}
              </BreadcrumbButton>
            ) : (
              <span className={styles.current}>{crumb.title}</span>
            )}
          </BreadcrumbItem>
        ))}
      </Breadcrumb>
    </div>
  );
};
