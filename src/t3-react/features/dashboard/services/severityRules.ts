import type { SyncHealthData } from './syncHealthApi';

export function isStartupPause(pausedReason?: string | null): boolean {
  return !!pausedReason && pausedReason.toLowerCase().includes('startup');
}

export function isCenterDbDegraded(health: SyncHealthData | null): boolean {
  return !!health && !health.centerDbConnected && !!health.writesBlocked;
}

export function isSamplingDegraded(health: SyncHealthData | null): boolean {
  return !!health
    && !!health.samplingPaused
    && (!!health.writesBlocked || isStartupPause(health.pausedReason));
}
