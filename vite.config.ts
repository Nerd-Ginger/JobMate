import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this project under /JobMate/; local dev/preview stays at
// root. The deploy workflow sets GITHUB_PAGES=true.
const base = process.env.GITHUB_PAGES ? '/JobMate/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'JobMate — Job Application Tracker',
        short_name: 'JobMate',
        description:
          'Backend-free job application tracker: pipeline board, funnel analytics, AI apply kit, and live job discovery. All data on-device.',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache the app shell for offline board use; API calls are never cached.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: base + 'index.html',
      },
    }),
  ],
})
