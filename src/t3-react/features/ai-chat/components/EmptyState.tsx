/**
 * EmptyState — Welcome screen shown when no messages exist yet.
 *
 * Card-style suggestions based on available MCP API tools.
 */

import React from 'react';
import styles from '../AiChat.module.css';

interface Props {
  onSelectQuestion: (question: string) => void;
}

import {
  DesktopRegular,
  AlertRegular,
  TagRegular,
  DataTrendingRegular,
  EyeRegular,
  EditRegular,
} from '@fluentui/react-icons';

const CARDS = [
  { title: 'Device List', desc: 'Show all devices and their online status', query: 'List all devices and their online status', Icon: DesktopRegular },
  { title: 'Active Alarms', desc: 'Check current alarms across the system', query: 'Show me all active alarms', Icon: AlertRegular },
  { title: 'Search Tags', desc: 'Find points by Haystack or Brick tags', query: 'Search for supply air temperature sensors', Icon: TagRegular },
  { title: 'Trend Logs', desc: 'Query historical trend data for a point', query: 'Show trend data for the last hour', Icon: DataTrendingRegular },
  { title: 'Read Points', desc: 'Read current values from any device', query: 'Read the current value of point 0 on device 1', Icon: EyeRegular },
  { title: 'Write Points', desc: 'Command a value to an output point', query: 'Set point 5 on device 1 to 22.5', Icon: EditRegular },
];

const TAGS = [
  'Preview Auto-Tags',
  'Acknowledge Alarm',
  'Batch Read Points',
  'Auto-Tag Devices',
  'Refresh Device Data',
  'List Tagging Rules',
];

const EXAMPLES = [
  'Is the T3000 server running?',
  'What devices are currently online?',
  'List all Haystack tags',
  'Find all points without tags',
  'What Brick class does input 8 have?',
  'Show temperature in AHU-1',
  'Summarize the building system',
  'Write 22.5 to the setpoint',
];

export const EmptyState: React.FC<Props> = ({ onSelectQuestion }) => {
  return (
    <div className={styles.emptyRoot}>
      <h2 className={styles.emptyTitle}>Hello, how can I help with your building today?</h2>
      <p className={styles.emptySubtitle}>
        I can query live device data, check alarms, search Haystack tags, and analyze trend logs.
      </p>

      {/* Card row */}
      <div className={styles.emptyCards}>
        {CARDS.map((s) => (
          <button
            key={s.title}
            className={styles.emptyCard}
            onClick={() => onSelectQuestion(s.query)}
          >
            <s.Icon fontSize={18} className={styles.emptyCardIcon} />
            <div>
              <span className={styles.emptyCardTitle}>{s.title}</span>
              <span className={styles.emptyCardDesc}>{s.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Tag chips */}
      <div className={styles.emptyTags}>
        {TAGS.map((t) => (
          <button
            key={t}
            className={styles.emptyTag}
            onClick={() => onSelectQuestion(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Example queries */}
      <div className={styles.emptyExamples}>
        {EXAMPLES.map((q) => (
          <button
            key={q}
            className={styles.emptyExample}
            onClick={() => onSelectQuestion(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};
