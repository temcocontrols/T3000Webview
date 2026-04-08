/**
 * PropertiesPanel — Edit properties of the selected widget, or page-level styles
 * when no widget is selected.
 */

import React, { useCallback } from 'react';
import {
  makeStyles, tokens, Text, Input, Checkbox, Button, Dropdown, Option,
} from '@fluentui/react-components';
import simStyles from '../styles/simulator.module.css';
import { DeleteRegular } from '@fluentui/react-icons';
import type { LcdWidget, PageStyles } from './LcdPageRenderer';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 10px',
    width: '240px',
    flexShrink: 0,
    overflowY: 'auto',
    height: '100%',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  title: {
    fontWeight: 600,
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    marginBottom: '4px',
  },
  section: {
    fontWeight: 600,
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '6px 0 2px',
    marginTop: '4px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 0',
  },
  label: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
    width: '65px',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
  },
  deleteBtn: {
    marginTop: '8px',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
    fontStyle: 'italic' as const,
    padding: '24px 8px',
    textAlign: 'center' as const,
  },
  actionRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
  },
});

const FONT_SIZES = ['12px', '14px', '16px', '18px', '24px', '36px', '48px', '72px'];

interface PropertiesPanelProps {
  selectedWidget: LcdWidget | null;
  pageStyles: PageStyles;
  onUpdateWidget: (id: string, updates: Partial<LcdWidget>) => void;
  onRemoveWidget: (id: string) => void;
  onUpdatePageStyles: (updates: Record<string, any>) => void;
  onExportJSON: () => void;
  onImportJSON: (json: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedWidget,
  pageStyles,
  onUpdateWidget,
  onRemoveWidget,
  onUpdatePageStyles,
  onExportJSON,
  onImportJSON,
}) => {
  const styles = useStyles();

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') onImportJSON(reader.result);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [onImportJSON]);

  const w = selectedWidget;

  return (
    <div className={`${styles.root} ${simStyles.thinScroll}`}>
      <Text className={styles.title}>Properties</Text>

      {w ? (
        <>
          {/* Widget info */}
          <div className={styles.section}>Widget: {w.type}</div>
          <div className={styles.row}>
            <span className={styles.label}>ID</span>
            <Text size={200} style={{ fontFamily: 'monospace', fontSize: 11 }}>{w.id}</Text>
          </div>

          {/* Position */}
          <div className={styles.section}>Position</div>
          <div className={styles.row}>
            <span className={styles.label}>Row</span>
            <Input
              className={styles.input}
              size="small"
              type="number"
              value={String(w.row)}
              min={0} max={9}
              onChange={(_, d) => onUpdateWidget(w.id, { row: parseInt(d.value) || 0 })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Col</span>
            <Input
              className={styles.input}
              size="small"
              type="number"
              value={String(w.col ?? 0)}
              min={0} max={16}
              onChange={(_, d) => onUpdateWidget(w.id, { col: parseInt(d.value) || 0 })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>ColSpan</span>
            <Input
              className={styles.input}
              size="small"
              type="number"
              value={String(w.colSpan ?? 1)}
              min={1} max={17}
              onChange={(_, d) => onUpdateWidget(w.id, { colSpan: parseInt(d.value) || 1 })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>RowSpan</span>
            <Input
              className={styles.input}
              size="small"
              type="number"
              value={String(w.rowSpan ?? 1)}
              min={1} max={10}
              onChange={(_, d) => onUpdateWidget(w.id, { rowSpan: parseInt(d.value) || 1 })}
            />
          </div>

          {/* Typography */}
          <div className={styles.section}>Typography</div>
          <div className={styles.row}>
            <span className={styles.label}>Font Size</span>
            <Dropdown
              className={styles.input}
              size="small"
              value={w.fontSize || pageStyles.fontSize || '16px'}
              selectedOptions={[w.fontSize || pageStyles.fontSize || '16px']}
              onOptionSelect={(_, d) => onUpdateWidget(w.id, { fontSize: d.optionValue })}
            >
              {FONT_SIZES.map(s => <Option key={s} value={s}>{s}</Option>)}
            </Dropdown>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Align</span>
            <Dropdown
              className={styles.input}
              size="small"
              value={w.align || 'left'}
              selectedOptions={[w.align || 'left']}
              onOptionSelect={(_, d) => onUpdateWidget(w.id, { align: d.optionValue })}
            >
              <Option value="left">Left</Option>
              <Option value="center">Center</Option>
              <Option value="right">Right</Option>
            </Dropdown>
          </div>

          {/* Text content (for text, header, footer types) */}
          {(w.type === 'text' || w.type === 'header' || w.type === 'footer_hint' || w.type === 'footer_nav') && (
            <>
              <div className={styles.section}>Content</div>
              <div className={styles.row}>
                <span className={styles.label}>Text</span>
                <Input
                  className={styles.input}
                  size="small"
                  value={w.text || ''}
                  onChange={(_, d) => onUpdateWidget(w.id, { text: d.value })}
                />
              </div>
            </>
          )}

          {/* Label + Field (for label_value, large_text, edit_value) */}
          {(w.type === 'label_value' || w.type === 'large_text' || w.type === 'edit_value') && (
            <>
              <div className={styles.section}>Data Binding</div>
              {w.type === 'label_value' && (
                <div className={styles.row}>
                  <span className={styles.label}>Label</span>
                  <Input
                    className={styles.input}
                    size="small"
                    value={w.label || ''}
                    onChange={(_, d) => onUpdateWidget(w.id, { label: d.value })}
                  />
                </div>
              )}
              <div className={styles.row}>
                <span className={styles.label}>Field</span>
                <Input
                  className={styles.input}
                  size="small"
                  value={w.field || ''}
                  onChange={(_, d) => onUpdateWidget(w.id, { field: d.value })}
                />
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Suffix</span>
                <Input
                  className={styles.input}
                  size="small"
                  value={w.suffix || ''}
                  onChange={(_, d) => onUpdateWidget(w.id, { suffix: d.value })}
                />
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Register</span>
                <Input
                  className={styles.input}
                  size="small"
                  type="number"
                  value={String(w.register ?? '')}
                  onChange={(_, d) => onUpdateWidget(w.id, { register: parseInt(d.value) || undefined })}
                />
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Editable</span>
                <Checkbox
                  checked={w.editable ?? false}
                  onChange={(_, d) => onUpdateWidget(w.id, { editable: !!d.checked })}
                />
              </div>
            </>
          )}

          {/* Icon (for icon type) */}
          {w.type === 'icon' && (
            <>
              <div className={styles.section}>Icon</div>
              <div className={styles.row}>
                <span className={styles.label}>Icon</span>
                <Dropdown
                  className={styles.input}
                  size="small"
                  value={w.icon || 'house'}
                  selectedOptions={[w.icon || 'house']}
                  onOptionSelect={(_, d) => onUpdateWidget(w.id, { icon: d.optionValue })}
                >
                  {['house', 'moon', 'snowflake', 'fan', 'wifi', 'sun', 'leaf', 'thermometer'].map(ic => (
                    <Option key={ic} value={ic}>{ic}</Option>
                  ))}
                </Dropdown>
              </div>
            </>
          )}

          {/* Delete */}
          <Button
            className={styles.deleteBtn}
            size="small"
            appearance="subtle"
            icon={<DeleteRegular />}
            onClick={() => onRemoveWidget(w.id)}
          >
            Delete Widget
          </Button>
        </>
      ) : (
        <>
          {/* Page styles (no widget selected) */}
          <div className={styles.section}>Page Styles</div>
          <div className={styles.row}>
            <span className={styles.label}>BG Color</span>
            <input
              type="color"
              value={pageStyles.bg || '#003366'}
              aria-label="Background color"
              style={{ width: 32, height: 24, border: 'none', cursor: 'pointer' }}
              onChange={(e) => onUpdatePageStyles({ bg: e.target.value })}
            />
            <Text size={200} style={{ fontFamily: 'monospace', fontSize: 11 }}>{pageStyles.bg || '#003366'}</Text>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Highlight</span>
            <input
              type="color"
              value={pageStyles.highlight || '#008080'}
              aria-label="Highlight color"
              style={{ width: 32, height: 24, border: 'none', cursor: 'pointer' }}
              onChange={(e) => onUpdatePageStyles({ highlight: e.target.value })}
            />
            <Text size={200} style={{ fontFamily: 'monospace', fontSize: 11 }}>{pageStyles.highlight || '#008080'}</Text>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Font</span>
            <Dropdown
              className={styles.input}
              size="small"
              value={pageStyles.fontFamily || 'monospace'}
              selectedOptions={[pageStyles.fontFamily || 'monospace']}
              onOptionSelect={(_, d) => onUpdatePageStyles({ fontFamily: d.optionValue })}
            >
              <Option value="'Fira Mono', 'Consolas', monospace">Fira Mono</Option>
              <Option value="'Consolas', monospace">Consolas</Option>
              <Option value="monospace">Monospace</Option>
            </Dropdown>
          </div>

          <div className={styles.empty}>
            Select a widget on the canvas to edit its properties
          </div>
        </>
      )}

      {/* Actions — always visible */}
      <div className={styles.section}>Actions</div>
      <div className={styles.actionRow}>
        <Button size="small" appearance="primary" onClick={onExportJSON}>Export JSON</Button>
        <Button size="small" appearance="outline" onClick={handleImport}>Import JSON</Button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
