import { describe, expect, it } from 'vitest'
import { MemoryKv } from '../../src/store/kv'
import { marcarVentana, ventanaAbierta } from '../../src/wa/ventana'

const MIN = 60_000
const HORA = 60 * MIN
const T0 = 1_761_616_860_000

describe('ventana de 24 h', () => {
  it('sin mensaje previo está cerrada', async () => {
    expect(await ventanaAbierta(new MemoryKv(), '573001234567', T0)).toBe(false)
  })

  it('está abierta justo después de marcar', async () => {
    const kv = new MemoryKv(() => T0)
    await marcarVentana(kv, '573001234567', T0)
    expect(await ventanaAbierta(kv, '573001234567', T0)).toBe(true)
  })

  it('está abierta a 23 h 59 min', async () => {
    const kv = new MemoryKv(() => T0)
    await marcarVentana(kv, '573001234567', T0)
    expect(await ventanaAbierta(kv, '573001234567', T0 + 23 * HORA + 59 * MIN)).toBe(true)
  })

  it('está cerrada a 24 h 01 min', async () => {
    const kv = new MemoryKv(() => T0)
    await marcarVentana(kv, '573001234567', T0)
    expect(await ventanaAbierta(kv, '573001234567', T0 + 24 * HORA + MIN)).toBe(false)
  })

  it('cada teléfono tiene su propia ventana', async () => {
    const kv = new MemoryKv(() => T0)
    await marcarVentana(kv, '573001234567', T0)
    expect(await ventanaAbierta(kv, '573009999999', T0)).toBe(false)
  })

  it('un mensaje nuevo reabre la ventana', async () => {
    const kv = new MemoryKv(() => T0)
    await marcarVentana(kv, '573001234567', T0)
    await marcarVentana(kv, '573001234567', T0 + 20 * HORA)
    expect(await ventanaAbierta(kv, '573001234567', T0 + 30 * HORA)).toBe(true)
  })

  it('un mensaje viejo (reenvío tardío) no acorta una ventana más reciente', async () => {
    const kv = new MemoryKv(() => T0)
    await marcarVentana(kv, '573001234567', T0 + 20 * HORA)
    await marcarVentana(kv, '573001234567', T0)
    expect(await ventanaAbierta(kv, '573001234567', T0 + 30 * HORA)).toBe(true)
  })
})
