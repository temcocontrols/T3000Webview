/**
 * ChatMessage — Single message bubble for the AI chat panel.
 *
 * - User messages: right-aligned, brand-colored bubble.
 * - AI messages: left-aligned, neutral bubble with full Markdown rendering.
 * - System messages: centered, muted text (errors / info).
 * - Thinking section: collapsible "Finished with N steps · Xs" block.
 * - Tool calls: compact inline tags that open a detail drawer.
 *
 * Uses Fluent UI design tokens via shared AiChat.styles.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  ArrowSyncRegular,
  CheckmarkCircleFilled,
  DismissCircleFilled,
} from '@fluentui/react-icons';
import styles from '../AiChat.module.css';
import type {
  ChatMessage as ChatMessageType,
  ToolCallRecord,
  ThinkingStep,
} from '../hooks/useAiChatStream';

// Configure marked for safety
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface Props {
  message: ChatMessageType;
  isStreaming?: boolean;
}

// ── Helpers ──

const formatTime = (ts: number): string =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

function renderMarkdown(content: string): string {
  if (!content) return '';
  const raw = marked.parse(content) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'hr', 'img', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style'],
  });
}

// ── ThinkingSection (per-step, Copilot-style) ──

const ThinkingSection: React.FC<{
  steps: ThinkingStep[];
  isStreaming: boolean;
  outputStarted: boolean;
}> = ({ steps, isStreaming, outputStarted }) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const outputStartedRef = useRef(false);

  // Auto-scroll to bottom on new steps
  useEffect(() => {
    if (bodyRef.current && isStreaming) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [steps, isStreaming]);

  // Auto-collapse when output starts arriving
  useEffect(() => {
    if (outputStarted && !outputStartedRef.current) {
      outputStartedRef.current = true;
      setExpanded(false);
    }
  }, [outputStarted]);

  const stepCount = steps.length;

  if (stepCount === 0) return null;

  return (
    <div className={styles.thinkingSection}>
      {/* Header */}
      {isStreaming ? (
        <div className={styles.thinkingHeader}>
          <span className={styles.thinkingIcon}>
            <ArrowSyncRegular style={{ fontSize: 14 }} />
          </span>
          <span className={styles.thinkingLabel}>Thinking&hellip;</span>
          <span className={styles.thinkingCount}>{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
        </div>
      ) : (
        <button
          className={styles.thinkingToggle}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span className={styles.thinkingToggleIcon}>{expanded ? '▾' : '▸'}</span>
          <span className={styles.thinkingToggleLabel}>
            Finished with {stepCount} step{stepCount !== 1 ? 's' : ''}
          </span>
        </button>
      )}

      {/* Step list */}
      {expanded && (
        <div className={styles.thinkingStepList} ref={bodyRef}>
          {steps.map((step) => (
            <div key={step.index} className={styles.thinkingStepItem}>
              <span className={styles.thinkingStepMarker} />
              <div className={styles.thinkingStepContent}>
                <div className={styles.thinkingStepText}>{step.content}</div>
                {step.toolCall && (
                  <ToolCallTagInline tool={step.toolCall} />
                )}
              </div>
            </div>
          ))}
          {isStreaming && <span className={styles.thinkingCursor} />}
        </div>
      )}
    </div>
  );
};

// ── ToolCallTagInline (compact badge inside a step) ──

const ToolCallTagInline: React.FC<{ tool: ToolCallRecord }> = ({ tool }) => {
  const [expanded, setExpanded] = useState(false);
  const isPending = tool.status === 'pending';
  const isError = tool.status === 'error';

  let formattedArgs = '';
  try { formattedArgs = JSON.stringify(JSON.parse(tool.args), null, 2); } catch { formattedArgs = tool.args || '(empty)'; }

  let formattedResult = '';
  if (tool.result) {
    try { formattedResult = JSON.stringify(JSON.parse(tool.result), null, 2); } catch { formattedResult = tool.result; }
  }

  return (
    <div className={styles.stepToolWrapper}>
      <button
        className={`${styles.stepToolBadge} ${isPending ? styles.stepToolBadgePending : ''} ${isError ? styles.stepToolBadgeError : ''}`}
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        title={`${tool.name} — click for details`}
      >
        <span className={styles.stepToolBadgeIcon}>
          {isPending ? (
            <ArrowSyncRegular style={{ fontSize: 11, color: 'var(--colorStatusWarningForeground1, #8a6d00)' }} />
          ) : isError ? (
            <DismissCircleFilled style={{ fontSize: 11, color: 'var(--colorStatusDangerForeground1, #c50f1f)' }} />
          ) : (
            <CheckmarkCircleFilled style={{ fontSize: 11, color: 'var(--colorStatusSuccessForeground1, #107c10)' }} />
          )}
        </span>
        <span className={styles.toolTagName}>{tool.name}</span>
        <span className={styles.toolTagArrow}>{expanded ? '▾' : '→'}</span>
      </button>

      {expanded && (
        <div className={styles.stepToolDetail}>
          <div className={styles.toolDetailSection}>
            <div className={styles.toolDetailSectionTitle}>Arguments</div>
            <pre className={styles.toolDetailPre}>{formattedArgs}</pre>
          </div>
          {formattedResult && (
            <div className={styles.toolDetailSection}>
              <div className={styles.toolDetailSectionTitle}>Result</div>
              <pre className={styles.toolDetailPre}>{formattedResult}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── ChatMessage ──

export const ChatMessage: React.FC<Props> = ({ message, isStreaming }) => {
  // Pre-compute markdown for assistant messages
  const htmlContent = useMemo(() => {
    if (message.role !== 'assistant') return null;
    return renderMarkdown(message.content);
  }, [message.content, message.role]);

  // System message
  if (message.role === 'system') {
    const isError = message.content.startsWith('Error:');
    return (
      <div className={`${styles.systemMessage} ${isError ? styles.systemError : ''}`}>
        {message.content}
      </div>
    );
  }

  const isUser = message.role === 'user';
  const hasContent = !isUser && !!htmlContent;
  const steps = message.thinkingSteps || [];
  const hasThinking = steps.length > 0;

  return (
    <div className={styles.messageWrapper}>
      {/* Meta: role label + timestamp */}
      <div className={styles.messageMeta}>
        <span className={styles.messageRole}>{isUser ? 'User' : 'Model'}</span>
        <span>{formatTime(message.timestamp)}</span>
      </div>

      {/* Thinking section — shows when steps have arrived */}
      {hasThinking && (
        <ThinkingSection steps={steps} isStreaming={!!isStreaming} outputStarted={!!message.content} />
      )}

      {/* Content */}
      {isUser ? (
        <div className={styles.userContent}>{message.content}</div>
      ) : hasContent ? (
        <div className={styles.mdWrapper} dangerouslySetInnerHTML={{ __html: htmlContent! }} />
      ) : isStreaming && !hasThinking ? (
        <span className={styles.thinkingCursor} />
      ) : null}
    </div>
  );
};
