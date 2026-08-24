/**
 * Design Hub — Main Dashboard Page
 * The unified center for all HVAC drawing engines.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Button, Tooltip } from '@fluentui/react-components';
import { ArrowDownloadRegular, ArrowUploadRegular, SparkleRegular } from '@fluentui/react-icons';
import type { DrawingType, HubProject } from '../types';
import { useDesignHubStore } from '../store/designHubStore';
import { designHubService } from '../services/designHubService';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import { HeroHeader } from '../components/HeroHeader';
import { DeviceContextBar } from '../components/DeviceContextBar';
// import { HubStats } from '../components/HubStats'; // hidden for now (user, 2026-08-22) — duplicates Device Context Bar counts
import { TypeTiles } from '../components/TypeTiles';
import { ProjectsGrid } from '../components/ProjectsGrid';
// import { FoldersBar } from '../components/FoldersBar'; // hidden for now (user, 2026-08-22)
// import { TemplatesSection } from '../components/TemplatesSection'; // hidden for now (user, 2026-08-22)
// import { SharedLibraries } from '../components/SharedLibraries'; // hidden for now (user, 2026-08-22)
// import { ActivityPanel } from '../components/ActivityPanel'; // hidden for now (user, 2026-08-22)
import { BindDeviceDialog } from '../components/BindDeviceDialog';
import { NewDrawingDialog } from '../components/NewDrawingDialog';
import { EezExamplesDrawer } from '../components/EezExamplesDrawer';
// 'New Type' hidden for now — only the 4 core types (user, 2026-08-22)
// import { NewTypeDialog } from '../components/NewTypeDialog';
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
  const exportHub = useDesignHubStore((s) => s.exportHub);
  const importHub = useDesignHubStore((s) => s.importHub);
  const importFile = useDesignHubStore((s) => s.importFile);
  const refresh = useDesignHubStore((s) => s.refresh);
  const setView = useDesignHubStore((s) => s.setView);
  const setSortBy = useDesignHubStore((s) => s.setSortBy);
  const syncBackend = useDesignHubStore((s) => s.syncBackend);
  const setMessage = useStatusBarStore((s) => s.setMessage);

  const restoreRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [bindingProject, setBindingProject] = useState<HubProject | null>(null);
  const [newDrawingType, setNewDrawingType] = useState<DrawingType | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [examplesCount, setExamplesCount] = useState<number | null>(null);

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

  // ?tab=shared removed — the Shared tab was retired (user, 2026-08-24)
  // ?newtype=1 hidden for now (user, 2026-08-22)

  useEffect(() => {
    const openImport = () => setImportOpen(true);
    window.addEventListener('t3-design-import', openImport);
    return () => window.removeEventListener('t3-design-import', openImport);
  }, []);

  // Top menu bar actions (File / View / Tools) — dispatched via t3-design-action
  useEffect(() => {
    const scrollTo = (id: string) =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const onAction = (e: Event) => {
      const action = (e as CustomEvent)?.detail?.action;
      if (!action) return;
      switch (action) {
        // 'new-type' hidden for now (user, 2026-08-22)
        // case 'new-type':
        //   setNewTypeOpen(true);
        //   break;
        case 'import':
          setImportOpen(true);
          break;
        case 'backup':
          try {
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
          } catch {
            setMessage('Backup failed', 'error');
          }
          break;
        case 'restore':
          restoreRef.current?.click();
          break;
        case 'view-grid':
          setView('grid');
          break;
        case 'view-list':
          setView('list');
          break;
        case 'sort-updated':
          setSortBy('updated');
          break;
        case 'sort-name':
          setSortBy('name');
          break;
        case 'sort-created':
          setSortBy('created');
          break;
        case 'favorites':
          setActiveTab('all');
          scrollTo('hub-projects');
          break;
        case 'folders':
          scrollTo('hub-folders');
          break;
        case 'refresh':
          refresh();
          break;
        case 'sync':
          syncBackend().then((r) => {
            setMessage(
              r.backend
                ? `Synced ${r.projects} drawings, ${r.libraries} libraries`
                : 'Backend offline — kept locally',
              r.backend ? 'success' : 'info'
            );
          });
          break;
        case 'bind':
          setActiveTab('all');
          scrollTo('hub-projects');
          setMessage('Select a drawing, then use "Bind Device" on its card', 'info');
          break;
        case 'deploy':
          setActiveTab('all');
          scrollTo('hub-projects');
          setMessage('Select a drawing, then use "Deploy" on its card', 'info');
          break;
        case 'share':
          setActiveTab('all');
          scrollTo('hub-projects');
          break;
        case 'compare':
          setActiveTab('all');
          scrollTo('hub-projects');
          setMessage('Open a drawing’s detail page to compare revisions', 'info');
          break;
        case 'palette':
          setPaletteOpen(true);
          break;
      }
    };
    window.addEventListener('t3-design-action', onAction);
    return () => window.removeEventListener('t3-design-action', onAction);
  }, [exportHub, setMessage, setView, setSortBy, setActiveTab, refresh, syncBackend]);

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
        <HeroHeader />
        <DeviceContextBar />
        {/* Stats strip hidden for now (user, 2026-08-22) — duplicates Device Context Bar counts
        <HubStats />
        */}

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.examplesHeaderLeft}>
              <div className={styles.sectionTitle}>
                <HubIcon icon="DocumentAdd" size={18} />
                Create by Type
              </div>
              <div className={styles.sectionHint}>Each tile opens its own drawing engine</div>
            </div>
            <div className={styles.examplesHeaderRight}>
              <span className={styles.examplesInfoChip}>
                <SparkleRegular className={styles.examplesInfoSpark} />
                For <b>LVGL</b> you can create by example
              </span>
              <button
                type="button"
                className={styles.examplesTrigger}
                onClick={() => setExamplesOpen(true)}
              >
                <SparkleRegular style={{ fontSize: 14 }} />
                LVGL Examples
                {examplesCount !== null && (
                  <span className={styles.examplesCount}>{examplesCount}</span>
                )}
                <span className={styles.examplesTriggerArrow}>→</span>
              </button>
            </div>
          </div>
          <TypeTiles onCreate={(type) => setNewDrawingType(type)} />
        </div>

        {/* Templates section hidden for now (user, 2026-08-22) — redundant with
            "Create by Type"; the LCD template was broken (navigated to HVAC).
        */}
        {/* <TemplatesSection /> */}

        {/* Folders section hidden for now (user, 2026-08-22) — organization is
            redundant with device binding + type tabs.
        <div className={styles.section} id="hub-folders">
          <div className={styles.sectionHeader} style={{ marginBottom: 10 }}>
            <div className={styles.sectionTitle}>
              <HubIcon icon="FolderOpen" size={18} />
              Folders
            </div>
            <span className={styles.sectionHint}>Organize drawings into groups</span>
          </div>
          <FoldersBar />
        </div>
        */}

        <div id="hub-projects">
          <ProjectsGrid onBind={handleBind} />
        </div>

        {/* Hub Tools row hidden for now (user, 2026-08-22) — Backup/Restore stay in File menu.
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
        </div>
        */}
        {/* Hidden file input kept — used by File → Restore Hub */}
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

        {/* Recent & History + Shared Libraries hidden for now (user, 2026-08-22) —
            redundant with the Projects grid (already lists by recent-updated with search).
        */}
      </div>

      {/* Dialogs */}
      <BindDeviceDialog
        open={bindingProject !== null}
        project={bindingProject}
        onClose={() => setBindingProject(null)}
        onBind={handleBindSave}
      />
      {/* New Type dialog hidden for now (user, 2026-08-22)
      <NewTypeDialog
        open={newTypeOpen}
        onClose={() => setNewTypeOpen(false)}
        onRegister={(type) => {
          addCustomType(type as any);
        }}
      />
      */}
      <NewDrawingDialog type={newDrawingType} onClose={() => setNewDrawingType(null)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <EezExamplesDrawer
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        onCount={setExamplesCount}
      />
    </div>
  );
};

export default DesignHubPage;
