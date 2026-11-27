import { fileURLToPath } from 'node:url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Em dev a web roda em outra porta; a API é a mesma origem em produção.
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/public': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // A landing tem nome próprio para ficar fora do precache do service worker (RN-12).
        chunkFileNames: (chunk) =>
          chunk.facadeModuleId?.includes('/features/landing/') || chunk.name === 'LandingPage'
            ? 'landing-[hash].js'
            : 'assets/[name]-[hash].js',
        assetFileNames: (asset) =>
          /^(mount|LandingPage)/.test(asset.name ?? '')
            ? 'landing-[hash][extname]'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [
    vue(),
    VueI18nPlugin({
      include: fileURLToPath(new URL('./src/i18n/locales/**', import.meta.url)),
      runtimeOnly: true,
      strictMessage: true,
      fullInstall: true,
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,json,svg,png,woff,woff2}'],
        // Em celular a landing nunca é baixada, nem pelo precache do SW.
        globIgnores: ['**/landing-*'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'EmagreSer',
        short_name: 'EmagreSer',
        description: 'Controle de peso com acolhimento.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F8FAFC',
        theme_color: '#22C55E',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
