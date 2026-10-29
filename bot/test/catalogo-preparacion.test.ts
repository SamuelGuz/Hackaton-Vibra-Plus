import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('preparación del catálogo de demostración', () => {
  it('sin --aplicar muestra cinco fotos y no intenta conectar con DATABASE_URL', () => {
    const salida = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/catalogo-demo.ts'], {
      cwd: process.cwd(), encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: 'postgres://invalido:invalido@127.0.0.1:1/no_conectar' },
    })
    const plan = JSON.parse(salida)
    expect(plan.modo).toBe('vista_previa')
    expect(plan.animales).toHaveLength(5)
    expect(new Set(plan.animales.map((a: { foto: string }) => a.foto)).size).toBe(5)
    expect(plan.borraOtrosAnimales).toBe(false)
  })
})
