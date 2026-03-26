/**
 * ExpansionIOTab
 *
 * Matches C++ CBacnetIOConfig dialog (BacnetIOConfig.cpp).
 * Columns: Num (checkbox) | Hardware | Port | ID | Last Contact | Inputs | Outputs
 *
 * Static data from global_define.h:
 *   ExtIO_Product[]   = T3_8AI8AO6DO, T3_22I, T3_PT12, PWM_IO_Transducer
 *   ExtIO_ProductId[] = 44, 43, 46, 104
 *   ExtIO_Port[]      = RS485 Sub, Zigbee, RS485 Main
 *   Max rows: 12 (BAC_EXTIO_COUNT)
 *
 * Row 0 = the main device panel (Port/ID/LastContact shown as "N/A", not editable).
 * Rows 1+ = expansion modules with editable Hardware/Port/ID.
 * IO ranges (Inputs/Outputs) are auto-calculated from previous row when Hardware changes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Option,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { AddRegular, ChevronDownRegular, ChevronUpRegular, DeleteRegular, CheckmarkRegular, DismissRegular, InfoRegular } from '@fluentui/react-icons';

// ─── Viewport width hook (same tiers as PointListRow) ─────────────────────
function useViewportWidth(): number {
  const [vw, setVw] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0
  );
  React.useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    const update = () => { clearTimeout(tid); tid = setTimeout(() => setVw(window.innerWidth), 50); };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); clearTimeout(tid); };
  }, []);
  return vw;
}
const T1 = 600;  // show Port + ID
const T2 = 800;  // also show Inputs + Outputs

// ─── Static data (from C++ global_define.h) ───────────────────────────────

const MAX_EXTIO_COUNT = 12;

interface ExtioProduct {
  name: string;
  id: number;
  inputCount: number;
  outputCount: number;
}

const EXTIO_PRODUCTS: ExtioProduct[] = [
  { name: 'T3_8AI8AO6DO',      id: 44,  inputCount: 8,  outputCount: 14 },
  { name: 'T3_22I',            id: 43,  inputCount: 22, outputCount: 0  },
  { name: 'T3_PT12',           id: 46,  inputCount: 12, outputCount: 0  },
  { name: 'PWM_IO_Transducer', id: 104, inputCount: 6,  outputCount: 6  },
];

const EXTIO_PORTS = ['RS485 Sub', 'Zigbee', 'RS485 Main'] as const;

// ─── Types ────────────────────────────────────────────────────────────────

export interface ExtioEntry {
  product_id: number;
  port: number;              // 0=RS485 Sub, 1=Zigbee, 2=RS485 Main
  modbus_id: number;         // 1–254; 0 = N/A (row 0)
  last_contact_time: number; // Unix timestamp, 0 = not contacted
  input_start: number;
  input_end: number;
  output_start: number;
  output_end: number;
}

export interface ExpansionIOSettings {
  devices: ExtioEntry[];
}

interface ExpansionIOTabProps {
  expansionSettings: ExpansionIOSettings;
  setExpansionSettings: (s: ExpansionIOSettings) => void;
  onDone: (settings: ExpansionIOSettings) => Promise<void>;
  loading?: boolean;
  mobile?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getProductIndexById(id: number): number {
  const idx = EXTIO_PRODUCTS.findIndex(p => p.id === id);
  return idx >= 0 ? idx : 0;
}

/**
 * Recalculate input/output start-end ranges for rows [fromIndex .. end].
 * Cascades from the previous row's ending values.
 */
function recalculateFromRow(devices: ExtioEntry[], fromIndex: number): ExtioEntry[] {
  if (fromIndex <= 0 || fromIndex >= devices.length) return devices;
  const result = [...devices];
  for (let i = fromIndex; i < result.length; i++) {
    const prev = result[i - 1];
    const prod = EXTIO_PRODUCTS[getProductIndexById(result[i].product_id)];
    result[i] = {
      ...result[i],
      product_id: prod.id,
      input_start: prev.input_end + 1,
      input_end: prev.input_end + prod.inputCount,
      output_start: prod.outputCount > 0 ? prev.output_end + 1 : prev.output_end,
      output_end: prod.outputCount > 0 ? prev.output_end + prod.outputCount : prev.output_end,
    };
  }
  return result;
}

/**
 * Format a Unix timestamp as "YY/MM/DD HH:MM:SS".
 * Returns "N/A" if the timestamp is older than a week or in the future.
 * Returns "" if zero (never contacted).
 */
function formatLastContact(ts: number): string {
  if (!ts) return '';
  const now = Math.floor(Date.now() / 1000);
  if (ts < now - 604800 || ts > now) return 'N/A';
  const d = new Date(ts * 1000);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  tableWrapper: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    overflowY: 'auto',
    minHeight: '300px',
    maxHeight: '400px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    tableLayout: 'fixed',
  },
  thead: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  thNum: {
    width: '60px',
    padding: '6px 4px',
    textAlign: 'center',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  thHardware: {
    width: '140px',
    padding: '6px 8px',
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  thPort: {
    width: '120px',
    padding: '6px 8px',
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  thId: {
    width: '60px',
    padding: '6px 8px',
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  thLastContact: {
    width: '150px',
    padding: '6px 8px',
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  thInputs: {
    width: '90px',
    padding: '6px 8px',
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  thOutputs: {
    padding: '6px 8px',
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  trEven: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  trOdd: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tdCenter: {
    padding: '3px 4px',
    textAlign: 'center',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    verticalAlign: 'middle',
    fontSize: '12px',
  },
  td: {
    padding: '3px 6px',
    fontSize: '12px',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    verticalAlign: 'middle',
  },
  tdLast: {
    padding: '3px 6px',
    fontSize: '12px',
    verticalAlign: 'middle',
  },
  cellText: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
  smallDropdown: {
    width: '100%',
    fontSize: '12px',
    minWidth: '0',
  },
  smallInput: {
    width: '100%',
    fontSize: '12px',
    minWidth: '0',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  statusMsg: {
    fontSize: '12px',
    color: tokens.colorPaletteRedForeground1,
    marginLeft: '8px',
  },
  statusOk: {
    fontSize: '12px',
    color: tokens.colorPaletteGreenForeground1,
    marginLeft: '8px',
  },
  emptyHint: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    padding: '20px',
    textAlign: 'center',
  },
  dataNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    padding: '4px 8px',
  },

  // ── Mobile layout classes ──────────────────────────────────────────────────
  mobileRoot: {
    display: 'flex',
    flexDirection: 'column',
  },
  mobileActionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 10px',
    backgroundColor: '#fafafa',
    borderBottom: `1px solid #edebe9`,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  mobileList: {
    flex: 1,
    overflowY: 'auto',
  },
  mobileListHeader: {
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    backgroundColor: '#fafafa',
    borderBottom: `1px solid #edebe9`,
    paddingLeft: '8px',
    paddingRight: '6px',
    flexShrink: 0,
    userSelect: 'none',
  },
  mobileHeaderCell: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#323130',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileHeaderNum: {
    width: '32px',
    flexShrink: 0,
  },
  mobileHeaderHardware: {
    flex: 1,
    paddingLeft: '6px',
  },
  mobileHeaderPort: {
    width: '86px',
    flexShrink: 0,
  },
  mobileHeaderRange: {
    width: '64px',
    flexShrink: 0,
    textAlign: 'right' as const,
    paddingRight: '4px',
  },
  mobileHeaderChevron: {
    width: '20px',
    flexShrink: 0,
  },
  mobileRow: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  mobileRowSelected: {
    backgroundColor: '#edf2fa',
  },
  mobileRowInner: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    minHeight: '44px',
    paddingLeft: '8px',
    paddingRight: '6px',
    cursor: 'pointer',
    userSelect: 'none',
    background: 'none',
    border: 'none',
    textAlign: 'left' as const,
    appearance: 'none',
    fontFamily: 'inherit',
    ':hover': { backgroundColor: '#fafafa' },
    ':active': { backgroundColor: tokens.colorNeutralBackground2 },
  },
  mobileNumCell: {
    width: '32px',
    flexShrink: 0,
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    fontWeight: 500,
  },
  mobileHardwareCell: {
    flex: 1,
    paddingLeft: '6px',
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobilePortCell: {
    width: '86px',
    flexShrink: 0,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileRangeCell: {
    width: '64px',
    flexShrink: 0,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    textAlign: 'right' as const,
    paddingRight: '4px',
  },
  mobileChevronCell: {
    width: '20px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
  },
  // extra column cells for wider viewports
  mobileHeaderId: {
    width: '50px',
    flexShrink: 0,
  },
  mobileHeaderInputs: {
    width: '70px',
    flexShrink: 0,
    textAlign: 'right' as const,
    paddingRight: '4px',
  },
  mobileHeaderOutputs: {
    width: '70px',
    flexShrink: 0,
    textAlign: 'right' as const,
    paddingRight: '4px',
  },
  mobileIdCell: {
    width: '50px',
    flexShrink: 0,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileInputsCell: {
    width: '70px',
    flexShrink: 0,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    textAlign: 'right' as const,
    paddingRight: '4px',
  },
  mobileOutputsCell: {
    width: '70px',
    flexShrink: 0,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    textAlign: 'right' as const,
    paddingRight: '4px',
  },
  // propGrid — flex-wrap tile grid (same as PointListRow expanded section)
  mobilePropGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    borderTop: '1px solid #e0e0e0',
    borderLeft: '1px solid #e0e0e0',
    backgroundColor: '#f5f8fc',
  },
  mobilePropRow: {
    flex: '1 1 140px',
    minWidth: '140px',
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 10px',
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
  },
  mobilePropKey: {
    fontSize: '10px',
    color: '#8a8886',
    fontWeight: 600,
    textTransform: 'uppercase' as 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '2px',
  },
  mobilePropVal: {
    fontSize: '12px',
    color: '#323130',
    fontWeight: 400,
    wordBreak: 'break-word' as 'break-word',
  },
  mobileStatusMsg: {
    fontSize: '12px',
    color: tokens.colorPaletteRedForeground1,
  },
  mobileStatusOk: {
    fontSize: '12px',
    color: tokens.colorPaletteGreenForeground1,
  },
});

// ─── Component ────────────────────────────────────────────────────────────

export const ExpansionIOTab: React.FC<ExpansionIOTabProps> = ({
  expansionSettings,
  setExpansionSettings,
  onDone,
  loading = false,
  mobile = false,
}) => {
  const styles = useStyles();

  // Local editable copy — Cancel resets; Done saves to parent + API
  const [devices, setDevices] = useState<ExtioEntry[]>(expansionSettings.devices);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Sync local copy when parent settings update (e.g., after refresh)
  useEffect(() => {
    setDevices(expansionSettings.devices);
    setSelectedIndex(null);
    setStatusMsg(null);
  }, [expansionSettings]);

  const handleCheckRow = useCallback((idx: number, checked: boolean) => {
    setSelectedIndex(checked ? idx : null);
    setStatusMsg(null);
  }, []);

  const handleHardwareChange = useCallback((rowIndex: number, productName: string) => {
    const pidIdx = EXTIO_PRODUCTS.findIndex(p => p.name === productName);
    if (pidIdx < 0) return;
    setDevices(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], product_id: EXTIO_PRODUCTS[pidIdx].id };
      return recalculateFromRow(updated, rowIndex);
    });
  }, []);

  const handlePortChange = useCallback((rowIndex: number, portName: string) => {
    const portIdx = EXTIO_PORTS.indexOf(portName as typeof EXTIO_PORTS[number]);
    if (portIdx < 0) return;
    setDevices(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], port: portIdx };
      return updated;
    });
  }, []);

  const handleIdChange = useCallback((rowIndex: number, value: string) => {
    const id = parseInt(value, 10);
    if (!Number.isFinite(id) || id <= 0 || id >= 255) return;
    setDevices(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], modbus_id: id };
      return updated;
    });
  }, []);

  const handleAdd = () => {
    if (devices.length >= MAX_EXTIO_COUNT) {
      setStatusMsg({ text: "Can't add more expansion I/O (max 12).", isError: true });
      return;
    }
    setStatusMsg(null);
    const prev = devices.length > 0
      ? devices[devices.length - 1]
      : { input_end: 0, output_end: 0 } as ExtioEntry;
    const defProd = EXTIO_PRODUCTS[0];
    const newEntry: ExtioEntry = {
      product_id: defProd.id,
      port: 2, // RS485 Main
      modbus_id: 1,
      last_contact_time: 0,
      input_start: prev.input_end + 1,
      input_end: prev.input_end + defProd.inputCount,
      output_start: prev.output_end + 1,
      output_end: prev.output_end + defProd.outputCount,
    };
    setDevices(prev => [...prev, newEntry]);
  };

  const handleDeleteSelected = () => {
    if (selectedIndex === null || selectedIndex === 0) return;
    setDevices(prev => {
      const filtered = prev.filter((_, i) => i !== selectedIndex);
      const startFrom = Math.min(selectedIndex, filtered.length - 1);
      return recalculateFromRow(filtered, Math.max(1, startFrom));
    });
    setSelectedIndex(null);
    setStatusMsg(null);
  };

  const handleDone = async () => {
    setSaveLoading(true);
    setStatusMsg(null);
    try {
      const updated: ExpansionIOSettings = { ...expansionSettings, devices };
      await onDone(updated);
      setExpansionSettings(updated);
      setStatusMsg({ text: 'Saved successfully.', isError: false });
    } catch (e) {
      setStatusMsg({ text: e instanceof Error ? e.message : 'Save failed.', isError: true });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setDevices(expansionSettings.devices);
    setSelectedIndex(null);
    setStatusMsg(null);
  };

  const isDisabled = loading || saveLoading;
  const vw = useViewportWidth();
  const isWide = vw >= T1;    // ≥600px: show Port + ID columns
  const isVeryWide = vw >= T2; // ≥800px: also show Inputs + Outputs columns

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div className={styles.mobileRoot}>

        {/* Action bar */}
        <div className={styles.mobileActionBar}>
          <Button size="small" appearance="secondary" icon={<AddRegular />}
            onClick={handleAdd} disabled={isDisabled || devices.length >= MAX_EXTIO_COUNT}>
            Add
          </Button>
          <Button size="small" appearance="secondary" icon={<DeleteRegular />}
            onClick={handleDeleteSelected} disabled={isDisabled || selectedIndex === null || selectedIndex === 0}>
            Delete
          </Button>
          <Button size="small" appearance="primary" icon={<CheckmarkRegular />}
            onClick={handleDone} disabled={isDisabled}>
            {saveLoading ? 'Saving…' : 'Done'}
          </Button>
          <Button size="small" appearance="secondary" icon={<DismissRegular />}
            onClick={handleCancel} disabled={isDisabled}>
            Cancel
          </Button>
          <Button size="small" appearance="secondary" disabled={true}>Redefine IO</Button>
          {statusMsg && (
            <span className={statusMsg.isError ? styles.mobileStatusMsg : styles.mobileStatusOk}>
              {statusMsg.text}
            </span>
          )}
        </div>

        {/* Column header — tier-based */}
        <div className={styles.mobileListHeader}>
          <span className={mergeClasses(styles.mobileHeaderCell, styles.mobileHeaderNum)}>#</span>
          <span className={mergeClasses(styles.mobileHeaderCell, styles.mobileHeaderHardware)}>Hardware</span>
          {isWide && <span className={mergeClasses(styles.mobileHeaderCell, styles.mobileHeaderPort)}>Port</span>}
          {isWide && <span className={mergeClasses(styles.mobileHeaderCell, styles.mobileHeaderId)}>ID</span>}
          {isVeryWide && <span className={mergeClasses(styles.mobileHeaderCell, styles.mobileHeaderInputs)}>Inputs</span>}
          {isVeryWide && <span className={mergeClasses(styles.mobileHeaderCell, styles.mobileHeaderOutputs)}>Outputs</span>}
          <span className={styles.mobileHeaderChevron} />
        </div>

        {/* List */}
        <div className={styles.mobileList}>
          {devices.length === 0 ? (
            <div className={styles.emptyHint}>No expansion I/O modules configured. Tap "Add" to add one.</div>
          ) : (
            devices.map((entry, i) => {
              const isExpanded = selectedIndex === i;
              const isRow0 = i === 0;
              const prod = EXTIO_PRODUCTS[getProductIndexById(entry.product_id)];
              const portName = EXTIO_PORTS[Math.min(entry.port, EXTIO_PORTS.length - 1)];
              const inputDisplay = isRow0 ? 'N/A' : `${entry.input_start}–${entry.input_end}`;
              const outputDisplay = isRow0 ? 'N/A' : (prod.outputCount === 0 ? 'N/A' : `${entry.output_start}–${entry.output_end}`);
              const lastContact = isRow0 ? 'N/A' : formatLastContact(entry.last_contact_time);

              return (
                <div key={i} className={mergeClasses(styles.mobileRow, isExpanded && styles.mobileRowSelected)}>

                  {/* Compact row — columns shown based on viewport tier */}
                  <button
                    className={styles.mobileRowInner}
                    onClick={() => { setSelectedIndex(prev => prev === i ? null : i); setStatusMsg(null); }}
                  >
                    <span className={styles.mobileNumCell}>{i + 1}</span>
                    <span className={styles.mobileHardwareCell}>{prod.name}</span>
                    {isWide && <span className={styles.mobilePortCell}>{isRow0 ? 'N/A' : portName}</span>}
                    {isWide && <span className={styles.mobileIdCell}>{isRow0 ? 'N/A' : entry.modbus_id}</span>}
                    {isVeryWide && <span className={styles.mobileInputsCell}>{inputDisplay}</span>}
                    {isVeryWide && <span className={styles.mobileOutputsCell}>{outputDisplay}</span>}
                    <span className={styles.mobileChevronCell}>
                      {isExpanded ? <ChevronUpRegular fontSize={14} /> : <ChevronDownRegular fontSize={14} />}
                    </span>
                  </button>

                  {/* Expanded area — propGrid tiles (flex-wrap, dynamic columns by width) */}
                  {isExpanded && (
                    <div className={styles.mobilePropGrid}>
                      {isRow0 ? (
                        /* Row 0 = main panel, all read-only */
                        [['Hardware', prod.name], ['Port', 'N/A'], ['ID', 'N/A'],
                         ['Last Contact', 'N/A'], ['Inputs', inputDisplay], ['Outputs', outputDisplay]]
                          .map(([k, v]) => (
                            <div key={k} className={styles.mobilePropRow}>
                              <span className={styles.mobilePropKey}>{k}</span>
                              <span className={styles.mobilePropVal}>{v}</span>
                            </div>
                          ))
                      ) : (
                        /* Rows 1+ = editable fields inline inside each tile */
                        <>
                          <div className={styles.mobilePropRow}>
                            <span className={styles.mobilePropKey}>Hardware</span>
                            <Dropdown appearance="underline" size="small" value={prod.name} selectedOptions={[prod.name]}
                              onOptionSelect={(_, d) => handleHardwareChange(i, d.optionValue ?? '')} disabled={isDisabled}>
                              {EXTIO_PRODUCTS.map(p => (<Option key={p.name} value={p.name}>{p.name}</Option>))}
                            </Dropdown>
                          </div>
                          <div className={styles.mobilePropRow}>
                            <span className={styles.mobilePropKey}>Port</span>
                            <Dropdown appearance="underline" size="small" value={portName} selectedOptions={[portName]}
                              onOptionSelect={(_, d) => handlePortChange(i, d.optionValue ?? '')} disabled={isDisabled}>
                              {EXTIO_PORTS.map(p => (<Option key={p} value={p}>{p}</Option>))}
                            </Dropdown>
                          </div>
                          <div className={styles.mobilePropRow}>
                            <span className={styles.mobilePropKey}>ID</span>
                            <Input appearance="underline" size="small"
                              key={`mid-${i}-${entry.modbus_id}`}
                              defaultValue={String(entry.modbus_id || '')}
                              disabled={isDisabled}
                              onBlur={e => handleIdChange(i, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleIdChange(i, (e.target as HTMLInputElement).value); }}
                            />
                          </div>
                          <div className={styles.mobilePropRow}>
                            <span className={styles.mobilePropKey}>Last Contact</span>
                            <span className={styles.mobilePropVal}>{lastContact || '—'}</span>
                          </div>
                          <div className={styles.mobilePropRow}>
                            <span className={styles.mobilePropKey}>Inputs</span>
                            <span className={styles.mobilePropVal}>{inputDisplay}</span>
                          </div>
                          <div className={styles.mobilePropRow}>
                            <span className={styles.mobilePropKey}>Outputs</span>
                            <span className={styles.mobilePropVal}>{outputDisplay}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>      {/* ⚠️ Data source note: Str_Extio_point[] is NOT in the 400-byte Str_Setting_Info */}
      <div className={styles.dataNote}>
        <InfoRegular fontSize={12} />
        <span>
          <strong>Data source:</strong> Str_Extio_point[] — separate from the 400-byte settings block.
          Loaded via <code>GET /api/v1/devices/:sn/expansion-io</code>.
        </span>
      </div>      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.thNum}>Num</th>
              <th className={styles.thHardware}>Hardware</th>
              <th className={styles.thPort}>Port</th>
              <th className={styles.thId}>ID</th>
              <th className={styles.thLastContact}>Last Contact</th>
              <th className={styles.thInputs}>Inputs</th>
              <th className={styles.thOutputs}>Outputs</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyHint}>
                  No expansion I/O modules configured. Click "Add Expansion I/O" to add one.
                </td>
              </tr>
            ) : (
              devices.map((entry, i) => {
                const isRow0 = i === 0;
                const isSelected = selectedIndex === i;
                const trClass = i % 2 === 0 ? styles.trEven : styles.trOdd;
                const prodIdx = getProductIndexById(entry.product_id);
                const prod = EXTIO_PRODUCTS[prodIdx];
                const portName = EXTIO_PORTS[Math.min(entry.port, EXTIO_PORTS.length - 1)];
                const inputDisplay = isRow0 ? 'N/A' : `${entry.input_start}-${entry.input_end}`;
                const outputDisplay = isRow0 ? 'N/A' : (prod.outputCount === 0 ? 'N/A' : `${entry.output_start}-${entry.output_end}`);
                const lastContact = isRow0 ? 'N/A' : formatLastContact(entry.last_contact_time);

                return (
                  <tr key={i} className={trClass}>
                    {/* Num + row checkbox */}
                    <td className={styles.tdCenter}>
                      {!isRow0 ? (
                        <Checkbox
                          checked={isSelected}
                          onChange={(_, d) => handleCheckRow(i, !!d.checked)}
                          label={String(i + 1)}
                          disabled={isDisabled}
                        />
                      ) : (
                        <Text className={styles.cellText}>1</Text>
                      )}
                    </td>

                    {/* Hardware dropdown */}
                    <td className={styles.td}>
                      {!isRow0 ? (
                        <Dropdown
                          className={styles.smallDropdown}
                          appearance="underline"
                          size="small"
                          value={prod.name}
                          selectedOptions={[prod.name]}
                          onOptionSelect={(_, d) => handleHardwareChange(i, d.optionValue ?? '')}
                          disabled={isDisabled}
                        >
                          {EXTIO_PRODUCTS.map(p => (
                            <Option key={p.name} value={p.name}>{p.name}</Option>
                          ))}
                        </Dropdown>
                      ) : (
                        <Text className={styles.cellText}>{prod.name}</Text>
                      )}
                    </td>

                    {/* Port dropdown */}
                    <td className={styles.td}>
                      {!isRow0 ? (
                        <Dropdown
                          className={styles.smallDropdown}
                          appearance="underline"
                          size="small"
                          value={portName}
                          selectedOptions={[portName]}
                          onOptionSelect={(_, d) => handlePortChange(i, d.optionValue ?? '')}
                          disabled={isDisabled}
                        >
                          {EXTIO_PORTS.map(p => (
                            <Option key={p} value={p}>{p}</Option>
                          ))}
                        </Dropdown>
                      ) : (
                        <Text className={styles.cellText}>N/A</Text>
                      )}
                    </td>

                    {/* Modbus ID */}
                    <td className={styles.td}>
                      {!isRow0 ? (
                        <Input
                          key={`id-${i}-${entry.modbus_id}`}
                          className={styles.smallInput}
                          size="small"
                          appearance="underline"
                          defaultValue={String(entry.modbus_id || '')}
                          disabled={isDisabled}
                          onBlur={e => handleIdChange(i, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleIdChange(i, (e.target as HTMLInputElement).value);
                          }}
                        />
                      ) : (
                        <Text className={styles.cellText}>N/A</Text>
                      )}
                    </td>

                    {/* Last Contact */}
                    <td className={styles.td}>
                      <Text className={styles.cellText}>{lastContact}</Text>
                    </td>

                    {/* Inputs */}
                    <td className={styles.td}>
                      <Text className={styles.cellText}>{inputDisplay}</Text>
                    </td>

                    {/* Outputs */}
                    <td className={styles.tdLast}>
                      <Text className={styles.cellText}>{outputDisplay}</Text>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Buttons ────────────────────────────────────────────────── */}
      <div className={styles.buttonRow}>
        <Button
          appearance="secondary"
          size="small"
          icon={<AddRegular />}
          onClick={handleAdd}
          disabled={isDisabled || devices.length >= MAX_EXTIO_COUNT}
        >
          Add Expansion I/O
        </Button>

        <Button
          appearance="secondary"
          size="small"
          icon={<DeleteRegular />}
          onClick={handleDeleteSelected}
          disabled={isDisabled || selectedIndex === null || selectedIndex === 0}
        >
          Delete Select Expansion I/O
        </Button>

        <Button
          appearance="primary"
          size="small"
          icon={<CheckmarkRegular />}
          onClick={handleDone}
          disabled={isDisabled}
        >
          {saveLoading ? 'Saving…' : 'Done'}
        </Button>

        <Button
          appearance="secondary"
          size="small"
          icon={<DismissRegular />}
          onClick={handleCancel}
          disabled={isDisabled}
        >
          Cancel
        </Button>

        {/* Redefine IO: only active for ESP32 T3 Series with firmware ≥ threshold */}
        <Button
          appearance="secondary"
          size="small"
          disabled={true}
          title="Redefine IO is available for ESP32 T3 Series devices with compatible firmware"
        >
          Redefine IO
        </Button>

        {statusMsg && (
          <span className={statusMsg.isError ? styles.statusMsg : styles.statusOk}>
            {statusMsg.text}
          </span>
        )}
      </div>
    </div>
  );
};
