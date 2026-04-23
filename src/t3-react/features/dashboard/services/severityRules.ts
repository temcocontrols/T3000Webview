import type { SyncHealthData } from './syncHealthApi';

export function isStartupPause(pausedReason?: string | null): boolean {
  return !!pausedReason && pausedReason.toLowerCase().includes('startup');
}

export function isCenterDbDegraded(health: SyncHealthData | null): boolean {
  return !!health && !health.centerDbConnected && !!health.fallbackActive;
}

export function isSamplingDegraded(health: SyncHealthData | null): boolean {
  return !!health
    && !!health.samplingPaused
    && (!!health.fallbackActive || isStartupPause(health.pausedReason));
}
