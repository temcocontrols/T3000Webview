/**
 * ModeBanner 鈥?top-of-dashboard mode selector
 *
 * Two modes: Standalone (local SQLite) vs Center DB (shared server/client).
 * Clicking Standalone applies immediately.
 * Clicking Center DB shows an inline action bar 鈥?user then clicks the link to configure.
 */

import React, { useState } from 'react';
import { makeStyles, mergeClasses, Spinner } from '@fluentui/react-components';
import {
  DesktopRegular,
  DatabaseRegular,
  ArrowRightRegular,
  InfoRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { IniConfig, saveIniConfig } from '../../database/services/databaseConfigApi';

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

  /* 鈹€鈹€ Top info strip 鈹€鈹€ */
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

  /* 鈹€鈹€ Card row 鈹€鈹€ */
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
      borderTopColor: '#0f6cbd',
      borderRightColor: '#0f6cbd',
      borderBottomColor: '#0f6cbd',
      borderLeftColor: '#0f6cbd',
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

  /* Sub-note below description (e.g. current role) */
  cardNote: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: '4px',
    backgroundColor: '#e8f4fd',
    color: '#0f6cbd',
    fontSize: '11px',
    fontWeight: 500,
    width: 'fit-content',
  },

  /* 鈹€鈹€ Action bar shown when Center DB is clicked 鈹€鈹€ */
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    backgroundColor: '#fff8e1',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#ffe082',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#ffe082',
    fontSize: '12px',
    color: '#605e5c',
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
    padding: '0',
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
    padding: '2px',
    flexShrink: 0,
    '&:hover': { color: '#323130' },
  },

});

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

type AppMode = 'standalone' | 'centerdb';

export interface ModeBannerProps {
  iniConfig: IniConfig | null;
  statusLine?: string;
  onModeChanged: () => void;
}

function currentMode(ini: IniConfig | null): AppMode {
  return ini && ini.enabled ? 'centerdb' : 'standalone';
}

function currentRole(ini: IniConfig | null): string | null {
  if (!ini || !ini.enabled) return null;
  return ini.role === 'server' ? 'Server' : 'Client';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ModeBanner: React.FC<ModeBannerProps> = ({ iniConfig, statusLine, onModeChanged }) => {
  const s = useStyles();
  const navigate = useNavigate();
  const active = currentMode(iniConfig);
  const role = currentRole(iniConfig);
  const [saving, setSaving] = useState(false);
  const [showActionBar, setShowActionBar] = useState(false);

  const goToConfigure = () => navigate('/t3000/database/config?from=dashboard');

  const handleCardClick = async (mode: AppMode) => {
    if (saving) return;

    if (mode === 'standalone') {
      // Switch to standalone immediately, no config needed
      setShowActionBar(false);
      if (active === 'standalone') return; // already active, no-op
      setSaving(true);
      try {
        await saveIniConfig({ enabled: false, role: 'client' });
        onModeChanged();
      } finally {
        setSaving(false);
      }
    } else {
      // Center DB — show action bar instead of navigating directly
      setShowActionBar(true);
    }
  };

  return (
    <div className={s.banner}>

      {/* Top info strip */}
      <div className={s.infoStrip}>
        <InfoRegular className={s.infoStripIcon} />
        <span>
          <strong>Standalone</strong> — this PC stores all data locally in SQLite. No network or extra setup needed.{' '}
          <strong>Center DB</strong> — multiple T3000 PCs share one central SQL Server / PostgreSQL database.
          One PC acts as the <strong>Server</strong> (hosts &amp; writes data); others are <strong>Clients</strong> (read from the shared DB).
        </span>
      </div>

      {/* Mode cards */}
      <div className={s.modeRow}>

        {/* Standalone card */}
        <div
          className={mergeClasses(s.modeCard, active === 'standalone' ? s.modeCardActive : undefined)}
          onClick={() => handleCardClick('standalone')}
        >
          <div className={s.cardHeader}>
            <DesktopRegular className={mergeClasses(s.cardIcon, active === 'standalone' ? s.cardIconActive : undefined)} />
            <span className={mergeClasses(s.cardTitle, active === 'standalone' ? s.cardTitleActive : undefined)}>
              Standalone
            </span>
            {active === 'standalone' && (
              saving
                ? <Spinner size="extra-tiny" className={s.savingSpinner} />
                : <span className={s.badge}>Active</span>
            )}
          </div>
          <span className={s.cardDesc}>
            Uses a local SQLite database on this PC. Trend logs and device data are stored
            locally — no network connection or shared server required.
          </span>
        </div>

        {/* Center DB card */}
        <div
          className={mergeClasses(s.modeCard, active === 'centerdb' ? s.modeCardActive : undefined)}
          onClick={() => handleCardClick('centerdb')}
        >
          <div className={s.cardHeader}>
            <DatabaseRegular className={mergeClasses(s.cardIcon, active === 'centerdb' ? s.cardIconActive : undefined)} />
            <span className={mergeClasses(s.cardTitle, active === 'centerdb' ? s.cardTitleActive : undefined)}>
              Center DB
            </span>
            {active === 'centerdb' && <span className={s.badge}>Active</span>}
          </div>
          <span className={s.cardDesc}>
            Shares trend logs and device data across multiple T3000 PCs via a central database.
            Requires a SQL Server or PostgreSQL instance and a designated Server PC.
          </span>
          {active === 'centerdb' && role && (
            <span className={s.cardNote}>
              Configured as: {role}
            </span>
          )}
        </div>

      </div>

      {/* Action bar (shown after clicking Center DB) */}
      {showActionBar && (
        <div className={s.actionBar}>
          <span className={s.actionBarText}>
            {active === 'centerdb'
              ? 'Center DB is already active. Open Database Configuration to change the Server / Client role or connection settings.'
              : 'To enable Center DB, configure the connection and select this PC\'s role (Server or Client).'}
          </span>
          <button className={s.actionBarLink} onClick={goToConfigure}>
            Database Configuration <ArrowRightRegular style={{ fontSize: '11px' }} />
          </button>
          <button className={s.actionBarDismiss} onClick={() => setShowActionBar(false)} title="Dismiss">
            <DismissRegular />
          </button>
        </div>
      )}


    </div>
  );
};
