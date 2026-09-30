/**
 * The web → desktop half of the WEBVIEW button pair.
 *
 * The T3000 toolbar's **WEBVIEW** button opens this web UI in the user's own browser (Chrome / Edge /
 * Firefox, on a dedicated profile); the **WIN11** quick-action icon here is the way back. A browser page
 * cannot move another program's window, so the request goes through the bridge that already exists for
 * everything else:
 *
 *     POST /api/t3000/ffi/call {"action":18}
 *       → Rust (running inside T3000.exe)
 *       → BacnetWebView_HandleWebViewMsg
 *       → the C++ HandleWebViewMsg switch, case BACK_TO_DESKTOP
 *       → CMainFrame::OnBackToDesktop
 *             restores + resizes + focuses the T3000 window,
 *             and closes the browser window the app launched.
 *
 * The action number is a contract: `18` must stay equal to the C++ `WEBVIEW_MESSAGE_TYPE::BACK_TO_DESKTOP`
 * (`T3000/BacnetWebView.cpp`) and to the Rust `WebViewMessageType::BACK_TO_DESKTOP`
 * (`api/src/t3_device/t3_ffi_sync_service.rs`).
 */
import { API_BASE_URL } from '@t3-react/config/constants';

/** Must match the C++ and Rust enums. */
export const BACK_TO_DESKTOP_ACTION = 18;

/**
 * Asks the desktop app to come back to the front.
 *
 * Resolves `true` when the bridge accepted the request. A `false` just means T3000.exe (with the bridge
 * inside it) is not reachable from this page — e.g. the page was opened in a browser while the desktop app
 * is closed, in which case there is nothing to switch to.
 */
export async function focusDesktopApp(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/t3000/ffi/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: BACK_TO_DESKTOP_ACTION }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
