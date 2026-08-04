/**
 * EmptyState — Welcome screen shown when no messages exist yet.
 *
 * Pattern inspired by Microsoft Copilot:
 *   - Warm, contextual greeting (no icon)
 *   - Horizontal scrollable suggestion chips
 *   - Clean, minimal layout
 */

import React from 'react';
import styles from '../AiChat.module.css';

interface Props {
  onSelectQuestion: (question: string) => void;
}

const SUGGESTIONS = [
  { label: 'Check device status', icon: '📡' },
  { label: 'Show alarms', icon: '🔔' },
  { label: 'Search tags', icon: '🏷️' },
  { label: 'Analyze trends', icon: '📈' },
  { label: 'List AHUs', icon: '🏢' },
  { label: 'Read points', icon: '📊' },
  { label: 'System health', icon: '💚' },
  { label: 'Network scan', icon: '🌐' },
];

export const EmptyState: React.FC<Props> = ({ onSelectQuestion }) => {
  return (
    <div className={styles.emptyRoot}>
      <h2 className={styles.emptyTitle}>Hello, how can I help with your building today?</h2>
      <p className={styles.emptySubtitle}>
        I can query live device data, check alarms, search Haystack tags, and analyze trend logs.
      </p>

      {/* Horizontal suggestion chips */}
      <div className={styles.emptyChips}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            className={styles.emptyChip}
            onClick={() => onSelectQuestion(s.label)}
          >
            <span className={styles.emptyChipIcon}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};
