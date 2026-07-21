import React, { useEffect, useState } from 'react';
import { Spinner, Button, Input, Tab, TabList, Select } from '@fluentui/react-components';
import { AddRegular, SearchRegular, DeleteRegular } from '@fluentui/react-icons';
import { useHaystackStore, TagDefinition } from '../store/haystackStore';
import { TagAssignmentDrawer } from '../components/TagAssignmentDrawer';
import styles from './HaystackTagsPage.module.css';

type RightTab = 'all' | 'custom' | 'deprecated' | 'batch';

export const HaystackTagsPage: React.FC = () => {
  const { tags, tagTree, isLoading, fetchTags, fetchTagTree, updateTag, deleteTag, replaceTag, createTag } = useHaystackStore();
  const [activeTab, setActiveTab] = useState<RightTab>('all');
  const [search, setSearch] = useState('');
  const [filterStandard, setFilterStandard] = useState(true);
  const [filterCustom, setFilterCustom] = useState(true);
  const [filterDeprecated, setFilterDeprecated] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagDefinition | null>(null);
  const [replaceOld, setReplaceOld] = useState('');
  const [replaceNew, setReplaceNew] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagDoc, setNewTagDoc] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchTags();
    fetchTagTree();
  }, []);

  // ── Filters ──
  const filteredTags = tags.filter((t) => {
    if (search && !t.tag_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (t.category === 'haystack' && !filterStandard) return false;
    if (t.category === 'custom' && !filterCustom) return false;
    if (t.deprecated && !filterDeprecated) return false;
    if (activeTab === 'custom' && t.category !== 'custom') return false;
    if (activeTab === 'deprecated' && !t.deprecated) return false;
    return true;
  });

  // ── Tree rendering ──
  const renderTreeNode = (node: any, depth: number = 0): React.ReactNode => (
    <div key={node.tag_name} className={styles.treeItem} style={{ paddingLeft: depth * 16 }}>
      <span
        className={`${styles.treeLabel} ${selectedTag?.tag_name === node.tag_name ? styles.treeLabelActive : ''}`}
        onClick={() => setSelectedTag(tags.find((t) => t.tag_name === node.tag_name) || null)}
      >
        {node.deprecated ? '⚠️ ' : ''}{node.tag_name}
      </span>
      {node.children?.map((c: any) => renderTreeNode(c, depth + 1))}
    </div>
  );

  return (
    <div className={styles.container}>
      {/* ── Left Panel: Tag Library ── */}
      <div className={styles.leftPanel}>
        <div className={styles.leftHeader}>Tag Library</div>
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          contentBefore={<SearchRegular />}
          className={styles.searchInput}
        />
        <div className={styles.filterChecks}>
          <label><input type="checkbox" checked={filterStandard} onChange={() => setFilterStandard(!filterStandard)} /> Standard</label>
          <label><input type="checkbox" checked={filterCustom} onChange={() => setFilterCustom(!filterCustom)} /> Custom</label>
          <label><input type="checkbox" checked={filterDeprecated} onChange={() => setFilterDeprecated(!filterDeprecated)} /> Deprecated</label>
        </div>
        <div className={styles.treeContainer}>
          {isLoading ? <Spinner size="tiny" /> : tagTree.map((n) => renderTreeNode(n))}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className={styles.rightPanel}>
        <TabList selectedValue={activeTab} onTabSelect={(_, d) => setActiveTab(d.value as RightTab)}>
          <Tab value="all">All Tags</Tab>
          <Tab value="custom">Custom Tags</Tab>
          <Tab value="deprecated">Deprecated Tags</Tab>
          <Tab value="batch">Batch Assign</Tab>
        </TabList>

        <div className={styles.tabContent}>
          {/* ── All / Custom / Deprecated Tabs ── */}
          {activeTab !== 'batch' && (
            <>
              {activeTab === 'custom' && (
                <div className={styles.addTagForm}>
                  <Input placeholder="Tag name" value={newTagName} onChange={(_, d) => setNewTagName(d.value)} />
                  <Input placeholder="Description (optional)" value={newTagDoc} onChange={(_, d) => setNewTagDoc(d.value)} />
                  <Button icon={<AddRegular />} onClick={async () => {
                    if (newTagName) { await createTag(newTagName, newTagDoc || undefined); setNewTagName(''); setNewTagDoc(''); }
                  }}>Add</Button>
                </div>
              )}
              <table className={styles.tagTable}>
                <thead>
                  <tr>
                    <th>Tag Name</th>
                    <th>Category</th>
                    <th>Parents</th>
                    <th>Deprecated</th>
                    <th>Used By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTags.map((t) => (
                    <tr key={t.tag_name}>
                      <td>{t.tag_name}</td>
                      <td>{t.category}</td>
                      <td>{t.parents?.join(', ') || '-'}</td>
                      <td>{t.deprecated ? '⚠️ Yes' : 'No'}</td>
                      <td>{t.usage_count} pts</td>
                      <td className={styles.actionCell}>
                        {!t.deprecated && (
                          <Button size="small" onClick={() => updateTag(t.tag_name, { deprecated: true })}>Deprecate</Button>
                        )}
                        {t.category === 'custom' && t.usage_count === 0 && (
                          <Button size="small" icon={<DeleteRegular />} onClick={() => deleteTag(t.tag_name)}>Delete</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── Deprecated Replace ── */}
          {activeTab === 'deprecated' && (
            <div className={styles.replaceForm}>
              <h3>Replace Deprecated Tag</h3>
              <Input placeholder="Old tag" value={replaceOld} onChange={(_, d) => setReplaceOld(d.value)} />
              <Input placeholder="New tag" value={replaceNew} onChange={(_, d) => setReplaceNew(d.value)} />
              <Button onClick={async () => { await replaceTag(replaceOld, replaceNew); setReplaceOld(''); setReplaceNew(''); }}>
                Replace Globally
              </Button>
            </div>
          )}

          {/* ── Batch Assign Tab ── */}
          {activeTab === 'batch' && (
            <div className={styles.batchPanel}>
              <p>Use the Tag Assignment Drawer from Inputs/Outputs/Variables pages to batch-assign tags to points.</p>
              <p>Select points in the table, then open the TAGS column to assign tags to all selected points at once.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tag Assignment Drawer ── */}
      {drawerOpen && (
        <TagAssignmentDrawer
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
};

export default HaystackTagsPage;
