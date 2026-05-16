import HvConstant from '../../../lib/t3-hvac/Data/Constant/HvConstant'
import { logFrontendEvent, type FrontendLogLevel } from './frontendLogger'

type TraceStepMode = 'summary' | 'full'
type TraceIdMode = 'page-session' | 'per-operation'
type TraceStatus = 'start' | 'ok' | 'warn' | 'fail' | 'skip'

interface TraceRuntimeConfig {
  enabled: boolean
  profile: string
  featureFilter: string[]
  stepMode: TraceStepMode
  includePayload: boolean
  sampleRate: number
  ttlSec: number
  traceIdMode: TraceIdMode
  consoleMirror: boolean
  enabledAt?: string
  expiresAt?: string
}

interface TraceEventInput {
  flow: string
  step: string
  message: string
  status?: TraceStatus
  mode?: TraceStepMode
  traceId?: string
  context?: Record<string, unknown>
  metrics?: Record<string, unknown>
  details?: Record<string, unknown>
}

interface CreateFeatureTraceLoggerOptions {
  feature: string
  source: string
  category?: string
}

const DEFAULT_TRACE_CONFIG: TraceRuntimeConfig = {
  enabled: false,
  profile: 'baseline',
  featureFilter: [],
  stepMode: 'summary',
  includePayload: false,
  sampleRate: 1,
  ttlSec: 1800,
  traceIdMode: 'page-session',
  consoleMirror: false,
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map(item => String(item ?? '').trim().toLowerCase())
    .filter(Boolean)
}

const parseTraceRuntimeConfig = (): TraceRuntimeConfig => {
  const defaults = {
    ...DEFAULT_TRACE_CONFIG,
    ...(HvConstant.LogConfig.Trace || {}),
  }

  try {
    const raw = localStorage.getItem('t3.config')
    const parsed = raw ? JSON.parse(raw) : null
    const trace = parsed?.log?.trace

    if (!trace || typeof trace !== 'object') {
      return {
        ...defaults,
        featureFilter: normalizeStringArray(defaults.featureFilter),
      }
    }

    const merged: TraceRuntimeConfig = {
      ...defaults,
      ...trace,
      featureFilter: normalizeStringArray(trace.featureFilter ?? defaults.featureFilter),
    }

    if (merged.expiresAt) {
      const expiry = Date.parse(merged.expiresAt)
      if (Number.isFinite(expiry) && Date.now() > expiry) {
        merged.enabled = false
      }
    }

    return merged
  } catch {
    return {
      ...defaults,
      featureFilter: normalizeStringArray(defaults.featureFilter),
    }
  }
}

const createTraceId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const shouldEmitTrace = (
  config: TraceRuntimeConfig,
  feature: string,
  level: FrontendLogLevel,
  mode: TraceStepMode,
): boolean => {
  if (!config.enabled) return false

  if (config.featureFilter.length > 0 && !config.featureFilter.includes(feature.toLowerCase())) {
    return false
  }

  if (mode === 'full' && config.stepMode !== 'full') {
    return false
  }

  if (level === 'error' || level === 'warn') {
    return true
  }

  const sampleRate = Math.max(1, Math.floor(Number(config.sampleRate) || 1))
  if (sampleRate <= 1) {
    return true
  }

  return Math.floor(Math.random() * sampleRate) === 0
}

const toConsoleMethod = (level: FrontendLogLevel): 'log' | 'warn' | 'error' => {
  if (level === 'warn') return 'warn'
  if (level === 'error') return 'error'
  return 'log'
}

export function createFeatureTraceLogger(options: CreateFeatureTraceLoggerOptions) {
  let pageSessionTraceId: string | null = null

  const getTraceId = (config: TraceRuntimeConfig, traceId?: string): string => {
    if (traceId) return traceId
    if (config.traceIdMode === 'per-operation') {
      return createTraceId()
    }
    if (!pageSessionTraceId) {
      pageSessionTraceId = createTraceId()
    }
    return pageSessionTraceId
  }

  const emit = (level: FrontendLogLevel, event: TraceEventInput): string => {
    const config = parseTraceRuntimeConfig()
    const traceId = getTraceId(config, event.traceId)
    const mode = event.mode ?? 'summary'

    if (!shouldEmitTrace(config, options.feature, level, mode)) {
      return traceId
    }

    const payload = {
      traceId,
      profile: config.profile,
      feature: options.feature,
      flow: event.flow,
      step: event.step,
      status: event.status ?? (level === 'error' ? 'fail' : level === 'warn' ? 'warn' : 'ok'),
      message: event.message,
      timestamp: new Date().toISOString(),
      context: event.context,
      metrics: event.metrics,
      details: config.includePayload ? event.details : undefined,
    }

    if (config.consoleMirror) {
      console[toConsoleMethod(level)]('[trace]', payload)
    }

    void logFrontendEvent({
      level,
      category: options.category ?? 'MESSAGE_ACTION',
      source: options.source,
      message: `[trace] ${options.feature}.${event.flow}.${event.step}`,
      params: [payload],
      traceId,
      feature: options.feature,
      flow: event.flow,
      step: event.step,
      status: payload.status,
    })

    return traceId
  }

  return {
    start(event: Omit<TraceEventInput, 'status'>) {
      return emit('info', { ...event, status: 'start' })
    },
    info(event: TraceEventInput) {
      return emit('info', event)
    },
    warn(event: TraceEventInput) {
      return emit('warn', { ...event, status: event.status ?? 'warn' })
    },
    error(event: TraceEventInput) {
      return emit('error', { ...event, status: event.status ?? 'fail' })
    },
    getTraceId() {
      const config = parseTraceRuntimeConfig()
      return getTraceId(config)
    },
  }
}

export type { TraceRuntimeConfig, TraceEventInput, TraceStepMode, TraceIdMode, TraceStatus }
