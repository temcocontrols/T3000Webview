/**
 * EezExamplesDrawer — Right-hand "EEZ Examples" drawer for the Design Hub.
 *
 * Shows ready-made LVGL example projects from the EEZ examples catalog
 * (`project-editor/store/examples-catalog`, filtered to LVGL / LVGL + Flow).
 * Picking an example opens the create dialog (EezExampleCreateDialog), which
 * collects the project settings and then hands off to the EEZ examples wizard:
 *   /t3000/eez?examples=1&folder=<folderId>&type=<exampleId>&name=…&location=…
 *
 * The trigger button + info chip live right-aligned in the "Create by Type"
 * title bar (see DesignHubPage). The count badge is reported via onCount().
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Spinner,
} from '@fluentui/react-components';
import {
  DismissRegular,
  SparkleRegular,
  SearchRegular,
  DocumentTextRegular,
} from '@fluentui/react-icons';
import { EezExampleCreateDialog } from './EezExampleCreateDialog';
import styles from '../pages/DesignHubPage.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Reports how many LVGL examples are available (for the trigger badge). */
  onCount?: (count: number) => void;
}

export interface ExampleItem {
  id: string;
  folderId: string;
  name: string;
  description: string;
  type: string;
  image?: string;
  width?: number;
  height?: number;
  author?: string;
  isNew: boolean;
}

const LVGL_TYPES = ['LVGL', 'LVGL with EEZ Flow'];

// Example → wizard projectType id: the raw GitHub URL of the .eez-project file
// (must match the derivation in WizardModel.exampleProjectTypes).
function exampleId(example: any): string {
  const repo = (example.repository || '').replace('github.com', 'raw.githubusercontent.com');
  return `${repo}/master/${example.eezProjectPath || ''}`;
}

function exampleFolderId(example: any): string {
  return `_example_${example.folder || 'misc'}`;
}

function typeLabel(t: string): string {
  if (t === 'LVGL with EEZ Flow') return 'LVGL + Flow 9.5';
  if (t === 'LVGL') return 'LVGL 9.5';
  return t;
}

// Reuse the same catalog-load promise across opens so we don't re-download
// the catalog every time the drawer is opened.
let catalogLoadPromise: Promise<void> | null = null;

function loadCatalog(): Promise<any> {
  if (!catalogLoadPromise) {
    catalogLoadPromise = import('project-editor/store/examples-catalog').then((m) =>
      m.examplesCatalog.load()
    );
    catalogLoadPromise.catch(() => {
      catalogLoadPromise = null;
    });
  }
  return catalogLoadPromise;
}

async function loadCatalogModule(): Promise<any> {
  const m = await import('project-editor/store/examples-catalog');
  return m.examplesCatalog;
}

// The catalog stores the raw ProjectType enum value (e.g. "lvgl") as
// `projectType`. Mirror the EEZ wizard (project-editor/project/ui/Wizard.tsx →
// PROJECT_TYPE_NAMES) by mapping it to its display name before filtering, so
// LVGL examples actually match. Kept inline to avoid pulling the whole
// project-editor module into the design hub bundle.
const PROJECT_TYPE_NAMES: Record<string, string> = {
  undefined: 'Undefined',
  firmware: 'EEZ-GUI',
  'firmware-module': 'EEZ-GUI Library',
  resource: 'BB3 MicroPython Script',
  applet: 'BB3 Applet',
  dashboard: 'Dashboard',
  lvgl: 'LVGL',
  iext: 'IEXT',
  'eez-gui-lite': 'EEZ-GUI Lite',
};

function buildExamples(catalog: any): ExampleItem[] {
  const raw = Array.isArray(catalog.catalog) ? catalog.catalog : [];
  console.log('[EEZ-Examples] buildExamples — raw catalog entries:', raw.length);
  console.log('[EEZ-Examples] raw projectType values:', raw.map((e: any) => e?.projectType));
  const startIds = new Set<string>(
    (Array.isArray(catalog.catalogAtStart) ? catalog.catalogAtStart : []).map(exampleId)
  );
  const result = raw
    .map((e: any): ExampleItem | null => {
      if (!e) return null;
      // Map raw enum → display name (same as the EEZ wizard), then keep LVGL.
      const mappedType = PROJECT_TYPE_NAMES[e.projectType as string];
      if (!mappedType || !LVGL_TYPES.includes(mappedType)) return null;
      return {
        id: exampleId(e),
        folderId: exampleFolderId(e),
        name: e.projectName || 'Untitled',
        description: e.description || '',
        type: mappedType,
        image: typeof e.image === 'string' ? e.image : undefined,
        width: e.displayWidth,
        height: e.displayHeight,
        author: e.author,
        isNew: !startIds.has(exampleId(e)),
      };
    })
    .filter((x): x is ExampleItem => x !== null);
  console.log('[EEZ-Examples] LVGL examples found:', result.length,
    result.slice(0, 5).map((x) => ({ type: x.type, name: x.name, id: x.id })));
  return result;
}

export const EezExamplesDrawer: React.FC<Props> = ({ open, onClose, onCount }) => {
  const [examples, setExamples] = useState<ExampleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'lvgl' | 'flow'>('all');
  const [selected, setSelected] = useState<ExampleItem | null>(null);
  const [creatingExample, setCreatingExample] = useState<ExampleItem | null>(null);

  // Load the catalog when the drawer opens (once).
  // The catalog module downloads + unpacks ASYNC after load() resolves (see
  // examples-catalog.ts: checkNewVersionOfCatalog → downloadCatalog), so the
  // live `examplesCatalog.catalog` can be empty for a while. The EEZ wizard
  // picks it up reactively (mobx recomputes on change). Mirror that here by
  // re-reading the live singleton until it populates instead of bailing out
  // after a few seconds (which caused "No LVGL examples yet").
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let pollTimer: number | undefined;
    setLoading(true);
    setError(null);

    const finish = (list: ExampleItem[]) => {
      if (cancelled) return;
      console.log('[EEZ-Examples] drawer finished with', list.length, 'examples');
      setExamples(list);
      onCount?.(list.length);
      // Keep the selection valid if the list changed.
      setSelected((prev) => (prev && list.some((x) => x.id === prev.id) ? prev : null));
      setLoading(false);
    };

    const snapshot = () => loadCatalogModule().then((catalog) => buildExamples(catalog));

    loadCatalog()
      .then(snapshot)
      .then((list) => {
        if (cancelled) return;
        if (list.length > 0) {
          finish(list);
          return;
        }
        // Empty right after load() — the async catalog download is still
        // running. Keep re-reading until it lands (long window, ~60s), like the
        // reactive wizard does.
        console.log('[EEZ-Examples] catalog empty after load(), polling for async download...');
        let attempts = 0;
        const poll = () => {
          if (cancelled) return;
          snapshot().then((l2) => {
            if (cancelled) return;
            if (l2.length > 0 || attempts >= 60) {
              finish(l2);
            } else {
              attempts++;
              pollTimer = window.setTimeout(poll, 1000);
            }
          });
        };
        poll();
      })
      .catch((err: any) => {
        if (!cancelled) {
          console.log('[EEZ-Examples] drawer load error:', err);
          setError(err?.message || String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [open]);

  // Reset search/filter when reopened.
  useEffect(() => {
    if (open) {
      setSearch('');
      setFilter('all');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return examples.filter((e) => {
      if (filter === 'new' && !e.isNew) return false;
      if (filter === 'lvgl' && e.type !== 'LVGL') return false;
      if (filter === 'flow' && e.type !== 'LVGL with EEZ Flow') return false;
      if (q) {
        const hay = `${e.name} ${e.description} ${e.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [examples, search, filter]);

  const counts = useMemo(
    () => ({
      all: examples.length,
      new: examples.filter((e) => e.isNew).length,
      lvgl: examples.filter((e) => e.type === 'LVGL').length,
      flow: examples.filter((e) => e.type === 'LVGL with EEZ Flow').length,
    }),
    [examples]
  );

  // Selecting an example opens the create dialog; it hands off to the EEZ
  // examples wizard (with name/location) when the user clicks "Create & Open".
  const handleUse = () => {
    if (!selected) return;
    setCreatingExample(selected);
  };

  // Manual reload (Retry / Try again) — forces a fresh catalog load + download.
  const retry = () => {
    setLoading(true);
    setError(null);
    catalogLoadPromise = null;
    loadCatalog()
      .then(() => loadCatalogModule())
      .then((catalog) => {
        const list = buildExamples(catalog);
        setExamples(list);
        onCount?.(list.length);
      })
      .catch((err: any) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  };

  const chips: { id: typeof filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'new', label: 'New', count: counts.new },
    { id: 'lvgl', label: 'LVGL', count: counts.lvgl },
    { id: 'flow', label: 'LVGL + Flow', count: counts.flow },
  ];

  return (
    <Drawer
      type="overlay"
      position="end"
      size="medium"
      open={open}
      onOpenChange={(_, data) => {
        if (data.open === false) onClose();
      }}
    >
      <DrawerHeader style={{ padding: '14px 16px 10px' }}>
        <DrawerHeaderTitle
          action={
            <Button appearance="subtle" icon={<DismissRegular />} onClick={onClose} />
          }
        >
          <span className={styles.examplesTitle}>
            <SparkleRegular className={styles.examplesTitleIcon} />
            LVGL Examples
          </span>
        </DrawerHeaderTitle>
        <div className={styles.examplesSub}>Ready-made LVGL projects — pick one to start from</div>
      </DrawerHeader>

      <DrawerBody
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#b9c6d6 transparent',
          padding: '12px 16px 18px',
        }}
      >
        {loading ? (
          <div className={styles.examplesState}>
            <Spinner size="tiny" label="Loading examples…" labelPosition="after" />
          </div>
        ) : error ? (
          <div className={styles.examplesState}>
            <div style={{ fontWeight: 600, color: '#c0392b' }}>Failed to load examples</div>
            <div className={styles.examplesErrorMsg}>{error}</div>
            <Button size="small" appearance="primary" onClick={retry} style={{ marginTop: 10 }}>
              Retry
            </Button>
          </div>
        ) : examples.length === 0 ? (
          <div className={styles.examplesState}>
            <div className={styles.examplesStateIcon}>
              <DocumentTextRegular style={{ fontSize: 30 }} />
            </div>
            <div style={{ fontWeight: 600 }}>No LVGL examples yet</div>
            <div className={styles.examplesErrorMsg}>
              The examples catalog is empty. Try again in a moment — it downloads from the EEZ
              example repository on first use.
            </div>
            <Button size="small" appearance="primary" onClick={retry} style={{ marginTop: 10 }}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.examplesSearch}>
              <SearchRegular className={styles.examplesSearchIcon} />
              <input
                className={styles.examplesSearchInput}
                placeholder="Search examples…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className={styles.examplesChips}>
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.examplesChip} ${filter === c.id ? styles.examplesChipOn : ''}`}
                  onClick={() => setFilter(c.id)}
                >
                  {c.label} ({c.count})
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className={styles.examplesState}>No examples match.</div>
            ) : (
              <div className={styles.examplesGrid}>
                {filtered.map((e) => (
                  <div
                    key={e.id}
                    className={`${styles.examplesCard} ${selected?.id === e.id ? styles.examplesCardSel : ''}`}
                    onClick={() => setSelected(e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') setSelected(e);
                    }}
                  >
                    {selected?.id === e.id && (
                      <span className={styles.examplesCardCheck}>✓</span>
                    )}
                    <div className={styles.examplesThumb}>
                      {e.image ? (
                        <img src={e.image} alt="" className={styles.examplesThumbImg} />
                      ) : (
                        <span className={styles.examplesThumbPh}>
                          <DocumentTextRegular style={{ fontSize: 26 }} />
                        </span>
                      )}
                      {e.isNew && <span className={styles.examplesNewTag}>NEW</span>}
                    </div>
                    <div className={styles.examplesBody}>
                      <div className={styles.examplesName}>{e.name}</div>
                      <div className={styles.examplesDesc}>{e.description}</div>
                      <div className={styles.examplesMeta}>
                        <span
                          className={`${styles.examplesBadge} ${
                            e.type === 'LVGL with EEZ Flow' ? styles.examplesBadgeFlow : styles.examplesBadgeLvgl
                          }`}
                        >
                          {typeLabel(e.type)}
                        </span>
                        {e.width && e.height && (
                          <span className={styles.examplesBadgeSize}>
                            {e.width}×{e.height}
                          </span>
                        )}
                      </div>
                    </div>
                    {e.author && <div className={styles.examplesFoot}>{e.author}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </DrawerBody>

      <div className={styles.examplesDrawerFoot}>
        <div className={styles.examplesFootActions}>
          <Button
            appearance="secondary"
            onClick={onClose}
            style={{ fontSize: 13, fontWeight: 400 }}
          >
            Cancel
          </Button>
          <Button
            appearance="primary"
            disabled={!selected}
            onClick={handleUse}
            style={{ fontSize: 13, fontWeight: 400 }}
          >
            Use this example →
          </Button>
        </div>
      </div>

      <EezExampleCreateDialog
        example={creatingExample}
        onClose={() => setCreatingExample(null)}
      />
    </Drawer>
  );
};

export default EezExamplesDrawer;
