/**
 * EmptyState — Welcome screen shown when no messages exist yet.
 *
 * Clicking a suggested question fills the input and sends it.
 */

import React from 'react';

interface Props {
  onSelectQuestion: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  'What devices are currently online?',
  'Show me active alarms',
  'What points have no Haystack tags?',
  'List all AHU-related devices',
];

export const EmptyState: React.FC<Props> = ({ onSelectQuestion }) => {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      {/* Welcome icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--colorBrandBackground2, #deecf9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          marginBottom: 20,
        }}
      >
        🤖
      </div>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          margin: '0 0 8px 0',
          color: 'var(--colorNeutralForeground1, #222)',
        }}
      >
        AI Building Assistant
      </h2>
      <p
        style={{
          fontSize: 14,
          color: 'var(--colorNeutralForeground2, #555)',
          margin: '0 0 24px 0',
          maxWidth: 400,
          lineHeight: 1.5,
        }}
      >
        Ask me anything about your T3000 system. I can query live device data, search
        Haystack tags, check alarms, and analyze trend logs.
      </p>

      {/* Capability badges */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 28,
          maxWidth: 500,
        }}
      >
        {['Live device values', 'Alarm monitoring', 'Haystack tag search', 'Trend log analysis'].map(
          (cap) => (
            <span
              key={cap}
              style={{
                fontSize: 12,
                padding: '4px 12px',
                borderRadius: 12,
                background: 'var(--colorNeutralBackground3, #e8e8e8)',
                color: 'var(--colorNeutralForeground2, #555)',
              }}
            >
              {cap}
            </span>
          ),
        )}
      </div>

      {/* Suggested questions */}
      <div style={{ maxWidth: 400, width: '100%' }}>
        <p
          style={{
            fontSize: 12,
            color: 'var(--colorNeutralForeground3, #888)',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Try asking
        </p>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelectQuestion(q)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              marginBottom: 6,
              border: '1px solid var(--colorNeutralStroke2, #e0e0e0)',
              borderRadius: 8,
              background: 'var(--colorNeutralBackground1, #fff)',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--colorNeutralForeground1, #222)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background =
                'var(--colorNeutralBackground2, #f5f5f5)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background =
                'var(--colorNeutralBackground1, #fff)';
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};
