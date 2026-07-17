import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from '@fluentui/react-components';
import { DismissRegular, SearchRegular } from '@fluentui/react-icons';
import { useHaystackStore } from '../store/haystackStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TagAssignmentDrawer.module.css';

interface Props {
  deviceName?: string;
  pointLabel?: string;
  pointId?: string;
  serialNumber: number;
  pointType: string;
  pointIndex: string;
  currentTags: string[];
  currentBrickClass?: string;
  onClose: () => void;
  onSaved?: () => void;
}

/** Chip color for prefixed tags */
const chipColors: Record<string, { bg: string; fg: string; border: string }> = {
  brick: { bg: '#fdf6e3', fg: '#8b6914', border: '#e6c960' },
  hay:   { bg: 'var(--colorBrandBackground2)', fg: 'var(--colorBrandForeground1)', border: 'transparent' },
};

export const TagAssignmentDrawer: React.FC<Props> = ({
  deviceName, pointLabel, pointId,
  serialNumber, pointType, pointIndex,
  currentTags, currentBrickClass,
  onClose, onSaved,
}) => {
  const { tags, isLoading, fetchTags, batchUpdatePointTags } = useHaystackStore();
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [brickClass, setBrickClass] = useState<string>(currentBrickClass || '');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const [brickClassOptions, setBrickClassOptions] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { fetchTags(); }, []);

  // Fetch available brick classes from rules table
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/haystack/auto-tagging/rules`)
      .then(r => r.json())
      .then(d => {
        const rules: any[] = d.rules || [];
        const bcs = [...new Set(rules.map((r: any) => r.brick_class).filter(Boolean))] as string[];
        setBrickClassOptions(bcs.sort());
      })
      .catch(() => {});
  }, []);

  // Build unified suggestion list: brick:xxx + haystack tags + custom tags
  const filteredSuggestions = (() => {
    const results: { label: string; prefix: string; isStandard: boolean; isAssigned: boolean }[] = [];
    const q = search.toLowerCase().trim();
    const showAll = !q;
    // Brick class suggestions
    for (const bc of brickClassOptions) {
      if (q && !bc.toLowerCase().includes(q) && !`brick:${bc}`.toLowerCase().includes(q)) continue;
      const assigned = brickClass === bc;
      results.push({ label: bc, prefix: 'brick', isStandard: true, isAssigned: assigned });
    }
    // Haystack tag suggestions
    for (const t of tags) {
      if (q && !t.tag_name.toLowerCase().includes(q)) continue;
      const prefix = t.category === 'haystack' ? 'hay' : '';
      const assigned = selectedTags.includes(t.tag_name);
      results.push({ label: t.tag_name, prefix, isStandard: t.category === 'haystack', isAssigned: assigned });
    }
    // Sort: unassigned first, then assigned (dimmed)
    results.sort((a, b) => Number(a.isAssigned) - Number(b.isAssigned));
    return showAll ? results : results.slice(0, 20);
  })();

  const handleAddTag = (item: { label: string; prefix: string }) => {
    if (item.prefix === 'brick') {
      setBrickClass(item.label);
    } else {
      if (!selectedTags.includes(item.label)) {
        setSelectedTags([...selectedTags, item.label]);
      }
    }
    setSearch('');
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  };

  const handleRemoveBrickClass = () => setBrickClass('');

  const handleSave = async () => {
    setSaving(true);
    const added = selectedTags.filter((t) => !currentTags.includes(t));
    const removed = currentTags.filter((t) => !selectedTags.includes(t));
    const bcChanged = brickClass !== (currentBrickClass || '');
    await batchUpdatePointTags([{
      serialNumber,
      pointType,
      pointIndex,
      pointId: pointId || `${serialNumber}.${pointType.toLowerCase()}.${pointIndex}`,
      addTags: added.length > 0 ? added : undefined,
      removeTags: removed.length > 0 ? removed : undefined,
      brickClass: bcChanged ? brickClass : undefined,
    }]);
    setSaving(false);
    onSaved?.();
    onClose();
  };

  // Compute display list for "Current" section
  const allItems: { label: string; prefix: string }[] = [];
  if (brickClass) allItems.push({ label: brickClass, prefix: 'brick' });
  for (const t of selectedTags) {
    const def = tags.find(d => d.tag_name === t);
    allItems.push({ label: t, prefix: def?.category === 'haystack' ? 'hay' : '' });
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h3>Assign Tags</h3>
            {deviceName && <p>Device: {deviceName}</p>}
            {pointLabel && <p>Point: {pointLabel}</p>}
            {pointId && <p className={styles.pointId}>Point ID: {pointId}</p>}
          </div>
          <Button icon={<DismissRegular />} appearance="subtle" onClick={onClose} />
        </div>

        {/* Current Tags */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Current Tags</div>
          <div className={styles.tagChips}>
            {allItems.map((item) => {
              const c = chipColors[item.prefix] || { bg: 'var(--colorNeutralBackground3)', fg: 'var(--colorNeutralForeground2)', border: 'transparent' };
              const displayLabel = item.prefix ? `${item.prefix}:${item.label}` : item.label;
              return (
                <span
                  key={displayLabel}
                  className={styles.tagChip}
                  style={{ background: c.bg, color: c.fg, borderColor: c.border, borderWidth: c.border !== 'transparent' ? 1 : 0, borderStyle: 'solid' }}
                >
                  {item.prefix === 'brick' ? `brick:${item.label}` :
                   item.prefix === 'hay' ? `hay:${item.label}` : item.label}
                  <span className={styles.chipRemove}
                    onClick={() => item.prefix === 'brick' ? handleRemoveBrickClass() : handleRemoveTag(item.label)}
                  >×</span>
                </span>
              );
            })}
            {allItems.length === 0 && <span className={styles.noTags}>No tags assigned</span>}
          </div>
        </div>

        {/* Add Tag Autocomplete */}
        <div className={styles.sectionSearch} ref={searchRef}>
          <div className={styles.sectionTitle}>Add Tag</div>
          <Input
            placeholder="Search tags or brick classes..."
            value={search}
            onChange={(_, d) => setSearch(d.value)}
            onFocus={() => setFocused(true)}
            contentBefore={<SearchRegular style={{ fontSize: 14 }} />}
            contentAfter={search ? <DismissRegular style={{ fontSize: 12, cursor: 'pointer', color: '#888' }} onClick={() => setSearch('')} /> : undefined}
            className={styles.searchInput}
          />
          {(search || focused) && (
            <div className={styles.suggestions}
              onMouseDown={(e) => e.preventDefault()}>
              {filteredSuggestions.map((s) => (
                <div key={`${s.prefix}:${s.label}`}
                  className={styles.suggestionItem}
                  onClick={() => !s.isAssigned && handleAddTag(s)}
                  style={s.isAssigned ? { background: '#e8f5e9', cursor: 'default' } : undefined}
                >
                  <span style={{ fontWeight: s.prefix === 'brick' ? 600 : 400 }}>
                    {s.prefix ? `${s.prefix}:${s.label}` : s.label}
                  </span>
                  <span className={styles.suggestionMeta}>
                    {s.isAssigned ? '✓ assigned' : s.prefix === 'brick' ? 'brick class' : s.isStandard ? 'standard' : 'custom'}
                  </span>
                </div>
              ))}
              {filteredSuggestions.length === 0 && !isLoading && (
                <div className={styles.suggestionItem} style={{ color: '#888', cursor: 'default' }}>No matches</div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button appearance="secondary" size="small" style={{ fontWeight: 400 }} onClick={onClose}>Cancel</Button>
          <Button appearance="primary" size="small" style={{ fontWeight: 400 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};
