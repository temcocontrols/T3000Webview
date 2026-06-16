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
        browser: ["es2019", "edge88", "firefox78", "chrome87", "safari13.1"],
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

        // EEZ Studio fork aliases (junction at src/lib/t3-eez-studio)
        const eezPath = (p) => require('path').resolve(__dirname, 'src/lib/t3-eez-studio', p);
        viteConf.resolve.alias['eez-studio-shared'] = eezPath('eez-studio-shared');
        viteConf.resolve.alias['eez-studio-ui'] = eezPath('eez-studio-ui');
        viteConf.resolve.alias['eez-studio-types'] = eezPath('eez-studio-types');
        viteConf.resolve.alias['eez-studio-web-entry'] = eezPath('eez-studio-web-entry.tsx');
        viteConf.resolve.alias['home'] = eezPath('home');
        viteConf.resolve.alias['instrument'] = eezPath('instrument');
        viteConf.resolve.alias['project-editor'] = eezPath('project-editor');
        viteConf.resolve.alias['notebook'] = eezPath('notebook');
        viteConf.resolve.alias['shortcuts'] = eezPath('shortcuts');
        viteConf.resolve.alias['basic-measurements'] = eezPath('basic-measurements');
        viteConf.resolve.alias['db-services'] = eezPath('db-services');
        viteConf.resolve.alias['pdf-services'] = eezPath('pdf-services');

        // Redirect Electron/Node.js to browser stubs
        const stub = (name) => require('path').resolve(__dirname, 'src/stubs', name);
        viteConf.resolve.alias['electron'] = stub('electron-kitchen.ts');
        viteConf.resolve.alias['@electron/remote'] = stub('electron-kitchen.ts');
        // EEZ Studio compat: bootstrap ESM has no default export
        // Must add CSS alias BEFORE the general 'bootstrap' alias so it takes precedence
        viteConf.resolve.alias['bootstrap/dist/css/bootstrap.min.css'] = require('path').resolve(__dirname, 'node_modules/bootstrap/dist/css/bootstrap.min.css');
        viteConf.resolve.alias['bootstrap'] = stub('bootstrap.ts');
        viteConf.resolve.alias['better-sqlite3'] = stub('better-sqlite3.ts');
        viteConf.resolve.alias['sqlite3'] = stub('better-sqlite3.ts');
        // Force mobx/mobx-react to our version (not fork's node_modules)
        viteConf.resolve.alias['mobx'] = require('path').resolve(__dirname, 'node_modules/mobx');
        viteConf.resolve.alias['mobx-react'] = require('path').resolve(__dirname, 'node_modules/mobx-react');
        viteConf.resolve.alias['fs'] = stub('fs');
        viteConf.resolve.alias['path'] = stub('path.ts');
        viteConf.resolve.alias['stream'] = stub('stream.ts');
        viteConf.resolve.alias['os'] = stub('os.ts');
        viteConf.resolve.alias['events'] = stub('events.ts');
        viteConf.resolve.alias['child_process'] = stub('child-process.ts');
        viteConf.resolve.alias['node:events'] = stub('node-events.ts');
        viteConf.resolve.alias['node:child_process'] = stub('node-child-process.ts');
        viteConf.resolve.alias['url'] = stub('url.ts');
        viteConf.resolve.alias['util'] = stub('util.ts');

        // Enable React JSX support for Grafana components
        viteConf.esbuild = viteConf.esbuild || {};
        viteConf.esbuild.jsx = 'automatic';
        viteConf.esbuild.jsxImportSource = 'react';
        // Match tsconfig: class fields on instance (required by MobX makeObservable)
        viteConf.esbuild.tsconfigRaw = JSON.stringify({
            compilerOptions: { useDefineForClassFields: true, target: "es2020" }
        });

        // Optimize deps for React components
        viteConf.optimizeDeps = viteConf.optimizeDeps || {};
        viteConf.optimizeDeps.include = viteConf.optimizeDeps.include || [];
        // Exclude Node.js built-ins from pre-bundling — aliased to stubs
        viteConf.optimizeDeps.exclude = viteConf.optimizeDeps.exclude || [];
        viteConf.optimizeDeps.exclude.push(
            'fs', 'path', 'stream', 'os', 'events', 'child_process',
            'node:events', 'node:child_process', 'url', 'util',
            'electron', '@electron/remote',
            'better-sqlite3', 'sqlite3'
        );
        // Include React and ReactDOM to ensure proper pre-bundling
        viteConf.optimizeDeps.include.push('react', 'react-dom', 'react-dom/client');
        // Include Vue to ensure proper initialization order with Ant Design
        viteConf.optimizeDeps.include.push('vue', '@vue/runtime-dom');
        // Include Uppy dependencies to ensure proper pre-bundling
        viteConf.optimizeDeps.include.push('@uppy/core', '@uppy/vue', '@uppy/dashboard', '@uppy/image-editor', '@uppy/xhr-upload');

        // Ensure React and Vue are properly resolved to prevent initialization issues
        viteConf.resolve = viteConf.resolve || {};
        viteConf.resolve.dedupe = viteConf.resolve.dedupe || [];
        viteConf.resolve.dedupe.push('react', 'react-dom', 'vue');
        // Force single copy of mobx (prevent fork's node_modules from shadowing)
        viteConf.resolve.dedupe.push('mobx', 'mobx-react');

        // Allow Vite to serve files from external eez-studio path
        // Must include project root since setting fs.allow replaces Vite defaults
        viteConf.server = viteConf.server || {};
        viteConf.server.fs = viteConf.server.fs || {};
        viteConf.server.fs.allow = [
            require('path').resolve(__dirname),
            require('path').resolve(__dirname, '../eez-studio'),
        ];

        // Disable manual chunking completely - let Vite handle everything automatically
        // This eliminates all chunking-related dependency issues like:
        // - "undefined is not a function" in drawing-components
        // - "Object.setPrototypeOf: expected an object or null, got undefined" in moveable
        // - Vue/React initialization issues
        // - Circular dependency problems
        viteConf.build = viteConf.build || {};
        viteConf.build.rollupOptions = viteConf.build.rollupOptions || {};
        viteConf.build.rollupOptions.output = viteConf.build.rollupOptions.output || {};

        // Remove manual chunking entirely - let Vite's automatic chunking handle everything
        // This will create larger but more stable bundles without dependency initialization issues
        // viteConf.build.rollupOptions.output.manualChunks = undefined;        // Bundle analyzer configuration
        if (process.env.ANALYZE === 'true') {
          const { visualizer } = require('rollup-plugin-visualizer');
          viteConf.build.rollupOptions.plugins = viteConf.build.rollupOptions.plugins || [];
          viteConf.build.rollupOptions.plugins.push(
            visualizer({
              filename: 'dist/bundle-analyzer.html',
              open: true,
              gzipSize: true,
              brotliSize: true,
              template: 'treemap' // Use treemap for better visualization
            })
          );
        }

        // Performance optimizations - adjusted for no manual chunking
        viteConf.build.chunkSizeWarningLimit = 1000; // Increased to 1MB since we'll have larger but more stable bundles
        viteConf.build.cssCodeSplit = true; // Split CSS into separate files

        // Minification settings
        viteConf.build.minify = 'terser';
        viteConf.build.terserOptions = {
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            drop_debugger: process.env.NODE_ENV === 'production'
          }
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
