import React, { useEffect, useMemo, useState } from 'react';
import { FilterRegular } from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TrendPolicyPage.module.css';

type PointType = 'input' | 'output' | 'variable';
type TabType = 'all' | PointType;
type TagStateFilter = 'all' | 'tagged' | 'untagged';

interface UnifiedPoint {
  key: string;
  serial: number;
  panel: number;
  type: PointType;
  index: string;
  pointLabel: string;
  fullLabel: string;
  digitalAnalog?: string | null;
  units?: string | null;
  fValue?: string | null;
  rangeField?: string | null;
}

const pointTypeEndpoint: Record<PointType, string> = {
  input: 'input-points',
  output: 'output-points',
  variable: 'variable-points',
};

const pointTypeResponseKey: Record<PointType, string> = {
  input: 'input_points',
  output: 'output_points',
  variable: 'variable_points',
};

const labelizeType = (t: PointType) => (t === 'input' ? 'Input' : t === 'output' ? 'Output' : 'Variable');
const ALL_TYPES: PointType[] = ['input', 'output', 'variable'];
const POLICY_STORAGE_KEY = 't3000.trend.policy.state.v2';
const SEMANTIC_TAGS = new Set(['temp', 'humidity', 'pressure', 'flow', 'co2', 'occupancy', 'volt', 'current', 'elec']);
const QUICK_TAGS = ['temp', 'humidity', 'pressure', 'flow', 'co2', 'occupancy', 'zone', 'site', 'equip'];

/** Convert ["point", "kind:Number", "unit:F"] to {"point":"M","kind":"Number","unit":"F"} */
const tagsArrayToObject = (tags: string[]): Record<string, string> => {
  const obj: Record<string, string> = {};
  tags.forEach(tag => {
    const colonIdx = tag.indexOf(':');
    if (colonIdx === -1) obj[tag] = 'M';
    else obj[tag.slice(0, colonIdx)] = tag.slice(colonIdx + 1);
  });
  return obj;
};

const HAYSTACK_UNIT_TAGS: Record<string, string[]> = {
  f: ['temp'],
  c: ['temp'],
  '%': ['humidity'],
  ppm: ['co2'],
  v: ['volt', 'elec'],
  a: ['current', 'elec'],
};

const mergeTagLists = (...tagLists: string[][]): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];

  tagLists.forEach((list) => {
    list.forEach((tag) => {
      const normalizedTag = tag.trim();
      if (!normalizedTag || seen.has(normalizedTag)) {
        return;
      }
      seen.add(normalizedTag);
      merged.push(normalizedTag);
    });
  });

  return merged;
};

const pointTypeFromHaystackTable = (pointTable: string): PointType | null => {
  const table = pointTable.trim().toUpperCase();
  if (table === 'INPUTS') return 'input';
  if (table === 'OUTPUTS') return 'output';
  if (table === 'VARIABLES') return 'variable';
  return null;
};

const parseHaystackTagList = (rawTags: unknown): string[] => {
  if (!rawTags || typeof rawTags !== 'object' || Array.isArray(rawTags)) {
    return [];
  }

  const tagsObj = rawTags as Record<string, unknown>;
  // Exclude curVal — it is a live sensor reading, not a static semantic tag
  return Object.entries(tagsObj).filter(([key]) => key !== 'curVal').map(([key, value]) => {
    if (value === 'M') {
      return key;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${key}:${String(value)}`;
    }

    return `${key}:${JSON.stringify(value)}`;
  });
};

const buildPolicyKeyFromHaystack = (row: any): string | null => {
  const serial = Number(row?.serialNumber ?? row?.serial_number ?? 0);
  const pointTable = String(row?.pointTable ?? row?.point_table ?? '').trim();
  const pointIndex = String(row?.pointIndex ?? row?.point_index ?? '').trim();

  if (!serial || !pointTable || !pointIndex) {
    return null;
  }

  const pointType = pointTypeFromHaystackTable(pointTable);
  if (!pointType) {
    return null;
  }

  return `${serial}:${pointType}:${pointIndex}`;
};

const deriveHaystackTagsForPoint = (point: UnifiedPoint): string[] => {
  const tags: string[] = ['point', 'sensor', 'his'];
  const kind = String(point.digitalAnalog ?? '').trim() === '1' ? 'Number' : 'Bool';
  tags.push(`kind:${kind}`);

  const units = String(point.units ?? '').trim();
  if (units) {
    tags.push(`unit:${units}`);
    const unitTags = HAYSTACK_UNIT_TAGS[units.toLowerCase()];
    if (unitTags) {
      tags.push(...unitTags);
    }
  }

  tags.push(`equipRef:dev${point.serial}`);
  return mergeTagLists(tags);
};

interface TrendPolicyPageProps {
  embedded?: boolean;
  onBack?: () => void;
}

export const TrendPolicyPage: React.FC<TrendPolicyPageProps> = (_props) => {
  const { selectedDevice } = useDeviceTreeStore();

  const [selectedDeviceSerials, setSelectedDeviceSerials] = useState<Set<number>>(new Set());
  const [activeTypeTab, setActiveTypeTab] = useState<TabType>('all');
  const [tagStateFilter, setTagStateFilter] = useState<TagStateFilter>('all');

  const [allPoints, setAllPoints] = useState<UnifiedPoint[]>([]);
  const [selectedPointKeys, setSelectedPointKeys] = useState<Set<string>>(new Set());
  const [loadingPoints, setLoadingPoints] = useState(false);

  const [applyTagInput, setApplyTagInput] = useState('');
  const [filterTagInput, setFilterTagInput] = useState('');
  const [pointSearch, setPointSearch] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [pointTags, setPointTags] = useState<Record<string, string[]>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [rebuildInProgress, setRebuildInProgress] = useState(false);
  const [rebuildStatusMessage, setRebuildStatusMessage] = useState('');
  const [loadRevision, setLoadRevision] = useState(0);

  useEffect(() => {
    try {
      const savedStateRaw = localStorage.getItem(POLICY_STORAGE_KEY);
      if (savedStateRaw) {
        const parsed = JSON.parse(savedStateRaw);
        setActiveTypeTab(parsed.activeTypeTab === 'input' || parsed.activeTypeTab === 'output' || parsed.activeTypeTab === 'variable' ? parsed.activeTypeTab : 'all');
        setTagStateFilter(parsed.tagStateFilter === 'tagged' || parsed.tagStateFilter === 'untagged' ? parsed.tagStateFilter : 'all');
        setPointSearch(typeof parsed.pointSearch === 'string' ? parsed.pointSearch : '');
        setFilterTags(Array.isArray(parsed.filterTags) ? parsed.filterTags : []);
        setPointTags(parsed.pointTags && typeof parsed.pointTags === 'object' ? parsed.pointTags : {});
      }
    } catch (e) {
      console.warn('Failed to restore TrendPolicy state:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        POLICY_STORAGE_KEY,
        JSON.stringify({
          selectedDeviceSerials: Array.from(selectedDeviceSerials),
          activeTypeTab,
          tagStateFilter,
          pointSearch,
          filterTags,
          pointTags,
        })
      );
    } catch (e) {
      console.warn('Failed to persist TrendPolicy state:', e);
    }
  }, [selectedDeviceSerials, activeTypeTab, tagStateFilter, pointSearch, filterTags, pointTags]);

  useEffect(() => {
    if (!selectedDevice?.serialNumber) {
      setSelectedDeviceSerials(new Set());
      return;
    }

    setSelectedDeviceSerials(new Set([selectedDevice.serialNumber]));
  }, [selectedDevice?.serialNumber]);

  const selectedDevices = useMemo(
    () => (selectedDevice ? [selectedDevice] : []),
    [selectedDevice]
  );

  useEffect(() => {
    let cancelled = false;

    const loadPoints = async () => {
      if (selectedDevices.length === 0) {
        setAllPoints([]);
        setSelectedPointKeys(new Set());
        return;
      }

      setLoadingPoints(true);
      try {
        const requests: Array<Promise<UnifiedPoint[]>> = [];

        for (const dev of selectedDevices) {
          for (const type of ALL_TYPES) {
            const url = `${API_BASE_URL}/api/t3_device/devices/${dev.serialNumber}/${pointTypeEndpoint[type]}`;
            requests.push(
              fetch(url)
                .then(res => (res.ok ? res.json() : Promise.resolve([])))
                .then((json: any) => {
                  const rows: any[] = json?.[pointTypeResponseKey[type]] ?? (Array.isArray(json) ? json : []);
                  return (rows as any[]).map((row, idx) => {
                    const index =
                      row.inputIndex ?? row.outputIndex ?? row.variableIndex ?? row.index ?? row.number ?? idx + 1;
                    const pointLabel = row.label ?? row.name ?? `${labelizeType(type)} ${index}`;
                    const fullLabel = row.fullLabel ?? row.description ?? pointLabel;
                    const panel = row.panelId ?? dev.panelId ?? 1;
                    const digitalAnalog = row.digitalAnalog ?? row.digital_analog ?? row.Digital_Analog ?? null;
                    const units = row.units ?? row.Units ?? null;
                    const fValue = row.fValue ?? row.f_value ?? row.FValue ?? null;
                    const rangeField = row.rangeField ?? row.range_field ?? row.Range_Field ?? null;
                    const key = `${dev.serialNumber}:${type}:${index}`;
                    return {
                      key,
                      serial: dev.serialNumber,
                      panel,
                      type,
                      index: String(index),
                      pointLabel: String(pointLabel),
                      fullLabel: String(fullLabel),
                      digitalAnalog: digitalAnalog == null ? null : String(digitalAnalog),
                      units: units == null ? null : String(units),
                      fValue: fValue == null ? null : String(fValue),
                      rangeField: rangeField == null ? null : String(rangeField),
                    } as UnifiedPoint;
                  });
                })
                .catch(() => [])
            );
          }
        }

        const settled = await Promise.all(requests);
        const merged = settled.flat();

        const haystackByPointKey: Record<string, string[]> = {};
        try {
          const haystackResponse = await fetch(`${API_BASE_URL}/api/haystack/read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serialNumbers: selectedDevices.map((dev) => dev.serialNumber),
            }),
          });

          if (haystackResponse.ok) {
            const haystackPayload = await haystackResponse.json();
            const rows: any[] = Array.isArray(haystackPayload?.rows) ? haystackPayload.rows : [];
            rows.forEach((row) => {
              const key = buildPolicyKeyFromHaystack(row);
              if (!key) {
                return;
              }
              haystackByPointKey[key] = parseHaystackTagList(row?.tags);
            });
          }
        } catch (error) {
          console.warn('Failed to load backend Haystack tags; using derived tags only:', error);
        }

        if (!cancelled) {
          setAllPoints(merged);
          setSelectedPointKeys(new Set());
          setPointTags((prev) => {
            const next = { ...prev };
            const validKeys = new Set(merged.map((point) => point.key));

            Object.keys(next).forEach((key) => {
              if (!validKeys.has(key)) {
                delete next[key];
              }
            });

            merged.forEach((point) => {
              const currentTags = next[point.key] ?? [];
              const backendTags = haystackByPointKey[point.key] ?? [];
              next[point.key] = mergeTagLists(deriveHaystackTagsForPoint(point), backendTags, currentTags);
            });

            return next;
          });
        }
      } finally {
        if (!cancelled) setLoadingPoints(false);
      }
    };

    loadPoints();
    return () => {
      cancelled = true;
    };
  }, [selectedDevices, loadRevision]);

  const visiblePoints = useMemo(() => {
    let pts = activeTypeTab === 'all' ? allPoints : allPoints.filter(p => p.type === activeTypeTab);

    const q = pointSearch.trim().toLowerCase();
    if (q) {
      pts = pts.filter(p =>
        p.pointLabel.toLowerCase().includes(q) || p.fullLabel.toLowerCase().includes(q)
      );
    }

    if (tagStateFilter === 'tagged') {
      pts = pts.filter(p => (pointTags[p.key] ?? []).length > 0);
    } else if (tagStateFilter === 'untagged') {
      pts = pts.filter(p => (pointTags[p.key] ?? []).length === 0);
    }

    if (filterTags.length > 0) {
      pts = pts.filter(p => {
        const tags = pointTags[p.key] ?? [];
        return filterTags.every(tag => tags.includes(tag));
      });
    }

    return pts;
  }, [allPoints, activeTypeTab, pointSearch, filterTags, pointTags, tagStateFilter]);

  const countByType = useMemo(() => ({
    input: allPoints.filter(p => p.type === 'input').length,
    output: allPoints.filter(p => p.type === 'output').length,
    variable: allPoints.filter(p => p.type === 'variable').length,
  }), [allPoints]);

  const handleTogglePoint = (key: string, checked: boolean) => {
    setSelectedPointKeys(prev => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleTypeChipClick = (tab: TabType) => {
    setActiveTypeTab(tab);
  };

  const addTagFilter = () => {
    const tag = filterTagInput.trim().toLowerCase();
    if (!tag) return;
    setFilterTags(prev => (prev.includes(tag) ? prev : [...prev, tag]));
    setFilterTagInput('');
  };

  const applyTagToSelected = () => {
    const tag = applyTagInput.trim().toLowerCase();
    if (!tag) return;

    setPointTags(prev => {
      const next = { ...prev };
      selectedPointKeys.forEach(key => {
        const tags = next[key] ?? [];
        if (!tags.includes(tag)) next[key] = [...tags, tag];
      });
      return next;
    });
    setApplyTagInput('');
  };

  const applyQuickTag = (rawTag: string) => {
    const tag = rawTag.trim().toLowerCase();
    if (!tag || selectedPointKeys.size === 0) return;

    setPointTags(prev => {
      const next = { ...prev };
      selectedPointKeys.forEach(key => {
        const tags = next[key] ?? [];
        if (!tags.includes(tag)) next[key] = [...tags, tag];
      });
      return next;
    });
  };

  const resetSelectedPointsToHaystackDefaults = () => {
    if (selectedPointKeys.size === 0) return;

    setPointTags((prev) => {
      const next = { ...prev };
      selectedPointKeys.forEach((key) => {
        const point = allPoints.find((item) => item.key === key);
        if (!point) return;
        next[key] = deriveHaystackTagsForPoint(point);
      });
      return next;
    });
  };

  const clearTagsOnSelected = async () => {
    if (selectedPointKeys.size === 0) return;
    const snapshot: Record<string, string[]> = {};
    selectedPointKeys.forEach(k => { snapshot[k] = []; });
    setPointTags((prev) => {
      const next = { ...prev };
      selectedPointKeys.forEach((key) => { next[key] = []; });
      return next;
    });
    try {
      setSaveStatus('saving');
      await saveTagsToBackend(snapshot);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      console.warn('Failed to clear selected tags in backend:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const clearAllTags = async () => {
    const snapshot: Record<string, string[]> = {};
    allPoints.forEach(p => { snapshot[p.key] = []; });
    setPointTags((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => { next[key] = []; });
      return next;
    });
    try {
      setSaveStatus('saving');
      await saveTagsToBackend(snapshot);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      console.warn('Failed to clear all tags in backend:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const rebuildHaystackFromBackend = async () => {
    if (selectedDeviceSerials.size === 0 || rebuildInProgress) {
      return;
    }

    setRebuildInProgress(true);
    setRebuildStatusMessage('');

    try {
      const serialNumbers = Array.from(selectedDeviceSerials);
      const response = await fetch(`${API_BASE_URL}/api/haystack/rebuild`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serialNumbers }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const payload = await response.json();
      const updated = Number(payload?.updated ?? serialNumbers.length);
      setRebuildStatusMessage(`Rebuilt Haystack tags for ${updated} device(s).`);
      setLoadRevision((prev) => prev + 1);
    } catch (error) {
      console.warn('Failed to rebuild Haystack tags from backend:', error);
      setRebuildStatusMessage('Failed to rebuild Haystack tags from backend.');
    } finally {
      setRebuildInProgress(false);
    }
  };

  const removeFilterTag = (tag: string) => {
    setFilterTags(prev => prev.filter(t => t !== tag));
  };

  const removePointTag = (key: string, tag: string) => {
    setPointTags(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(t => t !== tag) }));
  };

  const saveTagsToBackend = async (tagsSnapshot: Record<string, string[]>) => {
    const updates = allPoints
      .filter(p => p.key in tagsSnapshot)
      .map(p => ({
        serial: p.serial,
        pointTable: p.type === 'input' ? 'INPUTS' : p.type === 'output' ? 'OUTPUTS' : 'VARIABLES',
        pointIndex: p.index,
        tags: tagsArrayToObject(tagsSnapshot[p.key] ?? []),
      }));
    if (updates.length === 0) return;
    const response = await fetch(`${API_BASE_URL}/api/haystack/update-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    if (!response.ok) throw new Error(`Save tags failed: ${response.status}`);
  };

  const handleSaveTags = async () => {
    try {
      setSaveStatus('saving');
      await saveTagsToBackend(pointTags);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      console.warn('Failed to save tags to backend:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleApplyTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyTagToSelected();
    }
  };

  const handleFilterTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTagFilter();
    }
  };

  const allKnownTags = useMemo(() => {
    const tags = new Set<string>();
    Object.values(pointTags).forEach(list => list.forEach(tag => tags.add(tag)));
    return Array.from(tags)
      .filter(t => !t.startsWith('curVal:'))
      .sort((a, b) => a.localeCompare(b));
  }, [pointTags]);

  const taggedPointsCount = useMemo(
    () => allPoints.filter(p => (pointTags[p.key] ?? []).length > 0).length,
    [allPoints, pointTags]
  );

  const validationSummary = useMemo(() => {
    let selectedWithoutTags = 0;
    let selectedInsufficientTags = 0;
    let selectedSemanticConflicts = 0;

    selectedPointKeys.forEach((key) => {
      const tags = pointTags[key] ?? [];
      if (tags.length === 0) selectedWithoutTags += 1;
      if (tags.length < 2) selectedInsufficientTags += 1;
      const semanticCount = tags.filter(tag => SEMANTIC_TAGS.has(tag)).length;
      if (semanticCount > 1) selectedSemanticConflicts += 1;
    });

    return {
      selectedWithoutTags,
      selectedInsufficientTags,
      selectedSemanticConflicts,
    };
  }, [pointTags, selectedPointKeys]);

  return (
    <div className={styles.page}>
      {(validationSummary.selectedWithoutTags > 0 || validationSummary.selectedSemanticConflicts > 0 || validationSummary.selectedInsufficientTags > 0) && (
        <div className={styles.validationBanner}>
          <strong>Tag Validation:</strong>
          <span>{validationSummary.selectedWithoutTags} selected point(s) untagged.</span>
          <span>{validationSummary.selectedInsufficientTags} selected point(s) have fewer than 2 tags.</span>
          <span>{validationSummary.selectedSemanticConflicts} selected point(s) have semantic tag conflicts.</span>
        </div>
      )}

      {/* ── Two-panel Haystack workspace ── */}
      <div className={styles.main}>
        <aside className={styles.leftPanel}>
          {/* ── Panel header with action buttons ── */}
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleRow}>
              <span className={styles.panelTitle}>Tag Workspace</span>
              {saveStatus !== 'idle' && (
                <span className={saveStatus === 'saved' ? styles.saveStatusSaved : saveStatus === 'saving' ? styles.saveStatusSaving : styles.saveStatusError}>
                  {saveStatus === 'saving' ? '⟳ Saving…' : saveStatus === 'saved' ? '✓ Saved' : '⚠ Error'}
                </span>
              )}
            </div>
            <div className={styles.panelHeaderActions}>
              <button
                className={styles.headerActionBtn}
                onClick={rebuildHaystackFromBackend}
                disabled={selectedDevices.length === 0 || rebuildInProgress}
                title="Auto-Tag: re-derive static tags (unit, kind, equipRef) from device metadata for all points. Safe to run anytime — does not overwrite tags you added manually."
              >
                {rebuildInProgress ? '⟳…' : 'Auto-Tag'}
              </button>
              <button
                className={styles.headerActionBtnPrimary}
                onClick={handleSaveTags}
                disabled={allPoints.length === 0 || saveStatus === 'saving'}
                title="Save Tags: push all current tag edits to the database"
              >
                Save Tags
              </button>
              <button
                className={styles.headerActionBtnDanger}
                onClick={clearAllTags}
                disabled={allPoints.length === 0}
                title="Clear All Tags: remove all tags from every point on this device"
              >
                Clear All
              </button>
              <button
                className={styles.headerActionBtnDanger}
                onClick={clearTagsOnSelected}
                disabled={selectedPointKeys.size === 0}
                title="Clear Selected: remove all tags from the currently checked rows only"
              >
                Clear Sel.
              </button>
            </div>
          </div>

          {rebuildStatusMessage && (
            <div className={styles.rebuildStatus}>
              <span>{rebuildStatusMessage}</span>
              <button className={styles.dismissStatus} onClick={() => setRebuildStatusMessage('')}>×</button>
            </div>
          )}

          <div className={styles.panelBody}>
            {/* Workflow hint */}
            <div className={styles.workflowHint}>
              <span className={styles.workflowStep}>1</span>
              <span>Filter &amp; select rows on the right</span>
              <span className={styles.hintArrow}>→</span>
              <span className={styles.workflowStep}>2</span>
              <span>Apply tags here</span>
            </div>

            {/* ─── APPLY TAGS (always visible) ─── */}
            <div className={styles.flatSection}>
              <div className={styles.flatSectionLabel}>Apply Tags</div>
              <div className={styles.sectionRow}>
                <input
                  className={styles.tagInput}
                  value={applyTagInput}
                  onChange={e => setApplyTagInput(e.target.value)}
                  onKeyDown={handleApplyTagKeyDown}
                  placeholder="Custom tag (e.g. critical)"
                />
                <button
                  className={styles.tagActionBtn}
                  onClick={applyTagToSelected}
                  disabled={selectedPointKeys.size === 0 || !applyTagInput.trim()}
                >
                  + Add to {selectedPointKeys.size}
                </button>
              </div>

              <div className={styles.quickTagRow}>
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    className={styles.knownTagBtn}
                    onClick={() => applyQuickTag(tag)}
                    disabled={selectedPointKeys.size === 0}
                    title={`Apply "${tag}" to ${selectedPointKeys.size} selected point(s)`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                className={styles.tagActionBtn}
                onClick={resetSelectedPointsToHaystackDefaults}
                disabled={selectedPointKeys.size === 0}
              >
                ↺ Reset selected to defaults
              </button>
            </div>

            {/* ─── FILTER POINTS ─── */}
            <div className={styles.flatSection}>
              <div className={styles.flatSectionLabel}>Filter Points</div>
              <div className={styles.sectionRow}>
                <input
                  className={styles.tagInput}
                  value={filterTagInput}
                  onChange={e => setFilterTagInput(e.target.value)}
                  onKeyDown={handleFilterTagKeyDown}
                  placeholder="Filter by tag"
                />
                <button className={styles.tagActionBtn} onClick={addTagFilter} disabled={!filterTagInput.trim()}>
                  <FilterRegular style={{ fontSize: '11px' }} /> Add
                </button>
              </div>

              <div className={styles.tagStateTabs}>
                {(['all', 'tagged', 'untagged'] as TagStateFilter[]).map(state => (
                  <button
                    key={state}
                    className={`${styles.tagStateTab} ${tagStateFilter === state ? styles.tagStateTabActive : ''}`}
                    onClick={() => setTagStateFilter(state)}
                  >
                    {state === 'all' ? 'All' : state === 'tagged' ? 'Tagged' : 'Untagged'}
                  </button>
                ))}
              </div>

              {filterTags.length > 0 ? (
                <div className={styles.filterChips}>
                  <span className={styles.filterChipsLabel}>Active:</span>
                  {filterTags.map(tag => (
                    <span key={tag} className={styles.filterChip}>
                      {tag}
                      <button
                        className={styles.chipRemove}
                        aria-label={`Remove filter ${tag}`}
                        onClick={() => removeFilterTag(tag)}
                      >×</button>
                    </span>
                  ))}
                  <button className={styles.clearFilters} onClick={() => setFilterTags([])}>Clear all</button>
                </div>
              ) : (
                <span className={styles.helperText}>No active tag filters</span>
              )}

              <div className={styles.knownTags}>
                <span className={styles.filterChipsLabel}>Known:</span>
                {allKnownTags.length > 0 ? allKnownTags.map(tag => (
                  <button
                    key={tag}
                    className={styles.knownTagBtn}
                    onClick={() => setFilterTags(prev => (prev.includes(tag) ? prev : [...prev, tag]))}
                  >
                    {tag}
                  </button>
                )) : <span className={styles.helperText}>No tags yet</span>}
              </div>
            </div>

          </div>
        </aside>

        <section className={styles.rightPanel}>
          <div className={styles.secondaryBar}>
            {selectedDevice && (
              <div className={styles.deviceContextRow}>
                <span className={styles.deviceContextLabel}>Device</span>
                <span className={styles.deviceContextValue}>
                  {selectedDevice.nameShowOnTree || selectedDevice.productName || `SN-${selectedDevice.serialNumber}`}
                </span>
                <span className={styles.deviceContextMeta}>SN {selectedDevice.serialNumber}</span>
              </div>
            )}
            <div className={styles.typeFilterBar}>
              <div className={styles.typeTabs}>
                {([
                  { key: 'all', label: 'All points', count: allPoints.length },
                  { key: 'input', label: 'Inputs', count: countByType.input },
                  { key: 'output', label: 'Outputs', count: countByType.output },
                  { key: 'variable', label: 'Variables', count: countByType.variable },
                ] as Array<{ key: TabType; label: string; count: number }>).map(item => {
                  const active = activeTypeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      className={`${styles.typeTab} ${active ? styles.typeTabActive : ''}`}
                      onClick={() => handleTypeChipClick(item.key)}
                    >
                      {item.label}
                      {item.count > 0 && <span className={styles.tabCount}>{item.count}</span>}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={styles.clearSelectionBtn}
                onClick={() => setSelectedPointKeys(prev => {
                  const next = new Set(prev);
                  visiblePoints.forEach(p => next.add(p.key));
                  return next;
                })}
                disabled={visiblePoints.length === 0}
              >
                Select all visible
              </button>
              <button
                type="button"
                className={styles.clearSelectionBtn}
                onClick={() => setSelectedPointKeys(new Set())}
                disabled={selectedPointKeys.size === 0}
              >
                Clear selection
              </button>
              <div className={styles.statsRow}>
                <span className={styles.statsChip}>Visible {visiblePoints.length}</span>
                <span className={styles.statsChip}>Selected {selectedPointKeys.size}</span>
                <span className={styles.statsChip}>Tagged {taggedPointsCount}</span>
              </div>
              <div className={styles.typeSearchWrap}>
                <input
                  className={styles.typeSearchInput}
                  value={pointSearch}
                  onChange={e => setPointSearch(e.target.value)}
                  placeholder="Search label / full label"
                  aria-label="Search by label or full label"
                />
                {pointSearch.length > 0 && (
                  <button
                    type="button"
                    className={styles.typeSearchClear}
                    onClick={() => setPointSearch('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Points list */}
          <div className={styles.pointsWrap}>
            {loadingPoints ? (
              <div className={styles.empty}>Loading points…</div>
            ) : selectedDevices.length === 0 ? (
              <div className={styles.empty}>No devices available.</div>
            ) : visiblePoints.length === 0 ? (
              <div className={styles.empty}>No points match the current filters.</div>
            ) : (
              <table className={styles.pointTable}>
                <colgroup>
                  <col className={styles.colCheck} />
                  <col className={styles.colType} />
                  <col className={styles.colPoint} />
                  <col className={styles.colLabel} />
                  <col className={styles.colFullLabel} />
                  <col className={styles.colTags} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={styles.checkCol}>
                      <input
                        type="checkbox"
                        className={styles.nativeCheck}
                        ref={el => {
                          if (el) el.indeterminate =
                            visiblePoints.some(p => selectedPointKeys.has(p.key)) &&
                            !visiblePoints.every(p => selectedPointKeys.has(p.key));
                        }}
                        checked={visiblePoints.length > 0 && visiblePoints.every(p => selectedPointKeys.has(p.key))}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedPointKeys(prev => {
                              const next = new Set(prev);
                              visiblePoints.forEach(p => next.add(p.key));
                              return next;
                            });
                          } else {
                            setSelectedPointKeys(prev => {
                              const next = new Set(prev);
                              visiblePoints.forEach(p => next.delete(p.key));
                              return next;
                            });
                          }
                        }}
                        aria-label="Select / deselect all visible points"
                      />
                    </th>
                    <th>Type</th>
                    <th>Point</th>
                    <th>Label</th>
                    <th>Full Label</th>
                    <th>Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePoints.map(p => {
                    const tags = pointTags[p.key] ?? [];
                    return (
                      <tr key={p.key} className={selectedPointKeys.has(p.key) ? styles.rowSelected : ''}>
                        <td>
                          <input
                            type="checkbox"
                            className={styles.nativeCheck}
                            aria-label={`Select point ${p.type.toUpperCase()} ${p.index} on SN-${p.serial}`}
                            checked={selectedPointKeys.has(p.key)}
                            onChange={e => handleTogglePoint(p.key, e.target.checked)}
                          />
                        </td>
                        <td>
                          <span className={`${styles.typeTag} ${styles[`typeTag_${p.type}`]}`}>
                            {labelizeType(p.type)}
                          </span>
                        </td>
                        <td className={styles.monoCell}>{p.type.charAt(0).toUpperCase()}{p.index}</td>
                        <td className={styles.truncateText} title={p.pointLabel}>{p.pointLabel}</td>
                        <td className={styles.truncateText} title={p.fullLabel}>{p.fullLabel}</td>
                        <td>
                          <div className={styles.pointTagsCell}>
                            {(() => {
                              const visibleTags = tags.filter(t => !t.startsWith('curVal:'));
                              return visibleTags.length === 0 ? (
                                <span className={styles.noTags}>No tags</span>
                              ) : (
                                visibleTags.map(tag => (
                                  <span key={tag} className={styles.pointTagChip}>
                                    {tag}
                                    <button
                                      className={styles.chipRemove}
                                      aria-label={`Remove tag ${tag}`}
                                      onClick={() => removePointTag(p.key, tag)}
                                    >×</button>
                                  </span>
                                ))
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TrendPolicyPage;
