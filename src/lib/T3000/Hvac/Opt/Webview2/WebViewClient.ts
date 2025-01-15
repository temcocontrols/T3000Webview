

// Wrap a class to handle the communication between the WebView and the native code (T3000)
// Note: Migrated existing code from IndexPage for the window.chrome.webview part

class WebViewClient {

  /*
  window.chrome?.webview?.postMessage({
    action: 1, // GET_INITIAL_DATA
  });
  */

  // window.chrome?.webview?.addEventListener("message", (arg) => {});

  private webview = (window as any).chrome?.webview;

  constructor() { }

  initMessageHandler() {
    if (this.webview) {
      this.webview.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  // Send a message to the native code T3 application
  sendMessage(message: any) {
    if (!this.webview) {
      console.log('= Wv2 window.chrome.webview is not available');
      return;
    }

    this.webview.postMessage(message);
  }

  // Handle messages received from the native code T3 application
  handleMessage(arg: any) {
    console.log('= Wv2 Received message from T3:', arg);
    // Handle the message as needed
  }
}

export default WebViewClient
