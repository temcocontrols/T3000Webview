
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



## Connecting to WebSocket Server in C++ and Handling Messages

To connect to a WebSocket server in your C++ application and handle messages, you can use the WebSocket++ library. Here are the steps:

1. **Include WebSocket++ Library**: Ensure you have WebSocket++ installed and included in your project.
```cpp
#include <websocketpp/config/asio_no_tls_client.hpp>
#include <websocketpp/client.hpp>
#include <websocketpp/common/thread.hpp>
#include <websocketpp/common/memory.hpp>
```
2. **Initialize WebSocket Client**: Create a WebSocket client and connect to the server.

```cpp
#include <websocketpp/config/asio_no_tls_client.hpp>
#include <websocketpp/client.hpp>
#include <iostream>

typedef websocketpp::client<websocketpp::config::asio_client> client;

class WebSocketClient {
public:
  WebSocketClient() {
    c.init_asio();
    c.set_open_handler(bind(&WebSocketClient::on_open, this, ::_1));
    c.set_message_handler(bind(&WebSocketClient::on_message, this, ::_1, ::_2));
  }

  void connect(const std::string& uri) {
    websocketpp::lib::error_code ec;
    client::connection_ptr con = c.get_connection(uri, ec);
    if (ec) {
      std::cout << "Could not create connection because: " << ec.message() << std::endl;
      return;
    }
    c.connect(con);
    c.run();
  }

private:
  void on_open(websocketpp::connection_hdl hdl) {
    std::cout << "Connected to WebSocket server" << std::endl;
    c.send(hdl, "Hello from C++", websocketpp::frame::opcode::text);
  }

  void on_message(websocketpp::connection_hdl hdl, client::message_ptr msg) {
    std::cout << "Received message: " << msg->get_payload() << std::endl;
    // Handle the message as needed
  }

  client c;
};

int main() {
  WebSocketClient wsClient;
  wsClient.connect("ws://localhost:9104");
  return 0;
}
```

3. **Handle Messages**: Implement the `on_message` method to process incoming messages from the WebSocket server.

By following these steps, you can connect to a WebSocket server from your C++ application, send messages, and handle incoming messages.



```cpp
#include <boost/asio.hpp>
#include <websocketpp/config/asio_no_tls_client.hpp>
#include <websocketpp/client.hpp>
#include <iostream>

typedef websocketpp::client<websocketpp::config::asio_client> client;

class WebSocketClient {
public:
  WebSocketClient() : io_service_(), resolver_(io_service_), ws_client_() {
    ws_client_.init_asio(&io_service_);
    ws_client_.set_open_handler(bind(&WebSocketClient::on_open, this, ::_1));
    ws_client_.set_message_handler(bind(&WebSocketClient::on_message, this, ::_1, ::_2));
  }

  void connect(const std::string& uri) {
    websocketpp::lib::error_code ec;
    client::connection_ptr con = ws_client_.get_connection(uri, ec);
    if (ec) {
      std::cout << "Could not create connection because: " << ec.message() << std::endl;
      return;
    }
    ws_client_.connect(con);
    io_service_.run();
  }

private:
  void on_open(websocketpp::connection_hdl hdl) {
    std::cout << "Connected to WebSocket server" << std::endl;
    ws_client_.send(hdl, "Hello from C++", websocketpp::frame::opcode::text);
  }

  void on_message(websocketpp::connection_hdl hdl, client::message_ptr msg) {
    std::cout << "Received message: " << msg->get_payload() << std::endl;
    // Handle the message as needed
  }

  boost::asio::io_service io_service_;
  boost::asio::ip::tcp::resolver resolver_;
  client ws_client_;
};

int main() {
  WebSocketClient wsClient;
  wsClient.connect("ws://localhost:9104");
  return 0;
}
```

## Using WebSocket++

WebSocket++ is a C++ library that allows you to implement WebSocket client and server functionality. Here are the steps to use WebSocket++ in your project:

1. **Install WebSocket++**: You can install WebSocket++ using a package manager like vcpkg or by downloading it from the [official repository](https://github.com/zaphoyd/websocketpp).

2. **Include WebSocket++ Headers**: Include the necessary headers in your C++ code.

```cpp
#include <websocketpp/config/asio_no_tls_client.hpp>
#include <websocketpp/client.hpp>
#include <iostream>
```

3. **Create a WebSocket Client**: Define a WebSocket client class and initialize it.

```cpp
typedef websocketpp::client<websocketpp::config::asio_client> client;

class WebSocketClient {
public:
  WebSocketClient() {
    c.init_asio();
    c.set_open_handler(bind(&WebSocketClient::on_open, this, ::_1));
    c.set_message_handler(bind(&WebSocketClient::on_message, this, ::_1, ::_2));
  }

  void connect(const std::string& uri) {
    websocketpp::lib::error_code ec;
    client::connection_ptr con = c.get_connection(uri, ec);
    if (ec) {
      std::cout << "Could not create connection because: " << ec.message() << std::endl;
      return;
    }
    c.connect(con);
    c.run();
  }

private:
  void on_open(websocketpp::connection_hdl hdl) {
    std::cout << "Connected to WebSocket server" << std::endl;
    c.send(hdl, "Hello from C++", websocketpp::frame::opcode::text);
  }

  void on_message(websocketpp::connection_hdl hdl, client::message_ptr msg) {
    std::cout << "Received message: " << msg->get_payload() << std::endl;
    // Handle the message as needed
  }

  client c;
};
```

4. **Connect to WebSocket Server**: Use the `connect` method to connect to a WebSocket server.

```cpp
int main() {
  WebSocketClient wsClient;
  wsClient.connect("ws://localhost:9001");
  return 0;
}
```

By following these steps, you can create a WebSocket client using WebSocket++ to connect to a WebSocket server, send messages, and handle incoming messages.


$env:VCPKG_ROOT = "D:\1025\github\microsoft\vcpkg"
$env:PATH = "$env:VCPKG_ROOT;$env:PATH"


## Connecting to WebSocket Server using Boost.Asio

To connect to a WebSocket server using Boost.Asio, you can follow these steps:

1. **Include Boost.Asio and WebSocket++ Libraries**: Ensure you have Boost.Asio and WebSocket++ installed and included in your project.

```cpp
#include <boost/asio.hpp>
#include <websocketpp/config/asio_no_tls_client.hpp>
#include <websocketpp/client.hpp>
#include <iostream>
```

2. **Initialize WebSocket Client**: Create a WebSocket client and connect to the server.

```cpp
typedef websocketpp::client<websocketpp::config::asio_client> client;

class WebSocketClient {
public:
  WebSocketClient() : io_service_(), resolver_(io_service_), ws_client_() {
    ws_client_.init_asio(&io_service_);
    ws_client_.set_open_handler(bind(&WebSocketClient::on_open, this, ::_1));
    ws_client_.set_message_handler(bind(&WebSocketClient::on_message, this, ::_1, ::_2));
  }

  void connect(const std::string& uri) {
    websocketpp::lib::error_code ec;
    client::connection_ptr con = ws_client_.get_connection(uri, ec);
    if (ec) {
      std::cout << "Could not create connection because: " << ec.message() << std::endl;
      return;
    }
    ws_client_.connect(con);
    io_service_.run();
  }

private:
  void on_open(websocketpp::connection_hdl hdl) {
    std::cout << "Connected to WebSocket server" << std::endl;
    ws_client_.send(hdl, "Hello from C++", websocketpp::frame::opcode::text);
  }

  void on_message(websocketpp::connection_hdl hdl, client::message_ptr msg) {
    std::cout << "Received message: " << msg->get_payload() << std::endl;
    // Handle the message as needed
  }

  boost::asio::io_service io_service_;
  boost::asio::ip::tcp::resolver resolver_;
  client ws_client_;
};

int main() {
  WebSocketClient wsClient;
  wsClient.connect("ws://localhost:9104");
  return 0;
}
```

By following these steps, you can connect to a WebSocket server using Boost.Asio and WebSocket++ in your C++ application.


## Connecting to WebSocket Server using Boost.Asio Only

To connect to a WebSocket server using only Boost.Asio, you can follow these steps:

1. **Include Boost.Asio Library**: Ensure you have Boost.Asio installed and included in your project.


## Installing Boost.Asio

To install Boost.Asio, you can follow these steps:

1. **Download Boost**: Download the Boost library from the [official Boost website](https://www.boost.org/).

2. **Extract Boost**: Extract the downloaded Boost archive to a directory of your choice.

3. **Build Boost Libraries**: Open a terminal or command prompt and navigate to the Boost directory. Run the following commands to bootstrap and build the Boost libraries:

```sh
./bootstrap.sh
./b2
```

On Windows, you can use the following commands:

```sh
bootstrap.bat
b2
```

4. **Include Boost.Asio in Your Project**: Add the Boost include directory to your project's include paths. For example, if you are using g++, you can compile your code with the following command:

```sh
g++ -I /path/to/boost_1_76_0 your_code.cpp -o your_program
```

Replace `/path/to/boost_1_76_0` with the actual path to the Boost directory.

5. **Link Boost Libraries**: If your project requires linking against Boost libraries, add the appropriate library paths and link flags. For example, if you are using g++, you can link against the Boost system library with the following command:

```sh
g++ -I /path/to/boost_1_76_0 -L /path/to/boost_1_76_0/stage/lib your_code.cpp -o your_program -lboost_system
```

By following these steps, you can install and use Boost.Asio in your project.


```cpp
#include <boost/asio.hpp>
#include <boost/beast/websocket.hpp>
#include <iostream>
```

2. **Initialize WebSocket Client**: Create a WebSocket client and connect to the server.

```cpp
using tcp = boost::asio::ip::tcp;
namespace websocket = boost::beast::websocket;

class WebSocketClient {
public:
  WebSocketClient(boost::asio::io_context& ioc) : resolver_(ioc), ws_(ioc) {}

  void connect(const std::string& host, const std::string& port) {
    auto const results = resolver_.resolve(host, port);
    boost::asio::async_connect(ws_.next_layer(), results.begin(), results.end(),
      [this](boost::system::error_code ec, tcp::resolver::results_type::endpoint_type) {
        if (!ec) {
          ws_.async_handshake(host_, "/",
            [this](boost::system::error_code ec) {
              if (!ec) {
                send_message("Hello from C++");
              }
            });
        }
      });
  }

  void send_message(const std::string& message) {
    ws_.async_write(boost::asio::buffer(message),
      [this](boost::system::error_code ec, std::size_t bytes_transferred) {
        if (!ec) {
          receive_message();
        }
      });
  }

  void receive_message() {
    ws_.async_read(buffer_,
      [this](boost::system::error_code ec, std::size_t bytes_transferred) {
        if (!ec) {
          std::cout << "Received message: " << boost::beast::buffers_to_string(buffer_.data()) << std::endl;
          buffer_.consume(buffer_.size());
        }
      });
  }

private:
  tcp::resolver resolver_;
  websocket::stream<tcp::socket> ws_;
  boost::beast::flat_buffer buffer_;
  std::string host_;
};

int main() {
  boost::asio::io_context ioc;
  WebSocketClient wsClient(ioc);
  wsClient.connect("localhost", "9104");
  ioc.run();
  return 0;
}
```

By following these steps, you can connect to a WebSocket server using only Boost.Asio in your C++ application.


## Adding Custom String to WebSocket Connection

To add a custom string to the WebSocket connection and pass it to the server, you can include the custom string in the WebSocket handshake request. On the server side, you can extract this custom string and decide whether to send a message back to the related clients.

### Client Side

1. **Modify the WebSocket Handshake**: Add a custom header to the WebSocket handshake request.

```cpp
void connect(const std::string& host, const std::string& port, const std::string& custom_string) {
  host_ = host;
  custom_string_ = custom_string;
  auto const results = resolver_.resolve(host, port);
  boost::asio::async_connect(ws_.next_layer(), results.begin(), results.end(),
    [this](boost::system::error_code ec, tcp::resolver::results_type::endpoint_type) {
      if (!ec) {
        ws_.set_option(websocket::stream_base::decorator(
          [this](websocket::request_type& req) {
            req.set(http::field::user_agent, std::string(BOOST_BEAST_VERSION_STRING) + " websocket-client-async");
            req.set(http::field::custom, custom_string_);
          }));
        ws_.async_handshake(host_, "/",
          [this](boost::system::error_code ec) {
            if (!ec) {
              send_message("Hello from C++");
            }
          });
      }
    });
}
```

2. **Pass the Custom String**: Call the `connect` method with the custom string.

```cpp
int main() {
  boost::asio::io_context ioc;
  WebSocketClient wsClient(ioc);
  wsClient.connect("localhost", "9104", "custom_string_value");
  ioc.run();
  return 0;
}
```

### Server Side

1. **Extract Custom String**: Extract the custom string from the WebSocket handshake request.

```cpp
void on_open(websocketpp::connection_hdl hdl) {
  server::connection_ptr con = server_.get_con_from_hdl(hdl);
  std::string custom_string = con->get_request_header("custom");
  std::cout << "Custom string received: " << custom_string << std::endl;

  // Check the custom string and decide whether to send a message back
  if (custom_string == "custom_string_value") {
    server_.send(hdl, "Message to related client", websocketpp::frame::opcode::text);
  }
}
```

2. **Set Up WebSocket Server**: Initialize the WebSocket server and set the open handler.

```cpp
int main() {
  server_.init_asio();
  server_.set_open_handler(bind(&on_open, ::_1));
  server_.listen(9104);
  server_.start_accept();
  server_.run();
  return 0;
}
```

By following these steps, you can add a custom string to the WebSocket connection, pass it to the server, and handle it on the server side to decide whether to send a message back to the related clients.


## Using WebSocket++ with boost 1.66.0

## Additional library
D:\1026\boost_1_66_0-bin-msvc-all-32-64\boost_1_66_0\lib32-msvc-14.1

## Additional Include Directories

D:\1025\github\zaphoyd\websocketpp\
D:\1026\boost_1_66_0-bin-msvc-all-32-64\boost_1_66_0

WebSocketClient.cpp

#include <websocketpp/config/asio_no_tls_client.hpp>
#include <websocketpp/client.hpp>
#include <iostream>
//#include <nlohmann/json.hpp>

typedef websocketpp::client<websocketpp::config::asio_client> client;

using websocketpp::lib::placeholders::_1;
using websocketpp::lib::placeholders::_2;
using websocketpp::lib::bind;
//using json = nlohmann::json;

class WebSocketClient {
public:
    WebSocketClient() {
        c.init_asio();
        c.set_open_handler(bind(&WebSocketClient::on_open, this, ::_1));
        c.set_message_handler(bind(&WebSocketClient::on_message, this, ::_1, ::_2));
    }

    void connect(const std::string& uri) {
        websocketpp::lib::error_code ec;
        client::connection_ptr con = c.get_connection(uri, ec);
        if (ec) {
            std::cout << "Could not create connection because: " << ec.message() << std::endl;
            return;
        }
        c.connect(con);
        c.run();
    }

private:
    void on_open(websocketpp::connection_hdl hdl) {
        std::cout << "Connected to WebSocket server" << std::endl;
        c.send(hdl, "Hello from C++", websocketpp::frame::opcode::text);
    }

    void on_message(websocketpp::connection_hdl hdl, client::message_ptr msg) {

        //std::string msgCtx = msg->get_payload();

        std::cout << "Received message: " << msg->get_payload() << std::endl;
        // Handle the message as needed

        //  {"header":{"device":"T3-XX-ESP","panel":1,"clientId":"R102039488500","from":"firefox"},"message":{"action":0,"panelId":1}}

        /*
        // Parse the JSON message
        try {
            json j = json::parse(msg->get_payload());
            std::string device = j["header"]["device"];
            int panel = j["header"]["panel"];
            std::string clientId = j["header"]["clientId"];
            std::string from = j["header"]["from"];
            int action = j["message"]["action"];
            int panelId = j["message"]["panelId"];

            std::cout << "Device: " << device << std::endl;
            std::cout << "Panel: " << panel << std::endl;
            std::cout << "Client ID: " << clientId << std::endl;
            std::cout << "From: " << from << std::endl;
            std::cout << "Action: " << action << std::endl;
            std::cout << "Panel ID: " << panelId << std::endl;

            // Handle the message as needed

            // Send a response back to the server
            // c.send(hdl, "Message received", websocketpp::frame::opcode::text);

            // Close the connection when done
            // c.close(hdl, websocketpp::close::status::normal, "Done");
        }
        catch (json::parse_error& e) {
            std::cerr << "JSON parse error: " << e.what() << std::endl;
        }
        */

        // Send a response back to the server
		//std::cout << msgCtx << std::endl;

        if (msg->get_payload() == "ClientA test1") {

            std::cout << "Get matched message =>: start to send it back to clients " << msg->get_payload() << std::endl;

            c.send(hdl, "{\"Data1\":\"send back test1\",\"Data2\":\"send 00000000000000000\"}", websocketpp::frame::opcode::text);
        }

        // Close the connection when done
        //c.close(hdl, websocketpp::close::status::normal, "Done");
    }

    client c;
};

## --

## Connecting to WebSocket Server using Windows Sockets

To connect to a WebSocket server using Windows Sockets, you can follow these steps:

1. **Include Necessary Headers**: Include the necessary headers for Windows Sockets.

```cpp
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iostream>
#pragma comment(lib, "Ws2_32.lib")
```

2. **Initialize Winsock**: Initialize Winsock in your main function.

```cpp
int main() {
  WSADATA wsaData;
  int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
  if (result != 0) {
    std::cerr << "WSAStartup failed: " << result << std::endl;
    return 1;
  }

  // Your WebSocket connection code here

  WSACleanup();
  return 0;
}
```

3. **Create and Connect Socket**: Create a socket and connect to the WebSocket server.

```cpp
SOCKET ConnectSocket = INVALID_SOCKET;
struct addrinfo* result = NULL, * ptr = NULL, hints;

ZeroMemory(&hints, sizeof(hints));
hints.ai_family = AF_INET;
hints.ai_socktype = SOCK_STREAM;
hints.ai_protocol = IPPROTO_TCP;

result = getaddrinfo("localhost", "9104", &hints, &result);
if (result != 0) {
  std::cerr << "getaddrinfo failed: " << result << std::endl;
  WSACleanup();
  return 1;
}

for (ptr = result; ptr != NULL; ptr = ptr->ai_next) {
  ConnectSocket = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
  if (ConnectSocket == INVALID_SOCKET) {
    std::cerr << "Error at socket(): " << WSAGetLastError() << std::endl;
    WSACleanup();
    return 1;
  }

  result = connect(ConnectSocket, ptr->ai_addr, (int)ptr->ai_addrlen);
  if (result == SOCKET_ERROR) {
    closesocket(ConnectSocket);
    ConnectSocket = INVALID_SOCKET;
    continue;
  }
  break;
}

freeaddrinfo(result);

if (ConnectSocket == INVALID_SOCKET) {
  std::cerr << "Unable to connect to server!" << std::endl;
  WSACleanup();
  return 1;
}
```

4. **Send and Receive Data**: Send and receive data using the connected socket.

```cpp
const char* sendbuf = "Hello from C++";
result = send(ConnectSocket, sendbuf, (int)strlen(sendbuf), 0);
if (result == SOCKET_ERROR) {
  std::cerr << "send failed: " << WSAGetLastError() << std::endl;
  closesocket(ConnectSocket);
  WSACleanup();
  return 1;
}

char recvbuf[512];
result = recv(ConnectSocket, recvbuf, 512, 0);
if (result > 0) {
  std::cout << "Bytes received: " << result << std::endl;
  std::cout << "Message: " << std::string(recvbuf, result) << std::endl;
} else if (result == 0) {
  std::cout << "Connection closed" << std::endl;
} else {
  std::cerr << "recv failed: " << WSAGetLastError() << std::endl;
}

closesocket(ConnectSocket);
WSACleanup();
```

By following these steps, you can connect to a WebSocket server using Windows Sockets in your C++ application.

```cpp
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iostream>
#pragma comment(lib, "Ws2_32.lib")

class WebSocketClient {
public:
  WebSocketClient(const std::string& host, const std::string& port) : host_(host), port_(port), ConnectSocket(INVALID_SOCKET) {
    WSADATA wsaData;
    int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
    if (result != 0) {
      throw std::runtime_error("WSAStartup failed: " + std::to_string(result));
    }
  }

  ~WebSocketClient() {
    closesocket(ConnectSocket);
    WSACleanup();
  }

  void connect() {
    struct addrinfo* result = NULL, * ptr = NULL, hints;
    ZeroMemory(&hints, sizeof(hints));
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_protocol = IPPROTO_TCP;

    int res = getaddrinfo(host_.c_str(), port_.c_str(), &hints, &result);
    if (res != 0) {
      WSACleanup();
      throw std::runtime_error("getaddrinfo failed: " + std::to_string(res));
    }

    for (ptr = result; ptr != NULL; ptr = ptr->ai_next) {
      ConnectSocket = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
      if (ConnectSocket == INVALID_SOCKET) {
        WSACleanup();
        throw std::runtime_error("Error at socket(): " + std::to_string(WSAGetLastError()));
      }

      res = ::connect(ConnectSocket, ptr->ai_addr, (int)ptr->ai_addrlen);
      if (res == SOCKET_ERROR) {
        closesocket(ConnectSocket);
        ConnectSocket = INVALID_SOCKET;
        continue;
      }
      break;
    }

    freeaddrinfo(result);

    if (ConnectSocket == INVALID_SOCKET) {
      WSACleanup();
      throw std::runtime_error("Unable to connect to server!");
    }
  }

  void sendMessage(const std::string& message) {
    int res = send(ConnectSocket, message.c_str(), (int)message.length(), 0);
    if (res == SOCKET_ERROR) {
      closesocket(ConnectSocket);
      WSACleanup();
      throw std::runtime_error("send failed: " + std::to_string(WSAGetLastError()));
    }
  }

  std::string receiveMessage() {
    char recvbuf[512];
    int res = recv(ConnectSocket, recvbuf, 512, 0);
    if (res > 0) {
      return std::string(recvbuf, res);
    } else if (res == 0) {
      return "Connection closed";
    } else {
      throw std::runtime_error("recv failed: " + std::to_string(WSAGetLastError()));
    }
  }

private:
  std::string host_;
  std::string port_;
  SOCKET ConnectSocket;
};

int main() {
  try {
    WebSocketClient client("localhost", "9104");
    client.connect();
    client.sendMessage("Hello from C++");
    std::string response = client.receiveMessage();
    std::cout << "Received message: " << response << std::endl;
  } catch (const std::exception& ex) {
    std::cerr << ex.what() << std::endl;
  }
  return 0;
}
```

## Connecting to WebSocket Server using MFC SocketCore

To connect to a WebSocket server using MFC (Microsoft Foundation Class) SocketCore, you can follow these steps:

1. **Include Necessary Headers**: Include the necessary headers for MFC and sockets.

```cpp
#include <afxsock.h>
#include <iostream>
```

2. **Initialize MFC and Sockets**: Initialize MFC and sockets in your main function.

```cpp
int main() {
  if (!AfxWinInit(::GetModuleHandle(NULL), NULL, ::GetCommandLine(), 0)) {
    std::cerr << "MFC initialization failed" << std::endl;
    return 1;
  }

  if (!AfxSocketInit()) {
    std::cerr << "Socket initialization failed" << std::endl;
    return 1;
  }

  // Your WebSocket connection code here

  return 0;
}
```

3. **Create and Connect Socket**: Create a socket and connect to the WebSocket server.

```cpp
CSocket socket;
if (!socket.Create()) {
  std::cerr << "Socket creation failed" << std::endl;
  return 1;
}

if (!socket.Connect(_T("localhost"), 9104)) {
  std::cerr << "Socket connection failed" << std::endl;
  return 1;
}
```

4. **Send and Receive Data**: Send and receive data using the connected socket.

```cpp
const char* sendbuf = "Hello from MFC";
if (socket.Send(sendbuf, strlen(sendbuf)) == SOCKET_ERROR) {
  std::cerr << "Send failed" << std::endl;
  return 1;
}

char recvbuf[512];
int result = socket.Receive(recvbuf, sizeof(recvbuf));
if (result > 0) {
  std::cout << "Bytes received: " << result << std::endl;
  std::cout << "Message: " << std::string(recvbuf, result) << std::endl;
} else if (result == 0) {
  std::cout << "Connection closed" << std::endl;
} else {
  std::cerr << "Receive failed" << std::endl;
}

socket.Close();
```

By following these steps, you can connect to a WebSocket server using MFC SocketCore in your C++ application.


## Connecting to WebSocket Server using MFC CAsyncSocket

To connect to a WebSocket server using MFC `CAsyncSocket`, you can follow these steps:

1. **Include Necessary Headers**: Include the necessary headers for MFC and sockets.

```cpp
#include <afxsock.h>
#include <iostream>
```

2. **Create a WebSocket Client Class**: Define a WebSocket client class that inherits from `CAsyncSocket`.

```cpp
class WebSocketClient : public CAsyncSocket {
public:
  WebSocketClient() {}
  virtual ~WebSocketClient() {}

  void ConnectToServer(const CString& host, UINT port) {
    if (!Create()) {
      std::cerr << "Socket creation failed" << std::endl;
      return;
    }

    if (!Connect(host, port)) {
      std::cerr << "Socket connection failed" << std::endl;
      return;
    }
  }

  void SendMessage(const CString& message) {
    if (Send(message, message.GetLength()) == SOCKET_ERROR) {
      std::cerr << "Send failed" << std::endl;
    }
  }

protected:
  virtual void OnReceive(int nErrorCode) override {
    char buffer[512];
    int bytesReceived = Receive(buffer, sizeof(buffer) - 1);
    if (bytesReceived > 0) {
      buffer[bytesReceived] = '\0';
      std::cout << "Received message: " << buffer << std::endl;
    } else if (bytesReceived == 0) {
      std::cout << "Connection closed" << std::endl;
    } else {
      std::cerr << "Receive failed" << std::endl;
    }
    CAsyncSocket::OnReceive(nErrorCode);
  }

  virtual void OnClose(int nErrorCode) override {
    std::cout << "Connection closed by server" << std::endl;
    CAsyncSocket::OnClose(nErrorCode);
  }
};
```

3. **Initialize MFC and Sockets**: Initialize MFC and sockets in your main function.

```cpp
int main() {
  if (!AfxWinInit(::GetModuleHandle(NULL), NULL, ::GetCommandLine(), 0)) {
    std::cerr << "MFC initialization failed" << std::endl;
    return 1;
  }

  if (!AfxSocketInit()) {
    std::cerr << "Socket initialization failed" << std::endl;
    return 1;
  }

  WebSocketClient client;
  client.ConnectToServer(_T("localhost"), 9104);
  client.SendMessage(_T("Hello from MFC"));

  // Run a message loop to keep the application running
  MSG msg;
  while (GetMessage(&msg, NULL, 0, 0)) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }

  return 0;
}
```

By following these steps, you can connect to a WebSocket server using MFC `CAsyncSocket` in your C++ application.


## Handling WebSocket Errors in MFC CAsyncSocket

When using MFC `CAsyncSocket` to connect to a WebSocket server, you might encounter errors such as `Protocol(HttparseError(Version))`. This error typically indicates an issue with the WebSocket handshake process, where the server expects a specific HTTP version or format that is not being met by the client's request.

### Common Causes and Solutions

1. **Incorrect HTTP Version**: Ensure that the WebSocket handshake request uses HTTP/1.1, as WebSocket requires this version.

2. **Malformed Handshake Request**: Verify that the WebSocket handshake request includes all necessary headers, such as `Upgrade`, `Connection`, `Sec-WebSocket-Key`, and `Sec-WebSocket-Version`.

3. **Server Configuration**: Check the WebSocket server configuration to ensure it correctly handles WebSocket upgrade requests.

### Example Code

Here is an example of how to properly format a WebSocket handshake request using MFC `CAsyncSocket`:

```cpp
class WebSocketClient : public CAsyncSocket {
public:
  WebSocketClient() {}
  virtual ~WebSocketClient() {}

  void ConnectToServer(const CString& host, UINT port) {
    if (!Create()) {
      std::cerr << "Socket creation failed" << std::endl;
      return;
    }

    if (!Connect(host, port)) {
      std::cerr << "Socket connection failed" << std::endl;
      return;
    }
  }

  void SendHandshakeRequest(const CString& host) {
      CString handshakeRequest;
      handshakeRequest.Format(
        _T("GET / HTTP/1.1\r\n")
        _T("Host: %s\r\n")
        _T("Upgrade: websocket\r\n")
        _T("Connection: Upgrade\r\n")
        _T("Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==\r\n")
        _T("Sec-WebSocket-Version: 13\r\n")
         host, host
      );

      if (Send(handshakeRequest, handshakeRequest.GetLength()) == SOCKET_ERROR) {
        std::cerr << "Send handshake request failed" << std::endl;
      }
    }

    void SendMessage(const CString& message) {
    if (Send(message, message.GetLength()) == SOCKET_ERROR) {
      std::cerr << "Send failed" << std::endl;
    }
  }


protected:
  virtual void OnConnect(int nErrorCode) override {
    if (nErrorCode == 0) {
      SendHandshakeRequest(_T("localhost"));
    } else {
      std::cerr << "Connection failed with error code: " << nErrorCode << std::endl;
    }
    CAsyncSocket::OnConnect(nErrorCode);
  }

  virtual void OnReceive(int nErrorCode) override {
    char buffer[512];
    int bytesReceived = Receive(buffer, sizeof(buffer) - 1);
    if (bytesReceived > 0) {
      buffer[bytesReceived] = '\0';
      std::cout << "Received message: " << buffer << std::endl;
    } else if (bytesReceived == 0) {
      std::cout << "Connection closed" << std::endl;
    } else {
      std::cerr << "Receive failed" << std::endl;
    }
    CAsyncSocket::OnReceive(nErrorCode);
  }

  virtual void OnClose(int nErrorCode) override {
    std::cout << "Connection closed by server" << std::endl;
    CAsyncSocket::OnClose(nErrorCode);
  }
};

int main() {
  if (!AfxWinInit(::GetModuleHandle(NULL), NULL, ::GetCommandLine(), 0)) {
    std::cerr << "MFC initialization failed" << std::endl;
    return 1;
  }

  if (!AfxSocketInit()) {
    std::cerr << "Socket initialization failed" << std::endl;
    return 1;
  }

  WebSocketClient client;
  client.ConnectToServer(_T("localhost"), 9104);
  client.SendMessage(_T("Hello from MFC"));

  // Run a message loop to keep the application running
  MSG msg;
  while (GetMessage(&msg, NULL, 0, 0)) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }

  return 0;
}
```

By ensuring that the WebSocket handshake request is correctly formatted, you can avoid common errors such as `Protocol(HttparseError(Version))` and establish a successful WebSocket connection using MFC `CAsyncSocket`.

## Fix error

The invalidcode (4) error in the context of WebSockets typically indicates that there was an issue with the WebSocket frame being sent. This error can occur for several reasons, such as improperly formatted WebSocket frames, issues with the handshake, or problems in the WebSocket protocol implementation.

To help you debug and resolve this issue, here are a few steps to check and ensure your WebSocket client implemented using MFC CAsyncSocket is correctly handling the WebSocket protocol:

1. Verify Handshake

Ensure that the WebSocket handshake is completed successfully. The server should respond with an HTTP 101 Switching Protocols status code. Here is an example of a successful handshake response:

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: [base64-encoded response]

2. Frame Formatting

WebSocket messages must be sent in a specific format. Ensure that your frames are correctly formatted according to the WebSocket protocol. Each frame has a specific structure, including an opcode, payload length, masking key (for client-to-server frames), and payload data.

Here is a basic structure of a WebSocket frame:

// WebSocket frame structure
struct WebSocketFrame {
    unsigned char fin_and_opcode; // 1 byte
    unsigned char mask_and_payload_len; // 1 byte
    unsigned char masking_key[4]; // 4 bytes (if masked)
    unsigned char payload_data[]; // Variable length
};

Example Code

Below is an example of how to create and send a WebSocket text frame in MFC CAsyncSocket:

void CMySocket::SendWebSocketMessage(const CString& message) {
    // Convert the message to UTF-8
    std::string utf8Message = CT2A(message, CP_UTF8);

    // Create WebSocket frame
    std::vector<unsigned char> frame;

    // FIN and opcode (0x81 for text frame)
    frame.push_back(0x81);

    // Mask and payload length
    size_t msgLen = utf8Message.size();
    if (msgLen <= 125) {
        frame.push_back(0x80 | static_cast<unsigned char>(msgLen));
    } else if (msgLen <= 65535) {
        frame.push_back(0x80 | 126);
        frame.push_back((msgLen >> 8) & 0xFF);
        frame.push_back(msgLen & 0xFF);
    } else {
        frame.push_back(0x80 | 127);
        for (int i = 7; i >= 0; --i) {
            frame.push_back((msgLen >> (8 * i)) & 0xFF);
        }
    }

    // Masking key (randomly generated)
    unsigned char maskingKey[4];
    for (int i = 0; i < 4; ++i) {
        maskingKey[i] = static_cast<unsigned char>(rand() % 256);
    }
    frame.insert(frame.end(), maskingKey, maskingKey + 4);

    // Mask the payload data
    for (size_t i = 0; i < msgLen; ++i) {
        frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
    }

    // Send the frame
    Send(frame.data(), frame.size());
}

void CMySocket::OnSend(int nErrorCode) {
    // Check if there was an error
    if (nErrorCode != 0) {
        AfxMessageBox(_T("Error sending WebSocket message."));
        return;
    }

    // Code to handle successful send
    // ...

    CAsyncSocket::OnSend(nErrorCode);
}

3. Error Handling

Ensure that you handle errors appropriately in your OnSend and OnReceive methods. Proper error handling can help you identify and resolve issues during the WebSocket communication.
Conclusion

    Verify that the WebSocket handshake is completed successfully.
    Ensure that the WebSocket frames are correctly formatted according to the WebSocket protocol.
    Implement appropriate error handling in your OnSend and OnReceive methods.

By following these steps, you should be able to debug and resolve the invalidcode (4) error in your MFC CAsyncSocket WebSocket client.


## Protocol(InvalidOpcode(11)) Error

The `Protocol(InvalidOpcode(11))` error in the context of WebSockets indicates that the WebSocket frame being sent or received contains an invalid opcode. In the WebSocket protocol, opcodes are used to define the type of frame being transmitted. The valid opcodes are:

- `0x0`: Continuation frame
- `0x1`: Text frame
- `0x2`: Binary frame
- `0x8`: Connection close frame
- `0x9`: Ping frame
- `0xA`: Pong frame

An opcode of `11` (or `0xB`) is not defined in the WebSocket protocol, hence the `InvalidOpcode` error.

### Common Causes

1. **Malformed Frame**: The WebSocket frame might be incorrectly formatted, leading to an invalid opcode.
2. **Corrupted Data**: Data corruption during transmission could result in an invalid opcode.
3. **Implementation Bug**: There might be a bug in the WebSocket client or server implementation that generates an invalid opcode.

### Solutions

1. **Verify Frame Construction**: Ensure that the WebSocket frames are correctly constructed according to the WebSocket protocol specification.
2. **Check Data Integrity**: Implement checks to ensure data integrity during transmission.
3. **Debug Implementation**: Review and debug the WebSocket client and server code to identify and fix any issues related to frame construction.

### Example Code

Here is an example of how to correctly construct and send a WebSocket text frame in C++:

```cpp
void SendWebSocketMessage(const std::string& message) {
  std::vector<unsigned char> frame;

  // FIN and opcode (0x81 for text frame)
  frame.push_back(0x81);

  // Mask and payload length
  size_t msgLen = message.size();
  if (msgLen <= 125) {
    frame.push_back(0x80 | static_cast<unsigned char>(msgLen));
  } else if (msgLen <= 65535) {
    frame.push_back(0x80 | 126);
    frame.push_back((msgLen >> 8) & 0xFF);
    frame.push_back(msgLen & 0xFF);
  } else {
    frame.push_back(0x80 | 127);
    for (int i = 7; i >= 0; --i) {
      frame.push_back((msgLen >> (8 * i)) & 0xFF);
    }
  }

  // Masking key (randomly generated)
  unsigned char maskingKey[4];
  for (int i = 0; i < 4; ++i) {
    maskingKey[i] = static_cast<unsigned char>(rand() % 256);
  }
  frame.insert(frame.end(), maskingKey, maskingKey + 4);

  // Mask the payload data
  for (size_t i = 0; i < msgLen; ++i) {
    frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
  }

  // Send the frame
  Send(frame.data(), frame.size());
}
```

By ensuring that the WebSocket frames are correctly constructed and transmitted, you can avoid the `Protocol(InvalidOpcode(11))` error.


```cpp
void sendMessage(const std::wstring& message) {
  // Convert the wide string to a UTF-8 encoded string
  int bufferSize = WideCharToMultiByte(CP_UTF8, 0, message.c_str(), -1, nullptr, 0, nullptr, nullptr);
  std::vector<char> utf8Message(bufferSize);
  WideCharToMultiByte(CP_UTF8, 0, message.c_str(), -1, utf8Message.data(), bufferSize, nullptr, nullptr);

  // Create WebSocket frame
  std::vector<unsigned char> frame;

  // FIN and opcode (0x81 for text frame)
  frame.push_back(0x81);

  // Mask and payload length
  size_t msgLen = utf8Message.size() - 1; // Exclude null terminator
  if (msgLen <= 125) {
    frame.push_back(static_cast<unsigned char>(msgLen));
  } else if (msgLen <= 65535) {
    frame.push_back(126);
    frame.push_back((msgLen >> 8) & 0xFF);
    frame.push_back(msgLen & 0xFF);
  } else {
    frame.push_back(127);
    for (int i = 7; i >= 0; --i) {
      frame.push_back((msgLen >> (8 * i)) & 0xFF);
    }
  }

  // Masking key (randomly generated)
  unsigned char maskingKey[4];
  for (int i = 0; i < 4; ++i) {
    maskingKey[i] = static_cast<unsigned char>(rand() % 256);
  }
  frame.insert(frame.end(), maskingKey, maskingKey + 4);

  // Mask the payload data
  for (size_t i = 0; i < msgLen; ++i) {
    frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
  }

  // Send the frame
  Send(frame.data(), frame.size());
}
```

```cpp
void sendMessage(const CString& message) {
  // Convert the CString to a UTF-8 encoded string
  int bufferSize = WideCharToMultiByte(CP_UTF8, 0, message, -1, nullptr, 0, nullptr, nullptr);
  std::vector<char> utf8Message(bufferSize);
  WideCharToMultiByte(CP_UTF8, 0, message, -1, utf8Message.data(), bufferSize, nullptr, nullptr);

  // Create WebSocket frame
  std::vector<unsigned char> frame;

  // FIN and opcode (0x81 for text frame)
  frame.push_back(0x81);

  // Mask and payload length
  size_t msgLen = utf8Message.size() - 1; // Exclude null terminator
  if (msgLen <= 125) {
    frame.push_back(static_cast<unsigned char>(msgLen));
  } else if (msgLen <= 65535) {
    frame.push_back(126);
    frame.push_back((msgLen >> 8) & 0xFF);
    frame.push_back(msgLen & 0xFF);
  } else {
    frame.push_back(127);
    for (int i = 7; i >= 0; --i) {
      frame.push_back((msgLen >> (8 * i)) & 0xFF);
    }
  }

  // Masking key (randomly generated)
  unsigned char maskingKey[4];
  for (int i = 0; i < 4; ++i) {
    maskingKey[i] = static_cast<unsigned char>(rand() % 256);
  }
  frame.insert(frame.end(), maskingKey, maskingKey + 4);

  // Mask the payload data
  for (size_t i = 0; i < msgLen; ++i) {
    frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
  }

  // Send the frame
  send(ConnectSocket, reinterpret_cast<const char*>(frame.data()), frame.size(), 0);
}
```
When establishing a WebSocket connection, the initial handshake is performed using HTTP, not WebSocket frames. The handshake process involves the client sending an HTTP request to the server, which includes specific headers indicating the desire to establish a WebSocket connection. The server responds with an HTTP response that includes headers confirming the WebSocket upgrade.

Here is a brief overview of the WebSocket handshake process:

Client Request: The client sends an HTTP request to the server with headers indicating the upgrade to WebSocket. For example:

Server Response: The server responds with an HTTP response indicating that the connection has been upgraded to WebSocket. For example:

After the handshake is complete, the connection is established, and both the client and server can start sending WebSocket frames to each other.

The handshake does not require creating WebSocket frames because it uses standard HTTP headers to negotiate the connection upgrade. Once the connection is established, subsequent communication uses WebSocket frames, which need to be constructed as shown in your example code.

If you have any further questions or need more details, feel free to ask!



### Creating a WebSocket Frame using `WideCharToMultiByte`

To create a WebSocket frame based on `WideCharToMultiByte`, you need to follow these steps:

1. **Convert the Wide String to a UTF-8 Encoded String**: Use `WideCharToMultiByte` to convert the wide string to a UTF-8 encoded string.
2. **Construct the WebSocket Frame**: Create the WebSocket frame according to the WebSocket protocol specification.
3. **Send the Frame**: Send the constructed frame over the WebSocket connection.

Here is an example of how to achieve this in C++:

```cpp
void sendMessage(const std::wstring& message) {
  // Convert the wide string to a UTF-8 encoded string
  int bufferSize = WideCharToMultiByte(CP_UTF8, 0, message.c_str(), -1, nullptr, 0, nullptr, nullptr);
  std::vector<char> utf8Message(bufferSize);
  WideCharToMultiByte(CP_UTF8, 0, message.c_str(), -1, utf8Message.data(), bufferSize, nullptr, nullptr);

  // Create WebSocket frame
  std::vector<unsigned char> frame;

  // FIN and opcode (0x81 for text frame)
  frame.push_back(0x81);

  // Mask and payload length
  size_t msgLen = utf8Message.size() - 1; // Exclude null terminator
  if (msgLen <= 125) {
    frame.push_back(static_cast<unsigned char>(msgLen));
  } else if (msgLen <= 65535) {
    frame.push_back(126);
    frame.push_back((msgLen >> 8) & 0xFF);
    frame.push_back(msgLen & 0xFF);
  } else {
    frame.push_back(127);
    for (int i = 7; i >= 0; --i) {
      frame.push_back((msgLen >> (8 * i)) & 0xFF);
    }
  }

  // Masking key (randomly generated)
  unsigned char maskingKey[4];
  for (int i = 0; i < 4; ++i) {
    maskingKey[i] = static_cast<unsigned char>(rand() % 256);
  }
  frame.insert(frame.end(), maskingKey, maskingKey + 4);

  // Mask the payload data
  for (size_t i = 0; i < msgLen; ++i) {
    frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
  }

  // Send the frame
  send(ConnectSocket, reinterpret_cast<const char*>(frame.data()), frame.size(), 0);
}
```

This code snippet demonstrates how to convert a wide string to a UTF-8 encoded string using `WideCharToMultiByte`, construct a WebSocket frame, and send it over a WebSocket connection.

## Sending Message to WebSocket Server using WinSock2

To send a message to a WebSocket server using WinSock2, you can follow these steps:

1. **Include Necessary Headers**: Include the necessary headers for Windows Sockets.

```cpp
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iostream>
#pragma comment(lib, "Ws2_32.lib")
```

2. **Initialize Winsock**: Initialize Winsock in your main function.

```cpp
int main() {
  WSADATA wsaData;
  int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
  if (result != 0) {
    std::cerr << "WSAStartup failed: " << result << std::endl;
    return 1;
  }

  // Your WebSocket connection code here

  WSACleanup();
  return 0;
}
```

3. **Create and Connect Socket**: Create a socket and connect to the WebSocket server.

```cpp
SOCKET ConnectSocket = INVALID_SOCKET;
struct addrinfo* result = NULL, * ptr = NULL, hints;

ZeroMemory(&hints, sizeof(hints));
hints.ai_family = AF_INET;
hints.ai_socktype = SOCK_STREAM;
hints.ai_protocol = IPPROTO_TCP;

result = getaddrinfo("localhost", "9104", &hints, &result);
if (result != 0) {
  std::cerr << "getaddrinfo failed: " << result << std::endl;
  WSACleanup();
  return 1;
}

for (ptr = result; ptr != NULL; ptr = ptr->ai_next) {
  ConnectSocket = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
  if (ConnectSocket == INVALID_SOCKET) {
    std::cerr << "Error at socket(): " << WSAGetLastError() << std::endl;
    WSACleanup();
    return 1;
  }

  result = connect(ConnectSocket, ptr->ai_addr, (int)ptr->ai_addrlen);
  if (result == SOCKET_ERROR) {
    closesocket(ConnectSocket);
    ConnectSocket = INVALID_SOCKET;
    continue;
  }
  break;
}

freeaddrinfo(result);

if (ConnectSocket == INVALID_SOCKET) {
  std::cerr << "Unable to connect to server!" << std::endl;
  WSACleanup();
  return 1;
}
```

4. **Send and Receive Data**: Send and receive data using the connected socket.

```cpp
void sendMessage(SOCKET ConnectSocket, const std::string& message) {
  // Create WebSocket frame
  std::vector<unsigned char> frame;

  // FIN and opcode (0x81 for text frame)
  frame.push_back(0x81);

  // Mask and payload length
  size_t msgLen = message.size();
  if (msgLen <= 125) {
    frame.push_back(0x80 | static_cast<unsigned char>(msgLen));
  } else if (msgLen <= 65535) {
    frame.push_back(0x80 | 126);
    frame.push_back((msgLen >> 8) & 0xFF);
    frame.push_back(msgLen & 0xFF);
  } else {
    frame.push_back(0x80 | 127);
    for (int i = 7; i >= 0; --i) {
      frame.push_back((msgLen >> (8 * i)) & 0xFF);
    }
  }

  // Masking key (randomly generated)
  unsigned char maskingKey[4];
  for (int i = 0; i < 4; ++i) {
    maskingKey[i] = static_cast<unsigned char>(rand() % 256);
  }
  frame.insert(frame.end(), maskingKey, maskingKey + 4);

  // Mask the payload data
  for (size_t i = 0; i < msgLen; ++i) {
    frame.push_back(message[i] ^ maskingKey[i % 4]);
  }

  // Send the frame
  send(ConnectSocket, reinterpret_cast<const char*>(frame.data()), frame.size(), 0);
}

int main() {
  WSADATA wsaData;
  int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
  if (result != 0) {
    std::cerr << "WSAStartup failed: " << result << std::endl;
    return 1;
  }

  SOCKET ConnectSocket = INVALID_SOCKET;
  struct addrinfo* result = NULL, * ptr = NULL, hints;

  ZeroMemory(&hints, sizeof(hints));
  hints.ai_family = AF_INET;
  hints.ai_socktype = SOCK_STREAM;
  hints.ai_protocol = IPPROTO_TCP;

  result = getaddrinfo("localhost", "9104", &hints, &result);
  if (result != 0) {
    std::cerr << "getaddrinfo failed: " << result << std::endl;
    WSACleanup();
    return 1;
  }

  for (ptr = result; ptr != NULL; ptr = ptr->ai_next) {
    ConnectSocket = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
    if (ConnectSocket == INVALID_SOCKET) {
      std::cerr << "Error at socket(): " << WSAGetLastError() << std::endl;
      WSACleanup();
      return 1;
    }

    result = connect(ConnectSocket, ptr->ai_addr, (int)ptr->ai_addrlen);
    if (result == SOCKET_ERROR) {
      closesocket(ConnectSocket);
      ConnectSocket = INVALID_SOCKET;
      continue;
    }
    break;
  }

  freeaddrinfo(result);

  if (ConnectSocket == INVALID_SOCKET) {
    std::cerr << "Unable to connect to server!" << std::endl;
    WSACleanup();
    return 1;
  }

  sendMessage(ConnectSocket, "Hello from C++");

  closesocket(ConnectSocket);
  WSACleanup();
  return 0;
}
```

By following these steps, you can send a message to a WebSocket server using WinSock2 in your C++ application.



```cpp
void sendMessage(SOCKET ConnectSocket, const CString& message) {
  // Convert the CString to a UTF-8 encoded string
  int bufferSize = WideCharToMultiByte(CP_UTF8, 0, message, -1, nullptr, 0, nullptr, nullptr);
  std::vector<char> utf8Message(bufferSize);
  WideCharToMultiByte(CP_UTF8, 0, message, -1, utf8Message.data(), bufferSize, nullptr, nullptr);

  // Create WebSocket frame
  std::vector<unsigned char> frame;

  // FIN and opcode (0x81 for text frame)
  frame.push_back(0x81);

  // Mask and payload length
  size_t msgLen = utf8Message.size() - 1; // Exclude null terminator
  if (msgLen <= 125) {
    frame.push_back(0x80 | static_cast<unsigned char>(msgLen));
  } else if (msgLen <= 65535) {
    frame.push_back(0x80 | 126);
    frame.push_back((msgLen >> 8) & 0xFF);
    frame.push_back(msgLen & 0xFF);
  } else {
    frame.push_back(0x80 | 127);
    for (int i = 7; i >= 0; --i) {
      frame.push_back((msgLen >> (8 * i)) & 0xFF);
    }
  }

  // Masking key (randomly generated)
  unsigned char maskingKey[4];
  for (int i = 0; i < 4; ++i) {
    maskingKey[i] = static_cast<unsigned char>(rand() % 256);
  }
  frame.insert(frame.end(), maskingKey, maskingKey + 4);

  // Mask the payload data
  for (size_t i = 0; i < msgLen; ++i) {
    frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
  }

  // Send the frame
  send(ConnectSocket, reinterpret_cast<const char*>(frame.data()), frame.size(), 0);
}

int main() {
  WSADATA wsaData;
  int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
  if (result != 0) {
    std::cerr << "WSAStartup failed: " << result << std::endl;
    return 1;
  }

  SOCKET ConnectSocket = INVALID_SOCKET;
  struct addrinfo* result = NULL, * ptr = NULL, hints;

  ZeroMemory(&hints, sizeof(hints));
  hints.ai_family = AF_INET;
  hints.ai_socktype = SOCK_STREAM;
  hints.ai_protocol = IPPROTO_TCP;

  result = getaddrinfo("localhost", "9104", &hints, &result);
  if (result != 0) {
    std::cerr << "getaddrinfo failed: " << result << std::endl;
    WSACleanup();
    return 1;
  }

  for (ptr = result; ptr != NULL; ptr = ptr->ai_next) {
    ConnectSocket = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
    if (ConnectSocket == INVALID_SOCKET) {
      std::cerr << "Error at socket(): " << WSAGetLastError() << std::endl;
      WSACleanup();
      return 1;
    }

    result = connect(ConnectSocket, ptr->ai_addr, (int)ptr->ai_addrlen);
    if (result == SOCKET_ERROR) {
      closesocket(ConnectSocket);
      ConnectSocket = INVALID_SOCKET;
      continue;
    }
    break;
  }

  freeaddrinfo(result);

  if (ConnectSocket == INVALID_SOCKET) {
    std::cerr << "Unable to connect to server!" << std::endl;
    WSACleanup();
    return 1;
  }

  sendMessage(ConnectSocket, _T("Hello from C++"));

  closesocket(ConnectSocket);
  WSACleanup();
  return 0;
}
```


WebSocket

## Keeping WebSocket Connection Alive and Reconnecting

To keep the WebSocket connection always online and check whether the server is down, you can implement a mechanism to periodically send ping messages and attempt reconnection if the connection is lost. Here is an example of how to achieve this in C++:

1. **Include Necessary Headers**: Include the necessary headers for WebSocket and networking.

```cpp
#include <websocketpp/config/asio_no_tls_client.hpp>
#include <websocketpp/client.hpp>
#include <iostream>
#include <thread>
#include <chrono>
```

2. **Define WebSocket Client Class**: Define a WebSocket client class that handles connection, ping, and reconnection.

```cpp
typedef websocketpp::client<websocketpp::config::asio_client> client;

class WebSocketClient {
public:
  WebSocketClient() : retries(0), max_retries(5) {
    c.init_asio();
    c.set_open_handler(bind(&WebSocketClient::on_open, this, ::_1));
    c.set_close_handler(bind(&WebSocketClient::on_close, this, ::_1));
    c.set_fail_handler(bind(&WebSocketClient::on_fail, this, ::_1));
    c.set_message_handler(bind(&WebSocketClient::on_message, this, ::_1, ::_2));
  }

  void connect(const std::string& uri) {
    websocketpp::lib::error_code ec;
    client::connection_ptr con = c.get_connection(uri, ec);
    if (ec) {
      std::cout << "Could not create connection because: " << ec.message() << std::endl;
      return;
    }
    c.connect(con);
    c.run();
  }

  void send_ping() {
    while (true) {
      std::this_thread::sleep_for(std::chrono::seconds(10));
      if (connected) {
        c.ping(hdl, "");
      }
    }
  }

private:
  void on_open(websocketpp::connection_hdl hdl) {
    std::cout << "Connected to WebSocket server" << std::endl;
    this->hdl = hdl;
    connected = true;
    retries = 0;
  }

  void on_close(websocketpp::connection_hdl hdl) {
    std::cout << "Connection closed" << std::endl;
    connected = false;
    attempt_reconnect();
  }

  void on_fail(websocketpp::connection_hdl hdl) {
    std::cout << "Connection failed" << std::endl;
    connected = false;
    attempt_reconnect();
  }

  void on_message(websocketpp::connection_hdl hdl, client::message_ptr msg) {
    std::cout << "Received message: " << msg->get_payload() << std::endl;
  }

  void attempt_reconnect() {
    if (retries < max_retries) {
      std::cout << "Attempting to reconnect (" << retries + 1 << "/" << max_retries << ")" << std::endl;
      std::this_thread::sleep_for(std::chrono::seconds(5));
      connect(uri);
      retries++;
    } else {
      std::cout << "Max retries reached. Giving up." << std::endl;
    }
  }

  client c;
  websocketpp::connection_hdl hdl;
  bool connected = false;
  int retries;
  const int max_retries;
  std::string uri;
};
```

3. **Main Function**: Initialize the WebSocket client and start the ping thread.

```cpp
int main() {
  WebSocketClient wsClient;
  std::thread ping_thread(&WebSocketClient::send_ping, &wsClient);
  wsClient.connect("ws://localhost:9104");
  ping_thread.join();
  return 0;
}
```

By following these steps, you can keep the WebSocket connection alive and attempt to reconnect if the connection is lost, up to a maximum of 5 times.


## Keeping WebSocket Connection Alive in TypeScript

To keep the WebSocket connection always online and check whether the server is down, you can implement a mechanism to periodically send ping messages and attempt reconnection if the connection is lost. Here is an example of how to achieve this in TypeScript:

1. **Define WebSocket Client Class**: Define a WebSocket client class that handles connection, ping, and reconnection.

```typescript
class WebSocketClient {
  private ws: WebSocket | null = null;
  private retries: number = 0;
  private maxRetries: number = 5;
  private uri: string;
  private pingInterval: number = 10000; // 10 seconds

  constructor(uri: string) {
    this.uri = uri;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.uri);

    this.ws.onopen = () => {
      console.log("Connected to WebSocket server");
      this.retries = 0;
      this.startPing();
    };

    this.ws.onclose = () => {
      console.log("Connection closed");
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      console.log("Connection error");
      this.attemptReconnect();
    };

    this.ws.onmessage = (event) => {
      console.log("Received message:", event.data);
    };
  }

  private startPing() {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send("ping");
      }
    }, this.pingInterval);
  }

  private attemptReconnect() {
    if (this.retries < this.maxRetries) {
      console.log(`Attempting to reconnect (${this.retries + 1}/${this.maxRetries})`);
      setTimeout(() => {
        this.retries++;
        this.connect();
      }, 5000); // 5 seconds
    } else {
      console.log("Max retries reached. Giving up.");
    }
  }
}
```

2. **Initialize WebSocket Client**: Create an instance of the WebSocket client and connect to the server.

```typescript
const wsClient = new WebSocketClient("ws://localhost:9104");
```

By following these steps, you can keep the WebSocket connection alive and attempt to reconnect if the connection is lost, up to a maximum of 5 times.


## Exporting and Importing Instances in JavaScript

When you export an instance of a class in JavaScript and import it in multiple files, each import will reference the same instance. This is because JavaScript modules are singletons, meaning that the module is evaluated once and the same instance is shared across all imports.

### Example

1. **Define the Class and Export the Instance**:

```javascript
// A.js
class A {
  constructor() {
    this.deviceList = [];
  }
}

const x = new A();
export default x;
```

2. **Import the Instance in Multiple Files**:

```javascript
// file1.js
import x from './A.js';
x.deviceList.push('Device1');
console.log(x.deviceList); // Output: ['Device1']

// file2.js
import x from './A.js';
console.log(x.deviceList); // Output: ['Device1']
x.deviceList.push('Device2');
console.log(x.deviceList); // Output: ['Device1', 'Device2']

// file3.js
import x from './A.js';
console.log(x.deviceList); // Output: ['Device1', 'Device2']
```

In this example, `x` is the same instance of `A` across `file1.js`, `file2.js`, and `file3.js`. Any changes made to `x.deviceList` in one file will be reflected in the other files.

### Conclusion

When you export an instance of a class and import it in multiple files, all imports will reference the same instance. This allows you to share state across different parts of your application.



## Using Shared Instances in Vue Components

When you use a shared instance in a Vue component and bind its properties to the UI, you need to ensure that Vue reactivity is maintained. Simply assigning the shared instance's property to a local variable will not make it reactive. Instead, you should directly use the shared instance's property in your component's reactive state.

Here's an example of how to achieve this:

1. **Define the Shared Instance**:

```javascript
// A.js
class A {
  constructor() {
    this.deviceList = [];
  }
}

const x = new A();
export default x;
```

2. **Use the Shared Instance in a Vue Component**:

```vue
<!-- MyComponent.vue -->
<template>
  <div>
    <ul>
      <li v-for="device in deviceList" :key="device">{{ device }}</li>
    </ul>
  </div>
</template>

<script>
import { reactive, toRefs } from 'vue';
import x from './A.js';

export default {
  setup() {
    const state = reactive({
      deviceList: x.deviceList
    });

    return {
      ...toRefs(state)
    };
  }
};
</script>
```

3. **Update the Shared Instance in Another File**:

```javascript
// updateDeviceList.js
import x from './A.js';

function addDevice(device) {
  x.deviceList.push(device);
}

export { addDevice };
```

4. **Trigger Updates**:

```javascript
// main.js or any other file
import { addDevice } from './updateDeviceList.js';

addDevice('Device1');
addDevice('Device2');
```

By using `reactive` and `toRefs` in the Vue component, you ensure that changes to `x.deviceList` are reactive and will update the UI accordingly.

```vue
<!-- MyComponent.vue -->
<template>
  <div>
    <ul>
      <li v-for="device in deviceList" :key="device">{{ device }}</li>
    </ul>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import x from './A.js';

export default {
  setup() {
    const deviceList = ref(x.deviceList);

    watch(
      () => x.deviceList,
      (newList) => {
        deviceList.value = newList;
      },
      { deep: true }
    );

    return {
      deviceList
    };
  }
};
</script>
```

==WebSocket error: Capacity(MessageTooLong { size: 295201692257404, max_size: 16777216 })



```cpp
void sendMessage(SOCKET ConnectSocket, const CString& message) {
  // Convert the CString to a UTF-8 encoded string
  int bufferSize = WideCharToMultiByte(CP_UTF8, 0, message, -1, nullptr, 0, nullptr, nullptr);
  std::vector<char> utf8Message(bufferSize);
  WideCharToMultiByte(CP_UTF8, 0, message, -1, utf8Message.data(), bufferSize, nullptr, nullptr);

  // Create WebSocket frame
  std::vector<unsigned char> frame;

  // FIN and opcode (0x81 for text frame)
  frame.push_back(0x81);

  // Mask and payload length
  size_t msgLen = utf8Message.size() - 1; // Exclude null terminator
  if (msgLen <= 125) {
    frame.push_back(static_cast<unsigned char>(msgLen));
  } else if (msgLen <= 65535) {
    frame.push_back(126);
    frame.push_back((msgLen >> 8) & 0xFF);
    frame.push_back(msgLen & 0xFF);
  } else {
    frame.push_back(127);
    for (int i = 7; i >= 0; --i) {
      frame.push_back((msgLen >> (8 * i)) & 0xFF);
    }
  }

  // Masking key (randomly generated)
  unsigned char maskingKey[4];
  for (int i = 0; i < 4; ++i) {
    maskingKey[i] = static_cast<unsigned char>(rand() % 256);
  }
  frame.insert(frame.end(), maskingKey, maskingKey + 4);

  // Mask the payload data
  for (size_t i = 0; i < msgLen; ++i) {
    frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
  }

  // Split the frame into smaller chunks if necessary
  size_t maxChunkSize = 1024; // Define a maximum chunk size
  for (size_t i = 0; i < frame.size(); i += maxChunkSize) {
    size_t chunkSize = std::min(maxChunkSize, frame.size() - i);
    send(ConnectSocket, reinterpret_cast<const char*>(frame.data() + i), chunkSize, 0);
  }
}
```

## Debugging Rust in Visual Studio Code

To debug Rust code in Visual Studio Code (VS Code), follow these steps:

1. **Install Rust and Cargo**: Ensure you have Rust and Cargo installed. You can install them using [rustup](https://rustup.rs/).

2. **Install VS Code**: Download and install Visual Studio Code from the [official website](https://code.visualstudio.com/).

3. **Install Rust Extension**: Open VS Code and install the Rust extension by running the following command in the Command Palette (Ctrl+Shift+P):

  ```
  ext install rust-lang.rust
  ```

4. **Install CodeLLDB Extension**: Install the CodeLLDB extension for debugging support by running the following command in the Command Palette:

  ```
  ext install vadimcn.vscode-lldb
  ```

5. **Configure Launch Settings**: Create a `launch.json` file in the `.vscode` directory of your project to configure the debugger. Here is an example configuration:

  ```json
  {
    "version": "0.2.0",
    "configurations": [
     {
      "name": "Rust API Debug",
      "type": "lldb",
      "request": "launch",
      "program": "${workspaceFolder}/target/debug/your_executable",
      "args": [],
      "cwd": "${workspaceFolder}",
      "stopOnEntry": false,
      "preLaunchTask": "cargo build",
      "sourceLanguages": ["rust"]
     }
    ]
  }
  ```

  Replace `your_executable` with the name of your compiled Rust binary.

6. **Add Prelaunch Task**: Create a `tasks.json` file in the `.vscode` directory to define the prelaunch task for building your project:

  ```json
  {
    "version": "2.0.0",
    "tasks": [
     {
      "label": "cargo build",
      "type": "shell",
      "command": "cargo",
      "args": ["build"],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": ["$rustc"]
     }
    ]
  }
  ```

7. **Start Debugging**: Set breakpoints in your Rust code by clicking in the gutter next to the line numbers. Then, start debugging by selecting the debug configuration from the Run and Debug view (Ctrl+Shift+D) and clicking the green play button.

By following these steps, you can debug Rust code in Visual Studio Code effectively.


{"header":{"clientId":"-","from":"T3"},"message":{"action":13,"clientId":"11111111-1111-1111-1111-111111111111"}}

Capacity(MessageTooLong { size: 295201692257404, max_size: 16777216 })

To calculate the maximum length of a `CString` that can be sent given the `max_size` of 16777216 bytes, you need to consider the overhead of the WebSocket frame. The WebSocket frame includes a header and possibly a masking key.

1. **WebSocket Frame Overhead**:
  - **FIN and opcode**: 1 byte
  - **Mask and payload length**: 1 byte (for payloads <= 125 bytes), 3 bytes (for payloads <= 65535 bytes), or 9 bytes (for larger payloads)
  - **Masking key**: 4 bytes (if masked)

For large payloads (greater than 65535 bytes), the overhead is 1 byte (FIN and opcode) + 9 bytes (mask and payload length) + 4 bytes (masking key) = 14 bytes.

2. **Calculate Maximum Payload Size**:
  - `max_size` = 16777216 bytes
  - Overhead = 14 bytes
  - Maximum payload size = `max_size` - Overhead = 16777216 - 14 = 16777202 bytes

3. **CString Length**:
  - The maximum length of a `CString` that can be sent is 16777202 bytes.

Therefore, the maximum length of a `CString` that can be sent given the `max_size` of 16777216 bytes is 16777202 bytes.


To transfer the maximum length of a string in kilobytes (KB), you can convert the bytes to kilobytes by dividing the byte size by 1024. Here is the implementation:

```cpp
#include <iostream>

int main() {
  // Maximum payload size in bytes
  size_t maxPayloadSizeBytes = 16777202;

  // Convert bytes to kilobytes
  size_t maxPayloadSizeKB = maxPayloadSizeBytes / 1024;

  std::cout << "Maximum payload size: " << maxPayloadSizeKB << " KB" << std::endl;

  return 0;
}
```

This code calculates the maximum payload size in kilobytes and prints it to the console.


## Capacity(MessageTooLong { size: 295201692257404, max_size: 16777216 })

{"header":{"clientId":"-","from":"T3"},"message":{"action":13,"clientId":"11111111-1111-1111-1111-111111111111"}}

Capacity(MessageTooLong { size: 295201692257404, max_size: 16777216 })

To transfer 295201692257404 bytes to kilobytes (KB), you can divide the byte size by 1024. Here is the calculation:

```markdown
295201692257404 bytes / 1024 = 288292617823.84 KB
```

So, 295201692257404 bytes is approximately 288292617823.84 KB.

To transfer a JSON string that is 64KB large to bytes, you can convert kilobytes to bytes by multiplying the size in kilobytes by 1024. Here is the calculation:

```markdown
64 KB * 1024 = 65536 bytes
```

So, a JSON string that is 64KB large is equivalent to 65536 bytes.

// Log the frame size
let frame_size = msg.into_data().len();
println!("Frame size: {} bytes", frame_size);

No, you do not always need to mask the payload data when sending a JSON string message to a Tokio WebSocket server. Masking is required for client-to-server messages as per the WebSocket protocol, but server-to-client messages do not need to be masked. If you are implementing a client, you should mask the payload data. If you are implementing a server, you do not need to mask the payload data.

```cpp
// Mask the payload data (only if you are implementing a client)
for (size_t i = 0; i < msgLen; ++i) {
  frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
}

If you do not mask the data when sending a message from a client to a Tokio WebSocket server, it may result in a protocol violation, and the server could reject the message or close the connection. The WebSocket protocol requires that client-to-server messages be masked to prevent certain types of attacks. Therefore, it is important to mask the payload data when implementing a WebSocket client.

```cpp
// Mask the payload data (only if you are implementing a client)
for (size_t i = 0; i < msgLen; ++i) {
  frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
}

// Send the frame
send(ConnectSocket, reinterpret_cast<const char*>(frame.data()), frame.size(), 0);
```
```
To check the encoding of a JSON string text on the server side using Tokio, you can inspect the received data and ensure it is properly decoded. Here is an example of how to handle and check the encoding of incoming WebSocket messages in a Tokio server:

1. **Set Up Tokio WebSocket Server**: Create a Tokio WebSocket server that listens for incoming connections.

```rust
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use futures_util::{StreamExt, SinkExt};

#[tokio::main]
async fn main() {
  let addr = "127.0.0.1:9001";
  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");

  while let Ok((stream, _)) = listener.accept().await {
    tokio::spawn(handle_connection(stream));
  }
}

async fn handle_connection(stream: tokio::net::TcpStream) {
  let ws_stream = accept_async(stream).await.expect("Error during the websocket handshake");

  let (mut write, mut read) = ws_stream.split();

  while let Some(message) = read.next().await {
    match message {
      Ok(msg) => {
        if msg.is_text() {
          let text = msg.into_text().expect("Failed to convert message to text");
          println!("Received text message: {}", text);

          // Check encoding
          if text.is_ascii() {
            println!("The message is ASCII encoded.");
          } else {
            println!("The message is not ASCII encoded.");
          }

          // Process JSON
          match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(json) => println!("Received valid JSON: {:?}", json),
            Err(e) => println!("Failed to parse JSON: {}", e),
          }
        }
      }
      Err(e) => println!("Error receiving message: {}", e),
    }
  }
}
```

2. **Check Encoding**: In the `handle_connection` function, after receiving a text message, you can check if the message is ASCII encoded using the `is_ascii` method. You can also attempt to parse the message as JSON using `serde_json`.

By following these steps, you can check the encoding of incoming JSON string text messages on the server side using Tokio.

The default text encoding for a Tokio server is UTF-8. When handling text data, such as JSON strings, it is common to assume that the data is encoded in UTF-8. This is because UTF-8 is the standard encoding for JSON and is widely used for text data in web applications.

When receiving text messages in a Tokio WebSocket server, you can safely assume that the text is UTF-8 encoded unless specified otherwise. Here is an example of how to handle and decode UTF-8 text messages in a Tokio WebSocket server:

```rust
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use futures_util::{StreamExt, SinkExt};

#[tokio::main]
async fn main() {
  let addr = "127.0.0.1:9001";
  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");

  while let Ok((stream, _)) = listener.accept().await {
    tokio::spawn(handle_connection(stream));
  }
}

async fn handle_connection(stream: tokio::net::TcpStream) {
  let ws_stream = accept_async(stream).await.expect("Error during the websocket handshake");

  let (mut write, mut read) = ws_stream.split();

  while let Some(message) = read.next().await {
    match message {
      Ok(msg) => {
        if msg.is_text() {
          let text = msg.into_text().expect("Failed to convert message to text");
          println!("Received text message: {}", text);

          // Process JSON
          match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(json) => println!("Received valid JSON: {:?}", json),
            Err(e) => println!("Failed to parse JSON: {}", e),
          }
        }
      }
      Err(e) => println!("Error receiving message: {}", e),
    }
  }
}
```

In this example, the server assumes that incoming text messages are UTF-8 encoded and processes them accordingly.


The maximum frame size for `tokio::net::TcpStream` is not explicitly defined by Tokio itself. Instead, it depends on the underlying TCP/IP protocol and the operating system's configuration. TCP does not impose a strict limit on the size of the data that can be sent in a single write operation, but it is generally recommended to keep the frame size within reasonable limits to avoid issues with network congestion and buffer sizes.

For WebSocket communication over `tokio::net::TcpStream`, the maximum frame size is typically determined by the WebSocket protocol and the WebSocket library you are using. For example, the `tokio-tungstenite` library has a default maximum frame size of 16 MiB (16777216 bytes).

If you need to handle larger frames, you can configure the WebSocket library to increase the maximum frame size. Here is an example of how to configure the maximum frame size using `tokio-tungstenite`:

```rust
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::protocol::WebSocketConfig;
use tokio_tungstenite::accept_async_with_config;
use futures_util::{StreamExt, SinkExt};

#[tokio::main]
async fn main() {
  let addr = "127.0.0.1:9001";
  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");

  let config = WebSocketConfig {
    max_frame_size: Some(32 * 1024 * 1024), // 32 MiB
    ..Default::default()
  };

  while let Ok((stream, _)) = listener.accept().await {
    tokio::spawn(handle_connection(stream, config.clone()));
  }
}

async fn handle_connection(stream: tokio::net::TcpStream, config: WebSocketConfig) {
  let ws_stream = accept_async_with_config(stream, Some(config))
    .await
    .expect("Error during the websocket handshake");

  let (mut write, mut read) = ws_stream.split();

  while let Some(message) = read.next().await {
    match message {
      Ok(msg) => {
        if msg.is_text() {
          let text = msg.into_text().expect("Failed to convert message to text");
          println!("Received text message: {}", text);

          // Process JSON
          match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(json) => println!("Received valid JSON: {:?}", json),
            Err(e) => println!("Failed to parse JSON: {}", e),
          }
        }
      }
      Err(e) => println!("Error receiving message: {}", e),
    }
  }
}
```

In this example, the maximum frame size is set to 32 MiB. Adjust the `max_frame_size` value as needed for your application.

To change the maximum frame size for a Tokio WebSocket server using the `tokio-tungstenite` library, you can configure the `WebSocketConfig` with the desired `max_frame_size` and pass it to the `accept_async_with_config` function. Here is an example:

```rust
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::protocol::WebSocketConfig;
use tokio_tungstenite::accept_async_with_config;
use futures_util::{StreamExt, SinkExt};

#[tokio::main]
async fn main() {
  let addr = "127.0.0.1:9001";
  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");

  let config = WebSocketConfig {
    max_frame_size: Some(32 * 1024 * 1024), // 32 MiB
    ..Default::default()
  };

  while let Ok((stream, _)) = listener.accept().await {
    tokio::spawn(handle_connection(stream, config.clone()));
  }
}

async fn handle_connection(stream: tokio::net::TcpStream, config: WebSocketConfig) {
  let ws_stream = accept_async_with_config(stream, Some(config))
    .await
    .expect("Error during the websocket handshake");

  let (mut write, mut read) = ws_stream.split();

  while let Some(message) = read.next().await {
    match message {
      Ok(msg) => {
        if msg.is_text() {
          let text = msg.into_text().expect("Failed to convert message to text");
          println!("Received text message: {}", text);

          // Process JSON
          match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(json) => println!("Received valid JSON: {:?}", json),
            Err(e) => println!("Failed to parse JSON: {}", e),
          }
        }
      }
      Err(e) => println!("Error receiving message: {}", e),
    }
  }
}
```

In this example, the maximum frame size is set to 32 MiB. Adjust the `max_frame_size` value as needed for your application.


## In 32-bit application, should use uint64_t to store the messge length value for some large json text string.

## std::vector<unsigned char> CreateWebSocketFrame(const CString& message) {

    // Convert the CString to a UTF-8 encoded string
    int bufferSize = WideCharToMultiByte(CP_UTF8, 0, message, -1, nullptr, 0, nullptr, nullptr);
    if (bufferSize <= 0) {
        throw std::runtime_error("Failed to convert CString to UTF-8");
    }

    std::vector<char> utf8Message(bufferSize);
    WideCharToMultiByte(CP_UTF8, 0, message, -1, utf8Message.data(), bufferSize, nullptr, nullptr);

    // Create WebSocket frame
    std::vector<unsigned char> frame;

    // FIN and opcode (0x81 for text frame)
    frame.push_back(0x81);

    // Mask and payload length, should use uint64_t instead of size_t for 32-bit application
    uint64_t msgLen = utf8Message.size() - 1; // Exclude null terminator
    if (msgLen <= 125) {
        frame.push_back(0x80 | static_cast<unsigned char>(msgLen));
    }
    else if (msgLen <= 65535) {
        frame.push_back(0x80 | 126);
        frame.push_back((msgLen >> 8) & 0xFF);
        frame.push_back(msgLen & 0xFF);
    }
    else {
        frame.push_back(0x80 | 127);
        for (int i = 7; i >= 0; --i) {
            frame.push_back((msgLen >> (8 * i)) & 0xFF);
        }
    }

    // Masking key (securely generated)
    std::random_device rd;
    std::uniform_int_distribution<unsigned int> dist(0, 255);
    unsigned char maskingKey[4];
    for (int i = 0; i < 4; ++i) {
        maskingKey[i] = dist(rd);
    }
    frame.insert(frame.end(), maskingKey, maskingKey + 4);

    // Mask the payload data
    for (size_t i = 0; i < msgLen; ++i) {
        frame.push_back(utf8Message[i] ^ maskingKey[i % 4]);
    }

    return frame;
}

## Wrap error message T3000

void WrapErrorMessage(const Json::Value& tempjson, CString& outmsg, const CString& temp_message, Json::StreamWriterBuilder& builder) {
    if (!temp_message.IsEmpty()) {
        Json::Value tempjsonCopy = tempjson;
        tempjsonCopy["error"] = temp_message.GetString();
        const std::string output = Json::writeString(builder, tempjsonCopy);
        outmsg = CString(output.c_str());
    } else {
        const std::string output = Json::writeString(builder, tempjson);
        outmsg = CString(output.c_str());
    }
}

To check whether a `CString` is null or empty in C++, you can use the `IsEmpty` method provided by the `CString` class. Here is an example:

```cpp
if (error_message.IsEmpty()) {
  // The CString is null or empty
  std::cout << "The error message is null or empty." << std::endl;
} else {
  // The CString is not empty
  std::cout << "The error message is: " << (LPCTSTR)error_message << std::endl;
}
```

The `IsEmpty` method returns `TRUE` if the `CString` is empty or contains only whitespace characters, and `FALSE` otherwise.


## Add new function for processing the data received from websocket server at T3 application

std::string ProcessWebSocketFrame(const std::vector<uint8_t>& recvbuf) {
    std::string message;

    if (recvbuf.size() < 2) {
        return message; // Invalid frame
    }

    bool fin = recvbuf[0] & 0x80;
    uint8_t opcode = recvbuf[0] & 0x0F;
    bool mask = recvbuf[1] & 0x80;
    uint64_t payloadLength = recvbuf[1] & 0x7F;

    size_t pos = 2;

    if (payloadLength == 126) {
        if (recvbuf.size() < 4) {
            return message; // Invalid frame
        }
        payloadLength = (recvbuf[2] << 8) | recvbuf[3];
        pos += 2;
    } else if (payloadLength == 127) {
        if (recvbuf.size() < 10) {
            return message; // Invalid frame
        }
        payloadLength = 0;
        for (int i = 0; i < 8; ++i) {
            payloadLength = (payloadLength << 8) | recvbuf[2 + i];
        }
        pos += 8;
    }

    if (mask) {
        if (recvbuf.size() < pos + 4) {
            return message; // Invalid frame
        }
        std::vector<uint8_t> maskingKey(recvbuf.begin() + pos, recvbuf.begin() + pos + 4);
        pos += 4;

        if (recvbuf.size() < pos + payloadLength) {
            return message; // Invalid frame
        }

        message.resize(payloadLength);
        for (size_t i = 0; i < payloadLength; ++i) {
            message[i] = recvbuf[pos + i] ^ maskingKey[i % 4];
        }
    } else {
        if (recvbuf.size() < pos + payloadLength) {
            return message; // Invalid frame
        }
        message.insert(message.end(), recvbuf.begin() + pos, recvbuf.begin() + pos + payloadLength);
    }

    return message;
}
