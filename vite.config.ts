import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { templateCompilerOptions } from '@tresjs/core'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/BugBoard/' : '/',
  // Без isCustomElement из TresJS <TresMesh> и др. компилируются как обычные
  // Vue-компоненты, не резолвятся и не превращаются в объекты three.js —
  // стеклянная панель просто не рендерилась
  plugins: [vue(templateCompilerOptions), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
}))
