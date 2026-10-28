import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Las fechas de "hoy" y las horas de las dosis se calculan en hora de Colombia
    env: { TZ: 'America/Bogota' },
  },
})
