import { describe, expect, it } from 'vitest'
import { MemoryKv } from '../../src/store/kv'

function conReloj() {
  let ahora = 1_000_000
  const kv = new MemoryKv(() => ahora)
  return { kv, avanzar: (segundos: number) => (ahora += segundos * 1000) }
}

describe('MemoryKv', () => {
  it('guarda, lee y borra', async () => {
    const { kv } = conReloj()
    expect(await kv.get('a')).toBeNull()
    await kv.put('a', 'uno')
    expect(await kv.get('a')).toBe('uno')
    await kv.delete('a')
    expect(await kv.get('a')).toBeNull()
  })

  it('sin ttl el valor no vence', async () => {
    const { kv, avanzar } = conReloj()
    await kv.put('a', 'uno')
    avanzar(10 * 365 * 24 * 3600)
    expect(await kv.get('a')).toBe('uno')
  })

  it('el valor vive hasta justo antes del ttl y desaparece al cumplirlo', async () => {
    const { kv, avanzar } = conReloj()
    await kv.put('ctx', 'TOB01', 600)
    avanzar(599)
    expect(await kv.get('ctx')).toBe('TOB01')
    avanzar(1)
    expect(await kv.get('ctx')).toBeNull()
  })

  it('volver a guardar renueva el ttl', async () => {
    const { kv, avanzar } = conReloj()
    await kv.put('a', 'uno', 10)
    avanzar(8)
    await kv.put('a', 'dos', 10)
    avanzar(8)
    expect(await kv.get('a')).toBe('dos')
  })

  it('ponerSiNoExiste guarda la primera vez y rechaza la segunda sin pisar el valor', async () => {
    const { kv } = conReloj()
    expect(await kv.ponerSiNoExiste('wamid.X', 'a', 172800)).toBe(true)
    expect(await kv.ponerSiNoExiste('wamid.X', 'b', 172800)).toBe(false)
    expect(await kv.get('wamid.X')).toBe('a')
  })

  it('ponerSiNoExiste vuelve a aceptar cuando el valor anterior ya venció (candado de 60 s)', async () => {
    const { kv, avanzar } = conReloj()
    expect(await kv.ponerSiNoExiste('lock:t-1@2026-10-27T14:00', 'x', 60)).toBe(true)
    avanzar(59)
    expect(await kv.ponerSiNoExiste('lock:t-1@2026-10-27T14:00', 'y', 60)).toBe(false)
    avanzar(1)
    expect(await kv.ponerSiNoExiste('lock:t-1@2026-10-27T14:00', 'z', 60)).toBe(true)
    expect(await kv.get('lock:t-1@2026-10-27T14:00')).toBe('z')
  })

  it('ponerSiNoExiste tras delete vuelve a aceptar', async () => {
    const { kv } = conReloj()
    await kv.ponerSiNoExiste('k', 'a', 60)
    await kv.delete('k')
    expect(await kv.ponerSiNoExiste('k', 'b', 60)).toBe(true)
  })
})
