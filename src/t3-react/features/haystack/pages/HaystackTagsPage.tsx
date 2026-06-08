import React, { useEffect, useMemo, useState } from 'react';
import {
  Spinner, Button, Input,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components';
import { SearchRegular, ArrowSyncRegular, InfoRegular, AddRegular, SubtractRegular } from '@fluentui/react-icons';
import { useHaystackStore } from '../store/haystackStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './HaystackTagsPage.module.css';

export const HaystackTagsPage: React.FC = () => {
  const { tags, tagTree, isLoading, error, fetchTags, fetchTagTree } = useHaystackStore();
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; count?: number; msg?: string } | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedTreeNode, setSelectedTreeNode] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => { fetchTags(); fetchTagTree(); }, []);

  const collectAllIds = (nodes: any[]): string[] => {
    const ids: string[] = [];
    const walk = (n: any) => { ids.push(n.tag_name); n.children?.forEach(walk); };
    nodes.forEach(walk);
    return ids;
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const expandAll = () => {
    const ids = collectAllIds(tagTree);
    setExpanded(new Set(ids));
    setAllExpanded(true);
  };

  const collapseAll = () => {
    setExpanded(new Set());
    setAllExpanded(false);
  };

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
    setSyncResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/haystack/sync`, { method: 'POST' });
      const data = await res.json();
      setSyncResult({ ok: true, count: data.count ?? data.inserted });
      await fetchTags();
      await fetchTagTree();
    } catch (e: any) {
      setSyncResult({ ok: false, msg: e.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const renderTreeNode = (node: any, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children?.length > 0;
    const isExpanded = expanded.has(node.tag_name);
    const isSelected = selectedTreeNode === node.tag_name;

    return (
      <div key={node.tag_name}>
        <div
          className={`${styles.treeItem} ${isSelected ? styles.treeItemActive : ''}`}
          style={{ paddingLeft: 8 + depth * 16 }}
          onClick={() => {
            setSelectedTreeNode(isSelected ? '' : node.tag_name);
            if (hasChildren) toggleExpand(node.tag_name);
          }}
        >
          <span className={styles.treeToggle}>
            {hasChildren ? (
              <span className={styles.toggleIcon}>{isExpanded ? '−' : '+'}</span>
            ) : (
              <span className={styles.togglePlaceholder} />
            )}
          </span>
          <span className={`${styles.treeLabel} ${isSelected ? styles.treeLabelActive : ''} ${node.category !== 'haystack' ? styles.treeLabelCustom : ''}`}>
            {node.tag_name}
            {hasChildren && <span className={styles.treeCount}>{node.children.length}</span>}
          </span>
        </div>
        {hasChildren && isExpanded && node.children.map((c: any) => renderTreeNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* ── Sync Progress Bar ── */}
      {syncing && (
        <div className={styles.syncBar}>
          <Spinner size="extra-tiny" /> Syncing official tags from project-haystack.org…
        </div>
      )}

      {/* ── Sync Result Bar ── */}
      {syncResult && !syncing && (
        <div className={`${styles.syncBar} ${syncResult.ok ? styles.syncSuccess : styles.syncError}`}>
          {syncResult.ok
            ? `✓ Successfully synced ${syncResult.count} standard tags from project-haystack.org.`
            : `✗ Sync failed: ${syncResult.msg}`}
        </div>
      )}

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
          <div className={styles.leftHeader}>
            <span>Tags Tree</span>
            <span className={styles.treeActions}>
              <Button
                size="small"
                appearance="subtle"
                icon={allExpanded ? <AddRegular style={{ fontSize: 11 }} /> : <SubtractRegular style={{ fontSize: 11 }} />}
                onClick={() => allExpanded ? collapseAll() : expandAll()}
              >
                {allExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </span>
          </div>
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
                <p>No tag tree loaded.</p>
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
              {standardTags.length === 0 ? (
                <p className={styles.emptyHint}>
                  Click 'Sync official tags' above to pull the standard tag library from project-haystack.org.
                </p>
              ) : (
                <p className={styles.emptyHint}>No tags match your filter.</p>
              )}
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
