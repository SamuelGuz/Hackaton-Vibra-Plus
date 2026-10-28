import { describe, expect, it } from 'vitest'
import { MemoryKv } from '../../src/store/kv'
import { guardarContexto, leerContexto } from '../../src/wa/contexto'

function conReloj() {
  let ahora = 1_000_000
  return { kv: new MemoryKv(() => ahora), avanzar: (segundos: number) => (ahora += segundos * 1000) }
}

describe('contexto de animal', () => {
  it('sin contexto da null', async () => {
    expect(await leerContexto(new MemoryKv(), '573001234567')).toBeNull()
  })

  it('guarda y lee un código de animal', async () => {
    const { kv } = conReloj()
    await guardarContexto(kv, '573001234567', 'TOB01')
    expect(await leerContexto(kv, '573001234567')).toBe('TOB01')
  })

  it('guarda y lee un marcador como monto_pendiente:<id>', async () => {
    const { kv } = conReloj()
    await guardarContexto(kv, '573001234567', 'monto_pendiente:reg-7')
    expect(await leerContexto(kv, '573001234567')).toBe('monto_pendiente:reg-7')
  })

  it('vive hasta justo antes de los 10 min y vence al cumplirlos', async () => {
    const { kv, avanzar } = conReloj()
    await guardarContexto(kv, '573001234567', 'TOB01')
    avanzar(599)
    expect(await leerContexto(kv, '573001234567')).toBe('TOB01')
    avanzar(1)
    expect(await leerContexto(kv, '573001234567')).toBeNull()
  })

  it('guardar de nuevo pisa el valor y reinicia los 10 min', async () => {
    const { kv, avanzar } = conReloj()
    await guardarContexto(kv, '573001234567', 'TOB01')
    avanzar(500)
    await guardarContexto(kv, '573001234567', 'MAT01')
    avanzar(500)
    expect(await leerContexto(kv, '573001234567')).toBe('MAT01')
  })

  it('cada teléfono tiene su propio contexto', async () => {
    const { kv } = conReloj()
    await guardarContexto(kv, '573001234567', 'TOB01')
    expect(await leerContexto(kv, '573009999999')).toBeNull()
  })
})
