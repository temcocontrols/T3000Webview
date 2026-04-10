/**
 * PageTabs — Tab bar for multiple LCD pages.
 * Shows page tabs, active indicator, add/remove/rename.
 */

import React, { useState, useCallback } from 'react';
import { makeStyles, tokens, Button, Checkbox, Text } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import simStyles from '../styles/simulator.module.css';
import type { PageDefinition } from './LcdPageRenderer';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 0',
    flexWrap: 'wrap',
  },
  rootVertical: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    padding: '8px 0',
    width: '140px',
    flexShrink: 0,
    overflowY: 'auto',
    height: '100%',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  verticalTitle: {
    fontWeight: 600,
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '0 10px 4px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '4px 4px 0 0',
    fontSize: '11px',
    fontFamily: 'monospace',
    cursor: 'pointer',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: 'none',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  tabVertical: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    borderRadius: '0',
    fontSize: '11px',
    fontFamily: 'monospace',
    cursor: 'pointer',
    border: 'none',
    borderLeft: '3px solid transparent',
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground2,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  activeTab: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
  },
  activeTabVertical: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
    borderLeftColor: tokens.colorBrandForeground1,
  },
  closeBtn: {
    padding: 0,
    minWidth: 'auto',
    width: '16px',
    height: '16px',
    fontSize: '10px',
    lineHeight: 1,
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    ':hover': {
      color: tokens.colorPaletteRedForeground1,
    },
  },
  addBtn: {
    marginLeft: '4px',
  },
  canvasFooter: {
    marginTop: 'auto',
    paddingTop: '8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px 10px 4px',
  },
  canvasTitle: {
    fontWeight: 600,
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '2px',
  },
  canvasCheckbox: {
    fontSize: '11px',
    '& label': { fontSize: '11px' },
  },
  widgetCount: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground3,
    opacity: 0.7,
    padding: '2px 0',
  },
});

interface PageTabsProps {
  pages: PageDefinition[];
  selectedPageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onRemovePage: (id: string) => void;
  onRenamePage: (id: string, label: string) => void;
  vertical?: boolean;
  showGrid?: boolean;
  onShowGridChange?: (v: boolean) => void;
  showCoords?: boolean;
  onShowCoordsChange?: (v: boolean) => void;
  widgetCount?: number;
}

export const PageTabs: React.FC<PageTabsProps> = ({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onRenamePage,
  vertical = false,
  showGrid,
  onShowGridChange,
  showCoords,
  onShowCoordsChange,
  widgetCount,
}) => {
  const styles = useStyles();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const startRename = useCallback((pageId: string, currentLabel: string) => {
    setEditingId(pageId);
    setEditLabel(currentLabel);
  }, []);

  const finishRename = useCallback(() => {
    if (editingId && editLabel.trim()) {
      onRenamePage(editingId, editLabel.trim());
    }
    setEditingId(null);
  }, [editingId, editLabel, onRenamePage]);

  return (
    <div className={vertical ? `${styles.rootVertical} ${simStyles.thinScroll}` : styles.root}>
      {vertical && <div className={styles.verticalTitle}>Pages</div>}
      {pages.map(p => (
        <div
          key={p.id}
          className={`${vertical ? styles.tabVertical : styles.tab} ${
            p.id === selectedPageId
              ? (vertical ? styles.activeTabVertical : styles.activeTab)
              : ''
          }`}
          onClick={() => onSelectPage(p.id)}
          onDoubleClick={() => startRename(p.id, p.label)}
        >
          {editingId === p.id ? (
            <input
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              onBlur={finishRename}
              onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setEditingId(null); }}
              autoFocus
              aria-label="Page name"
              style={{ width: 80, fontSize: 11, fontFamily: 'monospace', border: 'none', outline: 'none', background: 'transparent' }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span>{p.label}</span>
          )}
          {pages.length > 1 && (
            <span
              className={styles.closeBtn}
              onClick={(e) => { e.stopPropagation(); onRemovePage(p.id); }}
              title="Remove page"
            >
              ×
            </span>
          )}
        </div>
      ))}
      <Button
        className={styles.addBtn}
        size="small"
        appearance="subtle"
        icon={<AddRegular />}
        onClick={onAddPage}
        title="Add new page"
      />
      {vertical && onShowGridChange && (
        <div className={styles.canvasFooter}>
          <div className={styles.canvasTitle}>Canvas</div>
          <Checkbox
            className={styles.canvasCheckbox}
            checked={showGrid ?? false}
            onChange={(_, d) => onShowGridChange(!!d.checked)}
            label="Grid"
          />
          <Checkbox
            className={styles.canvasCheckbox}
            checked={showCoords ?? false}
            onChange={(_, d) => onShowCoordsChange?.(!!d.checked)}
            label="Coords"
          />
          {widgetCount !== undefined && (
            <span className={styles.widgetCount}>{widgetCount} widgets</span>
          )}
        </div>
      )}
    </div>
  );
};

export default PageTabs;
