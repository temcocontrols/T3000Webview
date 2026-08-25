/**
 * Design Hub — Shared Libraries
 * Symbol sets, templates and parts shared across drawing engines.
 * Phase 4/6 extend this with cloud sync and Inkscape SVG symbol import.
 */
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Input,
  Select,
  Field,
  Tooltip,
} from '@fluentui/react-components';
import { AddRegular, ToolboxRegular, ArrowSyncRegular, CheckmarkCircleRegular } from '@fluentui/react-icons';
import { useDesignHubStore } from '../store/designHubStore';
import { designHubService } from '../services/designHubService';
import { HubIcon } from '../icons';
import type { LibraryItem } from '../types';
import styles from '../pages/DesignHubPage.module.css';

const KIND_LABEL: Record<LibraryItem['kind'], string> = {
  symbols: 'Symbols',
  template: 'Templates',
  logo: 'Logos',
  part: 'Parts',
  custom: 'Custom',
};

export const SharedLibraries: React.FC = () => {
  const libraries = useDesignHubStore((s) => s.libraries);
  const refresh = useDesignHubStore((s) => s.refresh);
  const syncLibraryToCloud = useDesignHubStore((s) => s.syncLibraryToCloud);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<LibraryItem['kind']>('symbols');
  const [count, setCount] = useState('');

  const save = () => {
    if (!name.trim()) return;
    designHubService.addLibrary({
      name: name.trim(),
      description: description.trim() || undefined,
      kind,
      count: parseInt(count, 10) || undefined,
      source: 'local',
    });
    designHubService.recordActivity('created', `Added library "${name.trim()}"`, {
      detail: kind,
    });
    refresh();
    setOpen(false);
    setName('');
    setDescription('');
    setCount('');
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <HubIcon icon="Toolbox" size={18} />
          Shared Libraries
        </div>
        <Button
          size="small"
          className={styles.addLibBtn}
          icon={<AddRegular />}
          onClick={() => setOpen(true)}
        >
          Add Library
        </Button>
      </div>

      <div className={styles.libList}>
        {libraries.map((lib) => (
          <div key={lib.id} className={styles.libCard}>
            <div className={styles.libIcon}>
              <ToolboxRegular style={{ fontSize: 19 }} />
            </div>
            <div className={styles.libBody}>
              <div className={styles.libName}>{lib.name}</div>
              <div className={styles.libDesc}>{lib.description || '—'}</div>
            </div>
            {typeof lib.count === 'number' && (
              <span className={styles.libBadge}>{lib.count} items</span>
            )}
            <span className={styles.libSource}>
              {lib.source === 'cloud' ? (
                <span style={{ color: '#0e700e', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <CheckmarkCircleRegular style={{ fontSize: 11 }} /> cloud
                </span>
              ) : (
                'local'
              )}
            </span>
            {lib.source !== 'cloud' && (
              <Tooltip content="Sync to cloud (T3 User Library API)" relationship="label">
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<ArrowSyncRegular style={{ fontSize: 14 }} />}
                  onClick={() => syncLibraryToCloud(lib.id)}
                >
                  Sync
                </Button>
              </Tooltip>
            )}
          </div>
        ))}
        {libraries.length === 0 && (
          <div className={styles.activityEmpty}>No libraries yet — add your first symbol set.</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(_, d) => !d.open && setOpen(false)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Add Shared Library</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Name" required>
                  <Input value={name} onChange={(_, d) => setName(d.value)} placeholder="e.g. Chilled Water Valves" />
                </Field>
                <Field label="Description">
                  <Input value={description} onChange={(_, d) => setDescription(d.value)} placeholder="What this library contains" />
                </Field>
                <Field label="Kind">
                  <Select value={kind} onChange={(_, d) => setKind(d.value as LibraryItem['kind'])}>
                    {(Object.keys(KIND_LABEL) as LibraryItem['kind'][]).map((k) => (
                      <option key={k} value={k}>{KIND_LABEL[k]}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Item count">
                  <Input value={count} onChange={(_, d) => setCount(d.value)} placeholder="e.g. 24" type="number" />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={save}>
                Add
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
