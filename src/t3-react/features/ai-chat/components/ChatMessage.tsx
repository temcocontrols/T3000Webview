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
    ADD_ATTR: ['target'],
  });
}

// Hook: force all links to open in a new tab
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

// ── ThinkingSection (per-step, Copilot-style) ──

const ThinkingSection: React.FC<{
  steps: ThinkingStep[];
  isStreaming: boolean;
  outputStarted: boolean;
}> = ({ steps, isStreaming, outputStarted }) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const outputStartedRef = useRef(false);

  // ── Auto-scroll to latest step (RAF ensures DOM painted first) ──
  useEffect(() => {
    if (bodyRef.current && expanded && isStreaming) {
      requestAnimationFrame(() => {
        if (bodyRef.current) {
          bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
      });
    }
  }, [steps, expanded, isStreaming]);

  // ── Auto-collapse when output starts ──
  useEffect(() => {
    if (outputStarted && !outputStartedRef.current) {
      outputStartedRef.current = true;
      setExpanded(false);
    }
  }, [outputStarted]);

  // ── Re-expand when new thinking arrives (tool-call loop iterations) ──
  const prevStepCountRef = useRef(steps.length);
  useEffect(() => {
    if (steps.length > prevStepCountRef.current && isStreaming) {
      setExpanded(true);
    }
    prevStepCountRef.current = steps.length;
  }, [steps.length, isStreaming]);

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
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const prevHadTool = i > 0 && !!steps[i - 1].toolCall;
            return (
            <React.Fragment key={step.index}>
              {prevHadTool && <div className={styles.thinkingIterationDivider} />}
            <div className={styles.thinkingStepItem}>
              <span className={styles.thinkingStepMarker} />
              <div className={styles.thinkingStepContent}>
                <div className={styles.thinkingStepText}>
                  {step.content}
                  {isStreaming && isLast && <span className={styles.thinkingCursor} />}
                </div>
                {step.toolCall && (
                  <ToolCallTagInline tool={step.toolCall} />
                )}
              </div>
            </div>
            </React.Fragment>
            );
          })}
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
    const isError =
      message.content.startsWith('Error:') ||
      message.content.startsWith('The LLM server returned HTTP') ||
      message.content.startsWith('Could not reach the LLM server') ||
      message.content.startsWith('The LLM request failed on the server side') ||
      message.content.startsWith('No response received from the LLM server');
    const isWarning = message.content.startsWith('Unable to complete your request');
    if (isWarning) {
      const nl = message.content.indexOf('\n');
      const title = nl > -1 ? message.content.slice(0, nl) : message.content;
      const body = nl > -1 ? message.content.slice(nl + 1) : '';
      // Split body around the URL to render it as a link
      const urlMatch = body.match(/(https?:\/\/\S+)/);
      const linkUrl = urlMatch ? urlMatch[1] : '';
      const beforeLink = urlMatch ? body.slice(0, urlMatch.index!) : body;
      const afterLink = urlMatch ? body.slice(urlMatch.index! + linkUrl.length) : '';
      return (
        <div className={`${styles.systemMessage} ${styles.systemWarning}`}>
          <div className={styles.systemWarningTitle}>{title}</div>
          {body && (
            <div className={styles.systemWarningBody}>
              {beforeLink}
              {linkUrl && (
                <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.systemWarningLink}>
                  {linkUrl}
                </a>
              )}
              {afterLink}
            </div>
          )}
        </div>
      );
    }
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
  const blocks = message.messageBlocks;
  const hasBlocks = blocks && blocks.length > 0;

  // Render interleaved blocks or fall back to legacy mode
  const renderBlocks = () => {
    if (!blocks) return null;
    // Pre-compute: does each thinking block have output after it?
    const hasOutputAfter: boolean[] = new Array(blocks.length).fill(false);
    let foundOutput = false;
    for (let i = blocks.length - 1; i >= 0; i--) {
      if (blocks[i].type === 'output') foundOutput = true;
      hasOutputAfter[i] = foundOutput && blocks[i].type === 'thinking';
    }
    return blocks.map((block, i) => {
      if (block.type === 'thinking') {
        const finished = hasOutputAfter[i]; // output exists after this block
        return (
          <ThinkingSection
            key={i}
            steps={block.steps}
            isStreaming={!!isStreaming && !finished}
            outputStarted={finished}
          />
        );
      }
      return (
        <div key={i} className={styles.mdWrapper} dangerouslySetInnerHTML={{ __html: renderMarkdown(block.content) }} />
      );
    });
  };

  return (
    <div className={styles.messageWrapper}>
      {/* Meta: role label + timestamp */}
      <div className={styles.messageMeta}>
        <span className={styles.messageRole}>{isUser ? 'User' : 'Model'}</span>
        <span>{formatTime(message.timestamp)}</span>
      </div>

      {/* Interleaved blocks (new format) or legacy fallback */}
      {hasBlocks ? renderBlocks() : (
        <>
          {hasThinking && (
            <ThinkingSection steps={steps} isStreaming={!!isStreaming} outputStarted={!!message.content} />
          )}
          {isUser ? (
            <div className={styles.userContent}>{message.content}</div>
          ) : hasContent ? (
            <div className={styles.mdWrapper} dangerouslySetInnerHTML={{ __html: htmlContent! }} />
          ) : isStreaming && !hasThinking ? (
            <span className={styles.thinkingCursor} />
          ) : null}
        </>
      )}
    </div>
  );
};
