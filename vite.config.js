import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // firebase-messaging-sw.js는 PWA 캐싱에서 제외
        navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/],
        // 새 SW 활성화 시 즉시 적용
        skipWaiting: true,
        clientsClaim: true,
        // navigation 요청은 네트워크 우선 → 항상 최신 index.html 제공
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      manifest: {
        name: 'GREF FarmWork',
        short_name: 'FarmWork',
        description: '온실 인력관리 프로그램',
        theme_color: '#022c22',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
