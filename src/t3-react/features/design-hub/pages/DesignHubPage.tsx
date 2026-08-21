/**
 * Design Hub — Main Dashboard Page
 * The unified center for all HVAC drawing engines.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spinner, Button, Tooltip } from '@fluentui/react-components';
import { ArrowDownloadRegular, ArrowUploadRegular } from '@fluentui/react-icons';
import type { HubProject } from '../types';
import { useDesignHubStore } from '../store/designHubStore';
import { designHubService } from '../services/designHubService';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import { HeroHeader } from '../components/HeroHeader';
import { DeviceContextBar } from '../components/DeviceContextBar';
import { HubStats } from '../components/HubStats';
import { TypeTiles } from '../components/TypeTiles';
import { ProjectsGrid } from '../components/ProjectsGrid';
import { FoldersBar } from '../components/FoldersBar';
import { TemplatesSection } from '../components/TemplatesSection';
import { SharedLibraries } from '../components/SharedLibraries';
import { ActivityPanel } from '../components/ActivityPanel';
import { BindDeviceDialog } from '../components/BindDeviceDialog';
import { NewTypeDialog } from '../components/NewTypeDialog';
import { ImportDialog } from '../components/ImportDialog';
import { CommandPalette } from '../components/CommandPalette';
import { HubIcon } from '../icons';
import styles from './DesignHubPage.module.css';

export const DesignHubPage: React.FC = () => {
  const navigate = useNavigate();
  const load = useDesignHubStore((s) => s.load);
  const isLoading = useDesignHubStore((s) => s.isLoading);
  const setActiveTab = useDesignHubStore((s) => s.setActiveTab);
  const bindProject = useDesignHubStore((s) => s.bindProject);
  const addCustomType = useDesignHubStore((s) => s.addCustomType);
  const exportHub = useDesignHubStore((s) => s.exportHub);
  const importHub = useDesignHubStore((s) => s.importHub);
  const importFile = useDesignHubStore((s) => s.importFile);
  const refresh = useDesignHubStore((s) => s.refresh);
  const setMessage = useStatusBarStore((s) => s.setMessage);

  const [searchParams, setSearchParams] = useSearchParams();
  const restoreRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [bindingProject, setBindingProject] = useState<HubProject | null>(null);
  const [newTypeOpen, setNewTypeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  // Ctrl+K → command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Drag-and-drop file import
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    importFile(file)
      .then((r) => {
        setMessage(`Imported "${r.name}"`, 'success');
        navigate(r.openPath);
      })
      .catch((err) => setMessage(`Import failed: ${err.message}`, 'error'));
  };

  // ?tab=shared → jump to the Shared view of projects
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'shared') {
      setActiveTab('shared');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setActiveTab, setSearchParams]);

  // ?newtype=1 or the global t3-design-import event → open dialogs
  useEffect(() => {
    if (searchParams.get('newtype') === '1') {
      setNewTypeOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const openImport = () => setImportOpen(true);
    window.addEventListener('t3-design-import', openImport);
    return () => window.removeEventListener('t3-design-import', openImport);
  }, []);

  const handleBind = (project: HubProject) => setBindingProject(project);

  const handleBindSave = (binding: { serialNumber?: number; building?: string; floor?: string; room?: string }) => {
    if (bindingProject) bindProject(bindingProject.id, binding);
  };

  const handleBackup = () => {
    const blob = exportHub();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage('Design Hub backup downloaded', 'success');
  };

  const handleRestore = async (file: File) => {
    try {
      const result = await importHub(file);
      refresh();
      setMessage(`Backup restored — ${result.projects} drawings, ${result.libraries} libraries, ${result.customTypes} types`, 'success');
    } catch (err) {
      setMessage(`Restore failed: ${err instanceof Error ? err.message : 'invalid backup'}`, 'error');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spinner label="Loading Design Hub…" />
      </div>
    );
  }

  return (
    <div
      className={styles.page}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 15000,
            background: 'rgba(0,120,212,0.08)',
            border: '3px dashed #0078d4',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ background: '#fff', padding: '18px 28px', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.2)', fontSize: 15, fontWeight: 600, color: '#143a5c' }}>
            Drop SVG / JSON to import
          </div>
        </div>
      )}
      <div className={styles.container}>
        <HeroHeader onImport={() => setImportOpen(true)} />
        <DeviceContextBar />
        <HubStats />

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <HubIcon icon="DocumentAdd" size={18} />
              Create by Type
            </div>
            <span className={styles.sectionHint}>Each tile opens its own drawing engine</span>
          </div>
          <TypeTiles onNewType={() => setNewTypeOpen(true)} />
        </div>

        <TemplatesSection />

        <div className={styles.section}>
          <div className={styles.sectionHeader} style={{ marginBottom: 10 }}>
            <div className={styles.sectionTitle}>
              <HubIcon icon="FolderOpen" size={18} />
              Folders
            </div>
            <span className={styles.sectionHint}>Organize drawings into groups</span>
          </div>
          <FoldersBar />
        </div>

        <ProjectsGrid onBind={handleBind} />

        {/* Hub Tools — backup / restore */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '10px 16px',
            borderRadius: 12,
            background: '#fff',
            border: '1px dashed #c9d4e2',
            fontSize: 12,
            color: '#6b7f94',
          }}
        >
          <span style={{ fontWeight: 700, color: '#1c2b3a' }}>Hub Tools</span>
          <span style={{ flex: 1 }} />
          <Tooltip content="Export all drawings, libraries and types to a .json file" relationship="label">
            <Button size="small" icon={<ArrowDownloadRegular />} onClick={handleBackup}>
              Backup
            </Button>
          </Tooltip>
          <Tooltip content="Restore a Design Hub backup (.json)" relationship="label">
            <Button size="small" icon={<ArrowUploadRegular />} onClick={() => restoreRef.current?.click()}>
              Restore
            </Button>
          </Tooltip>
          <input
            ref={restoreRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleRestore(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className={styles.bottomGrid}>
          <SharedLibraries />
          <ActivityPanel />
        </div>
      </div>

      {/* Dialogs */}
      <BindDeviceDialog
        open={bindingProject !== null}
        project={bindingProject}
        onClose={() => setBindingProject(null)}
        onBind={handleBindSave}
      />
      <NewTypeDialog
        open={newTypeOpen}
        onClose={() => setNewTypeOpen(false)}
        onRegister={(type) => {
          addCustomType(type as any);
        }}
      />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};

export default DesignHubPage;
