import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  // server: {
  //   proxy: {
  //     '/api': {
  //       target: 'http://localhost:5000',
  //       changeOrigin: true,
  //       rewrite(path) {
  //         return path.replace(/^\/api/, '')
  //       },
  //     },
  //   },
  // },
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
