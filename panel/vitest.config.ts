import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config aparte para no cargar el plugin PWA en las pruebas.
// Sin @types/node en el panel: pasamos la URL a ruta a mano (en Windows quita la barra de "/C:/...")
const shared = decodeURIComponent(new URL('../shared/src', import.meta.url).pathname).replace(/^[/]([A-Za-z]:)/, '$1')

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@huellitas/shared': shared } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/prueba/preparar.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
