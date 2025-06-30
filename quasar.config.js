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
      // exclude = [],
      // rawOptions = {},
      warnings: true,
      errors: true,
    },

    // https://v2.quasar.dev/quasar-cli/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli/boot-files
    boot: [
      'antd',
      'performance'
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: ["app.css", "lib.css", "shape.css", "global.css"],

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
        ...require("dotenv").config().parsed,
      },
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      // extendViteConf (viteConf) {},
      extendViteConf(viteConf) {
        // Manual chunk splitting for better bundle optimization
        viteConf.build = viteConf.build || {};
        viteConf.build.rollupOptions = viteConf.build.rollupOptions || {};
        viteConf.build.rollupOptions.output = viteConf.build.rollupOptions.output || {};

        // Define manual chunks to split large dependencies
        viteConf.build.rollupOptions.output.manualChunks = (id) => {
          // T3000 library chunks
          if (id.includes('src/lib/T3000')) {
            if (id.includes('T3000/Hvac/Data')) {
              return 't3000-data';
            }
            if (id.includes('T3000/Hvac')) {
              return 't3000-hvac';
            }
            if (id.includes('T3000')) {
              return 't3000-core';
            }
          }

          // Third-party library chunks
          if (id.includes('node_modules')) {
            if (id.includes('fabric')) {
              return 'fabric';
            }
            if (id.includes('echarts')) {
              return 'echarts';
            }
            if (id.includes('lodash')) {
              return 'lodash';
            }
            if (id.includes('vue3-moveable')) {
              return 'moveable';
            }
            if (id.includes('vue3-selecto')) {
              return 'selecto';
            }
            if (id.includes('@toast-ui')) {
              return 'toast-ui';
            }
            if (id.includes('@uppy')) {
              return 'uppy';
            }
            if (id.includes('@svgdotjs')) {
              return 'svg';
            }
            // Group other large node_modules
            if (id.includes('antd') || id.includes('ant-design')) {
              return 'antd';
            }
            if (id.includes('quasar')) {
              return 'quasar';
            }
            if (id.includes('vue')) {
              return 'vue';
            }
          }

          // Component chunks
          if (id.includes('src/components')) {
            if (id.includes('ObjectType') || id.includes('Canvas')) {
              return 'drawing-components';
            }
            if (id.includes('FileUpload') || id.includes('Upload')) {
              return 'upload-components';
            }
          }

          // Page chunks
          if (id.includes('src/pages')) {
            if (id.includes('HvacDrawer')) {
              return 'hvac-drawer';
            }
            if (id.includes('ModbusRegister')) {
              return 'modbus-register';
            }
            if (id.includes('AppsLibrary')) {
              return 'apps-library';
            }
          }
        };

        // Bundle analyzer configuration
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

        // Performance optimizations
        viteConf.build.chunkSizeWarningLimit = 300; // Warn for chunks > 300KB
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
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   registerServiceWorker: 'src-pwa/register-service-worker',
    //   serviceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    // },

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
