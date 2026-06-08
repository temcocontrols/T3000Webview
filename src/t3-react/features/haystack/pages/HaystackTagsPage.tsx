import React, { useEffect, useMemo, useState } from 'react';
import {
  Spinner, Button, Input,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components';
import { SearchRegular, ArrowSyncRegular, InfoRegular } from '@fluentui/react-icons';
import { useHaystackStore } from '../store/haystackStore';
import styles from './HaystackTagsPage.module.css';

export const HaystackTagsPage: React.FC = () => {
  const { tags, tagTree, isLoading, error, fetchTags, fetchTagTree } = useHaystackStore();
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedTreeNode, setSelectedTreeNode] = useState<string>('');

  useEffect(() => { fetchTags(); fetchTagTree(); }, []);

  const standardTags = useMemo(() =>
    tags.filter(t => t.category === 'haystack'),
  [tags]);

  const filteredTags = useMemo(() => {
    const q = search.toLowerCase();
    if (!q && !selectedTreeNode) return standardTags;
    return standardTags.filter(t => {
      if (q && !t.tag_name.toLowerCase().includes(q)) return false;
      if (selectedTreeNode) {
        const allParents = new Set(t.parents);
        if (t.tag_name !== selectedTreeNode && !allParents.has(selectedTreeNode)) return false;
      }
      return true;
    });
  }, [standardTags, search, selectedTreeNode]);

  const handleSync = async () => {
    setSyncDialogOpen(false);
    setSyncing(true);
    try {
      await fetchTags();
      await fetchTagTree();
    } finally {
      setSyncing(false);
    }
  };

  const renderTreeNode = (node: any, depth: number = 0): React.ReactNode => (
    <div key={node.tag_name} className={styles.treeItem} style={{ paddingLeft: 8 + depth * 14 }}>
      <span
        className={`${styles.treeLabel} ${selectedTreeNode === node.tag_name ? styles.treeLabelActive : ''} ${node.category !== 'haystack' ? styles.treeLabelCustom : ''}`}
        onClick={() => setSelectedTreeNode(selectedTreeNode === node.tag_name ? '' : node.tag_name)}
      >
        {node.tag_name}
        {node.children?.length > 0 && <span className={styles.treeCount}> ({node.children.length})</span>}
      </span>
      {node.children?.map((c: any) => renderTreeNode(c, depth + 1))}
    </div>
  );

  return (
    <div className={styles.container}>
      {/* ── Info Bar ── */}
      <div className={styles.infoBar}>
        <div className={styles.infoBarLeft}>
          <InfoRegular className={styles.infoIcon} />
          <div className={styles.infoText}>
            <span className={styles.infoTitle}>Standard Tags</span>
            <div className={styles.infoDesc}>
              Project Haystack is an open source standard that defines semantic data models for IoT,
              automation, HVAC, lighting, and environmental systems.{' '}
              <a href="https://project-haystack.org/" target="_blank" rel="noopener noreferrer" className={styles.infoLink}>
                Learn more ↗
              </a>
            </div>
            <div className={styles.infoMeta}>
              Tags imported from the official{' '}
              <a href="https://github.com/Project-Haystack/haystack-defs" target="_blank" rel="noopener noreferrer" className={styles.infoLink}>
                haystack-defs
              </a>
              {' '}v4 specification. Use these tags to semantically label your points (Inputs, Outputs, Variables)
              for consistent data modeling across the building automation system.
            </div>
          </div>
        </div>
        <Button
          size="small"
          appearance="transparent"
          icon={<ArrowSyncRegular style={{ fontSize: 14 }} />}
          onClick={() => setSyncDialogOpen(true)}
          disabled={syncing}
          className={styles.syncButton}
        >
          {syncing ? 'Syncing…' : 'Sync official tags'}
        </Button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

      <div className={styles.main}>
        {/* ── Left Panel: Tag Tree ── */}
        <aside className={styles.leftPanel}>
          <div className={styles.leftHeader}>Tree</div>
          <Input
            placeholder="Filter tags…"
            value={search}
            onChange={(_, d) => { setSearch(d.value); setSelectedTreeNode(''); }}
            contentBefore={<SearchRegular />}
            className={styles.searchInput}
          />
          <div className={styles.treeContainer}>
            {isLoading ? (
              <Spinner size="tiny" label="Loading…" />
            ) : tagTree.length === 0 ? (
              <div className={styles.emptyTree}>
                <p>No tag tree loaded</p>
                <p className={styles.emptyHint}>Start the backend and run migrations.</p>
              </div>
            ) : (
              tagTree.map((n) => renderTreeNode(n))
            )}
          </div>
          {selectedTreeNode && (
            <div className={styles.treeClear}>
              <Button size="small" appearance="subtle" onClick={() => setSelectedTreeNode('')}>
                Clear filter
              </Button>
            </div>
          )}
        </aside>

        {/* ── Right Panel: Tag Table ── */}
        <div className={styles.rightPanel}>
          {isLoading ? (
            <div className={styles.emptyState}><Spinner size="tiny" label="Loading…" /></div>
          ) : filteredTags.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No tags found</p>
              <p className={styles.emptyHint}>
                {standardTags.length === 0
                  ? 'Restart the backend to run migrations and seed the standard tag library.'
                  : 'No tags match your filter.'}
              </p>
            </div>
          ) : (
            <table className={styles.tagTable}>
              <thead>
                <tr>
                  <th>Tag Name</th>
                  <th>Parents</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.map((t) => (
                  <tr key={t.tag_name}>
                    <td className={styles.tagName}>{t.tag_name}</td>
                    <td className={styles.parents}>{t.parents?.join(', ') || '—'}</td>
                    <td className={styles.description}>{t.doc || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Sync Dialog ── */}
      <Dialog open={syncDialogOpen} onOpenChange={(_, data) => setSyncDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle style={{ fontSize: 15, fontWeight: 600 }}>Sync Official Tags</DialogTitle>
            <DialogContent>
              <div className={styles.syncDialogContent}>
                <p>
                  This will refresh the standard tag library from the official{' '}
                  <a href="https://github.com/Project-Haystack/haystack-defs" target="_blank" rel="noopener noreferrer">
                    Project Haystack haystack-defs
                  </a>
                  {' '}v4 specification.
                </p>
                <p>
                  Project Haystack is an open source standard that defines semantic data models
                  for IoT, HVAC, lighting, and building automation systems. These tags help you
                  consistently label your points across the entire system.
                </p>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" size="small" style={{ fontWeight: 400 }} onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
              <Button appearance="primary" size="small" style={{ fontWeight: 400 }} onClick={handleSync}>Sync Now</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default HaystackTagsPage;
