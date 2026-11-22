import { describe, it, expect } from 'vitest';
import {
  isSystemErrorNotice,
  isSystemWarningNotice,
} from '@/t3-react/features/ai-chat/systemMessage';

describe('chat system-message classification', () => {
  it('treats the current unreachable-endpoint notice as an error', () => {
    const notice =
      'Could not reach the LLM endpoint https://generativelanguage.googleapis.com/v1beta — it may be down, or this machine has no route to it.\n' +
      'If the endpoint is a cloud provider (e.g. Gemini), check the internet connection, proxy, VPN or firewall.\n' +
      'You can also switch the provider to "Local" in Settings to work offline, then try again.\n\n' +
      'Endpoint: https://generativelanguage.googleapis.com/v1beta\n' +
      'Details: Provider error: Failed to connect to Gemini';
    expect(isSystemErrorNotice(notice)).toBe(true);
  });

  it('keeps recognising the legacy error phrasings', () => {
    expect(isSystemErrorNotice('Could not reach the LLM server at http://x — it may be down.')).toBe(true);
    expect(isSystemErrorNotice('The LLM server returned HTTP 503 — it may be down.')).toBe(true);
    expect(isSystemErrorNotice('Connection lost: network error')).toBe(true);
    expect(isSystemErrorNotice('Error: boom')).toBe(true);
    expect(isSystemErrorNotice('No response received from the LLM server at http://x.')).toBe(true);
  });

  it('does not mistake warnings or plain notices for errors', () => {
    expect(isSystemErrorNotice('Unable to complete your request')).toBe(false);
    expect(isSystemErrorNotice('Session saved')).toBe(false);
    expect(isSystemWarningNotice('Unable to complete your request\nbody')).toBe(true);
    expect(isSystemWarningNotice('Error: boom')).toBe(false);
  });
});
