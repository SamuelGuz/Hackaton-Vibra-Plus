import { describe, expect, it } from 'vitest'
import { evaluacionInicial } from '../../src/adopciones-agente/decisiones'
import { cargarSesion, claveSesionKv, guardarSesion, MAX_MENSAJES_HISTORIAL, sesionDesdeJson, TTL_SESION_SEG } from '../../src/adopciones-agente/sesiones'
import { MemoryKv } from '../../src/store/kv'

const HORA_MS = 3_600_000

function almacen() {
  const reloj = { ms: 1_000_000 }
  return { kv: new MemoryKv(() => reloj.ms), reloj }
}

describe('sesiones en el Kv', () => {
  it('sin nada guardado arranca una sesión vacía', async () => {
    const { kv } = almacen()
    expect(await cargarSesion(kv, 'wa:1')).toEqual({
      clave: 'wa:1',
      historial: [],
      evaluacion: evaluacionInicial(),
      perroFoco: null,
      turnos: 0,
      alertaBienestar: false,
      padrinazgoOfrecido: false,
      visitas: {},
    })
  })

  it('lo guardado se lee igual (JSON) bajo ext:ses:<clave>', async () => {
    const { kv } = almacen()
    const s = await cargarSesion(kv, 'wa:1')
    s.turnos = 3
    s.perroFoco = '5'
    s.historial.push({ rol: 'user', texto: 'hola' }, { rol: 'model', texto: 'qué alegría' })
    s.visitas['5'] = '2026-10-31T15:00:00.000Z'
    s.evaluacion = { ...s.evaluacion, suitability: 80, nombre: 'Ana', viviendaTipo: 'casa' }
    await guardarSesion(kv, s)
    expect(await kv.get(claveSesionKv('wa:1'))).toContain('"turnos":3')
    expect(claveSesionKv('wa:1')).toBe('ext:ses:wa:1')
    expect(await cargarSesion(kv, 'wa:1')).toEqual(s)
  })

  it('vence a las 6 h sin hablar y cada guardado la renueva', async () => {
    const { kv, reloj } = almacen()
    const s = await cargarSesion(kv, 'wa:1')
    s.turnos = 2
    await guardarSesion(kv, s)
    reloj.ms += 5 * HORA_MS
    expect((await cargarSesion(kv, 'wa:1')).turnos).toBe(2)
    await guardarSesion(kv, s) // renueva
    reloj.ms += 5 * HORA_MS
    expect((await cargarSesion(kv, 'wa:1')).turnos).toBe(2)
    reloj.ms += TTL_SESION_SEG * 1000
    expect((await cargarSesion(kv, 'wa:1')).turnos).toBe(0)
  })

  it('cada clave tiene su propia sesión', async () => {
    const { kv } = almacen()
    const a = await cargarSesion(kv, 'wa:1')
    a.turnos = 1
    await guardarSesion(kv, a)
    expect((await cargarSesion(kv, 'wa:2')).turnos).toBe(0)
    expect((await cargarSesion(kv, 'web:abcdefgh')).turnos).toBe(0)
  })

  describe('un valor dañado nunca tumba la conversación', () => {
    it.each([['no es json'], ['null'], ['[1,2]'], ['"texto"'], ['42']])('%s → sesión nueva', (json) => {
      expect(sesionDesdeJson('wa:1', json)).toMatchObject({ clave: 'wa:1', turnos: 0, historial: [] })
    })

    it('descarta campos con tipos equivocados y conserva los buenos', () => {
      const s = sesionDesdeJson(
        'wa:1',
        JSON.stringify({
          turnos: 'tres',
          perroFoco: 7,
          alertaBienestar: 'sí',
          historial: [{ rol: 'user', texto: 'hola' }, { rol: 'robot', texto: 'x' }, { rol: 'model' }, 'suelto'],
          evaluacion: { suitability: 'mucho', risk: 999, viviendaTipo: 'castillo', permisoArriendo: 'si', nombre: '' },
          visitas: { '5': '2026-10-31T15:00:00.000Z', '6': 12 },
        }),
      )
      expect(s.turnos).toBe(0)
      expect(s.perroFoco).toBeNull()
      expect(s.alertaBienestar).toBe(false)
      expect(s.historial).toEqual([{ rol: 'user', texto: 'hola' }])
      expect(s.evaluacion).toMatchObject({ suitability: 0, risk: 100, viviendaTipo: 'desconocido', permisoArriendo: 'si', nombre: null })
      expect(s.visitas).toEqual({ '5': '2026-10-31T15:00:00.000Z' })
    })

    it('recorta un historial más largo que el máximo', () => {
      const largo = Array.from({ length: MAX_MENSAJES_HISTORIAL + 6 }, (_, i) => ({ rol: 'user', texto: `m${i}` }))
      const s = sesionDesdeJson('wa:1', JSON.stringify({ historial: largo }))
      expect(s.historial).toHaveLength(MAX_MENSAJES_HISTORIAL)
      expect(s.historial[0]?.texto).toBe('m6')
    })
  })
})
