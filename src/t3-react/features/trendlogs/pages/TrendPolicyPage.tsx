import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRegular, TagRegular, FilterRegular } from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TrendPolicyPage.module.css';

type PointType = 'input' | 'output' | 'variable';
type TabType = 'all' | PointType;
type PrimaryTab = 'points' | 'tags';
type TagStateFilter = 'all' | 'tagged' | 'untagged';

interface UnifiedPoint {
  key: string;
  serial: number;
  panel: number;
  type: PointType;
  index: string;
  pointLabel: string;
  fullLabel: string;
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

export const TrendPolicyPage: React.FC = () => {
  const { devices, fetchDevices } = useDeviceTreeStore();

  const [selectedDeviceSerials, setSelectedDeviceSerials] = useState<Set<number>>(new Set());
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('points');
  const [activeTypeTab, setActiveTypeTab] = useState<TabType>('all');
  const [tagStateFilter, setTagStateFilter] = useState<TagStateFilter>('all');

  const [allPoints, setAllPoints] = useState<UnifiedPoint[]>([]);
  const [selectedPointKeys, setSelectedPointKeys] = useState<Set<string>>(new Set());
  const [loadingPoints, setLoadingPoints] = useState(false);

  const [applyTagInput, setApplyTagInput] = useState('');
  const [filterTagInput, setFilterTagInput] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [pointTags, setPointTags] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (devices.length === 0) {
      fetchDevices();
    }
  }, [devices.length, fetchDevices]);

  const selectedDevices = useMemo(
    () => devices.filter(d => selectedDeviceSerials.has(d.serialNumber)),
    [devices, selectedDeviceSerials]
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
                    const key = `${dev.serialNumber}:${type}:${index}`;
                    return {
                      key,
                      serial: dev.serialNumber,
                      panel,
                      type,
                      index: String(index),
                      pointLabel: String(pointLabel),
                      fullLabel: String(fullLabel),
                    } as UnifiedPoint;
                  });
                })
                .catch(() => [])
            );
          }
        }

        const settled = await Promise.all(requests);
        const merged = settled.flat();
        if (!cancelled) {
          setAllPoints(merged);
          setSelectedPointKeys(prev => {
            const next = new Set<string>();
            merged.forEach(p => {
              if (prev.has(p.key)) next.add(p.key);
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
  }, [selectedDevices]);

  const visiblePoints = useMemo(() => {
    let pts = activeTypeTab === 'all' ? allPoints : allPoints.filter(p => p.type === activeTypeTab);

    if (primaryTab !== 'points') {
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
    }

    return pts;
  }, [allPoints, activeTypeTab, filterTags, pointTags, primaryTab, tagStateFilter]);

  const selectedVisibleCount = useMemo(
    () => visiblePoints.filter(p => selectedPointKeys.has(p.key)).length,
    [visiblePoints, selectedPointKeys]
  );

  const countByType = useMemo(() => ({
    input: allPoints.filter(p => p.type === 'input').length,
    output: allPoints.filter(p => p.type === 'output').length,
    variable: allPoints.filter(p => p.type === 'variable').length,
  }), [allPoints]);

  const handleToggleDevice = (serial: number, checked: boolean) => {
    setSelectedDeviceSerials(prev => {
      const next = new Set(prev);
      if (checked) next.add(serial);
      else next.delete(serial);
      return next;
    });
  };

  const handleSelectAllDevices = (checked: boolean) => {
    if (!checked) {
      setSelectedDeviceSerials(new Set());
      return;
    }
    setSelectedDeviceSerials(new Set(devices.map(d => d.serialNumber)));
  };

  const handleTogglePoint = (key: string, checked: boolean) => {
    setSelectedPointKeys(prev => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleSelectAllVisible = (checked: boolean) => {
    setSelectedPointKeys(prev => {
      const next = new Set(prev);
      visiblePoints.forEach(p => {
        if (checked) next.add(p.key);
        else next.delete(p.key);
      });
      return next;
    });
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

  const removeFilterTag = (tag: string) => {
    setFilterTags(prev => prev.filter(t => t !== tag));
  };

  const removePointTag = (key: string, tag: string) => {
    setPointTags(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(t => t !== tag) }));
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
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [pointTags]);

  const taggedPointsCount = useMemo(
    () => allPoints.filter(p => (pointTags[p.key] ?? []).length > 0).length,
    [allPoints, pointTags]
  );

  const allDevicesSelected = devices.length > 0 && selectedDeviceSerials.size === devices.length;
  const allVisibleSelected = visiblePoints.length > 0 && selectedVisibleCount === visiblePoints.length;

  return (
    <div className={styles.page}>
      {/* ── Top toolbar ── */}
      <div className={styles.topBar}>
        <div className={styles.summaryChips}>
          <span className={styles.summaryChip}>
            <span className={styles.chipLabel}>Devices</span>
            <span className={styles.chipValue}>{selectedDevices.length}/{devices.length}</span>
          </span>
          <span className={styles.summaryChip}>
            <span className={styles.chipLabel}>Visible</span>
            <span className={styles.chipValue}>{visiblePoints.length}</span>
          </span>
          <span className={styles.summaryChip}>
            <span className={styles.chipLabel}>Selected</span>
            <span className={styles.chipValue}>{selectedPointKeys.size}</span>
          </span>
        </div>
        <div className={styles.topBarDivider} />
        <button
          className={styles.backBtn}
          onClick={() => { window.history.back(); }}
          aria-label="Back to Dashboard"
        >
          <ArrowLeftRegular style={{ fontSize: '13px' }} />
          Back to Dashboard
        </button>
      </div>

      {/* ── Two-panel layout ── */}
      <div className={styles.main}>

        {/* ── Left: Device Scope ── */}
        <section className={styles.leftPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Device Scope</span>
            <label className={styles.selectAllLabel}>
              <input
                type="checkbox"
                className={styles.nativeCheck}
                aria-label="Select all devices"
                checked={allDevicesSelected}
                onChange={e => handleSelectAllDevices(e.target.checked)}
              />
              All ({devices.length})
            </label>
          </div>
          <div className={styles.panelBody}>
            {devices.map(dev => {
              const checked = selectedDeviceSerials.has(dev.serialNumber);
              return (
                <label
                  key={dev.serialNumber}
                  className={`${styles.deviceItem} ${checked ? styles.deviceItemSelected : ''}`}
                >
                  <input
                    type="checkbox"
                    className={styles.nativeCheck}
                    aria-label={`Select device ${dev.nameShowOnTree || `SN-${dev.serialNumber}`}`}
                    checked={checked}
                    onChange={e => handleToggleDevice(dev.serialNumber, e.target.checked)}
                  />
                  <div>
                    <div className={styles.deviceName}>{dev.nameShowOnTree || `SN-${dev.serialNumber}`}</div>
                    <div className={styles.deviceSub}>SN-{dev.serialNumber} · Panel {dev.panelId ?? 1}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* ── Right: Point Selection ── */}
        <section className={styles.rightPanel}>

          <div className={styles.primaryTabBar}>
            {([
              { key: 'points', label: 'By Points', count: allPoints.length },
              { key: 'tags', label: 'By Tags', count: taggedPointsCount },
            ] as Array<{ key: PrimaryTab; label: string; count: number }>).map(tab => (
              <button
                key={tab.key}
                className={`${styles.primaryTab} ${primaryTab === tab.key ? styles.primaryTabActive : ''}`}
                onClick={() => setPrimaryTab(tab.key)}
              >
                {tab.label}
                <span className={styles.tabCount}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className={styles.secondaryBar}>
            {primaryTab === 'points' && (
              <div className={styles.typeFilterBar}>
                <label className={`${styles.selectAllLabel} ${styles.selectAllLabelLeading}`}>
                  <input
                    type="checkbox"
                    className={styles.nativeCheck}
                    aria-label="Select all visible points"
                    checked={allVisibleSelected}
                    onChange={e => handleSelectAllVisible(e.target.checked)}
                  />
                  Select All
                </label>
                <div className={styles.tabBarDivider} />
                {(['all', 'input', 'output', 'variable'] as TabType[]).map(tab => {
                  const label = tab === 'all' ? 'All Types' : tab === 'input' ? 'Inputs' : tab === 'output' ? 'Outputs' : 'Variables';
                  const count = tab === 'all' ? allPoints.length : countByType[tab];
                  return (
                    <button
                      key={tab}
                      className={`${styles.tab} ${activeTypeTab === tab ? styles.tabActive : ''}`}
                      onClick={() => setActiveTypeTab(tab)}
                    >
                      {label}
                      {count > 0 && <span className={styles.tabCount}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {primaryTab === 'tags' && (
              <div className={styles.tagWorkspace}>
                <div className={styles.tagHint}>
                  <TagRegular style={{ fontSize: '12px' }} />
                  Select point rows, then apply tags. Use filter tags to narrow the grid.
                </div>

                <div className={styles.tagControlsRow}>
                  <div className={styles.inlineControl}>
                    <span className={styles.controlLabel}>Apply Tag</span>
                    <input
                      className={styles.tagInput}
                      value={applyTagInput}
                      onChange={e => setApplyTagInput(e.target.value)}
                      onKeyDown={handleApplyTagKeyDown}
                      placeholder="e.g. critical"
                    />
                    <button
                      className={styles.tagActionBtn}
                      onClick={applyTagToSelected}
                      disabled={selectedPointKeys.size === 0 || !applyTagInput.trim()}
                    >
                      Apply to {selectedPointKeys.size}
                    </button>
                  </div>

                  <div className={styles.inlineControl}>
                    <span className={styles.controlLabel}>Filter Tag</span>
                    <input
                      className={styles.tagInput}
                      value={filterTagInput}
                      onChange={e => setFilterTagInput(e.target.value)}
                      onKeyDown={handleFilterTagKeyDown}
                      placeholder="tag to filter"
                    />
                    <button className={styles.tagActionBtn} onClick={addTagFilter} disabled={!filterTagInput.trim()}>
                      <FilterRegular style={{ fontSize: '12px' }} /> Add
                    </button>
                  </div>

                  <div className={styles.inlineControl}>
                    <span className={styles.controlLabel}>Tag State</span>
                    <div className={styles.segmentedControl}>
                      {(['all', 'tagged', 'untagged'] as TagStateFilter[]).map(state => (
                        <button
                          key={state}
                          className={`${styles.segmentBtn} ${tagStateFilter === state ? styles.segmentBtnActive : ''}`}
                          onClick={() => setTagStateFilter(state)}
                        >
                          {state === 'all' ? 'All' : state === 'tagged' ? 'Tagged' : 'Untagged'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.filterSummaryRow}>
                  {filterTags.length > 0 ? (
                    <div className={styles.filterChips}>
                      <span className={styles.filterChipsLabel}>Active Filters:</span>
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
                    <span className={styles.helperText}>No tag filters active</span>
                  )}

                  <div className={styles.knownTags}>
                    <span className={styles.filterChipsLabel}>Known Tags:</span>
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
            )}
          </div>

          {/* Points list */}
          <div className={styles.pointsWrap}>
            {loadingPoints ? (
              <div className={styles.empty}>Loading points…</div>
            ) : selectedDevices.length === 0 ? (
              <div className={styles.empty}>Select one or more devices on the left to load points.</div>
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
                  <col className={styles.colDevice} />
                  <col className={styles.colTags} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={styles.checkCol} />
                    <th>Type</th>
                    <th>Point</th>
                    <th>Label</th>
                    <th>Full Label</th>
                    <th>Device</th>
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
                        <td className={styles.deviceCell}>SN-{p.serial}</td>
                        <td>
                          <div className={styles.pointTagsCell}>
                            {tags.length === 0 ? (
                              <span className={styles.noTags}>No tags</span>
                            ) : (
                              tags.map(tag => (
                                <span key={tag} className={styles.pointTagChip}>
                                  {tag}
                                  <button
                                    className={styles.chipRemove}
                                    aria-label={`Remove tag ${tag}`}
                                    onClick={() => removePointTag(p.key, tag)}
                                  >×</button>
                                </span>
                              ))
                            )}
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
