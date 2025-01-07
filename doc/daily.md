
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


# Using WebSocket++ with boost 1.66.0

# Additional library
D:\1026\boost_1_66_0-bin-msvc-all-32-64\boost_1_66_0\lib32-msvc-14.1

# Additional Include Directories
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

