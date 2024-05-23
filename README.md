# T3000 Webview

This repository stores the webview components used in the T3000 software. There are two primary components:

 - *T3000 HVAC Drawer*: This web-based tool allows users to create and visualize HVAC system drawings for buildings.
 - *Modbus Register Tool*: This tool enables users to add, edit, and manage Modbus register lists for Modbus devices. Additionally, it includes a Rust-based API for managing Modbus register data interaction with the SQLite database. The tool can also synchronize the local SQLite database data with the [T3 User Library API](https://github.com/temcocontrols/T3000_ApplicationLibrary_API), if the user enables data syncing in their settings.

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
npm run dev
```

### Unit test

We utilize Vitest for unit testing, with all test files located within the test directory.

Tests are automatically executed by GitHub Actions upon the creation of a pull request or when new changes are pushed to the repository.

To manually run the unit tests, execute one of the following commands:

```bash
yarn test:unit
# or
npm run test:unit
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
npm run build
```

### Customize Quasar configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

## How to run this tool in C++ webview2

1- Build the package as you see above

2- get the result files from `dist/spa/` and serve them using a http lib like [cpp-httplib](https://github.com/yhirose/cpp-httplib), as you see in this C++ example:

https://github.com/yhirose/cpp-httplib/blob/master/example/simplesvr.cc

3- Use the url you got from the previous step in webview2 like this example from Microsoft:

https://github.com/MicrosoftEdge/WebView2Samples/tree/main/GettingStartedGuides/Win32_GettingStarted

Just replace "https://bing.com" with your url from step #2 and run the example. that's it, you have the HVAC drawer running in the webview.

> And don't forget to delete the following three lines from the example to allow non-ssl http urls:

    if (source.substr(0, 5) != L"https") {
        args->put_Cancel(true);
    }

## T3000 Cpp integration

We've seamlessly integrated our Quasar application with the T3000 software's C++ code, allowing us to utilize data obtained from T3000 devices for rendering animated drawings. Furthermore, the T3000 software can now exert control over the drawing's status; for instance, if a fan is in the "On" state, it can trigger motion in the corresponding fan object.

To facilitate communication, the JavaScript side communicates with the C++ webview through the `window.chrome.webview.postMessage` function. Here's an example of how to send a message from the C++ side back to our JavaScript component:

    String input_data = L"{\"SetInput\":{\"id\":\"IN1\",\"value\":\"On\"}}");
    webview->PostWebMessageAsJson(input_data);

To learn more about webview communication between JS and C++, check this [Interop of native-side and web-side code](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/communicate-btwn-web-native)
