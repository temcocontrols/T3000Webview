
## localStorage ===========================

New Project | newProject |
localStorage.removeItem("appState");

//Import | importJsonAction
const content = cloneDeep(toRaw(appState.value));
const file = new Blob([JSON.stringify(content)], {
    type: "application/json",
});

Export | exportToJsonAction

//Save | save
const data = cloneDeep(toRaw(appState.value));
localStorage.setItem("appState", JSON.stringify(data));

//IndexPage load default
const localState = localStorage.getItem("appState");
if (localState) {
  appState.value = JSON.parse(localState);
}

//saveSelectedToClipboard
localStorage.setItem("clipboard", JSON.stringify(selectedItems));

//pasteFromClipboard
const clipboard = localStorage.getItem("clipboard");

localStorage.setItem("user", JSON.stringify(user.value));
localStorage.setItem("user", JSON.stringify(user.value));

//in webview load data from GET_INITIAL_DATA_RES and set to appState.value
//not in webview load data from localStorage.getItem('appState')

## localStorage ===========================


## Fetching Data from External Explorer

To fetch data from an external explorer in your C++ application using Microsoft Edge as an integrated window, you can follow these steps:

1. **Start the Rust Server**: Ensure your Rust server is running and ready to handle requests.

2. **Fetch Data using JavaScript**: Use JavaScript to fetch data from the Rust server. You can use the `fetch` API to make HTTP requests.

```javascript
async function fetchDataFromServer() {
  try {
    const response = await fetch('http://localhost:8000/data');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log(data);
    // Process the data as needed
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
  }
}

fetchDataFromServer();
```

3. **Integrate with C++**: Use the WebView2 API to integrate the Edge browser with your C++ application. You can execute JavaScript in the webview and retrieve the results.

```cpp
#include <wil/com.h>
#include <WebView2.h>

// Initialize WebView2
void InitializeWebView2(HWND hwnd) {
  wil::com_ptr<ICoreWebView2Environment> webViewEnvironment;
  CreateCoreWebView2EnvironmentWithOptions(nullptr, nullptr, nullptr,
    Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
      [hwnd](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
        env->CreateCoreWebView2Controller(hwnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
          [hwnd](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
            wil::com_ptr<ICoreWebView2> webView;
            controller->get_CoreWebView2(&webView);
            webView->Navigate(L"http://localhost:8000");
            return S_OK;
          }).Get());
        return S_OK;
      }).Get());
}
```

4. **Handle Data in C++**: Use the WebView2 API to execute JavaScript and handle the fetched data in your C++ application.

```cpp
void ExecuteJavaScript(wil::com_ptr<ICoreWebView2> webView) {
  webView->ExecuteScript(L"fetchDataFromServer().then(data => window.chrome.webview.postMessage(data));",
    Callback<ICoreWebView2ExecuteScriptCompletedHandler>(
      [](HRESULT errorCode, LPCWSTR resultObjectAsJson) -> HRESULT {
        // Handle the result here
        return S_OK;
      }).Get());
}
```

By following these steps, you can fetch data from an external explorer and integrate it into your C++ application using Microsoft Edge and a Rust server.


## Posting Messages to WebView2 from Firefox

To post messages from a standalone Firefox browser to an integrated WebView2 in your C++ application, you can use a combination of WebSockets and the WebView2 postMessage API. Here are the steps:

1. **Set Up a WebSocket Server**: Create a WebSocket server in your Rust application to handle communication between Firefox and WebView2.

```rust
use std::net::TcpListener;
use tungstenite::accept;

fn main() {
  let server = TcpListener::bind("127.0.0.1:9001").unwrap();
  for stream in server.incoming() {
    let mut websocket = accept(stream.unwrap()).unwrap();
    loop {
      let msg = websocket.read_message().unwrap();
      if msg.is_text() {
        println!("Received: {}", msg);
        // Process the message and forward it to WebView2
      }
    }
  }
}
```

2. **Send Messages from Firefox**: Use the WebSocket API in Firefox to send messages to the WebSocket server.

```javascript
const socket = new WebSocket('ws://localhost:9001');

socket.onopen = function(event) {
  socket.send('Hello WebView2');
};

socket.onmessage = function(event) {
  console.log('Message from server ', event.data);
};
```

3. **Receive Messages in WebView2**: Modify your C++ application to receive messages from the WebSocket server and post them to WebView2.

```cpp
#include <websocketpp/config/asio_no_tls_client.hpp>
#include <websocketpp/client.hpp>

typedef websocketpp::client<websocketpp::config::asio_client> client;

void on_message(websocketpp::connection_hdl hdl, client::message_ptr msg) {
  std::wstring message = std::wstring(msg->get_payload().begin(), msg->get_payload().end());
  webView->PostWebMessageAsString(message.c_str());
}

void InitializeWebSocket() {
  client c;
  c.init_asio();
  c.set_message_handler(&on_message);
  websocketpp::lib::error_code ec;
  client::connection_ptr con = c.get_connection("ws://localhost:9001", ec);
  c.connect(con);
  c.run();
}
```

4. **Handle Messages in WebView2**: Use the WebView2 API to handle messages posted from the C++ application.

```cpp
webView->add_WebMessageReceived(
  Callback<ICoreWebView2WebMessageReceivedEventHandler>(
    [](ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
      wil::unique_cotaskmem_string message;
      args->get_WebMessageAsString(&message);
      // Process the message
      return S_OK;
    }).Get(), &token);
```

By following these steps, you can post messages from a standalone Firefox browser to an integrated WebView2 in your C++ application using WebSockets.
