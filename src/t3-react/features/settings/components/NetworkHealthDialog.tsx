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
import { T3Database } from '../../../../lib/t3-database';
import { API_BASE_URL } from '../../../config/constants';
import type { MiscSettings } from '../../../../lib/t3-database/types/device.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 4000; // C++: SetTimer(1, 4000, NULL)

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

function mapMiscToRows(data: MiscSettings): HealthRow[] {
  return [
    {
      label: 'RS485 SUB',
      rx: data.COM_RX_0 ?? 0,
      tx: data.COM_TX_0 ?? 0,
      collision: data.Collision_0 ?? 0,
      packetError: data.Packet_Error_0 ?? 0,
      timeout: data.Timeout_0 ?? 0,
    },
    {
      label: 'ZIGB / GSM :',
      rx: data.COM_RX_1 ?? 0,
      tx: data.COM_TX_1 ?? 0,
      collision: data.Collision_1 ?? 0,
      packetError: data.Packet_Error_1 ?? 0,
      timeout: data.Timeout_1 ?? 0,
    },
    {
      label: 'RS485 Main',
      rx: data.COM_RX_2 ?? 0,
      tx: data.COM_TX_2 ?? 0,
      collision: data.Collision_2 ?? 0,
      packetError: data.Packet_Error_2 ?? 0,
      timeout: data.Timeout_2 ?? 0,
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
  const db = new T3Database(`${API_BASE_URL}/api`);

  const [rows, setRows] = useState<HealthRow[]>(EMPTY_ROWS);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch misc data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!serialNumber) return;
    try {
      const data = await db.deviceMisc.get(serialNumber);
      if (data) setRows(mapMiscToRows(data));
      setError(null);
    } catch {
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
  // C++: Device_Special_Data.reg.clear_health_rx_tx = 0x11 + WRITE_SPECIAL_COMMAND
  // We zero all health counter fields via upsert.
  const handleClear = async () => {
    setClearing(true);
    setError(null);
    try {
      await db.deviceMisc.upsert(serialNumber, {
        Network_Health_Flag: 0x11, // signals clear to firmware
        COM_RX_0: 0, COM_RX_1: 0, COM_RX_2: 0,
        COM_TX_0: 0, COM_TX_1: 0, COM_TX_2: 0,
        Collision_0: 0, Collision_1: 0, Collision_2: 0,
        Packet_Error_0: 0, Packet_Error_1: 0, Packet_Error_2: 0,
        Timeout_0: 0, Timeout_1: 0, Timeout_2: 0,
      });
      setRows(EMPTY_ROWS);
    } catch {
      setError('Clear failed – device did not respond');
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
