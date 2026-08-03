import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Spinner, Button, Input,
  Popover, PopoverTrigger, PopoverSurface,
} from '@fluentui/react-components';
import {
  SearchRegular, AddRegular, DismissRegular, InfoRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { useHaystackStore, TagDefinition, TagPointRef } from '../store/haystackStore';
import styles from './CustomTagsPage.module.css';

export const CustomTagsPage: React.FC = () => {
  const { tags, isLoading, error, fetchTags, createTag, updateTag, deleteTag, forceDeleteTag, fetchTagPoints } = useHaystackStore();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDoc, setNewDoc] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDoc, setEditDoc] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagDefinition | null>(null);
  const [tagPoints, setTagPoints] = useState<TagPointRef[]>([]);
  const [showAllPoints, setShowAllPoints] = useState(false);
  const [forceDeleting, setForceDeleting] = useState(false);

  useEffect(() => { fetchTags(); }, []);

  const customTags = useMemo(() => tags.filter(t => t.category === 'custom'), [tags]);

  const filteredTags = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customTags;
    return customTags.filter(t => t.tag_name.toLowerCase().includes(q) || (t.doc || '').toLowerCase().includes(q));
  }, [customTags, search]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { setLocalError('Tag name is required.'); return; }
    const exists = tags.some(t => t.tag_name.toLowerCase() === name.toLowerCase());
    if (exists) { setLocalError(`Tag "${name}" already exists.`); return; }
    setLocalError(null);
    await createTag(name, newDoc.trim() || undefined);
    setNewName(''); setNewDoc(''); setAdding(false);
  };

  const handleSaveEdit = async (oldName: string) => {
    const name = editName.trim();
    if (!name) { setLocalError('Tag name is required.'); return; }
    if (name.toLowerCase() !== oldName.toLowerCase()) {
      const exists = tags.some(t => t.tag_name.toLowerCase() === name.toLowerCase());
      if (exists) { setLocalError(`Tag "${name}" already exists.`); return; }
    }
    setLocalError(null);
    await updateTag(oldName, { doc: editDoc.trim() || undefined });
    setEditingName(null);
    fetchTags();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteTag(deleteTarget.tag_name);
      setDeleteTarget(null);
    }
  };

  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    setForceDeleting(true);
    await forceDeleteTag(deleteTarget.tag_name);
    setForceDeleting(false);
    setDeleteTarget(null);
    setTagPoints([]);
    setShowAllPoints(false);
  };

  const handleOpenDeletePopover = useCallback(async (t: TagDefinition) => {
    setDeleteTarget(t);
    setShowAllPoints(false);
    if (t.usage_count > 0) {
      const points = await fetchTagPoints(t.tag_name);
      setTagPoints(points);
    } else {
      setTagPoints([]);
    }
  }, [fetchTagPoints]);

  return (
    <div className={styles.container}>
      {/* ── Info Bar ── */}
      <div className={styles.infoBar}>
        <div className={styles.infoBarLeft}>
          <InfoRegular className={styles.infoIcon} />
          <div className={styles.infoText}>
            <span className={styles.infoTitle}>Custom Tags</span>
            <div className={styles.infoDesc}>
              Create your own domain-specific tags to supplement the standard library.
              Custom tags can be applied to points alongside standard tags for flexible labeling.
            </div>
          </div>
        </div>
        <Button
          size="small"
          appearance="transparent"
          icon={<AddRegular style={{ fontSize: 14 }} />}
          onClick={() => { setAdding(true); setEditingName(null); setLocalError(null); }}
          disabled={adding}
          className={styles.addButton}
        >
          New Tag
        </Button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {localError && <div className={styles.errorBanner}>{localError}</div>}

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <Input
          size="small"
          placeholder="Filter tags…"
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          contentBefore={<SearchRegular style={{ fontSize: 14 }} />}
          contentAfter={search ? <DismissRegular style={{ fontSize: 12, cursor: 'pointer', color: '#888' }} onClick={() => setSearch('')} /> : undefined}
          className={styles.searchInput}
        />
        <span className={styles.tagCount}>{filteredTags.length} tag{filteredTags.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Tag Name</th>
              <th style={{ width: '50%' }}>Description</th>
              <th style={{ width: '20%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className={styles.editRow}>
                <td><Input size="small" placeholder="tag_name" value={newName} onChange={(_, d) => setNewName(d.value)} autoFocus /></td>
                <td><Input size="small" placeholder="Optional description" value={newDoc} onChange={(_, d) => setNewDoc(d.value)} /></td>
                <td className={styles.actions}>
                  <Button size="small" appearance="primary" onClick={handleAdd}>Save</Button>
                  <Button size="small" appearance="subtle" onClick={() => { setAdding(false); setNewName(''); setNewDoc(''); setLocalError(null); }}>Cancel</Button>
                </td>
              </tr>
            )}
            {isLoading ? (
              <tr><td colSpan={3} className={styles.empty}><Spinner size="tiny" label="Loading…" /></td></tr>
            ) : filteredTags.length === 0 && !adding ? (
              <tr><td colSpan={3} className={styles.empty}>
                <p>No custom tags yet.</p>
                <p className={styles.emptyHint}>Create your first custom tag using the 'New Tag' button above.</p>
              </td></tr>
            ) : (
              filteredTags.map(t => (
                editingName === t.tag_name ? (
                  <tr key={t.tag_name} className={styles.editRow}>
                    <td><Input size="small" value={editName} onChange={(_, d) => setEditName(d.value)} /></td>
                    <td><Input size="small" value={editDoc} onChange={(_, d) => setEditDoc(d.value)} /></td>
                    <td className={styles.actions}>
                      <Button size="small" appearance="primary" onClick={() => handleSaveEdit(t.tag_name)}>Save</Button>
                      <Button size="small" appearance="subtle" onClick={() => setEditingName(null)}>Cancel</Button>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.tag_name}>
                    <td className={styles.tagName}>{t.tag_name}</td>
                    <td className={styles.tagDoc}>{t.doc || '—'}</td>
                    <td className={styles.actions}>
                      <Button size="small" appearance="subtle" onClick={() => {
                        setEditingName(t.tag_name); setEditName(t.tag_name); setEditDoc(t.doc || ''); setAdding(false); setLocalError(null);
                      }}>Edit</Button>
                      <Popover
                        open={deleteTarget?.tag_name === t.tag_name}
                        onOpenChange={(_, d) => { if (!d.open) { setDeleteTarget(null); setTagPoints([]); setShowAllPoints(false); } }}
                        positioning="above-start"
                      >
                        <PopoverTrigger disableButtonEnhancement>
                          <Button
                            size="small"
                            appearance="subtle"
                            onClick={() => handleOpenDeletePopover(t)}
                          >
                            Delete
                          </Button>
                        </PopoverTrigger>
                        <PopoverSurface style={{ maxWidth: 320, padding: 16 }}>
                          {t.usage_count === 0 ? (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                                Delete tag "{t.tag_name}"?
                              </div>
                              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 16 }}>
                                This tag is not used by any points. This action cannot be undone.
                              </div>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <Button size="small" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                                <Button size="small" appearance="primary" onClick={handleDelete}>Delete</Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <ErrorCircleRegular style={{ fontSize: 18, color: '#da3b01' }} />
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                  Cannot delete "{t.tag_name}"
                                </div>
                              </div>
                              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 4 }}>
                                This tag is assigned to {t.usage_count} point{t.usage_count !== 1 ? 's' : ''}:
                              </div>

                              {/* Point list */}
                              {tagPoints.length > 0 && (
                                <div style={{
                                  maxHeight: showAllPoints ? 200 : 100,
                                  overflowY: 'auto',
                                  marginBottom: 8,
                                  border: '1px solid var(--colorNeutralStroke2, #e0e0e0)',
                                  borderRadius: 4,
                                  fontSize: 12,
                                }}>
                                  {(showAllPoints ? tagPoints : tagPoints.slice(0, 3)).map((p, i) => (
                                    <div key={i} style={{
                                      padding: '4px 8px',
                                      borderBottom: '1px solid var(--colorNeutralStroke2, #f0f0f0)',
                                      display: 'flex', gap: 6,
                                    }}>
                                      <span style={{ color: '#888', minWidth: 48 }}>{p.serial_number}</span>
                                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {p.label || p.point_id}
                                      </span>
                                      <span style={{ color: '#888' }}>{p.point_type} #{p.point_index}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {tagPoints.length > 3 && !showAllPoints && (
                                <Button
                                  size="small"
                                  appearance="transparent"
                                  onClick={() => setShowAllPoints(true)}
                                  style={{ fontSize: 12, marginBottom: 8 }}
                                >
                                  ...and {tagPoints.length - 3} more — Show all {tagPoints.length}
                                </Button>
                              )}

                              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 16 }}>
                                Force delete will remove this tag from ALL points
                                listed above. This cannot be undone.
                              </div>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <Button size="small" onClick={() => { setDeleteTarget(null); setTagPoints([]); }}>Close</Button>
                                <Button
                                  size="small"
                                  appearance="primary"
                                  onClick={handleForceDelete}
                                  disabled={forceDeleting}
                                  style={{ background: '#da3b01', borderColor: '#da3b01' }}
                                >
                                  {forceDeleting ? 'Deleting…' : 'Force Delete'}
                                </Button>
                              </div>
                            </>
                          )}
                        </PopoverSurface>
                      </Popover>
                    </td>
                  </tr>
                )
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
