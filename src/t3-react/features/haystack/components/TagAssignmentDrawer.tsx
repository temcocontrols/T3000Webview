import React, { useState, useEffect } from 'react';
import { Button, Input, Spinner } from '@fluentui/react-components';
import { DismissRegular, SearchRegular } from '@fluentui/react-icons';
import { useHaystackStore } from '../store/haystackStore';
import styles from './TagAssignmentDrawer.module.css';

interface Props {
  deviceName?: string;
  pointLabel?: string;
  pointId?: string;
  serialNumber: number;
  pointType: string;
  pointIndex: string;
  currentTags: string[];
  onClose: () => void;
  onSaved?: () => void;
}

export const TagAssignmentDrawer: React.FC<Props> = ({
  deviceName,
  pointLabel,
  pointId,
  serialNumber,
  pointType,
  pointIndex,
  currentTags,
  onClose,
  onSaved,
}) => {
  const { tags, isLoading, fetchTags, batchUpdatePointTags } = useHaystackStore();
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const filteredTags = tags.filter((t) => {
    if (search && !t.tag_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedTags.includes(t.tag_name)) return false;
    return true;
  }).slice(0, 20);

  const handleAddTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
    setSearch('');
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  };

  const handleSave = async () => {
    setSaving(true);
    const added = selectedTags.filter((t) => !currentTags.includes(t));
    const removed = currentTags.filter((t) => !selectedTags.includes(t));
    await batchUpdatePointTags([{
      serialNumber: serialNumber,
      pointType: pointType,
      pointIndex: pointIndex,
      pointId: pointId || `${serialNumber}.${pointType.toLowerCase()}.${pointIndex}`,
      addTags: added.length > 0 ? added : undefined,
      removeTags: removed.length > 0 ? removed : undefined,
    }]);
    setSaving(false);
    onSaved?.();
    onClose();
  };

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
            {selectedTags.map((tag) => {
              const def = tags.find((t) => t.tag_name === tag);
              const isDeprecated = def?.deprecated;
              const cat = def?.category || 'custom';
              return (
                <span
                  key={tag}
                  className={`${styles.tagChip} ${cat === 'haystack' ? styles.chipStandard : styles.chipCustom} ${isDeprecated ? styles.chipDeprecated : ''}`}
                >
                  {isDeprecated && '⚠️ '}{tag}
                  <span className={styles.chipRemove} onClick={() => handleRemoveTag(tag)}>×</span>
                </span>
              );
            })}
            {selectedTags.length === 0 && <span className={styles.noTags}>No tags assigned</span>}
          </div>
        </div>

        {/* Add Tag Autocomplete */}
        <div className={styles.sectionSearch}>
          <div className={styles.sectionTitle}>Add Tag</div>
          <Input
            placeholder="Search tags..."
            value={search}
            onChange={(_, d) => setSearch(d.value)}
            contentBefore={<SearchRegular style={{ fontSize: 14 }} />}
            contentAfter={search ? <DismissRegular style={{ fontSize: 12, cursor: 'pointer', color: '#888' }} onClick={() => setSearch('')} /> : undefined}
            className={styles.searchInput}
          />
          {search && (
            <div className={styles.suggestions}>
              {isLoading ? <Spinner size="tiny" /> : (
                filteredTags.map((t) => (
                  <div key={t.tag_name} className={styles.suggestionItem} onClick={() => handleAddTag(t.tag_name)}>
                    <span>{t.tag_name}</span>
                    <span className={styles.suggestionMeta}>
                      {t.category === 'haystack' ? 'standard' : 'custom'}
                      {t.deprecated ? ' (deprecated)' : ''}
                    </span>
                  </div>
                ))
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
