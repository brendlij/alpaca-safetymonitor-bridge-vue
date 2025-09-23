import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // wrapper server for process management
      '/wrapper': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // backend management + alpaca endpoints
      '/admin': {
        target: 'http://localhost:11111',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: 'http://localhost:11111',
        changeOrigin: true,
        ws: true,
      },
      '/management': {
        target: 'http://localhost:11111',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
