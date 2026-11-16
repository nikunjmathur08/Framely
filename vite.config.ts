import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          // Forward /api/* to the local Express server in development.
          // Without this, Vite serves index.html for unknown paths and
          // React Router complains about unmatched routes inside iframes.
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: [
            'framely_logo.png',
            'framely_white.png',
            'robots.txt',
            'sitemap.xml',
          ],
          manifest: {
            name: 'Framely',
            short_name: 'Framely',
            description: 'Stream Movies & TV Shows Online',
            theme_color: '#E50914',
            background_color: '#141414',
            display: 'standalone',
            orientation: 'any',
            scope: '/',
            start_url: '/',
            categories: ['entertainment'],
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
              },
              {
                src: 'pwa-maskable-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
              },
              {
                src: 'pwa-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            // Pages — network-first so users always get fresh content
            navigateFallback: '/index.html',
            navigateFallbackDenylist: [/^\/api\//],

            runtimeCaching: [
              {
                // TMDB poster/backdrop images — cache-first, expire after 30 days
                urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'tmdb-images',
                  expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // API calls — network-first with 3s timeout fallback to cache
                urlPattern: /^\/api\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-responses',
                  networkTimeoutSeconds: 3,
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 24 * 60 * 60, // 1 day
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // Google Fonts stylesheets
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'google-fonts-stylesheets',
                  expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
                },
              },
              {
                // Google Fonts webfont files
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-webfonts',
                  expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
