import { describe, expect, it } from 'vitest'
import { crearAlmacenSesiones } from '../../src/adopciones-agente/sesiones.js'

const HORA = 3_600_000

function almacen(opc: { ttlMs?: number; maxSesiones?: number } = {}) {
  const reloj = { ahora: 1_000_000 }
  const a = crearAlmacenSesiones({ ttlMs: 6 * HORA, maxSesiones: 3, ...opc, ahora: () => reloj.ahora })
  return { a, reloj }
}

describe('almacén de sesiones', () => {
  it('crea una sesión vacía y devuelve la misma mientras no caduque', () => {
    const { a, reloj } = almacen()
    const s = a.obtener('wa:1')
    expect(s).toMatchObject({ clave: 'wa:1', historial: [], turnos: 0, perroFoco: null, alertaBienestar: false, padrinazgoOfrecido: false })
    expect(s.visitas.size).toBe(0)
    s.turnos = 2
    reloj.ahora += 5 * HORA
    expect(a.obtener('wa:1')).toBe(s)
    reloj.ahora += 5 * HORA // 5 h desde el último uso: sigue viva porque cada uso la renueva
    expect(a.obtener('wa:1')).toBe(s)
  })

  it('pasado el TTL sin usarse arranca una sesión nueva', () => {
    const { a, reloj } = almacen()
    const s = a.obtener('wa:1')
    s.turnos = 4
    reloj.ahora += 6 * HORA + 1
    const nueva = a.obtener('wa:1')
    expect(nueva).not.toBe(s)
    expect(nueva.turnos).toBe(0)
  })

  it('con el tope lleno saca la que lleva más tiempo sin usarse', () => {
    const { a, reloj } = almacen()
    a.obtener('a')
    reloj.ahora += 10
    a.obtener('b')
    reloj.ahora += 10
    a.obtener('c')
    reloj.ahora += 10
    a.obtener('a') // 'a' vuelve a ser la más reciente; 'b' queda como la más vieja
    reloj.ahora += 10
    a.obtener('d')
    expect(a.tamano()).toBe(3)
    expect(a.tiene('b')).toBe(false)
    expect(a.tiene('a') && a.tiene('c') && a.tiene('d')).toBe(true)
  })

  it('al llenarse primero descarta las caducadas', () => {
    const { a, reloj } = almacen()
    a.obtener('a')
    a.obtener('b')
    reloj.ahora += 6 * HORA + 1
    a.obtener('c')
    a.obtener('d')
    expect(a.tamano()).toBe(2)
  })
})
