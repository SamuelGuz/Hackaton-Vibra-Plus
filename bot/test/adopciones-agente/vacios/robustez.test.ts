// Vacíos de ROBUSTEZ: respuestas raras del modelo, timeouts, límites, tope de sesiones, recortes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerAgente } from '../../../src/adopciones-agente/agente.js'
import { textosAgente } from '../../../src/adopciones-agente/textos.js'
import { crudo, excelente, TEL } from '../ayudas.js'
import { escenario } from './ayudas-vacios.js'

let e: ReturnType<typeof escenario>
beforeEach(() => {
  e = escenario()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('respuestas inservibles del modelo', () => {
  const inservibles: [string, unknown][] = [
    ['null', null],
    ['un arreglo', []],
    ['un texto suelto', 'hola'],
    ['un objeto vacío', {}],
    ['respuesta vacía', { respuesta: '' }],
    ['respuesta solo espacios', { respuesta: '   \n ' }],
    ['respuesta que es un objeto', { respuesta: { texto: 'hola' } }],
    ['respuesta que es un arreglo', { respuesta: ['hola'] }],
  ]
  for (const [nombre, valor] of inservibles) {
    it(`[R-01] ${nombre}: la persona recibe el mensaje de falla amable y el turno no se cuenta`, async () => {
      e.t.llm.responder(valor, crudo({ respuesta: 'Ya sí' }))
      await e.escribir('cuéntame de los peluditos')
      expect(e.alTelefono(TEL)[0]).toMatch(/^Se me enredó la conexión.*datos personales/s)
      await e.escribir('hola otra vez')
      expect(e.t.llm.llamadas[1].sistema).toContain('MENSAJE NÚMERO 1')
      expect(e.t.llm.llamadas[1].mensajes).toEqual([{ rol: 'user', texto: 'hola otra vez' }])
    })
  }

  it('[R-02] una falla no envenena la cola: el siguiente mensaje de la misma persona sí se atiende', async () => {
    e.t.llm.responder(new Error('503'), crudo({ respuesta: 'Aquí estoy' }))
    await e.escribir('uno')
    await e.escribir('dos')
    expect(e.alTelefono(TEL)[0]).toMatch(/^Se me enredó la conexión.*datos personales/s)
    expect(e.alTelefono(TEL)[1]).toBe('Aquí estoy')
  })

  it('[R-03] Gemini que no responde en 25 s: la persona recibe la falla amable y se puede seguir hablando', async () => {
    vi.useFakeTimers()
    let primera = true
    e.t.llm.json = async <T,>() => {
      if (primera) {
        primera = false
        return new Promise<T>(() => {})
      }
      return crudo({ respuesta: 'Ya volví' }) as T
    }
    const turno = e.escribir('cuéntame de los peluditos')
    await vi.advanceTimersByTimeAsync(25_001)
    await turno
    expect(e.alTelefono(TEL)[0]).toMatch(/^Se me enredó la conexión.*datos personales/s)
    await e.escribir('¿sigues ahí?')
    expect(e.alTelefono(TEL).at(-1)).toBe('Ya volví')
  })
})

describe('valores fuera de rango o con forma rara', () => {
  it('[R-04] puntaje 250 se acota a 100 (y se ve en el aviso); -5 se acota a 0 y no agenda', async () => {
    e.t.llm.responder(excelente({ suitability: 250, nombre: 'Ana' }))
    await e.escribir('a')
    expect(e.avisos()[0]).toContain('(idoneidad 100/100)')
    const otro = escenario()
    otro.t.llm.responder(excelente({ suitability: -5 }))
    await otro.escribir('a')
    expect(otro.avisos()).toEqual([])
  })

  it('[R-05] campos extra y desconocidos en la respuesta se ignoran', async () => {
    e.t.llm.responder({ ...crudo(), puntaje_secreto: 1000, admin: true, __proto__: { x: 1 } })
    await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL)).toHaveLength(1)
  })

  it('[R-06] sin bloque "evaluacion" la charla sigue y no se agenda nada', async () => {
    const r = crudo() as Record<string, unknown>
    delete r.evaluacion
    e.t.llm.responder(r)
    await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL)).toHaveLength(1)
    expect(e.avisos()).toEqual([])
  })

  it('[R-07] enums inválidos ("quizás", "comprar") se ignoran y no destruyen lo ya sabido', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana', presupuesto: 'si' }), excelente({ presupuesto: 'quizás', permiso: 'tal vez', intencion: 'comprar', perrito_id_foco: '999', suitability: 82 }))
    await e.escribir('uno')
    // el primer turno ya agendó; el segundo no debe romper ni repetir
    await e.escribir('dos')
    expect(e.avisos()).toHaveLength(1)
    expect(e.alTelefono(TEL).every(m => m.length <= 600)).toBe(true)
  })

  it('[R-08] ids numéricos del modelo (5 en vez de "5") se aceptan como texto', async () => {
    const r = crudo() as Record<string, unknown>
    r.perrito_id_foco = 5
    r.perritos_mencionados = [5, 12]
    e.t.llm.responder(r)
    await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL)).toHaveLength(1)
  })

  it('[R-09] el nombre de la persona se recorta a 60 caracteres', async () => {
    e.t.llm.responder(excelente({ nombre: 'N'.repeat(200) }))
    await e.escribir('a')
    expect(e.avisos()[0]).toMatch(/Nombre: N{60}\n/)
  })

  it('[R-10] alerta_bienestar enviado como texto "true" también cuenta', async () => {
    const r = excelente({ nombre: 'Ana' }) as Record<string, unknown>
    r.alerta_bienestar = 'true'
    e.t.llm.responder(r)
    await e.escribir('lo dejo atado todo el día pero tengo plata')
    expect(e.avisos()).toEqual([])
  })
})

describe('largos y recortes', () => {
  it('[R-11] una respuesta sin límites del modelo no llega como un bloque gigante', async () => {
    e.t.llm.responder(crudo({ respuesta: 'a'.repeat(10_000) }))
    await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL)[0]).toMatch(/^Se me enredó la conexión.*datos personales/s)
  })

  it('[R-12] una respuesta excesiva se sustituye por aviso completo, sin cortar palabras', async () => {
    e.t.llm.responder(crudo({ respuesta: `${'Toby es muy cariñoso. '.repeat(300)}` }))
    await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL)[0]).toMatch(/^Se me enredó la conexión.*datos personales/s)
  })

  it('[R-13] el código rechaza respuestas excesivas y mantiene el mensaje breve', async () => {
    e.t.llm.responder(crudo({ respuesta: 'Toby es muy cariñoso. '.repeat(140) }))
    await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL)[0].length).toBeLessThanOrEqual(1500)
  })
})

describe('tope de sesiones (500) y límite por teléfono', () => {
  it('[R-14] la sesión 501 expulsa a la menos reciente; el almacén nunca pasa de 500', async () => {
    e.t.llm.responder(crudo())
    for (let i = 0; i < 501; i++) await e.escribir('cuéntame de los peluditos', `5731155${String(10000 + i)}`)
    const sesiones = obtenerAgente(e.t.deps).sesiones
    expect(sesiones.tamano()).toBe(500)
    expect(sesiones.tiene('wa:57311551' + '0000')).toBe(false)
    expect(sesiones.tiene('wa:57311551' + '0500')).toBe(true)
  })

  it('[R-15] el mensaje 30 de la hora pasa y el 31 recibe el aviso de límite (una sola vez); el 32 queda en silencio', async () => {
    e.t.llm.responder(crudo({ respuesta: 'ok' }))
    for (let i = 0; i < 30; i++) await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL)).toHaveLength(30)
    await e.escribir('cuéntame de los peluditos')
    await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL)).toHaveLength(31)
    expect(e.alTelefono(TEL).at(-1)).toBe(textosAgente.limite)
  })

  it('[R-16] el límite por teléfono acepta 100 consultas cuando la demo lo configura', () => {
    const agente = obtenerAgente(e.t.deps, { limiteWa: { maximo: 100, ventanaMs: 3_600_000 } })
    const permitidas = Array.from({ length: 100 }, () => agente.limiteWa.permitir(TEL))
    expect(permitidas.every(Boolean)).toBe(true)
  })
})
