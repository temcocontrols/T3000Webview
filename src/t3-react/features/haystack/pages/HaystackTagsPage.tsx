import React, { useEffect, useMemo, useState } from 'react';
import { Spinner, Button, Input } from '@fluentui/react-components';
import {
  AddRegular, SearchRegular, DeleteRegular, ArrowSyncRegular,
  WarningRegular, TagRegular, DismissRegular,
} from '@fluentui/react-icons';
import { useHaystackStore, TagDefinition } from '../store/haystackStore';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './HaystackTagsPage.module.css';

type RightTab = 'all' | 'custom' | 'deprecated' | 'batch';

interface BatchPoint {
  serial_number: number;
  point_type: string;
  point_index: string;
  point_id: string;
  label: string;
  units: string;
  tags: string[];
}

export const HaystackTagsPage: React.FC = () => {
  const { tags, tagTree, isLoading, error, fetchTags, fetchTagTree, updateTag, deleteTag, createTag, replaceTag } = useHaystackStore();
  const { devices } = useDeviceTreeStore();
  const [activeTab, setActiveTab] = useState<RightTab>('all');
  const [search, setSearch] = useState('');
  const [filterStandard, setFilterStandard] = useState(true);
  const [filterCustom, setFilterCustom] = useState(true);
  const [filterDeprecated, setFilterDeprecated] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagDefinition | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [replaceOld, setReplaceOld] = useState('');
  const [replaceNew, setReplaceNew] = useState('');

  // Batch state
  const [batchSerial, setBatchSerial] = useState<number | null>(null);
  const [batchPointType, setBatchPointType] = useState<string>('');
  const [batchSearch, setBatchSearch] = useState('');
  const [batchPoints, setBatchPoints] = useState<BatchPoint[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [batchAddTags, setBatchAddTags] = useState('');
  const [batchRemoveTags, setBatchRemoveTags] = useState('');
  const [batchReplaceOld, setBatchReplaceOld] = useState('');
  const [batchReplaceNew, setBatchReplaceNew] = useState('');

  useEffect(() => { fetchTags(); fetchTagTree(); }, []);

  const filteredTags = useMemo(() => tags.filter((t) => {
    if (search && !t.tag_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (t.category === 'haystack' && !filterStandard) return false;
    if (t.category === 'custom' && !filterCustom) return false;
    if (t.deprecated && !filterDeprecated) return false;
    if (activeTab === 'custom' && t.category !== 'custom') return false;
    if (activeTab === 'deprecated' && !t.deprecated) return false;
    return true;
  }), [tags, search, filterStandard, filterCustom, filterDeprecated, activeTab]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag(newTagName.trim());
    setNewTagName('');
  };

  const handleReplaceDeprecated = async () => {
    if (!replaceOld.trim() || !replaceNew.trim()) return;
    await replaceTag(replaceOld.trim(), replaceNew.trim());
    setReplaceOld(''); setReplaceNew('');
  };

  // ── Batch: fetch points ──
  const fetchBatchPoints = async () => {
    if (!batchSerial) return;
    setBatchLoading(true);
    try {
      const types = batchPointType ? [batchPointType] : ['INPUT', 'OUTPUT', 'VARIABLE'];
      const results: BatchPoint[] = [];
      for (const pt of types) {
        const table = pt === 'INPUT' ? 'input-points' : pt === 'OUTPUT' ? 'output-points' : 'variable-points';
        const key = pt === 'INPUT' ? 'input_points' : pt === 'OUTPUT' ? 'output_points' : 'variable_points';
        const idxField = pt === 'INPUT' ? 'inputIndex' : pt === 'OUTPUT' ? 'outputIndex' : 'variableIndex';
        const res = await fetch(`${API_BASE_URL}/api/t3_device/devices/${batchSerial}/${table}`);
        if (!res.ok) continue;
        const json = await res.json();
        const rows = json?.[key] ?? [];
        for (const row of rows) {
          const idx = String(row[idxField] ?? row.index ?? '');
          const prefix = pt === 'INPUT' ? 'in' : pt === 'OUTPUT' ? 'out' : 'var';
          results.push({
            serial_number: batchSerial, point_type: pt, point_index: idx,
            point_id: `dev${batchSerial}.${prefix}${idx}`,
            label: row.label || row.fullLabel || `${pt} ${idx}`,
            units: row.units || '', tags: [],
          });
        }
      }
      try {
        const tagRes = await fetch(`${API_BASE_URL}/api/haystack/point-tags/read`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serialNumbers: String(batchSerial) }),
        });
        if (tagRes.ok) {
          const tagData = await tagRes.json();
          const byKey = new Map<string, string[]>();
          for (const e of (tagData.entries || [])) {
            const k = `${e.point_type}:${e.point_index}`;
            if (!byKey.has(k)) byKey.set(k, []);
            byKey.get(k)!.push(e.tag_name);
          }
          for (const p of results) p.tags = byKey.get(`${p.point_type}:${p.point_index}`) || [];
        }
      } catch { /* ignore */ }
      setBatchPoints(results);
      setBatchSelected(new Set());
    } catch (e) { console.warn('Batch fetch failed:', e); }
    finally { setBatchLoading(false); }
  };

  const filteredBatchPoints = useMemo(() => {
    const q = batchSearch.toLowerCase();
    if (!q) return batchPoints;
    return batchPoints.filter(p => p.label.toLowerCase().includes(q) || p.units.toLowerCase().includes(q) || p.point_id.toLowerCase().includes(q));
  }, [batchPoints, batchSearch]);

  const toggleBatchSelect = (key: string) => setBatchSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleBatchAll = () => setBatchSelected(batchSelected.size === filteredBatchPoints.length ? new Set() : new Set(filteredBatchPoints.map(p => `${p.point_type}:${p.point_index}`)));

  const handleBatchAddTags = async () => {
    const tagsToAdd = batchAddTags.split(',').map(t => t.trim()).filter(Boolean);
    if (!tagsToAdd.length || batchSelected.size === 0) return;
    const updates = Array.from(batchSelected).map(key => {
      const [pt, pi] = key.split(':');
      const p = batchPoints.find(x => x.point_type === pt && x.point_index === pi);
      return { serial_number: batchSerial!, point_type: pt, point_index: pi, point_id: p?.point_id || '', add_tags: tagsToAdd };
    });
    await fetch(`${API_BASE_URL}/api/haystack/point-tags/write`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    setBatchAddTags(''); fetchBatchPoints();
  };

  const handleBatchRemoveTags = async () => {
    const tagsToRemove = batchRemoveTags.split(',').map(t => t.trim()).filter(Boolean);
    if (!tagsToRemove.length || batchSelected.size === 0) return;
    const updates = Array.from(batchSelected).map(key => {
      const [pt, pi] = key.split(':');
      const p = batchPoints.find(x => x.point_type === pt && x.point_index === pi);
      return { serial_number: batchSerial!, point_type: pt, point_index: pi, point_id: p?.point_id || '', remove_tags: tagsToRemove };
    });
    await fetch(`${API_BASE_URL}/api/haystack/point-tags/write`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    setBatchRemoveTags(''); fetchBatchPoints();
  };

  const handleBatchReplaceTags = async () => {
    if (!batchReplaceOld.trim() || !batchReplaceNew.trim() || batchSelected.size === 0) return;
    const updates = Array.from(batchSelected).map(key => {
      const [pt, pi] = key.split(':');
      const p = batchPoints.find(x => x.point_type === pt && x.point_index === pi);
      return { serial_number: batchSerial!, point_type: pt, point_index: pi, point_id: p?.point_id || '', add_tags: [batchReplaceNew.trim()], remove_tags: [batchReplaceOld.trim()] };
    });
    await fetch(`${API_BASE_URL}/api/haystack/point-tags/write`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    setBatchReplaceOld(''); setBatchReplaceNew(''); fetchBatchPoints();
  };

  // ── Tree rendering ──
  const renderTreeNode = (node: any, depth: number = 0): React.ReactNode => (
    <div key={node.tag_name} className={styles.treeItem} style={{ paddingLeft: 8 + depth * 16 }}>
      <span
        className={`${styles.treeLabel} ${selectedTag?.tag_name === node.tag_name ? styles.treeLabelActive : ''}`}
        onClick={() => { const found = tags.find(t => t.tag_name === node.tag_name); setSelectedTag(found || null); if (found) setSearch(found.tag_name); }}
      >
        {node.deprecated ? '⚠ ' : ''}{node.tag_name}
        {node.children?.length > 0 && <span className={styles.treeCount}> ({node.children.length})</span>}
      </span>
      {node.children?.map((c: any) => renderTreeNode(c, depth + 1))}
    </div>
  );

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.errorBanner}>
          <WarningRegular /> {error}
          <Button size="small" appearance="subtle" onClick={() => { fetchTags(); fetchTagTree(); }}>Retry</Button>
        </div>
      )}
      <div className={styles.main}>
        {/* ── Left Panel: Tag Library ── */}
        <aside className={styles.leftPanel}>
          <div className={styles.leftHeader}><TagRegular /><span>Tag Library</span></div>
          <Input placeholder="Search tags…" value={search} onChange={(_, d) => setSearch(d.value)} contentBefore={<SearchRegular />} className={styles.searchInput} />
          <div className={styles.filterChecks}>
            <label className={styles.filterChip}><input type="checkbox" checked={filterStandard} onChange={() => setFilterStandard(!filterStandard)} />Standard</label>
            <label className={styles.filterChip}><input type="checkbox" checked={filterCustom} onChange={() => setFilterCustom(!filterCustom)} />Custom</label>
            <label className={styles.filterChip}><input type="checkbox" checked={filterDeprecated} onChange={() => setFilterDeprecated(!filterDeprecated)} />Deprecated</label>
          </div>
          <div className={styles.treeContainer}>
            {isLoading ? <Spinner size="tiny" label="Loading…" /> : tagTree.length === 0 ? <div className={styles.emptyTree}>No tag tree loaded</div> : tagTree.map((n) => renderTreeNode(n))}
          </div>
          <div className={styles.leftFooter}>
            <Button size="small" icon={<ArrowSyncRegular />} appearance="subtle" onClick={() => { fetchTags(); fetchTagTree(); }}>Refresh</Button>
          </div>
        </aside>

        {/* ── Right Panel ── */}
        <div className={styles.rightPanel}>
          <div className={styles.tabBar}>
            {(['all', 'custom', 'deprecated', 'batch'] as RightTab[]).map(tab => (
              <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'all' ? 'All Tags' : tab === 'custom' ? 'Custom Tags' : tab === 'deprecated' ? 'Deprecated Tags' : 'Batch Assign'}
              </button>
            ))}
          </div>
          <div className={styles.tabContent}>
            {/* ── All Tags / Custom Tags ── */}
            {activeTab !== 'deprecated' && activeTab !== 'batch' && (
              <>
                {activeTab === 'custom' && (
                  <div className={styles.addTagForm}>
                    <Input placeholder="New tag name" value={newTagName} onChange={(_, d) => setNewTagName(d.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()} className={styles.addTagInput} />
                    <Button size="small" icon={<AddRegular />} onClick={handleCreateTag}>Add Custom Tag</Button>
                  </div>
                )}
                {isLoading ? (
                  <div className={styles.emptyState}><Spinner size="tiny" label="Loading…" /></div>
                ) : filteredTags.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No tags found</p>
                    <p className={styles.emptyHint}>{tags.length === 0 ? 'Restart the backend to run migrations and seed the tag library.' : 'No tags match your filters.'}</p>
                  </div>
                ) : (
                  <table className={styles.tagTable}><thead><tr><th>Tag Name</th><th>Category</th><th>Parents</th><th>Deprecated</th><th>Used By</th><th className={styles.actionsCol}>Actions</th></tr></thead><tbody>
                    {filteredTags.map((t) => (
                      <tr key={t.tag_name} className={t.deprecated ? styles.deprecatedRow : undefined}>
                        <td className={styles.tagName}>{t.deprecated ? '⚠ ' : ''}<span className={styles.tagNameLink} onClick={() => setSelectedTag(t)}>{t.tag_name}</span></td>
                        <td><span className={t.category === 'haystack' ? styles.badgeStandard : styles.badgeCustom}>{t.category === 'haystack' ? 'standard' : 'custom'}</span></td>
                        <td className={styles.parents}>{t.parents?.join(', ') || '—'}</td>
                        <td>{t.deprecated ? 'Yes' : '—'}</td><td>{t.usage_count}</td>
                        <td className={styles.actionCell}>
                          {!t.deprecated && <Button size="small" appearance="subtle" onClick={() => updateTag(t.tag_name, { deprecated: true }).then(() => fetchTags())}>Deprecate</Button>}
                          {t.category === 'custom' && t.usage_count === 0 && <Button size="small" appearance="subtle" icon={<DeleteRegular />} onClick={() => deleteTag(t.tag_name)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                )}
              </>
            )}

            {/* ── Deprecated Tags ── */}
            {activeTab === 'deprecated' && (
              <div className={styles.deprecatedPanel}>
                <div className={styles.replaceForm}>
                  <h3>Replace Deprecated Tag Globally</h3>
                  <p className={styles.replaceHelp}>Replaces all occurrences of a deprecated tag on all points with a new tag.</p>
                  <div className={styles.replaceRow}>
                    <Input placeholder="Old tag (e.g. supply)" value={replaceOld} onChange={(_, d) => setReplaceOld(d.value)} />
                    <span className={styles.replaceArrow}>→</span>
                    <Input placeholder="New tag (e.g. supplyAir)" value={replaceNew} onChange={(_, d) => setReplaceNew(d.value)} />
                    <Button appearance="primary" size="small" onClick={handleReplaceDeprecated} disabled={!replaceOld.trim() || !replaceNew.trim()}>Replace Globally</Button>
                  </div>
                </div>
                <h4>Currently Deprecated Tags</h4>
                {isLoading ? <Spinner size="tiny" /> : (
                  <table className={styles.tagTable}><thead><tr><th>Tag Name</th><th>Category</th><th>Used By</th><th>Actions</th></tr></thead><tbody>
                    {filteredTags.filter(t => t.deprecated).map((t) => (
                      <tr key={t.tag_name} className={styles.deprecatedRow}><td className={styles.tagName}>⚠ {t.tag_name}</td><td>{t.category}</td><td>{t.usage_count} pts</td>
                        <td><Button size="small" appearance="subtle" onClick={() => setReplaceOld(t.tag_name)}>Start Replace</Button></td></tr>
                    ))}
                    {filteredTags.filter(t => t.deprecated).length === 0 && <tr><td colSpan={4} className={styles.emptyCell}>No deprecated tags</td></tr>}
                  </tbody></table>
                )}
              </div>
            )}

            {/* ── Batch Assign ── */}
            {activeTab === 'batch' && (
              <div className={styles.batchPanel}>
                <div className={styles.batchFilters}>
                  <select className={styles.batchSelect} value={batchSerial ?? ''} onChange={(e) => setBatchSerial(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Select device…</option>
                    {(devices || []).map(d => <option key={d.serialNumber} value={d.serialNumber}>{d.deviceName || d.serialNumber}</option>)}
                  </select>
                  <select className={styles.batchSelect} value={batchPointType} onChange={(e) => setBatchPointType(e.target.value)}>
                    <option value="">All point types</option><option value="INPUT">Inputs</option><option value="OUTPUT">Outputs</option><option value="VARIABLE">Variables</option>
                  </select>
                  <Button size="small" icon={<SearchRegular />} onClick={fetchBatchPoints} disabled={!batchSerial}>Load Points</Button>
                </div>
                <Input placeholder="Filter points by label or units…" value={batchSearch} onChange={(_, d) => setBatchSearch(d.value)} contentBefore={<SearchRegular />} className={styles.batchSearch} />
                {batchLoading ? <Spinner size="tiny" label="Loading…" /> : batchPoints.length > 0 ? (
                  <>
                    <div className={styles.batchActions}>
                      <div className={styles.batchActionRow}>
                        <Input placeholder="Add tags (comma-separated)" value={batchAddTags} onChange={(_, d) => setBatchAddTags(d.value)} className={styles.batchTagInput} />
                        <Button size="small" icon={<AddRegular />} onClick={handleBatchAddTags} disabled={batchSelected.size === 0}>Add to {batchSelected.size}</Button>
                      </div>
                      <div className={styles.batchActionRow}>
                        <Input placeholder="Remove tags (comma-separated)" value={batchRemoveTags} onChange={(_, d) => setBatchRemoveTags(d.value)} className={styles.batchTagInput} />
                        <Button size="small" icon={<DismissRegular />} onClick={handleBatchRemoveTags} disabled={batchSelected.size === 0}>Remove from {batchSelected.size}</Button>
                      </div>
                      <div className={styles.batchActionRow}>
                        <Input placeholder="Old tag" value={batchReplaceOld} onChange={(_, d) => setBatchReplaceOld(d.value)} className={styles.batchTagInputSmall} />
                        <span className={styles.replaceArrow}>→</span>
                        <Input placeholder="New tag" value={batchReplaceNew} onChange={(_, d) => setBatchReplaceNew(d.value)} className={styles.batchTagInputSmall} />
                        <Button size="small" onClick={handleBatchReplaceTags} disabled={batchSelected.size === 0}>Replace on {batchSelected.size}</Button>
                      </div>
                    </div>
                    <table className={styles.tagTable}><thead><tr><th style={{ width: 32 }}><input type="checkbox" checked={batchSelected.size === filteredBatchPoints.length && filteredBatchPoints.length > 0} onChange={toggleBatchAll} /></th><th>Point</th><th>Label</th><th>Units</th><th>Current Tags</th></tr></thead><tbody>
                      {filteredBatchPoints.map((p) => {
                        const key = `${p.point_type}:${p.point_index}`;
                        const dt = p.tags.slice(0, 3); const ex = p.tags.length - 3;
                        return (
                          <tr key={key} className={batchSelected.has(key) ? styles.selectedRow : undefined}>
                            <td><input type="checkbox" checked={batchSelected.has(key)} onChange={() => toggleBatchSelect(key)} /></td>
                            <td className={styles.tagName}>{p.point_id}</td><td>{p.label}</td><td>{p.units || '—'}</td>
                            <td><div className={styles.tagChips}>{dt.map(t => <span key={t} className={styles.tagChipBlue}>{t}</span>)}{ex > 0 && <span className={styles.tagChipMore}>+{ex}</span>}{p.tags.length === 0 && <span className={styles.noTags}>none</span>}</div></td>
                          </tr>
                        );
                      })}
                    </tbody></table>
                  </>
                ) : batchSerial ? <div className={styles.emptyState}><p>No points found</p></div> : <div className={styles.emptyState}><p>Batch Tag Assignment</p><p className={styles.emptyHint}>Select a device and click Load Points.</p></div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tag Detail Panel ── */}
      {selectedTag && (
        <aside className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <span>{selectedTag.deprecated ? '⚠ ' : ''}{selectedTag.tag_name}</span>
            <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={() => setSelectedTag(null)} />
          </div>
          <div className={styles.detailBody}>
            <div className={styles.detailRow}><span className={styles.detailLabel}>Category</span><span>{selectedTag.category}</span></div>
            <div className={styles.detailRow}><span className={styles.detailLabel}>Deprecated</span><span>{selectedTag.deprecated ? 'Yes' : 'No'}</span></div>
            <div className={styles.detailRow}><span className={styles.detailLabel}>Parents</span><span>{selectedTag.parents?.join(', ') || '—'}</span></div>
            <div className={styles.detailRow}><span className={styles.detailLabel}>Used By</span><span>{selectedTag.usage_count} points</span></div>
            {selectedTag.doc && <div className={styles.detailRow}><span className={styles.detailLabel}>Description</span><span>{selectedTag.doc}</span></div>}
          </div>
          <div className={styles.detailActions}>
            {!selectedTag.deprecated && <Button size="small" appearance="subtle" onClick={() => updateTag(selectedTag.tag_name, { deprecated: true }).then(() => fetchTags())}>Deprecate</Button>}
            {selectedTag.category === 'custom' && selectedTag.usage_count === 0 && <Button size="small" appearance="subtle" icon={<DeleteRegular />} onClick={() => { deleteTag(selectedTag.tag_name); setSelectedTag(null); }}>Delete</Button>}
          </div>
        </aside>
      )}
    </div>
  );
};

export default HaystackTagsPage;
