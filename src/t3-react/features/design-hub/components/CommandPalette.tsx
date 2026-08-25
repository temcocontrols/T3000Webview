/**
 * CommandPalette — Ctrl+K quick actions + drawing search overlay.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SearchRegular,
  FlowRegular,
  DocumentAddRegular,
  ArrowUploadRegular,
  ArrowDownloadRegular,
  FolderRegular,
  OpenRegular,
} from '@fluentui/react-icons';
import { getAllDrawingTypes } from '../drawingTypes';
import { DRAWING_TEMPLATES } from '../templates';
import { useDesignHubStore } from '../store/designHubStore';
import { useStatusBarStore } from '@t3-react/store/statusBarStore';
import { HubIcon } from '../icons';

type PaletteItem =
  | { kind: 'action'; id: string; label: string; hint?: string; icon?: string; run: () => void }
  | { kind: 'project'; id: string; label: string; hint: string; projectId: string };

export const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const projects = useDesignHubStore((s) => s.projects);
  const exportHub = useDesignHubStore((s) => s.exportHub);
  const setMessage = useStatusBarStore((s) => s.setMessage);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const actions: PaletteItem[] = [
      { kind: 'action', id: 'a-hub', label: 'Go to Design Hub', icon: 'BuildingMultiple', run: () => navigate('/t3000/design') },
      ...getAllDrawingTypes().map<PaletteItem>((t) => ({
        kind: 'action',
        id: `a-new-${t.id}`,
        label: `New ${t.name}`,
        hint: t.engine,
        icon: t.icon,
        run: () => navigate(`${t.openPath}?type=${t.id}`),
      })),
      ...DRAWING_TEMPLATES.map<PaletteItem>((t) => ({
        kind: 'action',
        id: `a-tpl-${t.id}`,
        label: `New from template: ${t.name}`,
        hint: 'Template',
        icon: 'DocumentAdd',
        run: () => {
          const p = useDesignHubStore.getState().createFromTemplate(t);
          navigate(p.openPath);
        },
      })),
      {
        kind: 'action',
        id: 'a-import',
        label: 'Import SVG / JSON…',
        hint: 'Inkscape import',
        icon: 'ArrowUpload',
        run: () => {
          window.dispatchEvent(new CustomEvent('t3-design-import'));
          onClose();
        },
      },
      {
        kind: 'action',
        id: 'a-backup',
        label: 'Backup Design Hub',
        hint: 'Download .json',
        icon: 'ArrowDownload',
        run: () => {
          const blob = exportHub();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `design-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          setMessage('Design Hub backup downloaded', 'success');
          onClose();
        },
      },
      {
        kind: 'action',
        id: 'a-newfolder',
        label: 'New Folder',
        hint: 'Organize drawings',
        icon: 'FolderOpen',
        run: () => {
          const name = window.prompt('Folder name', 'New Folder');
          if (name?.trim()) useDesignHubStore.getState().addFolder(name.trim());
          onClose();
        },
      },
    ];
    const projectsList: PaletteItem[] = projects.map((p) => ({
      kind: 'project',
      id: `p-${p.id}`,
      label: p.name,
      hint: `${p.typeId} · ${p.status}`,
      projectId: p.id,
    }));
    const query = q.trim().toLowerCase();
    if (!query) return [...actions, ...projectsList.slice(0, 8)];
    return [...actions, ...projectsList].filter((it) =>
      `${it.label} ${it.hint || ''}`.toLowerCase().includes(query)
    );
  }, [q, projects, navigate, onClose, exportHub, setMessage]);

  if (!open) return null;

  const run = (it: PaletteItem) => {
    if (it.kind === 'action') it.run();
    else navigate(`/t3000/design/projects/${it.projectId}`);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[active]) run(items[active]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 25, 40, 0.45)',
        zIndex: 20000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: '92vw',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #e9edf3' }}>
          <SearchRegular style={{ fontSize: 18, color: '#7a8699' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Search drawings or type a command…  (↑ ↓ to navigate, Enter to run, Esc to close)"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }}
          />
          <kbd style={{ fontSize: 11, color: '#8b97a8', border: '1px solid #d1dbe6', borderRadius: 4, padding: '2px 6px' }}>Esc</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
          {items.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#8b97a8', fontSize: 13 }}>
              No matches
            </div>
          )}
          {items.map((it, i) => (
            <div
              key={it.id}
              onClick={() => run(it)}
              onMouseEnter={() => setActive(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: i === active ? '#eef4fb' : 'transparent',
                fontSize: 13,
              }}
            >
              {it.kind === 'action' ? (
                <HubIcon icon={it.icon || 'Flow'} size={16} />
              ) : (
                <OpenRegular style={{ fontSize: 15 }} />
              )}
              <span style={{ flex: 1, color: '#1c2b3a', fontWeight: it.kind === 'project' ? 500 : 600 }}>
                {it.label}
              </span>
              {it.hint && <span style={{ fontSize: 11, color: '#8b97a8' }}>{it.hint}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
