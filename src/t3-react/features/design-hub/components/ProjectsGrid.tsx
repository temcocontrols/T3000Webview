/**
 * Design Hub — Projects (unified across engines, tabbed, sortable, selectable)
 */
import React, { useMemo, useState } from 'react';
import { Button, Input, Tooltip } from '@fluentui/react-components';
import {
  SearchRegular,
  GridRegular,
  ListRegular,
  SelectAllOnRegular,
  DeleteRegular,
  ArrowDownloadRegular,
} from '@fluentui/react-icons';
import type { HubProject, HubView, ProjectTab, SortKey } from '../types';
import { getDrawingType } from '../drawingTypes';
import { HubIcon } from '../icons';
import { designHubService } from '../services/designHubService';
import { useDesignHubStore } from '../store/designHubStore';
import { ProjectCard } from './ProjectCard';
import { DeleteProjectPopover } from './DeleteProjectPopover';
import styles from '../pages/DesignHubPage.module.css';

const TABS: { id: ProjectTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'hvac', label: 'HVAC' },
  { id: 'lvgl-9-5', label: 'LVGL 9.5' },
  { id: 'lvgl-flow-9-5', label: 'LVGL + Flow 9.5' },
];

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'updated', label: 'Recently updated' },
  { id: 'name', label: 'Name' },
  { id: 'created', label: 'Recently created' },
];

function timeAgo(iso: string): string {
  try {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch {
    return '';
  }
}

export const ProjectsGrid: React.FC<{ onBind: (project: HubProject) => void }> = ({ onBind }) => {
  const projects = useDesignHubStore((s) => s.projects);
  const activeTab = useDesignHubStore((s) => s.activeTab);
  const search = useDesignHubStore((s) => s.search);
  const favorites = useDesignHubStore((s) => s.favorites);
  const sortBy = useDesignHubStore((s) => s.sortBy);
  const view = useDesignHubStore((s) => s.view);
  const selecting = useDesignHubStore((s) => s.selecting);
  const selectedIds = useDesignHubStore((s) => s.selectedIds);
  const activeFolder = useDesignHubStore((s) => s.activeFolder);
  const setActiveTab = useDesignHubStore((s) => s.setActiveTab);
  const setSearch = useDesignHubStore((s) => s.setSearch);
  const setSortBy = useDesignHubStore((s) => s.setSortBy);
  const setView = useDesignHubStore((s) => s.setView);
  const setSelecting = useDesignHubStore((s) => s.setSelecting);
  const toggleSelect = useDesignHubStore((s) => s.toggleSelect);
  const clearSelection = useDesignHubStore((s) => s.clearSelection);
  const deleteProjects = useDesignHubStore((s) => s.deleteProjects);
  const exportHub = useDesignHubStore((s) => s.exportHub);

  // The project currently targeted by the delete confirmation dialog.
  const [deleteTarget, setDeleteTarget] = useState<HubProject | null>(null);

  const selectMode = selecting || selectedIds.length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      switch (activeTab) {
        case 'hvac':
          if (p.engine !== 'hvac') return false;
          break;
        case 'lvgl-9-5':
          if (p.typeId !== 'lvgl-9-5') return false;
          break;
        case 'lvgl-flow-9-5':
          if (p.typeId !== 'lvgl-flow-9-5') return false;
          break;
        default:
          break;
      }
      if (q) {
        const hay = `${p.name} ${p.description || ''} ${p.typeId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // folder filter
      if (activeFolder) {
        const folderId = designHubService.getProjectFolder(p.id);
        if (activeFolder === '__none') {
          if (folderId) return false;
        } else if (folderId !== activeFolder) {
          return false;
        }
      }
      return true;
    });
  }, [projects, activeTab, search, activeFolder]);

  const sorted = useMemo(() => {
    const favSet = new Set(favorites);
    const f = [...filtered];
    f.sort((a, b) => {
      const af = favSet.has(a.id) ? 0 : 1;
      const bf = favSet.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return b.createdAt.localeCompare(a.createdAt);
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
    return f;
  }, [filtered, favorites, sortBy]);

  const countFor = (tab: ProjectTab): number => {
    switch (tab) {
      case 'hvac':
        return projects.filter((p) => p.engine === 'hvac').length;
      case 'lvgl-9-5':
        return projects.filter((p) => p.typeId === 'lvgl-9-5').length;
      case 'lvgl-flow-9-5':
        return projects.filter((p) => p.typeId === 'lvgl-flow-9-5').length;
      default:
        return projects.length;
    }
  };

  const handleExport = () => {
    const blob = exportHub();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete ${selectedIds.length} selected drawing(s)?`)) {
      deleteProjects(selectedIds);
    }
  };

  const handleDeleteOne = (id: string) => {
    setDeleteTarget(null);
    deleteProjects([id]);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <HubIcon icon="History" size={18} />
          Project History
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            title="Sort projects"
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #c9d4e2', fontSize: 12, background: '#fff', color: '#1c2b3a' }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2 }}>
            <Tooltip content="Grid view" relationship="label">
              <Button
                size="small"
                appearance={view === 'grid' ? 'primary' : 'subtle'}
                icon={<GridRegular />}
                onClick={() => setView('grid')}
              />
            </Tooltip>
            <Tooltip content="List view" relationship="label">
              <Button
                size="small"
                appearance={view === 'list' ? 'primary' : 'subtle'}
                icon={<ListRegular />}
                onClick={() => setView('list')}
              />
            </Tooltip>
          </div>

          {/* Select mode */}
          <Tooltip content={selectMode ? 'Exit selection mode' : 'Select multiple'} relationship="label">
            <Button
              size="small"
              appearance={selectMode ? 'primary' : 'subtle'}
              icon={<SelectAllOnRegular />}
              onClick={() => setSelecting(!selectMode)}
            />
          </Tooltip>

          <Input
            className={styles.searchBox}
            placeholder="Search drawings…"
            size="small"
            contentBefore={<SearchRegular style={{ fontSize: 14 }} />}
            value={search}
            onChange={(_, d) => setSearch(d.value)}
          />
        </div>
      </div>

      {/* Batch bar */}
      {selectMode && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            marginBottom: 12,
            background: '#eef4fb',
            border: '1px solid #cfe2f5',
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <span style={{ fontWeight: 600, color: '#143a5c' }}>{selectedIds.length} selected</span>
          <span style={{ flex: 1 }} />
          <Button size="small" icon={<ArrowDownloadRegular />} onClick={handleExport}>
            Export
          </Button>
          <Button size="small" icon={<DeleteRegular />} onClick={handleBatchDelete}>
            Delete
          </Button>
          <Button size="small" appearance="subtle" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      <div className={styles.tabs} style={{ marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className={styles.tabCount}>{countFor(tab.id)}</span>
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className={styles.emptyState}>
          {projects.length === 0
            ? 'No drawings yet — pick a type above to create your first one.'
            : `No drawings match this view.${search ? ` Search: "${search}"` : ''}`}
        </div>
      ) : view === 'grid' ? (
        <div className={styles.projectGrid}>
          {sorted.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onBind={onBind}
              selectMode={selectMode}
              selected={selectedIds.includes(p.id)}
              onToggleSelect={toggleSelect}
              deleteOpen={deleteTarget?.id === p.id}
              onOpenChange={(open) => setDeleteTarget(open ? p : null)}
              onConfirmDelete={handleDeleteOne}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((p) => {
            const type = getDrawingType(p.typeId);
            const isFav = favorites.includes(p.id);
            const selected = selectedIds.includes(p.id);
            return (
              <React.Fragment key={p.id}>
                <div
                  onClick={() => (selectMode ? toggleSelect(p.id) : (window.location.hash = `#/t3000/design/projects/${p.id}`))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${selected ? '#0078d4' : '#e9edf3'}`,
                    background: selected ? '#eef4fb' : '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <span style={{ width: 34, height: 34, borderRadius: 8, background: `${type.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: type.accent }}>
                    <HubIcon icon={type.icon} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1c2b3a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isFav ? '★ ' : ''}{p.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#7a8699' }}>{type.name}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#8b97a8', width: 90 }}>{timeAgo(p.updatedAt)}</span>
                  {p.serialNumber && <span style={{ fontSize: 11, color: '#8b97a8', width: 90 }}>SN {p.serialNumber}</span>}
                  <span className={`${styles.tabCount}`} style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 700, color: p.status === 'synced' ? '#0e700e' : p.status === 'bound' ? '#0078d4' : '#7a8699' }}>
                    {p.status}
                  </span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <DeleteProjectPopover
                      project={p}
                      open={deleteTarget?.id === p.id}
                      onOpenChange={(open) => setDeleteTarget(open ? p : null)}
                      onConfirm={handleDeleteOne}
                    />
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
