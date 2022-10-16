# T3000 HVAC Drawer

T3000 HVAC drawer is a web based tool to make and visualize HVAC drawings.

This will be used inside T3000 to provide a way to make HVAC drawings for buildings.

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

https://github.com/yhirose/cpp-httplib/blob/master/example/server.cc

3- Use the url you got from the previous step in webview2 like this example from Microsoft:

https://github.com/MicrosoftEdge/WebView2Samples/tree/main/GettingStartedGuides/Win32_GettingStarted

Just replace "https://bing.com" with your url from step #2 and run the example. that's it, you have the HVAC drawer running in the webview.
> Don't forget to delete these three lines from the example to allow non-ssl http urls:
> if (source.substr(0, 5) != L"https") {
>		args->put_Cancel(true);
> }

