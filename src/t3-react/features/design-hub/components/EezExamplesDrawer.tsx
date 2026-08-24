/**
 * EezExamplesDrawer — Right-hand "EEZ Examples" drawer for the Design Hub.
 *
 * Shows ready-made LVGL example projects from the EEZ examples catalog
 * (`project-editor/store/examples-catalog`, filtered to LVGL / LVGL + Flow).
 * Picking an example hands off to the EEZ New Project wizard in examples mode:
 *   navigate("/t3000/eez?examples=1&folder=<folderId>&type=<exampleId>")
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
import { useNavigate } from 'react-router-dom';
import styles from '../pages/DesignHubPage.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Reports how many LVGL examples are available (for the trigger badge). */
  onCount?: (count: number) => void;
}

interface ExampleItem {
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

function buildExamples(catalog: any): ExampleItem[] {
  const raw = Array.isArray(catalog.catalog) ? catalog.catalog : [];
  const startIds = new Set<string>(
    (Array.isArray(catalog.catalogAtStart) ? catalog.catalogAtStart : []).map(exampleId)
  );
  return raw
    .filter((e: any) => e && LVGL_TYPES.includes(e.projectType))
    .map((e: any): ExampleItem => ({
      id: exampleId(e),
      folderId: exampleFolderId(e),
      name: e.projectName || 'Untitled',
      description: e.description || '',
      type: e.projectType,
      image: typeof e.image === 'string' ? e.image : undefined,
      width: e.displayWidth,
      height: e.displayHeight,
      author: e.author,
      isNew: !startIds.has(exampleId(e)),
    }));
}

export const EezExamplesDrawer: React.FC<Props> = ({ open, onClose, onCount }) => {
  const navigate = useNavigate();
  const [examples, setExamples] = useState<ExampleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'lvgl' | 'flow'>('all');
  const [selected, setSelected] = useState<ExampleItem | null>(null);

  // Load the catalog when the drawer opens (once).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let pollTimer: number | undefined;
    setLoading(true);
    setError(null);

    const finish = (list: ExampleItem[]) => {
      if (cancelled) return;
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
        // The catalog download can finish a moment AFTER load() returns (the
        // catalog module downloads + unpacks async). Give it a few seconds to
        // populate before falling through to the empty state.
        if (list.length > 0) {
          finish(list);
          return;
        }
        let attempts = 0;
        const poll = () => {
          if (cancelled) return;
          snapshot().then((l2) => {
            if (cancelled) return;
            if (l2.length > 0 || attempts >= 10) {
              finish(l2);
            } else {
              attempts++;
              pollTimer = window.setTimeout(poll, 800);
            }
          });
        };
        poll();
      })
      .catch((err: any) => {
        if (!cancelled) {
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

  const handleUse = () => {
    if (!selected) return;
    const params = new URLSearchParams();
    params.set('examples', '1');
    params.set('folder', selected.folderId);
    params.set('type', selected.id);
    const target = `/t3000/eez?${params.toString()}`;
    onClose();
    window.setTimeout(() => {
      try {
        navigate(target);
      } catch (err) {
        console.error('[EezExamplesDrawer] navigate failed:', err, target);
      }
    }, 0);
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
    </Drawer>
  );
};

export default EezExamplesDrawer;
