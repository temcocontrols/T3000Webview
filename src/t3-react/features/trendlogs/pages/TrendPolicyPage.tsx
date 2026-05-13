import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRegular, TagRegular, FilterRegular } from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TrendPolicyPage.module.css';

type PointType = 'input' | 'output' | 'variable';
type TabType = 'all' | PointType;

interface UnifiedPoint {
  key: string;
  serial: number;
  panel: number;
  type: PointType;
  index: string;
  label: string;
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
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const [allPoints, setAllPoints] = useState<UnifiedPoint[]>([]);
  const [selectedPointKeys, setSelectedPointKeys] = useState<Set<string>>(new Set());
  const [loadingPoints, setLoadingPoints] = useState(false);

  const [tagInput, setTagInput] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [pointTags, setPointTags] = useState<Record<string, string[]>>({});
  const [tagMode, setTagMode] = useState<'filter' | 'apply'>('apply');

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
                    const label =
                      row.fullLabel ?? row.label ?? row.description ?? row.name ?? `${labelizeType(type)} ${index}`;
                    const panel = row.panelId ?? dev.panelId ?? 1;
                    const key = `${dev.serialNumber}:${type}:${index}`;
                    return {
                      key,
                      serial: dev.serialNumber,
                      panel,
                      type,
                      index: String(index),
                      label: String(label),
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
    let pts = activeTab === 'all' ? allPoints : allPoints.filter(p => p.type === activeTab);
    if (filterTags.length > 0) {
      pts = pts.filter(p => {
        const tags = pointTags[p.key] ?? [];
        return filterTags.every(tag => tags.includes(tag));
      });
    }
    return pts;
  }, [allPoints, activeTab, filterTags, pointTags]);

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
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    setFilterTags(prev => (prev.includes(tag) ? prev : [...prev, tag]));
    setTagInput('');
  };

  const applyTagToSelected = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;

    setPointTags(prev => {
      const next = { ...prev };
      selectedPointKeys.forEach(key => {
        const tags = next[key] ?? [];
        if (!tags.includes(tag)) next[key] = [...tags, tag];
      });
      return next;
    });
    setTagInput('');
  };

  const removeFilterTag = (tag: string) => {
    setFilterTags(prev => prev.filter(t => t !== tag));
  };

  const removePointTag = (key: string, tag: string) => {
    setPointTags(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(t => t !== tag) }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (tagMode === 'filter') addTagFilter();
      else applyTagToSelected();
    }
  };

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

          {/* Tab bar */}
          <div className={styles.tabBar}>
            <label className={`${styles.selectAllLabel} ${styles.selectAllLabelLeading}`}>
              <input
                type="checkbox"
                className={styles.nativeCheck}
                aria-label="Select all visible points"
                checked={allVisibleSelected}
                onChange={e => handleSelectAllVisible(e.target.checked)}
              />
              All
            </label>
            <div className={styles.tabBarDivider} />
            {(['all', 'input', 'output', 'variable'] as TabType[]).map(tab => {
              const label = tab === 'all' ? `All Types` : tab === 'input' ? `Inputs` : tab === 'output' ? `Outputs` : `Variables`;
              const count = tab === 'all' ? allPoints.length : countByType[tab];
              return (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {label}
                  {count > 0 && <span className={styles.tabCount}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Tag toolbar */}
          <div className={styles.tagToolbar}>
            <div className={styles.tagModeToggle}>
              <button
                className={`${styles.tagModeBtn} ${tagMode === 'apply' ? styles.tagModeBtnActive : ''}`}
                onClick={() => setTagMode('apply')}
              >
                <TagRegular style={{ fontSize: '12px' }} /> Tag Selected
              </button>
              <button
                className={`${styles.tagModeBtn} ${tagMode === 'filter' ? styles.tagModeBtnActive : ''}`}
                onClick={() => setTagMode('filter')}
              >
                <FilterRegular style={{ fontSize: '12px' }} /> Filter by Tag
              </button>
            </div>
            <input
              className={styles.tagInput}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={tagMode === 'apply' ? 'tag name, press Enter…' : 'filter tag, press Enter…'}
            />
            {tagMode === 'apply' ? (
              <button
                className={styles.tagActionBtn}
                onClick={applyTagToSelected}
                disabled={selectedPointKeys.size === 0 || !tagInput.trim()}
                title={selectedPointKeys.size === 0 ? 'Select points first' : `Apply tag to ${selectedPointKeys.size} selected point(s)`}
              >
                Apply to {selectedPointKeys.size} point{selectedPointKeys.size !== 1 ? 's' : ''}
              </button>
            ) : (
              <button
                className={styles.tagActionBtn}
                onClick={addTagFilter}
                disabled={!tagInput.trim()}
              >
                Add Filter
              </button>
            )}
            {filterTags.length > 0 && (
              <div className={styles.filterChips}>
                <span className={styles.filterChipsLabel}>Filters:</span>
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
                <thead>
                  <tr>
                    <th className={styles.checkCol} />
                    <th>Type</th>
                    <th>Point</th>
                    <th>Label</th>
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
                        <td>{p.label}</td>
                        <td className={styles.deviceCell}>SN-{p.serial}</td>
                        <td>
                          <div className={styles.pointTagsCell}>
                            {tags.map(tag => (
                              <span key={tag} className={styles.pointTagChip}>
                                {tag}
                                <button
                                  className={styles.chipRemove}
                                  aria-label={`Remove tag ${tag}`}
                                  onClick={() => removePointTag(p.key, tag)}
                                >×</button>
                              </span>
                            ))}
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
