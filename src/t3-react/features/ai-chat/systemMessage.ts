/**
 * Classification of `role: 'system'` chat notices.
 *
 * The chat renders system notices either as a muted info line, a warning card,
 * or a red error box. Detection is prefix-based because the notices are
 * multi-line prose, so every phrasing the app can produce has to be listed —
 * rewording a notice without updating this list silently downgrades it to the
 * muted style.
 */

const ERROR_PREFIXES = [
  'Error:',
  'Connection lost',
  'The LLM server returned HTTP',
  'Could not reach the LLM endpoint',
  'Could not reach the LLM server',
  'The LLM request failed on the server side',
  'No response received from the LLM server',
] as const;

const WARNING_PREFIXES = ['Unable to complete your request'] as const;

export function isSystemErrorNotice(content: string): boolean {
  return ERROR_PREFIXES.some((prefix) => content.startsWith(prefix));
}

export function isSystemWarningNotice(content: string): boolean {
  return WARNING_PREFIXES.some((prefix) => content.startsWith(prefix));
}
