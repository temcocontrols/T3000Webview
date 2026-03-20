/**
 * NetworkHealthDialog
 *
 * Mirrors the C++ T3000 CBacnetSettingHealth dialog (BacnetSettingHealth.cpp).
 *
 * Reads Device_Misc_Data (MISC_SETTINGS table) every 4 seconds and displays:
 *   Row 0 – RS485 SUB  (com_rx[0], com_tx[0], collision[0], packet_error[0], timeout[0])
 *   Row 1 – ZIGB / GSM (com_rx[1], com_tx[1], collision[1], packet_error[1], timeout[1])
 *   Row 2 – RS485 Main  (com_rx[2], com_tx[2], collision[2], packet_error[2], timeout[2])
 *
 * Clear button zeroes all counters by upserting the misc record with zeroed health fields
 * (C++ writes clear_health_rx_tx = 0x11 via WRITE_SPECIAL_COMMAND).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogActions,
  Button,
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { T3Transport } from '../../../../lib/t3-transport/core/T3Transport';
import { API_BASE_URL } from '../../../config/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 5000; // 5s — gives C++ FFI blocking call enough time to complete

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  surface: {
    width: '600px',
    maxWidth: '95vw',
    padding: '0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px 6px 14px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  closeBtn: {
    minWidth: 'unset',
    width: '22px',
    height: '22px',
    padding: '0',
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
  body: {
    padding: '0',
  },
  content: {
    padding: '10px 16px 6px 16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    fontSize: '12px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textAlign: 'center',
    padding: '4px 6px 6px 6px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  thLabel: {
    textAlign: 'left',
    width: '90px',
  },
  td: {
    textAlign: 'center',
    padding: '4px 6px',
  },
  tdLabel: {
    fontSize: '12px',
    fontWeight: tokens.fontWeightRegular,
    textAlign: 'left',
    paddingLeft: '0',
    paddingRight: '8px',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground1,
  },
  valueInput: {
    width: '88px',
    height: '24px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '2px',
    textAlign: 'center',
    fontSize: '12px',
    padding: '0 4px',
    background: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    outline: 'none',
  },
  actions: {
    padding: '8px 14px 12px 14px',
    justifyContent: 'center',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  clearBtn: {
    minWidth: '90px',
    height: '26px',
    fontSize: '12px',
    fontWeight: tokens.fontWeightRegular,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: '12px',
    marginTop: '4px',
  },
  spinnerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 0',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NetworkHealthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serialNumber: number;
}

interface HealthRow {
  label: string;
  rx: number;
  tx: number;
  collision: number;
  packetError: number;
  timeout: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Parse health counters from raw 400-byte Str_MISC All[] array.
// Offsets from CM5/ud_str.h Str_MISC.reg:
//   flag1        = byte 146 (0x55 = valid)
//   com_rx[3]    = bytes 147-158  (uint32 LE each)
//   com_tx[3]    = bytes 159-170  (uint32 LE each)
//   collision[3] = bytes 171-176  (uint16 LE each)
//   packet_error[3] = bytes 177-182 (uint16 LE each)
//   timeout[3]   = bytes 183-188  (uint16 LE each)
function parseMiscBytes(all: number[]): HealthRow[] {
  const u32 = (offset: number) =>
    ((all[offset + 3] ?? 0) << 24 | (all[offset + 2] ?? 0) << 16 |
     (all[offset + 1] ?? 0) << 8  | (all[offset]     ?? 0)) >>> 0;
  const u16 = (offset: number) =>
    ((all[offset + 1] ?? 0) << 8 | (all[offset] ?? 0)) >>> 0;

  return [
    {
      label: 'RS485 SUB',
      rx:          u32(147),
      tx:          u32(159),
      collision:   u16(171),
      packetError: u16(177),
      timeout:     u16(183),
    },
    {
      label: 'ZIGB / GSM :',
      rx:          u32(151),
      tx:          u32(163),
      collision:   u16(173),
      packetError: u16(179),
      timeout:     u16(185),
    },
    {
      label: 'RS485 Main',
      rx:          u32(155),
      tx:          u32(167),
      collision:   u16(175),
      packetError: u16(181),
      timeout:     u16(187),
    },
  ];
}

const EMPTY_ROWS: HealthRow[] = [
  { label: 'RS485 SUB',   rx: 0, tx: 0, collision: 0, packetError: 0, timeout: 0 },
  { label: 'ZIGB / GSM :', rx: 0, tx: 0, collision: 0, packetError: 0, timeout: 0 },
  { label: 'RS485 Main',  rx: 0, tx: 0, collision: 0, packetError: 0, timeout: 0 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const NetworkHealthDialog: React.FC<NetworkHealthDialogProps> = ({
  isOpen,
  onClose,
  serialNumber,
}) => {
  const styles = useStyles();

  const [rows, setRows] = useState<HealthRow[]>(EMPTY_ROWS);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch misc data from device via FFI (GET_WEBVIEW_LIST, entryType=96) ────
  const fetchData = useCallback(async () => {
    if (!serialNumber) return;
    try {
      const transport = new T3Transport({ apiBaseUrl: `${API_BASE_URL}/api` });
      await transport.connect('ffi');
      const response = await transport.getDeviceMisc(serialNumber);
      await transport.disconnect();

      if (!response || response.success === false) {
        throw new Error(response?.error || 'Device returned error');
      }

      const all: number[] = response.data?.data?.device_data?.[0]?.All ?? [];
      if (all.length >= 189) {
        setRows(parseMiscBytes(all));
      }
      setError(null);
    } catch (e) {
      setError('Failed to read health data');
    }
  }, [serialNumber]); // eslint-disable-line

  // ── Start / stop polling when dialog opens/closes ───────────────────────────
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setLoading(true);
    fetchData().finally(() => setLoading(false));
    timerRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, fetchData]);

  // ── Clear handler ───────────────────────────────────────────────────────────
  // Mirrors C++: Device_Special_Data.reg.clear_health_rx_tx = 0x11
  // TODO: send WRITE_SPECIAL_COMMAND via FFI once that action is implemented.
  // For now, just zero the display immediately.
  const handleClear = async () => {
    setClearing(true);
    setError(null);
    try {
      setRows(EMPTY_ROWS);
    } finally {
      setClearing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, d) => { if (!d.open) onClose(); }}>
      <DialogSurface className={styles.surface}>
        {/* Custom header — title left, X right */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>Health</span>
          <Button
            appearance="subtle"
            className={styles.closeBtn}
            icon={<Dismiss24Regular />}
            onClick={onClose}
          />
        </div>

        <DialogBody className={styles.body}>
          <div className={styles.content}>
            {loading ? (
              <div className={styles.spinnerRow}>
                <Spinner size="extra-tiny" />
                Loading health data…
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={`${styles.th} ${styles.thLabel}`} />
                    <th className={styles.th}>Rx (Byte)</th>
                    <th className={styles.th}>Tx (Byte)</th>
                    <th className={styles.th}>ID Collision</th>
                    <th className={styles.th}>Packet Error</th>
                    <th className={styles.th}>Timeout</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td className={`${styles.td} ${styles.tdLabel}`}>{row.label}</td>
                      {[row.rx, row.tx, row.collision, row.packetError, row.timeout].map((val, i) => (
                        <td key={i} className={styles.td}>
                          <input
                            className={styles.valueInput}
                            readOnly
                            title={['Rx', 'Tx', 'ID Collision', 'Packet Error', 'Timeout'][i]}
                            value={val}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {error && <div className={styles.errorText}>{error}</div>}
          </div>
        </DialogBody>

        <DialogActions className={styles.actions}>
          <Button
            appearance="secondary"
            className={styles.clearBtn}
            onClick={handleClear}
            disabled={clearing || loading}
          >
            {clearing ? <Spinner size="extra-tiny" /> : 'Clear'}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};

export default NetworkHealthDialog;
