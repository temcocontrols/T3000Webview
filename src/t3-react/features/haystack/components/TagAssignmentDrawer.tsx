import React, { useState, useEffect } from 'react';
import { Button, Input, Spinner } from '@fluentui/react-components';
import { DismissRegular, AddRegular, SearchRegular } from '@fluentui/react-icons';
import { useHaystackStore, TagDefinition } from '../store/haystackStore';
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
  onSave: (updates: { add_tags?: string[]; remove_tags?: string[]; set_tags?: string[] }) => Promise<void>;
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
  onSave,
}) => {
  const { tags, isLoading, fetchTags, createTag } = useHaystackStore();
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');
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
    await onSave({ add_tags: added, remove_tags: removed });
    setSaving(false);
    onClose();
  };

  const handleCreateTag = async () => {
    if (newTagName) {
      await createTag(newTagName);
      setSelectedTags([...selectedTags, newTagName]);
      setNewTagName('');
      setShowCreate(false);
    }
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
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Add Tag</div>
          <Input
            placeholder="Search tags..."
            value={search}
            onChange={(_, d) => setSearch(d.value)}
            contentBefore={<SearchRegular />}
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

        {/* Create Custom Tag */}
        <div className={styles.section}>
          {!showCreate ? (
            <Button appearance="subtle" icon={<AddRegular />} onClick={() => setShowCreate(true)}>
              + Create Custom Tag
            </Button>
          ) : (
            <div className={styles.createForm}>
              <Input
                placeholder="New tag name"
                value={newTagName}
                onChange={(_, d) => setNewTagName(d.value)}
              />
              <Button size="small" onClick={handleCreateTag}>Create</Button>
              <Button size="small" appearance="subtle" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button appearance="secondary" onClick={onClose}>Cancel</Button>
          <Button appearance="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};
