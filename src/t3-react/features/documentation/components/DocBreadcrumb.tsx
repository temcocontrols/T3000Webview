/**
 * Documentation Breadcrumb
 * Shows navigation path
 */

import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbButton, BreadcrumbDivider } from '@fluentui/react-components';
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
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {crumb.path !== undefined ? (
                <BreadcrumbButton onClick={() => onNavigate(crumb.path || '')}>
                  {crumb.title}
                </BreadcrumbButton>
              ) : (
                <span className={styles.current}>{crumb.title}</span>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbDivider />}
          </React.Fragment>
        ))}
      </Breadcrumb>
    </div>
  );
};
