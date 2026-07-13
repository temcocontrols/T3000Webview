/* eslint-env node */

/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

const { configure } = require("quasar/wrappers");

module.exports = configure(function (/* ctx */) {
  return {
    eslint: {
      // fix: true,
      // include = [],
      exclude: ['src/lib/t3-eez-studio/**', 'node_modules/**'],
      // rawOptions = {},
      warnings: false,
      errors: false,
    },

    // https://v2.quasar.dev/quasar-cli/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli/boot-files
    boot: [
      '../t3-vue/boot/antd', // Load Ant Design Vue
      'react.tsx' // Initialize React app conditionally based on route
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: ["app.css"],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v5',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      "roboto-font", // optional, you are not bound to it
      "material-icons", // optional, you are not bound to it
      "fontawesome-v6",
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#build
    build: {
      target: {
        browser: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
        node: "node16",
      },

      vueRouterMode: "hash", // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      analyze: process.env.ANALYZE === 'true',
      env: {
        VERSION: process.env.npm_package_version,
        BUILD_TIME: Date.now(),
        BUILD_HASH: require('crypto').createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 8),
        ...require("dotenv").config().parsed,
      },
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      distDir: 'dist',

      // extendViteConf (viteConf) {},
      extendViteConf(viteConf) {
        // Add path aliases for hybrid Vue+React architecture
        viteConf.resolve = viteConf.resolve || {};
        viteConf.resolve.alias = viteConf.resolve.alias || {};
        viteConf.resolve.alias['@'] = require('path').resolve(__dirname, 'src');
        viteConf.resolve.alias['@t3-vue'] = require('path').resolve(__dirname, 'src/t3-vue');
        viteConf.resolve.alias['@t3-react'] = require('path').resolve(__dirname, 'src/t3-react');
        viteConf.resolve.alias['@common'] = require('path').resolve(__dirname, 'src/lib');
        viteConf.resolve.alias['@shared'] = require('path').resolve(__dirname, 'src/t3-react/shared');
        // Multi-platform architecture aliases
        viteConf.resolve.alias['@t3-shared'] = require('path').resolve(__dirname, 'src/shared');
        viteConf.resolve.alias['@t3-mobile'] = require('path').resolve(__dirname, 'src/t3-mobile');

        // Replace Electron-only util-electron.ts with browser-safe util-web.ts
        // MUST come before the broad 'eez-studio-shared' alias (prefix match wins)
        const utilWeb = require('path').resolve(__dirname, 'src/lib/t3-eez-studio/eez-studio-shared/util-web.ts');
        viteConf.resolve.alias['eez-studio-shared/util-electron'] = utilWeb;
        viteConf.resolve.alias['eez-studio-shared/util-electron.ts'] = utilWeb;

        // EEZ Studio source aliases (copied into src/lib/t3-eez-studio)
        const eezPath = (p) => require('path').resolve(__dirname, 'src/lib/t3-eez-studio', p);
        viteConf.resolve.alias['eez-studio-shared'] = eezPath('eez-studio-shared');
        viteConf.resolve.alias['eez-studio-ui'] = eezPath('eez-studio-ui');
        viteConf.resolve.alias['eez-studio-types'] = eezPath('eez-studio-types');
        viteConf.resolve.alias['home'] = eezPath('home');
        viteConf.resolve.alias['instrument'] = eezPath('instrument');
        viteConf.resolve.alias['project-editor'] = eezPath('project-editor');
        viteConf.resolve.alias['notebook'] = eezPath('notebook');
        viteConf.resolve.alias['shortcuts'] = eezPath('shortcuts');
        viteConf.resolve.alias['db-services'] = eezPath('db-services');
        viteConf.resolve.alias['pdf-services'] = eezPath('pdf-services');
        viteConf.resolve.alias['main/settings'] = eezPath('main/settings.ts');

        // Redirect Electron/Node.js to browser stubs
        const stub = (name) => require('path').resolve(__dirname, 'src/t3-eez-studio/stubs', name);
        viteConf.resolve.alias['electron'] = stub('electron-kitchen.ts');
        viteConf.resolve.alias['@electron/remote'] = stub('electron-kitchen.ts');
        viteConf.resolve.alias['chokidar'] = stub('chokidar.ts');
        viteConf.resolve.alias['path'] = stub('path.ts');
        viteConf.resolve.alias['bootstrap/dist/css/bootstrap.min.css'] = require('path').resolve(__dirname, 'node_modules/bootstrap/dist/css/bootstrap.min.css');
        viteConf.resolve.alias['bootstrap'] = stub('bootstrap.ts');
        viteConf.resolve.alias['mobx'] = require('path').resolve(__dirname, 'node_modules/mobx');
        viteConf.resolve.alias['mobx-react'] = require('path').resolve(__dirname, 'node_modules/mobx-react');
        viteConf.resolve.alias['fs'] = stub('fs');
        viteConf.resolve.alias['path'] = stub('path.ts');
        viteConf.resolve.alias['stream'] = stub('node-stream.ts');
        viteConf.resolve.alias['os'] = stub('os.ts');
        viteConf.resolve.alias['events'] = stub('events.ts');
        viteConf.resolve.alias['child_process'] = stub('child-process.ts');
        viteConf.resolve.alias['url'] = stub('url.ts');
        viteConf.resolve.alias['crypto'] = stub('crypto.ts');
        // pngjs (used by lv_img_conv_v9) requires Node's util module
        viteConf.resolve.alias['util'] = require('path').resolve(__dirname, 'node_modules/util/util.js');
        viteConf.resolve.alias['mousetrap'] = stub('mousetrap.ts');
        viteConf.resolve.alias['sha256'] = stub('sha256.ts');
        viteConf.resolve.alias['better-sqlite3'] = stub('better-sqlite3.ts');
        viteConf.resolve.alias['simple-git'] = stub('simple-git.ts');
        viteConf.resolve.alias['archiver'] = stub('archiver.ts');
        viteConf.resolve.alias['serialport'] = stub('serialport.ts');

        // Buffer polyfill for browser (DataBuffer, lz4 compression)
        viteConf.resolve.alias['buffer'] = require('path').resolve(__dirname, 'node_modules/buffer/index.js');

        // Enable React JSX support
        viteConf.esbuild = viteConf.esbuild || {};
        viteConf.esbuild.jsx = 'automatic';
        viteConf.esbuild.jsxImportSource = 'react';
        viteConf.esbuild.tsconfigRaw = JSON.stringify({
          compilerOptions: {
            useDefineForClassFields: true,
            target: "es2020",
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
          }
        });

        // Optimize deps — noDiscovery prevents scanning the massive EEZ tree
        viteConf.optimizeDeps = viteConf.optimizeDeps || {};
        viteConf.optimizeDeps.noDiscovery = true;
        // Include deps needed at runtime by lv_img_conv_v9 sandbox.
        // pngjs is loaded via <script> tag — NOT via Vite import()
        viteConf.optimizeDeps.include = (viteConf.optimizeDeps.include || []).concat([
          'util', 'stream', 'events', 'buffer', 'lz4js'
        ]);
        // Native Node.js modules that can't be bundled for browser
        viteConf.optimizeDeps.exclude = (viteConf.optimizeDeps.exclude || []).concat([
          'quantize', 'pngjs'
        ]);

        viteConf.resolve = viteConf.resolve || {};
        viteConf.resolve.dedupe = viteConf.resolve.dedupe || [];
        viteConf.resolve.dedupe.push('react', 'react-dom', 'vue', 'mobx', 'mobx-react');

        // Build config
        viteConf.build = viteConf.build || {};
        viteConf.build.rollupOptions = viteConf.build.rollupOptions || {};
        viteConf.build.rollupOptions.output = viteConf.build.rollupOptions.output || {};
        if (process.env.ANALYZE === 'true') {
          const { visualizer } = require('rollup-plugin-visualizer');
          viteConf.build.rollupOptions.plugins = viteConf.build.rollupOptions.plugins || [];
          viteConf.build.rollupOptions.plugins.push(
            visualizer({
              filename: 'dist/bundle-analyzer.html',
              open: true,
              gzipSize: true,
              brotliSize: true,
              template: 'treemap'
            })
          );
        }
        viteConf.build.chunkSizeWarningLimit = 1000;
        viteConf.build.cssCodeSplit = true;
        viteConf.build.minify = 'terser';
        viteConf.build.terserOptions = {
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            drop_debugger: process.env.NODE_ENV === 'production'
          }
        };

        viteConf.css = viteConf.css || {};
        viteConf.css.preprocessorOptions = viteConf.css.preprocessorOptions || {};
        viteConf.css.preprocessorOptions.less = {
          javascriptEnabled: true,
          paths: [
            require('path').resolve(__dirname, 'src/lib/t3-eez-studio/eez-studio-ui/_stylesheets'),
          ],
        };

        // Add MIME type for .wasm files (required by WebAssembly.instantiateStreaming)
        viteConf.server = viteConf.server || {};
        viteConf.server.headers = viteConf.server.headers || {};
        if (typeof viteConf.server.headers === "function") {
          const orig = viteConf.server.headers;
          viteConf.server.headers = () => ({ ...orig(), "*.wasm": { "Content-Type": "application/wasm" } });
        } else {
          viteConf.server.headers["*.wasm"] = { "Content-Type": "application/wasm" };
        }

        viteConf.server.proxy = {
          ...(viteConf.server.proxy || {}),
          // Local backend proxy — all external downloads now go through Rust backend
          "/api/eez-studio": {
            target: "http://localhost:9103",
            changeOrigin: true,
            secure: false,
            rewrite: path => path.replace(/^\/api\/eez-studio/, "/api/eez-studio")
          },
          // T3000 device API proxy
          "/api/t3_device": {
            target: "http://localhost:9103",
            changeOrigin: true,
            secure: false,
          },
          // WASM runtimes & LVGL served from Rust resource tree (not public/)
          "/eez-studio-wasm": {
            target: "http://localhost:9103",
            changeOrigin: true,
            secure: false,
          },
          // Font assets served from Rust resource tree
          "/eez-studio-assets": {
            target: "http://localhost:9103",
            changeOrigin: true,
            secure: false,
          },

        };
      },

      viteVuePluginOptions: {
        template: {
          compilerOptions: {
            // isCustomElement: (tag) => tag.startsWith("wokwi-"),
          },
        },
      },

      // Add cache busting for WebView deployment
      chainWebpack(chain) {
        // Add hash to output filenames for cache busting
        chain.output
          .filename('js/[name].[contenthash:8].js')
          .chunkFilename('js/[name].[contenthash:8].js');

        chain.plugin('extract-css')
          .tap(args => {
            args[0].filename = 'css/[name].[contenthash:8].css';
            args[0].chunkFilename = 'css/[name].[contenthash:8].css';
            return args;
          });
      },

      // vitePlugins: [
      //   [ 'package-name', { ..options.. } ]
      // ]
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#devServer
    devServer: {
      // https: true
      port: 3003,
      open: true, // opens browser window automatically 
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: ["Dialog", "Notify", "Meta", "Cookies", "Loading"],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#property-sourcefiles
    sourceFiles: {
      rootComponent: 'src/t3-vue/App.vue',
      router: 'src/t3-vue/router/index',
      // store: 'src/t3-vue/store/index', // Not used
      // registerServiceWorker: 'src-pwa/register-service-worker',
      // serviceWorker: 'src-pwa/custom-service-worker',
      // pwaManifestFile: 'src-pwa/manifest.json',
      // electronMain: 'src-electron/electron-main',
      // electronPreload: 'src-electron/electron-preload'
    },

    // https://v2.quasar.dev/quasar-cli/developing-ssr/configuring-ssr
    ssr: {
      // ssrPwaHtmlFilename: 'offline.html', // do NOT use index.html as name!
      // will mess up SSR

      // extendSSRWebserverConf (esbuildConf) {},
      // extendPackageJson (json) {},

      pwa: false,

      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      prodPort: 3000, // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        "render", // keep this as last one
      ],
    },

    // https://v2.quasar.dev/quasar-cli/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: "generateSW", // or 'injectManifest'
      injectPwaMetaTags: true,
      swFilename: "sw.js",
      manifestFilename: "manifest.json",
      useCredentialsForManifestTag: false,
      // extendGenerateSWOptions (cfg) {}
      // extendInjectManifestOptions (cfg) {},
      // extendManifestJson (json) {}
      // extendPWACustomSWConf (esbuildConf) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (esbuildConf)
      // extendElectronPreloadConf (esbuildConf)

      inspectPort: 5858,

      bundler: "packager", // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: "t3-webview",
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      contentScripts: ["my-content-script"],

      // extendBexScriptsConf (esbuildConf) {}
      // extendBexManifestJson (json) {}
    },
  };
});
