type FrontendLogLevel = 'debug' | 'info' | 'warn' | 'error';

interface FrontendLogEvent {
  level: FrontendLogLevel;
  category: string;
  message: string;
  params?: unknown[];
  source?: string;
}

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:9103`;
  }
  return 'http://localhost:9103';
};

const LOG_ENDPOINT = `${getApiBaseUrl()}/api/log`;

export async function logFrontendEvent({
  level,
  category,
  message,
  params,
  source,
}: FrontendLogEvent): Promise<void> {
  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        category,
        message,
        params,
        source,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to send log to backend:', error);
    }
  }
}

export type { FrontendLogEvent, FrontendLogLevel };
