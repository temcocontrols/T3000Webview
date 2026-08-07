/**
 * EmptyState — Welcome screen shown when no messages exist yet.
 *
 * Panel mode: compact — short title, 4 key cards, single column.
 * Full mode: rich — cards, tags, examples.
 */

import React from 'react';
import styles from '../AiChat.module.css';

interface Props {
  onSelectQuestion: (question: string) => void;
  variant?: 'full' | 'panel';
}

import {
  DesktopRegular,
  AlertRegular,
  TagRegular,
  DataTrendingRegular,
  EyeRegular,
  EditRegular,
  PulseSquareRegular,
  CheckmarkCircleRegular,
  WrenchRegular,
} from '@fluentui/react-icons';

const CARDS = [
  { title: 'Building Health', desc: 'Diagnose all devices — alarms, programs, points', query: 'Run diagnostics on all devices', Icon: PulseSquareRegular },
  { title: 'Device List', desc: 'Show all devices and their online status', query: 'List all devices and their online status', Icon: DesktopRegular },
  { title: 'Active Alarms', desc: 'Check current alarms across the system', query: 'Show me all active alarms', Icon: AlertRegular },
  { title: 'Search Tags', desc: 'Find points by Haystack or Brick tags', query: 'Search for supply air temperature sensors', Icon: TagRegular },
  { title: 'Trend Logs', desc: 'Query historical trend data for a point', query: 'Show trend data for the last hour', Icon: DataTrendingRegular },
  { title: 'Read Points', desc: 'Read current values from any device', query: 'Read the current value of point 0 on device 1', Icon: EyeRegular },
  { title: 'Write Points', desc: 'Command a value to an output point', query: 'Set point 5 on device 1 to 22.5', Icon: EditRegular },
  { title: 'Tasks', desc: 'Create a commissioning workflow checklist', query: 'Create a task list for commissioning AHU-1', Icon: CheckmarkCircleRegular },
  { title: 'Maintenance', desc: 'Check firmware, schedules, and PID loops', query: 'Check the health of all PID loops', Icon: WrenchRegular },
];

const PANEL_CARDS = CARDS.slice(0, 5);

const TAGS = [
  'Preview Auto-Tags', 'Acknowledge Alarm', 'Batch Read Points',
  'Auto-Tag Devices', 'Refresh Device Data', 'List Tagging Rules',
  'Save site memory', 'Create task',
];

const EXAMPLES = [
  'Is the T3000 server running?', 'What devices are currently online?',
  'List all Haystack tags', 'Find all points without tags',
  'What Brick class does input 8 have?', 'Show temperature in AHU-1',
  'Summarize the building system', 'Write 22.5 to the setpoint',
];

export const EmptyState: React.FC<Props> = ({ onSelectQuestion, variant = 'full' }) => {
  const isPanel = variant === 'panel';

  if (isPanel) {
    return (
      <div className={`${styles.emptyRoot} ${styles.emptyRootPanel}`}>
        <h2 className={styles.emptyTitle}>How can I help with your building today?</h2>
        <div className={styles.emptyCardsPanel}>
          {PANEL_CARDS.map((s) => (
            <button key={s.title} className={styles.emptyPanelCard} onClick={() => onSelectQuestion(s.query)}>
              <s.Icon fontSize={18} className={styles.emptyCardIcon} />
              <div>
                <span className={styles.emptyCardTitle}>{s.title}</span>
                <span className={styles.emptyCardDesc}>{s.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.emptyRoot}>
      <h2 className={styles.emptyTitle}>Hello, how can I help with your building today?</h2>
      <p className={styles.emptySubtitle}>
        I can query live device data, check alarms, search Haystack tags, and analyze trend logs.
      </p>

      <div className={styles.emptyCards}>
        {CARDS.map((s) => (
          <button key={s.title} className={styles.emptyCard} onClick={() => onSelectQuestion(s.query)}>
            <s.Icon fontSize={18} className={styles.emptyCardIcon} />
            <div>
              <span className={styles.emptyCardTitle}>{s.title}</span>
              <span className={styles.emptyCardDesc}>{s.desc}</span>
            </div>
          </button>
        ))}
      </div>

      <div className={styles.emptyTags}>
        {TAGS.map((t) => (
          <button key={t} className={styles.emptyTag} onClick={() => onSelectQuestion(t)}>{t}</button>
        ))}
      </div>

      <div className={styles.emptyExamples}>
        {EXAMPLES.map((q) => (
          <button key={q} className={styles.emptyExample} onClick={() => onSelectQuestion(q)}>{q}</button>
        ))}
      </div>
    </div>
  );
};
