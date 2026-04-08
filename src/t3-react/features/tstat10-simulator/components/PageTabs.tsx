/**
 * PageTabs — Tab bar for multiple LCD pages.
 * Shows page tabs, active indicator, add/remove/rename.
 */

import React, { useState, useCallback } from 'react';
import { makeStyles, tokens, Button } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import type { PageDefinition } from './LcdPageRenderer';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 0',
    flexWrap: 'wrap',
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
  activeTab: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
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
});

interface PageTabsProps {
  pages: PageDefinition[];
  selectedPageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onRemovePage: (id: string) => void;
  onRenamePage: (id: string, label: string) => void;
}

export const PageTabs: React.FC<PageTabsProps> = ({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onRenamePage,
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
    <div className={styles.root}>
      {pages.map(p => (
        <div
          key={p.id}
          className={`${styles.tab} ${p.id === selectedPageId ? styles.activeTab : ''}`}
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
    </div>
  );
};

export default PageTabs;
