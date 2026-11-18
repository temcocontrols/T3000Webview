/**
 * Bridge to the T3000 C++ host for the report flow.
 *
 * Inside T3000 the page runs in WebView2, so `window.chrome.webview` posts a message the host
 * dispatches by numeric `action` (see `WEBVIEW_MESSAGE_TYPE` in BacnetWebView.cpp) and answers
 * through `PostWebMessageAsJson` with the same shape plus `_RES`.
 *
 * In a plain browser (dev server, or someone opened localhost:9103 directly) there is no host:
 * capture falls back to `getDisplayMedia` and the log/context calls report what they cannot
 * read instead of throwing, so the page still works end to end.
 */

import { REPORT_ACTIONS, type CaptureResult, type T3000Context } from '../types';

interface WebviewEvent {
  data: unknown;
}

interface WebviewHost {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: WebviewEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: WebviewEvent) => void): void;
}

/** WebView2 hangs its bridge off `window.chrome`, which no bundled typings describe. */
interface WebviewChrome {
  chrome?: { webview?: WebviewHost };
}

function webviewHost(): WebviewHost | undefined {
  return typeof window === 'undefined' ? undefined : (window as unknown as WebviewChrome).chrome?.webview;
}

export function inT3000(): boolean {
  return typeof webviewHost()?.postMessage === 'function';
}

/**
 * Send one action and wait for its `_RES` reply.
 *
 * T3000 answers on the same channel it receives, so a single listener per call is enough and
 * keeps the two sides loosely coupled — no request ids to keep in sync with the C++ switch.
 */
function call<T>(action: number, payload: Record<string, unknown>, responseAction: string, timeoutMs = 12000): Promise<T> {
  const host = webviewHost();
  if (!host) {
    return Promise.reject(new Error('T3000 host is not available'));
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      host.removeEventListener('message', listener);
      fn();
    };

    const listener = (event: WebviewEvent) => {
      let parsed: unknown = event.data;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return;
        }
      }
      const message = parsed as { action?: string } | null;
      if (!message || message.action !== responseAction) {
        return;
      }
      finish(() => resolve(parsed as T));
    };

    const timer = window.setTimeout(() => {
      finish(() => reject(new Error(`T3000 did not answer ${responseAction} in time`)));
    }, timeoutMs);

    host.addEventListener('message', listener);
    host.postMessage({ action, ...payload });
  });
}

export async function getContext(): Promise<T3000Context | null> {
  if (!inT3000()) {
    return null;
  }
  try {
    return await call<T3000Context>(REPORT_ACTIONS.context, {}, 'REPORT_CONTEXT_RES');
  } catch {
    return null;
  }
}

export async function getRuntimeLogs(count = 200): Promise<{ text: string; saved: string }> {
  if (!inT3000()) {
    return { text: '', saved: '' };
  }
  try {
    return await call<{ text: string; saved: string }>(
      REPORT_ACTIONS.logs,
      { count },
      'REPORT_LOGS_RES'
    );
  } catch {
    return { text: '', saved: '' };
  }
}

export async function copyScreenshotToClipboard(path: string): Promise<boolean> {
  if (!inT3000() || !path) {
    return false;
  }
  try {
    const res = await call<{ ok: boolean }>(REPORT_ACTIONS.clipboard, { path }, 'REPORT_CLIPBOARD_RES');
    return Boolean(res.ok);
  } catch {
    return false;
  }
}

/** Host capture, or a browser fallback so the page is testable outside T3000. */
export async function captureScreen(whole = true): Promise<CaptureResult> {
  if (inT3000()) {
    try {
      const res = await call<CaptureResult>(
        REPORT_ACTIONS.capture,
        { whole },
        'REPORT_CAPTURE_RES',
        20000
      );
      return {
        ok: Boolean(res.ok),
        path: res.path ?? '',
        width: res.width ?? 0,
        height: res.height ?? 0,
        // The host sends the PNG bytes along with the path, so the card renders without a second request.
        dataUrl: res.dataUrl,
        error: res.error,
      };
    } catch (error) {
      return {
        ok: false,
        path: '',
        width: 0,
        height: 0,
        error: error instanceof Error ? error.message : 'capture failed',
      };
    }
  }

  return captureInBrowser();
}

async function captureInBrowser(): Promise<CaptureResult> {
  const media = navigator.mediaDevices;
  if (!media || typeof media.getDisplayMedia !== 'function') {
    return { ok: false, path: '', width: 0, height: 0, error: 'screen capture is not available here' };
  }
  let stream: MediaStream | undefined;
  try {
    stream = await media.getDisplayMedia({ video: true });
    const track = stream.getVideoTracks()[0];
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();

    const settings = track.getSettings();
    const width = settings.width ?? video.videoWidth;
    const height = settings.height ?? video.videoHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { ok: false, path: '', width, height, error: 'canvas is not available' };
    }
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/png');
    return { ok: true, path: '', width, height, dataUrl };
  } catch (error) {
    return {
      ok: false,
      path: '',
      width: 0,
      height: 0,
      error: error instanceof Error ? error.message : 'capture cancelled',
    };
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}
