/**
 * ModeBanner - top-of-dashboard mode selector
 *
 * Driven by live runtime state (appMode from syncHealth) so the active card
 * always matches what the backend is actually running.
 *
 * Standalone card  - always visible; active when appMode === 'standalone'
 * Shared DB card   - always visible; active when appMode === 'server' | 'client'
 *
 * Clicking the inactive card shows a contextual action bar:
 *   - Click Shared DB while standalone  -> amber bar with "Database Configuration ->"
 *   - Click Standalone while Shared DB  -> warning bar with switch confirmation
 */

import React, { useState } from 'react';
import { makeStyles, mergeClasses, Spinner } from '@fluentui/react-components';
import {
  DesktopRegular,
  DatabaseRegular,
  ArrowRightRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { IniConfig, saveIniConfig } from '../../database/services/databaseConfigApi';
import { SyncHealthData } from '../services/syncHealthApi';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  banner: {
    margin: '8px 12px 0',
    borderTopWidth: '1px',
    borderRightWidth: '1px',
    borderBottomWidth: '1px',
    borderLeftWidth: '1px',
    borderTopStyle: 'solid',
    borderRightStyle: 'solid',
    borderBottomStyle: 'solid',
    borderLeftStyle: 'solid',
    borderTopColor: '#edebe9',
    borderRightColor: '#edebe9',
    borderBottomColor: '#edebe9',
    borderLeftColor: '#edebe9',
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },

  /* -- Top info strip -- */
  infoStrip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: '#f0f6ff',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#d0e4f7',
    fontSize: '11.5px',
    color: '#323130',
    lineHeight: '1.5',
  },
  infoStripIcon: {
    fontSize: '14px',
    color: '#0f6cbd',
    flexShrink: 0,
    marginTop: '1px',
  },

  /* -- Card row -- */
  modeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fafafa',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#edebe9',
  },

  /* Individual card */
  modeCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 14px',
    cursor: 'pointer',
    borderTopWidth: '1.5px',
    borderRightWidth: '1.5px',
    borderBottomWidth: '1.5px',
    borderLeftWidth: '1.5px',
    borderTopStyle: 'solid',
    borderRightStyle: 'solid',
    borderBottomStyle: 'solid',
    borderLeftStyle: 'solid',
    borderTopColor: '#e1dfdd',
    borderRightColor: '#e1dfdd',
    borderBottomColor: '#e1dfdd',
    borderLeftColor: '#e1dfdd',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.15s, background 0.15s',
    userSelect: 'none',
    '&:hover': {
      borderTopColor: '#0f6cbd',
      borderRightColor: '#0f6cbd',
      borderBottomColor: '#0f6cbd',
      borderLeftColor: '#0f6cbd',
      backgroundColor: '#f5f9ff',
    },
  },
  modeCardActive: {
    borderTopColor: '#0f6cbd',
    borderRightColor: '#0f6cbd',
    borderBottomColor: '#0f6cbd',
    borderLeftColor: '#0f6cbd',
    backgroundColor: '#eff6fc',
    '&:hover': {
      borderTopColor: '#0078d4',
      borderRightColor: '#0078d4',
      borderBottomColor: '#0078d4',
      borderLeftColor: '#0078d4',
      backgroundColor: '#ddeeff',
    },
  },

  /* Card header: icon + title + badge */
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardIcon: {
    fontSize: '18px',
    color: '#a19f9d',
    flexShrink: 0,
  },
  cardIconActive: {
    color: '#0f6cbd',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
  },
  cardTitleActive: {
    color: '#0f6cbd',
  },
  badge: {
    marginLeft: 'auto',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: '10px',
    backgroundColor: '#0f6cbd',
    color: '#ffffff',
    fontSize: '10.5px',
    fontWeight: 600,
    flexShrink: 0,
  },
  savingSpinner: {
    marginLeft: 'auto',
  },

  /* Card description text */
  cardDesc: {
    fontSize: '11.5px',
    color: '#605e5c',
    lineHeight: '1.5',
  },

  /* -- Status chip row -- */
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '2px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: '4px',
    backgroundColor: '#e8f4fd',
    color: '#0f6cbd',
    fontSize: '11px',
    fontWeight: 500,
  },
  chipGreen: {
    backgroundColor: '#dff6dd',
    color: '#107c10',
  },
  chipRed: {
    backgroundColor: '#fde7e9',
    color: '#a4262c',
  },
  chipOrange: {
    backgroundColor: '#fff4ce',
    color: '#835b00',
  },

  /* Reconfigure link inside the active Center DB card */
  reconfigureLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    marginTop: '2px',
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#0f6cbd',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    fontFamily: 'inherit',
    width: 'fit-content',
    '&:hover': { textDecorationLine: 'underline' },
  },

  /* -- Action bars -- */
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '14px',
    paddingRight: '14px',
    fontSize: '12px',
    color: '#605e5c',
  },
  actionBarAmber: {
    backgroundColor: '#fff8e1',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#ffe082',
  },
  actionBarWarning: {
    backgroundColor: '#fff4ce',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#f7ca00',
  },
  actionBarIcon: {
    fontSize: '15px',
    color: '#835b00',
    flexShrink: 0,
  },
  actionBarText: {
    flex: 1,
    lineHeight: '1.5',
  },
  actionBarLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0f6cbd',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    fontFamily: 'inherit',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '&:hover': { textDecorationLine: 'underline' },
  },
  actionBarConfirm: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#a4262c',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    fontFamily: 'inherit',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '&:hover': { textDecorationLine: 'underline' },
  },
  actionBarDismiss: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: '#a19f9d',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '2px',
    paddingRight: '2px',
    flexShrink: 0,
    '&:hover': { color: '#323130' },
  },

  /* -- Restart-pending notice bar -- */
  restartBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '14px',
    paddingRight: '14px',
    backgroundColor: '#e6f2fb',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#b3d6f5',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#b3d6f5',
    fontSize: '11.5px',
    color: '#0f5a9e',
    lineHeight: '1.5',
  },
  restartBarIcon: {
    fontSize: '14px',
    color: '#0f6cbd',
    flexShrink: 0,
  },

  /* -- Inline card states -- */
  cardHint: {
    fontSize: '11px',
    color: '#a19f9d',
    fontStyle: 'italic',
  },
  inlineRestart: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '10px',
    paddingRight: '10px',
    marginTop: '2px',
    backgroundColor: '#e6f2fb',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: '#0f6cbd',
    fontSize: '11px',
    color: '#0c4a8c',
    lineHeight: '1.4',
  },
  inlineRestartRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  setupLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    marginTop: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0f6cbd',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontFamily: 'inherit',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    width: 'fit-content',
    '&:hover': { textDecorationLine: 'underline' },
  },
  setupLinkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '4px',
  },
  inlineConfirmBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '10px',
    paddingRight: '10px',
    marginTop: '2px',
    backgroundColor: '#fff4ce',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: '#f7ca00',
  },
  inlineConfirmText: {
    fontSize: '11px',
    color: '#605e5c',
    lineHeight: '1.4',
  },
  inlineConfirmBtns: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  btnConfirm: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#a4262c',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontFamily: 'inherit',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    '&:hover': { textDecorationLine: 'underline' },
  },
  btnCancel: {
    fontSize: '11.5px',
    color: '#605e5c',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontFamily: 'inherit',
    paddingTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    '&:hover': { textDecorationLine: 'underline' },
  },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PendingAction = null | 'setupCenterDb' | 'switchToStandalone';

export interface ModeBannerProps {
  /** Derived runtime mode -- drives which card shows "Active" */
  appMode: 'standalone' | 'server' | 'client';
  /** Live sync-health data for status chips */
  syncHealth: SyncHealthData | null;
  /** Raw INI config -- used only for save calls */
  iniConfig: IniConfig | null;
  /** Called after a mode save completes so parent can re-fetch state */
  onModeChanged: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ModeBanner: React.FC<ModeBannerProps> = ({
  appMode,
  syncHealth,
  iniConfig: _iniConfig,
  onModeChanged,
}) => {
  const s = useStyles();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  // Only show restart notice after the user explicitly saved in this session
  const [savedStandalone, setSavedStandalone] = useState(false);

  const isCenterDb = appMode === 'server' || appMode === 'client';

  const goToConfigure = () => navigate('/t3000/database/config?from=dashboard');

  // -- Restart-pending: detect when INI config disagrees with live runtime state --
  // e.g. user saved Center DB but service hasn't restarted yet (or vice versa).
  const iniMode: 'standalone' | 'server' | 'client' = _iniConfig?.enabled
    ? (_iniConfig.role === 'server' ? 'server' : 'client')
    : 'standalone';
  // Only meaningful once both syncHealth (runtime) and iniConfig (file) are loaded
  const restartPending = !!syncHealth && _iniConfig !== null && iniMode !== appMode;
  // -- Card click handler --
  const handleCardClick = (clicked: 'standalone' | 'centerdb') => {
    if (saving) return;
    if (clicked === 'centerdb') {
      if (!isCenterDb) setPendingAction(prev => prev === 'setupCenterDb' ? null : 'setupCenterDb');
    } else {
      if (!isCenterDb) return; // already standalone
      setPendingAction('switchToStandalone');
    }
  };

  // -- Confirm: switch to standalone --
  const confirmStandalone = async () => {
    setSaving(true);
    setPendingAction(null);
    try {
      await saveIniConfig({ enabled: false, role: 'client' });
      setSavedStandalone(true);
      onModeChanged();
    } finally {
      setSaving(false);
    }
  };

  // -- Live status for Center DB card --
  const connected = syncHealth?.centerDbConnected ?? false;
  // When Center DB is active, sqlite means the service is in SQLite fallback mode —
  // the configured target is always SQL Server, so map sqlite → mssql here.
  const effectiveBackend = syncHealth
    ? (isCenterDb && syncHealth.backendType === 'sqlite' ? 'mssql' : syncHealth.backendType)
    : null;
  const BACKEND_LABELS: Record<string, string> = {
    mssql: 'SQL Server',
    sqlite: 'SQLite',
  };
  const backendLabel = effectiveBackend ? (BACKEND_LABELS[effectiveBackend] ?? effectiveBackend.toUpperCase()) : null;
  const roleLabel = appMode === 'server' ? 'Server' : appMode === 'client' ? 'Client' : null;
  const paused = syncHealth?.samplingPaused ?? false;

  return (
    <div className={s.banner}>

      {/* Top info strip — always static */}
      <div className={s.infoStrip}>
        <InfoRegular className={s.infoStripIcon} />
        <span>
          Select how this workstation stores and shares T3000 data.{' '}
          <strong>Standalone</strong> uses a local SQLite database with no network dependency.{' '}
          <strong>Shared DB</strong> connects multiple T3000 PCs to a shared central database
          (SQL Server), with one PC designated as the Server.
        </span>
      </div>

      {/* Mode cards */}
      <div className={s.modeRow}>

        {/* -- Standalone card -- */}
        <div
          className={mergeClasses(s.modeCard, !isCenterDb ? s.modeCardActive : undefined)}
          onClick={() => handleCardClick('standalone')}
        >
          <div className={s.cardHeader}>
            <DesktopRegular className={mergeClasses(s.cardIcon, !isCenterDb ? s.cardIconActive : undefined)} />
            <span className={mergeClasses(s.cardTitle, !isCenterDb ? s.cardTitleActive : undefined)}>
              Standalone
            </span>
            {!isCenterDb && (
              saving
                ? <Spinner size="extra-tiny" className={s.savingSpinner} />
                : <span className={s.badge}>Active</span>
            )}
          </div>
          <span className={s.cardDesc}>
            Stores all data locally in SQLite on this PC. No network connection or shared server required.
          </span>
          {!isCenterDb ? (
            <div className={s.chipRow}>
              <span className={s.chip}>SQLite</span>
              <span className={s.chip}>Local</span>
            </div>
          ) : (restartPending && iniMode === 'standalone' && savedStandalone) ? (
            <div className={s.inlineRestart}>
              <span>&#8635; Standalone saved — restart T3000 to apply.</span>
            </div>
          ) : pendingAction === 'switchToStandalone' ? (
            <div className={s.inlineConfirmBox} onClick={(e) => e.stopPropagation()}>
              <span className={s.inlineConfirmText}>
                Switching to Standalone disables Shared DB sync. Data will no longer be shared
                with other T3000 PCs. Takes effect after the T3000 service restarts.
              </span>
              <div className={s.inlineConfirmBtns}>
                <button className={s.btnConfirm} onClick={confirmStandalone}>
                  Switch to Standalone
                </button>
                <button className={s.btnCancel} onClick={(e) => { e.stopPropagation(); setPendingAction(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className={s.reconfigureLink}
              onClick={(e) => { e.stopPropagation(); handleCardClick('standalone'); }}
            >
              Switch to local SQLite <ArrowRightRegular style={{ fontSize: '11px' }} />
            </button>
          )}
        </div>

        {/* -- Shared DB card -- */}
        <div
          className={mergeClasses(s.modeCard, isCenterDb ? s.modeCardActive : undefined)}
          onClick={() => handleCardClick('centerdb')}
        >
          <div className={s.cardHeader}>
            <DatabaseRegular className={mergeClasses(s.cardIcon, isCenterDb ? s.cardIconActive : undefined)} />
            <span className={mergeClasses(s.cardTitle, isCenterDb ? s.cardTitleActive : undefined)}>
              Shared DB
            </span>
            {isCenterDb && <span className={s.badge}>Active</span>}
          </div>
          <span className={s.cardDesc}>
            Shares trend logs and device data across multiple T3000 PCs via a central
            Microsoft SQL Server database. Requires a designated Server PC.
          </span>
          {isCenterDb ? (
            <>
              <div className={s.chipRow}>
                {roleLabel && <span className={s.chip}>{roleLabel}</span>}
                {backendLabel && <span className={s.chip}>{backendLabel}</span>}
                {connected
                  ? <span className={mergeClasses(s.chip, s.chipGreen)}>Connected</span>
                  : <span className={mergeClasses(s.chip, s.chipRed)}>Disconnected</span>
                }
                {paused && <span className={mergeClasses(s.chip, s.chipOrange)}>Sampling Paused</span>}
              </div>
              <button
                className={s.reconfigureLink}
                onClick={(e) => { e.stopPropagation(); goToConfigure(); }}
              >
                Reconfigure <ArrowRightRegular style={{ fontSize: '11px' }} />
              </button>
            </>
          ) : restartPending && (iniMode === 'server' || iniMode === 'client') ? (
            <div className={s.inlineRestart} onClick={(e) => e.stopPropagation()}>
              <div className={s.inlineRestartRow}>
                <span>
                  &#8635; Shared DB ({iniMode === 'server' ? 'Server' : 'Client'}) saved — restart T3000 to activate.
                </span>
                <button className={s.setupLink} onClick={goToConfigure}>
                  Database Configuration <ArrowRightRegular style={{ fontSize: '11px' }} />
                </button>
              </div>
            </div>
          ) : pendingAction === 'setupCenterDb' ? (
            <div className={s.setupLinkRow} onClick={(e) => e.stopPropagation()}>
              <button
                className={s.setupLink}
                onClick={(e) => { e.stopPropagation(); goToConfigure(); }}
              >
                Connect to Shared DB <ArrowRightRegular style={{ fontSize: '11px' }} />
              </button>
              <button className={s.btnCancel} onClick={(e) => { e.stopPropagation(); setPendingAction(null); }}>
                Cancel
              </button>
            </div>
          ) : (
            <span className={s.cardHint}>Not configured. Click to connect to a shared SQL Server database.</span>
          )}
        </div>

      </div>


    </div>
  );
};
