import React, { useEffect, useState } from 'react';
import { Spinner, Button, Input } from '@fluentui/react-components';
import { AddRegular, SearchRegular, DeleteRegular, ArrowSyncRegular, WarningRegular } from '@fluentui/react-icons';
import { useHaystackStore } from '../store/haystackStore';
import styles from './HaystackTagsPage.module.css';

export const HaystackTagsPage: React.FC = () => {
  const { tags, isLoading, error, fetchTags, updateTag, deleteTag, createTag } = useHaystackStore();
  const [search, setSearch] = useState('');
  const [filterCustom, setFilterCustom] = useState(true);
  const [filterStandard, setFilterStandard] = useState(true);
  const [filterDeprecated, setFilterDeprecated] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => { fetchTags(); }, []);

  const filteredTags = tags.filter((t) => {
    if (search && !t.tag_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (t.category === 'haystack' && !filterStandard) return false;
    if (t.category === 'custom' && !filterCustom) return false;
    if (t.deprecated && !filterDeprecated) return false;
    return true;
  });

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag(newTagName.trim());
    setNewTagName('');
  };

  return (
    <div className={styles.container}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <Input
          placeholder="Search tags…"
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          contentBefore={<SearchRegular />}
          className={styles.searchInput}
        />
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filterStandard} onChange={() => setFilterStandard(!filterStandard)} />
          Standard
        </label>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filterCustom} onChange={() => setFilterCustom(!filterCustom)} />
          Custom
        </label>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filterDeprecated} onChange={() => setFilterDeprecated(!filterDeprecated)} />
          Deprecated
        </label>
        <div className={styles.toolbarSpacer} />
        <Input
          placeholder="New tag name"
          value={newTagName}
          onChange={(_, d) => setNewTagName(d.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
          className={styles.addTagInput}
        />
        <Button size="small" icon={<AddRegular />} onClick={handleCreateTag}>Add</Button>
        <Button
          size="small"
          icon={<ArrowSyncRegular />}
          appearance="subtle"
          onClick={() => fetchTags()}
          title="Refresh"
        />
      </div>

      {/* ── Status ── */}
      {error && (
        <div className={styles.errorBanner}>
          <WarningRegular /> {error}
          <Button size="small" appearance="subtle" onClick={() => fetchTags()}>Retry</Button>
        </div>
      )}

      {/* ── Content ── */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.emptyState}><Spinner size="tiny" label="Loading…" /></div>
        ) : error ? (
          <div className={styles.emptyState}>
            <WarningRegular className={styles.emptyIcon} />
            <p>Unable to load tags</p>
            <p className={styles.emptyHint}>Backend may not be running — start it and click Retry.</p>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No tags found</p>
            {tags.length === 0 ? (
              <p className={styles.emptyHint}>Restart the backend to run migrations and seed the standard Haystack v4 tag library.</p>
            ) : (
              <p className={styles.emptyHint}>No tags match your current filters.</p>
            )}
          </div>
        ) : (
          <table className={styles.tagTable}>
            <thead>
              <tr>
                <th>Tag Name</th>
                <th>Category</th>
                <th>Parents</th>
                <th>Deprecated</th>
                <th>Used By</th>
                <th className={styles.actionsCol}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map((t) => (
                <tr key={t.tag_name} className={t.deprecated ? styles.deprecatedRow : undefined}>
                  <td className={styles.tagName}>{t.deprecated ? '⚠ ' : ''}{t.tag_name}</td>
                  <td>{t.category === 'haystack' ? 'standard' : t.category}</td>
                  <td className={styles.parents}>{t.parents?.join(', ') || '—'}</td>
                  <td>{t.deprecated ? 'Yes' : '—'}</td>
                  <td>{t.usage_count}</td>
                  <td className={styles.actionCell}>
                    {!t.deprecated && (
                      <Button size="small" appearance="subtle" onClick={() => updateTag(t.tag_name, { deprecated: true })}>Deprecate</Button>
                    )}
                    {t.category === 'custom' && t.usage_count === 0 && (
                      <Button size="small" appearance="subtle" icon={<DeleteRegular />} onClick={() => deleteTag(t.tag_name)} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default HaystackTagsPage;
