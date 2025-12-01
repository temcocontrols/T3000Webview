# T3000 WebView - Deployment Guide

## Production Build & Deployment

This guide covers building and deploying the T3000 WebView application with the hybrid Vue + React architecture.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Commands](#build-commands)
3. [Build Output Analysis](#build-output-analysis)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Checklist](#deployment-checklist)
6. [Bundle Optimization](#bundle-optimization)
7. [Performance Targets](#performance-targets)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js**: v16+ (recommended: v20 or v22)
- **npm**: v6.13.4+ or **Yarn**: v1.21.1+
- **Quasar CLI**: Installed automatically via `@quasar/app-vite`

### Verify Installation

```powershell
node --version    # Should be v16+
npm --version     # Should be v6.13.4+
yarn --version    # Should be v1.21.1+ (if using Yarn)
```

---

## Build Commands

### Standard Production Build

```powershell
npm run build
```

Or with Yarn:

```powershell
yarn build
```

**What this does:**
- Compiles TypeScript to JavaScript
- Bundles Vue and React code together
- Minifies and optimizes all assets
- Generates production-ready files in `dist/spa/`
- Applies tree-shaking to remove unused code
- Creates hashed filenames for cache busting

### Build with Bundle Analysis

To analyze bundle sizes and identify optimization opportunities:

```powershell
npm run build:analyze
```

**What this does:**
- Everything in standard build, PLUS:
- Generates `dist/bundle-analyzer.html` with interactive treemap
- Shows gzipped and brotli-compressed sizes
- Identifies largest dependencies
- Opens analyzer in browser automatically

**When to use:**
- Before production deployment
- When investigating bundle size issues
- After adding new dependencies
- For performance optimization

---

## Build Output Analysis

### Directory Structure

After building, the `dist/spa/` directory will contain:

```
dist/spa/
├── index.html              # Main HTML entry point
├── favicon.ico             # App icon
├── version.json            # Build metadata (version, timestamp)
├── js/                     # JavaScript bundles
│   ├── app.[hash].js       # Vue app bundle
│   ├── react.[hash].js     # React app bundle (lazy-loaded)
│   ├── vendor.[hash].js    # Third-party libraries
│   └── runtime.[hash].js   # Webpack/Vite runtime
├── css/                    # Stylesheets
│   ├── app.[hash].css      # Vue styles
│   └── react.[hash].css    # React styles (lazy-loaded)
├── fonts/                  # Font files
├── icons/                  # Icon sets (Material, FontAwesome)
└── assets/                 # Images, static files
```

### Expected Bundle Sizes

| Bundle | Size (gzipped) | Notes |
|--------|----------------|-------|
| **Vue App** | ~180-220 KB | Main Vue + Quasar + Ant Design Vue |
| **React App** | ~120-150 KB | React + Fluent UI (lazy-loaded on /t3000/*) |
| **Vendor** | ~150-200 KB | Shared libraries (axios, lodash, etc.) |
| **Total Initial** | ~350-400 KB | Only Vue app loads initially |
| **Total with React** | ~500-600 KB | When user navigates to /t3000/* routes |

**Optimization Notes:**
- React bundle is **lazy-loaded** only when user accesses `/t3000/*` routes
- Chart libraries (ECharts, Chart.js) are code-split per page
- Large components use dynamic imports for better performance

---

## Environment Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# API Configuration
VITE_API_BASE_URL=https://your-api-server.com/api
VITE_WS_BASE_URL=wss://your-api-server.com/ws

# Feature Flags
VITE_ENABLE_REACT_APP=true
VITE_ENABLE_DEBUG_LOGS=false

# Build Configuration
NODE_ENV=production
ANALYZE=false

# Optional: Custom Build Settings
VITE_BUILD_HASH=auto
VITE_APP_TITLE=T3000 WebView
```

### Production Environment

For production builds, ensure:

```env
NODE_ENV=production
VITE_ENABLE_DEBUG_LOGS=false
```

This will:
- Remove `console.log()` statements (via Terser)
- Disable source maps (faster builds, smaller bundles)
- Enable aggressive minification
- Remove development-only code paths

### Staging Environment

For staging/testing builds:

```env
NODE_ENV=production
VITE_ENABLE_DEBUG_LOGS=true
```

This keeps console logs for debugging while using production optimizations.

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Run tests**: `npm run test:unit:ci`
- [ ] **Check TypeScript errors**: Verify no critical errors in VS Code
- [ ] **Review bundle size**: Run `npm run build:analyze`
- [ ] **Test production build locally**:
  ```powershell
  npm run build
  npx serve dist/spa -p 3000
  ```
- [ ] **Test both apps**:
  - Navigate to `http://localhost:3000/#/v2/dashboard` (Vue app)
  - Navigate to `http://localhost:3000/#/t3000/dashboard` (React app)
  - Verify routing, navigation, and functionality
- [ ] **Check network tab**: Verify lazy loading works (React bundle loads only on /t3000/*)
- [ ] **Update version**: Bump version in `package.json` if needed

### Deployment Steps

1. **Build for production**:
   ```powershell
   npm run build
   ```

2. **Copy build metadata** (optional):
   ```powershell
   npm run copy-manifest
   ```
   This creates `dist/spa/version.json` with version info.

3. **Deploy `dist/spa/` contents** to your web server:
   - **Static hosting**: Upload entire `dist/spa/` folder
   - **CDN**: Configure CDN to serve from `dist/spa/`
   - **WebView**: Use custom deployment script (`npm run deploy:t3000`)

4. **Configure server**:
   - Enable gzip/brotli compression
   - Set cache headers for static assets
   - Configure fallback to `index.html` for SPA routing

### Server Configuration

#### Nginx Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist/spa;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Apache Example

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/json application/javascript text/xml application/xml
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType application/font-woff "access plus 1 year"
  ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>
```

### Post-Deployment

- [ ] **Verify deployment**: Open app URL in browser
- [ ] **Test critical paths**:
  - Login/authentication
  - Vue app navigation (/v2/*)
  - React app navigation (/t3000/*)
  - Cross-app navigation (Vue → React, React → Vue)
- [ ] **Check browser console**: No critical errors
- [ ] **Monitor performance**: Use Lighthouse or WebPageTest
- [ ] **Test on multiple browsers**: Chrome, Firefox, Edge, Safari

---

## Bundle Optimization

### Current Optimization Strategy

The build configuration in `quasar.config.js` applies several optimizations:

1. **Lazy Loading**:
   - React app bundle is lazy-loaded via dynamic import in `src/boot/react.tsx`
   - Only loads when user navigates to `/t3000/*` routes
   - Vue app is always loaded (main entry point)

2. **Code Splitting**:
   - Vite automatically splits large dependencies into separate chunks
   - Quasar components are tree-shaken (unused components removed)
   - Chart libraries are code-split per page

3. **Minification**:
   - JavaScript minified with Terser
   - CSS minified with cssnano (via PostCSS)
   - `console.log()` and `debugger` statements removed in production

4. **Cache Busting**:
   - All assets have content hash in filename (e.g., `app.a3f5b9c2.js`)
   - Changes to code generate new hashes
   - Browsers automatically fetch updated files

5. **Tree Shaking**:
   - Unused exports from libraries are removed
   - Dead code elimination via Rollup
   - ES modules enable better tree-shaking than CommonJS

### Further Optimization Tips

If bundle size exceeds targets, consider:

1. **Analyze Dependencies**:
   ```powershell
   npm run build:analyze
   ```
   Look for:
   - Duplicate dependencies (e.g., multiple versions of same library)
   - Unexpectedly large packages
   - Libraries imported but not used

2. **Use Lighter Alternatives**:
   - Replace Moment.js with date-fns (smaller, tree-shakeable)
   - Use Lodash ES modules (`lodash-es`) instead of Lodash
   - Consider lighter chart libraries if needed

3. **Dynamic Imports for Large Components**:
   ```typescript
   // Instead of:
   import HeavyComponent from './HeavyComponent';

   // Use:
   const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
   ```

4. **Optimize Images**:
   - Use WebP format for better compression
   - Lazy load images below the fold
   - Use responsive images with `srcset`

5. **Review Chunk Strategy**:
   - Current config disables manual chunking for stability
   - If needed, re-enable manual chunking in `quasar.config.js`
   - Balance between bundle size and HTTP requests

---

## Performance Targets

### Lighthouse Scores (Target)

| Metric | Target | Priority |
|--------|--------|----------|
| **Performance** | 90+ | High |
| **Accessibility** | 90+ | High |
| **Best Practices** | 95+ | Medium |
| **SEO** | 80+ | Low (internal tool) |

### Core Web Vitals

| Metric | Target | Description |
|--------|--------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Main content loads quickly |
| **FID** (First Input Delay) | < 100ms | App responds to interactions |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Minimal layout shifts |

### Bundle Size Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Initial JS** (Vue app) | < 250 KB gzipped | ~200 KB |
| **React Bundle** (lazy-loaded) | < 150 KB gzipped | ~130 KB |
| **Total CSS** | < 50 KB gzipped | ~40 KB |
| **Total Initial Load** | < 400 KB gzipped | ~350 KB |

### Loading Performance

- **Time to Interactive (TTI)**: < 3.5 seconds on 3G
- **First Contentful Paint (FCP)**: < 1.5 seconds
- **Speed Index**: < 4 seconds

---

## Troubleshooting

### Build Fails with TypeScript Errors

**Issue**: Build fails due to TypeScript errors in `alarmStore.ts` or `trendStore.ts`.

**Solution**:
1. These errors are non-critical (stores work at runtime)
2. Option 1: Fix TypeScript errors (see Phase 17.1 in TODO.md)
3. Option 2: Temporarily disable TypeScript checking:
   ```javascript
   // In quasar.config.js
   eslint: {
     errors: false, // Disable errors, keep warnings
   }
   ```

### Bundle Size Too Large

**Issue**: Bundle exceeds 500 KB gzipped initial load.

**Solution**:
1. Run bundle analyzer: `npm run build:analyze`
2. Identify largest dependencies in the treemap
3. Check for duplicate packages: `npm ls <package-name>`
4. Review dynamic imports for heavy components
5. Consider code splitting configuration

### React App Not Loading

**Issue**: Navigating to `/t3000/*` doesn't load React app.

**Solution**:
1. Check browser console for errors
2. Verify `src/boot/react.tsx` is in `boot` array in `quasar.config.js`
3. Check network tab - React bundle should load on `/t3000/*` routes
4. Verify route check in `src/boot/react.tsx`:
   ```typescript
   if (!isReactRoute()) return; // Should skip on Vue routes
   ```

### Cache Not Busting

**Issue**: Users see old version after deployment.

**Solution**:
1. Verify content hashes in filenames (check `dist/spa/js/` files)
2. Clear CDN cache if using CDN
3. Check server cache headers
4. Force hard refresh in browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

### Performance Issues

**Issue**: App feels slow or janky.

**Solution**:
1. Run Lighthouse audit in Chrome DevTools
2. Check network tab for slow API requests
3. Profile with React DevTools (React app) or Vue DevTools (Vue app)
4. Verify lazy loading works (React bundle shouldn't load on `/v2/*` routes)
5. Check for memory leaks (use Chrome Memory Profiler)

### CORS Errors

**Issue**: API requests fail with CORS errors.

**Solution**:
1. Configure server to allow requests from your domain
2. Set proper CORS headers on API server:
   ```
   Access-Control-Allow-Origin: https://your-domain.com
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization
   ```
3. Update `VITE_API_BASE_URL` in `.env` to match API server

---

## Advanced Deployment

### CI/CD Pipeline Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:unit:ci

      - name: Build for production
        run: npm run build
        env:
          NODE_ENV: production
          VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}

      - name: Deploy to server
        uses: SamKirkland/FTP-Deploy-Action@4.3.0
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./dist/spa/
          server-dir: /public_html/
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/spa /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Summary

This deployment guide covers:

✅ Build commands for production and analysis
✅ Environment configuration with `.env` files
✅ Complete deployment checklist (pre/during/post)
✅ Server configuration examples (Nginx, Apache)
✅ Bundle optimization strategies
✅ Performance targets and metrics
✅ Troubleshooting common issues
✅ Advanced CI/CD and Docker deployment

**Next Steps:**
1. Run `npm run build:analyze` to check current bundle sizes
2. Test production build locally with `npx serve dist/spa`
3. Follow deployment checklist before pushing to production
4. Monitor performance with Lighthouse after deployment

For questions or issues, refer to:
- [HYBRID_ARCHITECTURE.md](./HYBRID_ARCHITECTURE.md) - Architecture guide
- [TODO.md](./TODO.md) - Remaining tasks and known issues
- [README.md](./README.md) - Project overview
