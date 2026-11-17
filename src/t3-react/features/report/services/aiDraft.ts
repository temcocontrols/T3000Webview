/**
 * AI help for the report page.
 *
 * The local model already answers through `/api/ai/chat`, so the page reuses it: one prompt in, one
 * streamed answer out. The draft is grounded in the documentation shipped with this installation
 * (offline index), and the titles of the pages that were used come back with the text so the UI can
 * say what it was based on.
 *
 * Everything here degrades quietly: if no model is configured the caller gets a plain Error and the
 * page says so instead of blocking the report.
 *
 * SSE shape from the Rust side (`StreamEvent` in api/src/ai/types.rs):
 *   data: {"event":"text_delta","data":{"content":"…"}}
 *   data: {"event":"done","data":{"session_id":"…","finish_reason":"stop"}}
 */

import { API_BASE_URL } from '../../../config/constants';
import type { ClientContext, ReportKind } from '../types';

export interface AiDraftInput {
  kind: ReportKind;
  area: string;
  summary: string;
  details: string;
  steps: string;
  expected: string;
  context: ClientContext;
}

export interface AiDraftOptions {
  /** The current text, when the user is asking for a change instead of a first draft. */
  previousBody?: string;
  /** What the user wants changed. */
  instruction?: string;
}

export interface AiDraftResult {
  text: string;
  /** Titles of the documentation pages the prompt was grounded in. */
  docs: string[];
}

interface SseEvent {
  event?: string;
  data?: {
    content?: string;
    message?: string;
  };
}

interface AiSettings {
  provider?: string;
  model?: string;
  configured?: boolean;
}

/** A documentation hit from the offline index. */
interface AiDoc {
  title: string;
  excerpt: string;
}

const KIND_WORDS: Record<ReportKind, string> = {
  bug: 'a fault report',
  feature: 'a feature request',
  support: 'a support question',
};

const RULES = [
  'Rules:',
  '- Use only the facts below. Never invent versions, screenshots, steps or values.',
  '- If a fact is missing, keep the heading and write "not sure" rather than guessing.',
  '- English, no greeting, no closing remarks, at most 180 words.',
  '- Start directly with "### What happened".',
];

/**
 * The model has no documentation of its own, so the top local hits for the user's words ride along
 * in the prompt. Offline, best effort — a docs failure must never block the draft.
 */
async function searchDocs(query: string): Promise<AiDoc[]> {
  const words = query.trim();
  if (!words) {
    return [];
  }
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/docs/search?q=${encodeURIComponent(words.slice(0, 200))}&limit=3`
    );
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as { results?: { title?: string; excerpt?: string }[] };
    return (data.results ?? [])
      .map((hit) => ({
        title: (hit.title ?? '').trim(),
        excerpt: (hit.excerpt ?? '').trim().slice(0, 300),
      }))
      .filter((doc) => doc.title && doc.excerpt);
  } catch {
    return [];
  }
}

function docSection(docs: AiDoc[]): string[] {
  if (docs.length === 0) {
    return [];
  }
  return [
    '',
    'Documentation from this installation that may be relevant (quote only what answers the report; ignore the rest):',
    ...docs.map((doc) => `- ${doc.title}: ${doc.excerpt}`),
  ];
}

function factSection(input: AiDraftInput): string[] {
  const logLines = input.context.logText ? input.context.logText.split('\n').length : 0;
  return [
    'Facts:',
    `- The user wrote: ${input.summary || '(nothing yet)'}`,
    `- More detail: ${input.details || '(none)'}`,
    `- Screen: ${input.area || '(unknown)'}`,
    `- Expected: ${input.expected || '(not stated)'}`,
    `- Steps they gave: ${input.steps || '(none)'}`,
    `- T3000 version: ${input.context.exeVersion || 'unknown'}`,
    `- Windows: ${input.context.windowsVersion || 'unknown'}`,
    `- Device serial: ${input.context.deviceSerial ?? 'none selected'}`,
    `- Runtime log lines available: ${logLines}`,
  ];
}

function buildPrompt(input: AiDraftInput, docs: AiDoc[]): string {
  return [
    `You are helping a building-automation engineer write ${KIND_WORDS[input.kind]} for the T3000 software.`,
    'Write the issue body in GitHub markdown.',
    '',
    ...RULES,
    '',
    ...factSection(input),
    ...docSection(docs),
  ].join('\n');
}

function buildRefinePrompt(
  input: AiDraftInput,
  docs: AiDoc[],
  previousBody: string,
  instruction: string
): string {
  return [
    `You are rewriting ${KIND_WORDS[input.kind]} for the T3000 software.`,
    'Rewrite the whole body so it reflects the change the user asks for. Return the body only.',
    '',
    ...RULES,
    '',
    'Body you wrote earlier:',
    '"""',
    previousBody.trim(),
    '"""',
    '',
    `Change the user asked for: ${instruction.trim()}`,
    '',
    ...factSection(input),
    ...docSection(docs),
  ].join('\n');
}

async function loadSettings(): Promise<AiSettings> {
  const res = await fetch(`${API_BASE_URL}/api/ai/settings`);
  if (!res.ok) {
    throw new Error('Could not read the AI settings');
  }
  return (await res.json()) as AiSettings;
}

/** One prompt in, streamed text out. Shared by the body draft and the single-field polish. */
async function streamChat(prompt: string, onDelta?: (chunk: string) => void): Promise<string> {
  const settings = await loadSettings();
  if (!settings.model) {
    throw new Error('No AI model is configured — set one under AI settings first.');
  }

  const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: settings.provider || 'local',
      model: settings.model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`The AI request failed (HTTP ${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let text = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    pending += decoder.decode(value, { stream: true });

    const lines = pending.split('\n');
    pending = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        continue;
      }
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') {
        continue;
      }

      let event: SseEvent;
      try {
        event = JSON.parse(payload) as SseEvent;
      } catch {
        continue;
      }

      if (event.event === 'text_delta' && event.data?.content) {
        text += event.data.content;
        onDelta?.(event.data.content);
      } else if (event.event === 'error') {
        throw new Error(event.data?.message || 'The model reported an error');
      } else if (event.event === 'done') {
        return text;
      }
    }
  }

  return text;
}

/**
 * Ask the local model for an issue body. `onDelta` receives each chunk so the caller can stream the
 * text into its own preview instead of the report.
 *
 * With `options.instruction` the same call becomes a follow-up: the current text is sent back with
 * the requested change, which is how "shorter" or "mention the log" works.
 */
export async function draftWithAi(
  input: AiDraftInput,
  onDelta?: (chunk: string) => void,
  options?: AiDraftOptions
): Promise<AiDraftResult> {
  const docs = await searchDocs(`${input.summary} ${input.details}`);
  const prompt = options?.instruction
    ? buildRefinePrompt(input, docs, options.previousBody ?? '', options.instruction)
    : buildPrompt(input, docs);
  const text = await streamChat(prompt, onDelta);
  return { text, docs: docs.map((doc) => doc.title) };
}
