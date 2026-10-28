import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Huellitas',
        short_name: 'Huellitas',
        description: 'La libreta del albergue que no se moja',
        lang: 'es-CO',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        background_color: '#F5EFE3',
        theme_color: '#F5EFE3',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo fuentes latinas: el resto de alfabetos no se usan y gastan datos.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,jpg}', '**/*-latin-*.woff2'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
