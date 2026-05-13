import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Text } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';
import styles from './TrendPolicyPage.module.css';

type PointType = 'input' | 'output' | 'variable';

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

export const TrendPolicyPage: React.FC = () => {
  const { devices, fetchDevices } = useDeviceTreeStore();

  const [selectedDeviceSerials, setSelectedDeviceSerials] = useState<Set<number>>(new Set());
  const [includeInputs, setIncludeInputs] = useState(true);
  const [includeOutputs, setIncludeOutputs] = useState(true);
  const [includeVariables, setIncludeVariables] = useState(true);

  const [allPoints, setAllPoints] = useState<UnifiedPoint[]>([]);
  const [selectedPointKeys, setSelectedPointKeys] = useState<Set<string>>(new Set());
  const [loadingPoints, setLoadingPoints] = useState(false);

  const [tagInput, setTagInput] = useState('');
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

  const enabledTypes = useMemo(() => {
    const types: PointType[] = [];
    if (includeInputs) types.push('input');
    if (includeOutputs) types.push('output');
    if (includeVariables) types.push('variable');
    return types;
  }, [includeInputs, includeOutputs, includeVariables]);

  useEffect(() => {
    let cancelled = false;

    const loadPoints = async () => {
      if (selectedDevices.length === 0 || enabledTypes.length === 0) {
        setAllPoints([]);
        setSelectedPointKeys(new Set());
        return;
      }

      setLoadingPoints(true);
      try {
        const requests: Array<Promise<UnifiedPoint[]>> = [];

        for (const dev of selectedDevices) {
          for (const type of enabledTypes) {
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
  }, [selectedDevices, enabledTypes]);

  const visiblePoints = useMemo(() => {
    if (filterTags.length === 0) return allPoints;
    return allPoints.filter(p => {
      const tags = pointTags[p.key] ?? [];
      return filterTags.every(tag => tags.includes(tag));
    });
  }, [allPoints, filterTags, pointTags]);

  const selectedVisibleCount = useMemo(
    () => visiblePoints.filter(p => selectedPointKeys.has(p.key)).length,
    [visiblePoints, selectedPointKeys]
  );

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

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => { window.history.back(); }} aria-label="Back">
          <ArrowLeftRegular style={{ fontSize: '14px' }} />
          Back
        </button>
        <div className={styles.summaryChips}>
          <span className={styles.summaryChip}>Devices: {selectedDevices.length}/{devices.length}</span>
          <span className={styles.summaryChip}>Point Types: {enabledTypes.length}</span>
          <span className={styles.summaryChip}>Visible Points: {visiblePoints.length}</span>
          <span className={styles.summaryChip}>Selected Points: {selectedPointKeys.size}</span>
          <span className={styles.summaryChip}>Selected in View: {selectedVisibleCount}</span>
        </div>
      </div>

      <div className={styles.main}>
        <section className={styles.leftPanel}>
          <div className={styles.panelHeader}>Device Scope</div>
          <div className={styles.panelBody}>
            <div className={styles.selectAllRow}>
              <Checkbox
                checked={selectedDeviceSerials.size > 0 && selectedDeviceSerials.size === devices.length}
                onChange={(_, data) => handleSelectAllDevices(!!data.checked)}
                label={`Select All Devices (${devices.length})`}
              />
            </div>

            {devices.map(dev => {
              const checked = selectedDeviceSerials.has(dev.serialNumber);
              return (
                <label
                  key={dev.serialNumber}
                  className={`${styles.deviceItem} ${checked ? styles.deviceItemSelected : ''}`}
                >
                  <input
                    type="checkbox"
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

        <section className={styles.rightPanel}>
          <div className={styles.panelHeader}>Point Selection + Tags</div>

          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <Checkbox checked={includeInputs} onChange={(_, d) => setIncludeInputs(!!d.checked)} label="Inputs" />
              <Checkbox checked={includeOutputs} onChange={(_, d) => setIncludeOutputs(!!d.checked)} label="Outputs" />
              <Checkbox checked={includeVariables} onChange={(_, d) => setIncludeVariables(!!d.checked)} label="Variables" />
            </div>
            <div className={styles.controlGroup}>
              <Checkbox
                checked={visiblePoints.length > 0 && selectedVisibleCount === visiblePoints.length}
                onChange={(_, d) => handleSelectAllVisible(!!d.checked)}
                label="Select All Visible"
              />
            </div>
          </div>

          <div className={styles.tagRow}>
            <Text size={200}>Tag:</Text>
            <input
              className={styles.tagInput}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="critical, energy, ahu..."
            />
            <Button size="small" appearance="secondary" onClick={addTagFilter}>Add Filter Tag</Button>
            <Button size="small" appearance="primary" onClick={applyTagToSelected}>Apply Tag To Selected</Button>
            {filterTags.map(tag => (
              <span key={tag} className={styles.tagChip}>{tag}</span>
            ))}
          </div>

          <div className={styles.pointsWrap}>
            {loadingPoints ? (
              <div className={styles.empty}>Loading points...</div>
            ) : visiblePoints.length === 0 ? (
              <div className={styles.empty}>Select device(s) and point type(s) to load points.</div>
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
                  {visiblePoints.map(p => (
                    <tr key={p.key}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select point ${p.type.toUpperCase()} ${p.index} on SN-${p.serial}`}
                          checked={selectedPointKeys.has(p.key)}
                          onChange={e => handleTogglePoint(p.key, e.target.checked)}
                        />
                      </td>
                      <td>{labelizeType(p.type)}</td>
                      <td>{p.type.toUpperCase()} {p.index}</td>
                      <td>{p.label}</td>
                      <td>SN-{p.serial}</td>
                      <td>{(pointTags[p.key] ?? []).join(', ') || '—'}</td>
                    </tr>
                  ))}
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
