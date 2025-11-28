import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appVersion = pkg.version; // Use package.json version for cache busting
  
  return {
  root: '.', // Explicitly set the root directory
  json: {
    // Allow importing package.json for version
    stringify: false
  },
  build: {
    // Generate unique filenames with content hash for cache busting
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`
      }
    },
    // Clear the output directory before building
    emptyOutDir: true,
    // Generate source maps for debugging
    sourcemap: true,
    // Set a unique build ID
    manifest: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces for remote access
    port: 5173,
    // Add cache headers for development
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    proxy: {
      // CORS FIX: Proxy Netlify Functions to production
      '/.netlify/functions': {
        target: 'https://musicsupplies.com',
        changeOrigin: true,
        secure: true,
      },
      '/api/version-check': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error - using fallback version check');
          });
        },
        // Fallback to local version when proxy fails
        bypass: (req, res, options) => {
          // Return current package.json version directly for development
          if (req.headers.accept?.includes('application/json')) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.end(JSON.stringify({
              version: appVersion,
              timestamp: new Date().toISOString(),
              build: Date.now(),
              source: 'dev-server-fallback'
            }));
            return undefined; // bypass proxy (returning undefined satisfies ProxyOptions type)
          }
        }
      },
      // Dev proxy to remote Supabase Edge Functions to avoid CORS in the browser.
      // Point the frontend functions URL to "/supabase-fn" (see .env.local) and Vite will forward to remote.
      '/supabase-fn': {
        target: 'https://ekklokrukxmqlahtonnc.supabase.co',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/supabase-fn/, '/functions/v1'),
        headers: {
          // Ensure origin header is acceptable to remote
          'Origin': 'https://ekklokrukxmqlahtonnc.supabase.co'
        }
      }
    }
  },
  plugins: [
    react(),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Define environment variables that will be replaced at build time
  define: {
    '__APP_VERSION__': JSON.stringify(appVersion),
  },
  };
});