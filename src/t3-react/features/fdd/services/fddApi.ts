/**
 * FDD (Fault Detection & Diagnostics) API client.
 * Talks to the Rust backend REST routes under /api/fdd/*.
 */

import { API_BASE_URL } from '../../../config/constants';

// ── Types ──

export interface FddRule {
  rule_id: string;
  rule_name: string;
  category: string;
  description?: string | null;
  rule_kind: string;
  required_roles: string[];
  params: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical' | string;
  enabled: boolean;
}

export interface AnalyzeFinding {
  rule_id: string;
  rule_name: string;
  category?: string;
  severity: string;
  status: 'ok' | 'insufficient_roles';
  fault_hours: number;
  evidence?: Record<string, unknown>;
  suggestion?: string;
  missing_roles?: string[];
}

export interface RoleFound {
  role: string;
  point_type: string;
  point_index: number;
  point_id?: string;
  label?: string | null;
}

export interface AnalyzeResult {
  device: number;
  equipment: string;
  range_hours: number;
  roles_found: RoleFound[];
  sample_count: number;
  findings: AnalyzeFinding[];
}

export interface FddFinding {
  id: number;
  device_serial: number;
  equipment?: string | null;
  rule_id: string;
  rule_name?: string | null;
  severity: string;
  fault_hours: number;
  evidence?: Record<string, unknown> | null;
  created_at: string;
}

// ── HTTP helper ──

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const d = await res.json();
      if (d?.error) msg = d.error;
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

// ── Rules CRUD ──

export const fddApi = {
  listRules: (category?: string) =>
    req<{ rules: FddRule[]; total: number }>(
      `/api/fdd/rules${category ? `?category=${encodeURIComponent(category)}` : ''}`
    ),

  createRule: (body: {
    ruleId: string;
    ruleName: string;
    category: string;
    description?: string;
    ruleKind: string;
    requiredRoles?: string[];
    params?: Record<string, unknown>;
    severity?: string;
    enabled?: boolean;
  }) => req<{ message: string; rule_id: string }>('/api/fdd/rules', jsonInit('POST', body)),

  updateRule: (ruleId: string, changes: Record<string, unknown>) =>
    req<{ message: string; rule: FddRule }>(
      `/api/fdd/rules/${encodeURIComponent(ruleId)}`,
      jsonInit('PUT', changes)
    ),

  deleteRule: (ruleId: string) =>
    req<{ message: string; rule_id: string }>(
      `/api/fdd/rules/${encodeURIComponent(ruleId)}`,
      { method: 'DELETE' }
    ),

  toggleRule: (ruleId: string, enabled: boolean) =>
    req<{ message: string; rule: FddRule }>(
      `/api/fdd/rules/${encodeURIComponent(ruleId)}/toggle`,
      jsonInit('POST', { enabled })
    ),

  // ── Analysis / Findings ──

  analyze: (
    serialNumber: number,
    equipment: string,
    rangeHours: number,
    ruleIds?: string[]
  ) =>
    req<AnalyzeResult>(
      '/api/fdd/analyze',
      jsonInit('POST', {
        serialNumber,
        equipment,
        rangeHours,
        ruleIds: ruleIds && ruleIds.length ? ruleIds : undefined,
      })
    ),

  listFindings: (opts?: { serial?: number; ruleId?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.serial != null) params.set('serial', String(opts.serial));
    if (opts?.ruleId) params.set('rule_id', opts.ruleId);
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return req<{ findings: FddFinding[]; total: number }>(
      `/api/fdd/faults${qs ? `?${qs}` : ''}`
    );
  },

  clearFindings: () =>
    req<{ message: string; count: number }>('/api/fdd/faults', { method: 'DELETE' }),
};
