/**
 * ChangeIpProgressDialog
 *
 * Mirrors the C++ T3000 CShowMessageDlg (EVENT_IP_STATIC_CHANGE flow) that
 * appears after the "Change IP" button saves new network settings.
 *
 * Behaviour (matching ShowMessageDlg.cpp / BacnetSettingTcpip.cpp):
 *  Phase 1  – Animate progress 0 → 50 % while device reboots (~12 s)
 *  Phase 2  – Poll backend API until device responds or 7 retries expire
 *  Phase 3  – Animate remaining progress to 100 %, then auto-close
 *
 * UI:
 *  • Blue message text "IP address has been changed!\nRebooting now! Please wait."
 *  • Red percentage label   e.g. "18%"
 *  • Green progress bar
 *  • OK (auto-fires when done) and Cancel buttons
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogActions,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { API_BASE_URL } from '../../../config/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Duration (ms) of each progress-animation tick (C++ auto_close_time = 250 ms). */
const TICK_MS = 250;
/** Number of ticks in Phase 1 (C++ uses 50 ticks → 50 * 250 ms ≈ 12.5 s). */
const PHASE1_TICKS = 50;
/** Total progress ticks for the whole animation (C++ auto_close_time_count = 100). */
const TOTAL_TICKS = 100;
/** Max device-poll retries in Phase 2 (C++ try_time < 7). */
const MAX_POLL_RETRIES = 7;
/** Delay (ms) between polls (C++ Sleep 2000). */
const POLL_INTERVAL_MS = 2000;

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  surface: {
    width: '500px',
    maxWidth: '95vw',
  },
  body: {
    padding: '16px 20px 8px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  message: {
    fontSize: '18px',
    fontWeight: tokens.fontWeightSemibold,
    color: '#0000CC',
    lineHeight: '1.5',
    whiteSpace: 'pre-line',
  },
  percentLabel: {
    color: '#CC0000',
    fontSize: '16px',
    fontWeight: tokens.fontWeightSemibold,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: '22px',
    backgroundColor: '#D0D0D0',
    borderRadius: '2px',
    overflow: 'hidden',
    border: '1px solid #AAAAAA',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00AA00',
    transition: 'width 0.2s ease',
  },
  actions: {
    padding: '8px 20px 16px 20px',
    justifyContent: 'center',
    gap: '16px',
  },
  statusText: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChangeIpProgressDialogProps {
  /** Whether the dialog is open. */
  isOpen: boolean;
  /** Called when the dialog should close (OK pressed, auto-close, or Cancel). */
  onClose: (success: boolean) => void;
  /** Serial number of the device being reconfigured. */
  serialNumber: number;
  /** The new IP address that was applied (used for polling). */
  newIpAddress: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Attempt to reach the device via the backend API.
 * Returns true if the API responds with a 2xx status.
 */
async function pollDevice(serialNumber: number): Promise<boolean> {
  try {
    const url = `${API_BASE_URL}/api/t3_device/device/settings/${serialNumber}`;
    const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ChangeIpProgressDialog: React.FC<ChangeIpProgressDialogProps> = ({
  isOpen,
  onClose,
  serialNumber,
  newIpAddress,
}) => {
  const styles = useStyles();

  const [progress, setProgress] = useState(0);      // 0–100
  const [statusText, setStatusText] = useState('');
  const [done, setDone] = useState(false);
  // newIpAddress is displayed in the status hint and available for future direct polling
  const newIpLabel = newIpAddress ? ` (${newIpAddress})` : '';

  // Refs so the animation loop can read latest values without stale closures
  const cancelledRef = useRef(false);
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reset state whenever dialog opens ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    cancelledRef.current = false;
    setProgress(0);
    setStatusText('Sending settings to device…');
    setDone(false);

    runSequence();

    return () => {
      cancelledRef.current = true;
      if (animFrameRef.current !== null) clearTimeout(animFrameRef.current);
    };
  }, [isOpen]); // eslint-disable-line

  // ── Tick-based progress helper ──────────────────────────────────────────────
  const animateTicks = useCallback(
    (
      fromPercent: number,
      toPercent: number,
      tickCount: number,
    ): Promise<void> =>
      new Promise((resolve) => {
        let tick = 0;
        const step = () => {
          if (cancelledRef.current) { resolve(); return; }
          if (tick >= tickCount) { setProgress(toPercent); resolve(); return; }
          const pct = fromPercent + Math.round((toPercent - fromPercent) * (tick / tickCount));
          setProgress(pct);
          tick++;
          animFrameRef.current = setTimeout(step, TICK_MS);
        };
        step();
      }),
    [],
  );

  // ── Main sequence (mirrors ShowMessageThread + EVENT_IP_STATIC_CHANGE) ──────
  const runSequence = useCallback(async () => {
    // ── Phase 1: animate 0 → 50 % (device rebooting) ────────────────────────
    setStatusText('Device is rebooting…');
    await animateTicks(0, 50, PHASE1_TICKS);
    if (cancelledRef.current) return;

    // ── Phase 2: poll until device responds (up to MAX_POLL_RETRIES × 2 s) ──
    setStatusText(`Waiting for device to come back online${newIpLabel}…`);
    let deviceBack = false;
    for (let i = 0; i < MAX_POLL_RETRIES; i++) {
      if (cancelledRef.current) return;
      const ok = await pollDevice(serialNumber);
      if (ok) { deviceBack = true; break; }
      // While polling, keep nudging progress slightly so it looks alive
      setProgress((prev) => Math.min(prev + 1, 70));
      await new Promise<void>((r) => {
        animFrameRef.current = setTimeout(r, POLL_INTERVAL_MS);
      });
    }
    if (cancelledRef.current) return;

    if (deviceBack) {
      setStatusText('Device is back online!');
    } else {
      setStatusText('Device did not respond – may still be rebooting.');
    }

    // ── Phase 3: animate current → 100 % ────────────────────────────────────
    const remaining = TOTAL_TICKS - PHASE1_TICKS;
    await animateTicks(progress, 100, remaining);
    if (cancelledRef.current) return;

    setProgress(100);
    setDone(true);
    setStatusText(deviceBack ? 'Done! Settings applied successfully.' : 'Complete.');

    // Auto-close after a short pause (mirrors C++ PostMessage(WM_CLOSE))
    animFrameRef.current = setTimeout(() => {
      if (!cancelledRef.current) onClose(deviceBack);
    }, 1200);
  }, [serialNumber, animateTicks, newIpLabel]); // eslint-disable-line

  const handleCancel = () => {
    cancelledRef.current = true;
    if (animFrameRef.current !== null) clearTimeout(animFrameRef.current);
    onClose(false);
  };

  const handleOk = () => {
    cancelledRef.current = true;
    if (animFrameRef.current !== null) clearTimeout(animFrameRef.current);
    onClose(done);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, d) => { if (!d.open) handleCancel(); }}>
      <DialogSurface className={styles.surface}>
        <DialogBody className={styles.body}>
          {/* Blue message text – matches C++ SetStaticTextColor(RGB(0,0,255)) */}
          <div className={styles.message}>
            {'IP address has been changed!\nRebooting now! Please wait.'}
          </div>

          {/* Red percentage – matches C++ m_static_persent red color */}
          <div className={styles.percentLabel}>{progress}%</div>

          {/* Green progress bar */}
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status hint */}
          <div className={styles.statusText}>{statusText}</div>
        </DialogBody>

        <DialogActions className={styles.actions}>
          <Button
            appearance="primary"
            onClick={handleOk}
            disabled={!done}
          >
            OK
          </Button>
          <Button appearance="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};

export default ChangeIpProgressDialog;
