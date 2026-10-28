import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config aparte para no cargar el plugin PWA en las pruebas.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/prueba/preparar.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
