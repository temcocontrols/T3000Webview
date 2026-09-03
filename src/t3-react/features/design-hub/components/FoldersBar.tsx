/**
 * FoldersBar — filter projects by folder, create folders.
 */
import React from 'react';
import { AddRegular, FolderRegular } from '@fluentui/react-icons';
import { useDesignHubStore } from '../store/designHubStore';
import { designHubService } from '../services/designHubService';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import styles from '../pages/DesignHubPage.module.css';

export const FoldersBar: React.FC = () => {
  const folders = useDesignHubStore((s) => s.folders);
  const activeFolder = useDesignHubStore((s) => s.activeFolder);
  const projects = useDesignHubStore((s) => s.projects);
  const setActiveFolder = useDesignHubStore((s) => s.setActiveFolder);
  const addFolder = useDesignHubStore((s) => s.addFolder);
  const setMessage = useStatusBarStore((s) => s.setMessage);

  const countInFolder = (folderId: string) =>
    projects.filter((p) => designHubService.getProjectFolder(p.id) === folderId).length;
  const countUnfiled = () =>
    projects.filter((p) => !designHubService.getProjectFolder(p.id)).length;

  const chips: { id: string | null; label: string; color?: string; count: number }[] = [
    { id: null, label: 'All', count: projects.length },
    { id: '__none', label: 'Unfiled', count: countUnfiled() },
    ...folders.map((f) => ({
      id: f.id,
      label: f.name,
      color: f.color,
      count: countInFolder(f.id),
    })),
  ];

  const handleAdd = () => {
    const name = window.prompt('Folder name', 'New Folder');
    if (name && name.trim()) {
      addFolder(name.trim());
      setMessage(`Folder "${name.trim()}" created`, 'success');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
      <FolderRegular style={{ fontSize: 15, color: '#7a8699' }} />
      {chips.map((chip) => (
        <button
          key={chip.id ?? 'all'}
          className={`${styles.tab} ${activeFolder === chip.id ? styles.tabActive : ''}`}
          onClick={() => setActiveFolder(chip.id)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {chip.color && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: chip.color }} />
          )}
          {chip.label}
          <span className={styles.tabCount}>{chip.count}</span>
        </button>
      ))}
      <button
        className={styles.tab}
        onClick={handleAdd}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#0078d4' }}
        title="New folder"
      >
        <AddRegular style={{ fontSize: 13 }} /> Folder
      </button>
      {activeFolder && (
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8b97a8' }}>
          Filtering by folder —{' '}
          <span style={{ color: '#0078d4', cursor: 'pointer' }} onClick={() => setActiveFolder(null)}>
            show all
          </span>
        </span>
      )}
    </div>
  );
};
