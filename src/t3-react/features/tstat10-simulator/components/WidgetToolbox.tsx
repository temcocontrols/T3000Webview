/**
 * WidgetToolbox — Categorized list of draggable widget types.
 * Drag a widget from here onto the DesignCanvas to add it.
 */

import React, { useCallback } from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import simStyles from '../styles/simulator.module.css';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px',
    width: '170px',
    flexShrink: 0,
    overflowY: 'auto',
    height: '100%',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  title: {
    fontWeight: 600,
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    marginBottom: '4px',
  },
  category: {
    fontWeight: 600,
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '6px 4px 2px',
    marginTop: '4px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 8px',
    borderRadius: '4px',
    cursor: 'grab',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':active': {
      cursor: 'grabbing',
    },
  },
  icon: {
    width: '22px',
    textAlign: 'center' as const,
    fontSize: '13px',
    flexShrink: 0,
  },
});

interface WidgetCatalogEntry {
  type: string;
  label: string;
  icon: string;
  category: string;
}

const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  // Display
  { type: 'label',      label: 'Label',       icon: 'Aa', category: 'Display' },
  { type: 'text',       label: 'Text',        icon: 'T',  category: 'Display' },
  { type: 'large_text', label: 'Large Text',  icon: 'T+', category: 'Display' },
  { type: 'header',     label: 'Header',      icon: 'H',  category: 'Display' },
  // Input
  { type: 'label_value', label: 'Input Row',    icon: '[=]', category: 'Input' },
  { type: 'label_value', label: 'Dropdown Row', icon: '[▼]', category: 'Input' },
  { type: 'edit_value',  label: 'Edit Value',   icon: '[#]', category: 'Input' },
  // Decorative
  { type: 'icon',       label: 'Icon',        icon: '☆',  category: 'Decor' },
  { type: 'icon_bar',   label: 'Icon Bar',    icon: '☆☆', category: 'Decor' },
  { type: 'divider',    label: 'Divider',     icon: '—',  category: 'Decor' },
  { type: 'wifi_icon',  label: 'WiFi Icon',   icon: '≋',  category: 'Decor' },
  // Footer
  { type: 'footer_hint', label: 'Hint Text',  icon: '...', category: 'Footer' },
  { type: 'footer_nav',  label: 'Nav Text',   icon: '◄►',  category: 'Footer' },
];

interface WidgetToolboxProps {
  onDragStart?: (type: string) => void;
}

export const WidgetToolbox: React.FC<WidgetToolboxProps> = ({ onDragStart }) => {
  const styles = useStyles();

  const handleDragStart = useCallback((e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(type);
  }, [onDragStart]);

  // Group by category
  const categories = ['Display', 'Input', 'Decor', 'Footer'];

  return (
    <div className={`${styles.root} ${simStyles.thinScroll}`}>
      <Text className={styles.title}>Widget Toolbox</Text>

      {categories.map(cat => (
        <React.Fragment key={cat}>
          <div className={styles.category}>{cat}</div>
          {WIDGET_CATALOG
            .filter(w => w.category === cat)
            .map((w, idx) => (
              <div
                key={`${w.type}-${idx}`}
                className={styles.item}
                draggable
                onDragStart={(e) => handleDragStart(e, w.type)}
              >
                <span className={styles.icon}>{w.icon}</span>
                <span>{w.label}</span>
              </div>
            ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default WidgetToolbox;
