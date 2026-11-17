/**
 * Report an Issue API client.
 * Talks to the Rust backend routes under /api/report/* and /api/docs/*.
 */

import { API_BASE_URL } from '../../../config/constants';
import type {
  BundleResult,
  ClientContext,
  DraftResult,
  ReportInput,
  SelfCheckResult,
  SendResult,
  StoredReport,
} from '../types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) {
        msg = data.error;
      }
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export interface DocsSearchHit {
  id: string;
  title: string;
  score: number;
  excerpt: string;
}

export const reportApi = {
  selfCheck: (context: ClientContext) =>
    req<SelfCheckResult>('/api/report/self-check', jsonInit('POST', context)),

  draft: (input: ReportInput) =>
    req<DraftResult>('/api/report/draft', jsonInit('POST', input)),

  bundle: (input: ReportInput) =>
    req<BundleResult>('/api/report/bundle', jsonInit('POST', input)),

  send: (payload: {
    kind: string;
    title: string;
    body: string;
    labels: string[];
    bundleId?: string | null;
  }) => req<SendResult>('/api/report/send', jsonInit('POST', payload)),

  list: () =>
    req<{ reports: StoredReport[]; total: number; dir: string }>('/api/report/list'),

  searchDocs: (query: string, limit = 5) =>
    req<{ query: string; results: DocsSearchHit[]; total_docs: number }>(
      `/api/docs/search?q=${encodeURIComponent(query)}&limit=${limit}`
    ),

  readDoc: (id: string) =>
    req<{ id: string; title: string; markdown: string }>(
      `/api/docs/page?id=${encodeURIComponent(id)}`
    ),
};

export default reportApi;
