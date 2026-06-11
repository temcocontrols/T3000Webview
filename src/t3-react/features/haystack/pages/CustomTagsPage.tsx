import React, { useEffect, useMemo, useState } from 'react';
import { Spinner, Button, Input, Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions } from '@fluentui/react-components';
import { SearchRegular, AddRegular, DismissRegular, InfoRegular } from '@fluentui/react-icons';
import { useHaystackStore } from '../store/haystackStore';
import styles from './CustomTagsPage.module.css';

export const CustomTagsPage: React.FC = () => {
  const { tags, isLoading, error, fetchTags, createTag, updateTag, deleteTag } = useHaystackStore();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDoc, setNewDoc] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDoc, setEditDoc] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => { fetchTags(); }, []);

  const customTags = useMemo(() => tags.filter(t => t.category === 'custom'), [tags]);

  const filteredTags = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customTags;
    return customTags.filter(t => t.tag_name.toLowerCase().includes(q) || (t.doc || '').toLowerCase().includes(q));
  }, [customTags, search]);

  const handleAdd = async () => {
    if (!newName.trim()) { setLocalError('Tag name is required.'); return; }
    setLocalError(null);
    await createTag(newName.trim(), newDoc.trim() || undefined);
    setNewName(''); setNewDoc(''); setAdding(false);
  };

  const handleSaveEdit = async (oldName: string) => {
    if (!editName.trim()) { setLocalError('Tag name is required.'); return; }
    setLocalError(null);
    await updateTag(oldName, { doc: editDoc.trim() || undefined });
    setEditingName(null);
    fetchTags();
  };

  const handleDelete = async () => {
    if (deleteTarget) { await deleteTag(deleteTarget); setDeleteTarget(null); }
  };

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
                      <Button size="small" appearance="subtle" onClick={() => setDeleteTarget(t.tag_name)}>Delete</Button>
                    </td>
                  </tr>
                )
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(_, d) => { if (!d.open) setDeleteTarget(null); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle style={{ fontSize: 15, fontWeight: 600 }}>Delete Tag</DialogTitle>
            <DialogContent>
              Are you sure you want to delete <strong>{deleteTarget}</strong>? This action cannot be undone.
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" size="small" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button appearance="primary" size="small" onClick={handleDelete}>Delete</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
