// Vacíos de NOTIFICACIONES a las administradoras y de enrutamiento desde app.ts.
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { montarRutasAgente } from '../../../src/adopciones-agente/index.js'
import type { Usuario } from '../../../src/tipos.js'
import { CAROLINA } from '../../fakes.js'
import { crudo, excelente, TEL } from '../ayudas.js'
import { brecha, escenario, MARIA, montarApp, webhook } from './ayudas-vacios.js'

let e: ReturnType<typeof escenario>
beforeEach(() => {
  e = escenario()
})
afterEach(() => vi.restoreAllMocks())

const PROMESA_EQUIPO = /equipo|fundaci[oó]n[^.]{0,60}(escrib|contact|comunic)|te (contact|escrib)/i

describe('cuando el aviso no llega a todas', () => {
  it('[N-01] si una administradora falla (p. ej. ventana de 24 h cerrada) y otra no, a la que falló se le reintenta en el siguiente turno', async () => {
    e.agregarAdmin(MARIA)
    const original = e.t.wa.enviar.bind(e.t.wa)
    let caida = true
    e.t.wa.enviar = async (tel, salida) => {
      if (caida && tel === MARIA.telefono) throw new Error('131047 fuera de la ventana de 24 h')
      return original(tel, salida)
    }
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('listo')
    expect(e.avisos()).toHaveLength(1)
    caida = false
    await e.escribir('sigo aquí')
    expect(e.alTelefono(MARIA.telefono)).toHaveLength(1)
  })

  it('[N-02] si falla el aviso a todas, la persona no recibe la promesa de visita (y se reintenta después)', async () => {
    const original = e.t.wa.enviar.bind(e.t.wa)
    let caida = true
    e.t.wa.enviar = async (tel, salida) => {
      if (caida && tel === CAROLINA.telefono) throw new Error('131047 fuera de la ventana de 24 h')
      return original(tel, salida)
    }
    e.t.llm.responder(excelente({ nombre: 'Ana', respuesta: 'Qué hermoso hogar' }))
    await e.escribir('listo')
    expect(e.alTelefono(TEL).join('\n')).toContain('Qué hermoso hogar')
    expect(e.alTelefono(TEL).join('\n')).not.toMatch(/visita propuesta|te (?:escribe|contacta) el equipo/i)
    caida = false
    await e.escribir('sigo aquí')
    expect(e.avisos()).toHaveLength(1)
    expect(e.alTelefono(TEL).join(' ')).toMatch(/visita/i)
  })

  for (const caso of ['sin administradoras registradas', 'todas las administradoras inactivas']) {
    it(`[N-03] ${caso}: no se promete contacto sin destinatario y la solicitud queda guardada`, async () => {
      if (caso.startsWith('sin')) e.t.repo.datos.personas = e.t.repo.datos.personas.filter((p) => p.rol !== 'admin' && p.rol !== 'adopciones')
      else e.t.repo.inactivos.add(CAROLINA.id)
      e.t.llm.responder(excelente({ nombre: 'Ana', respuesta: 'Qué hermoso hogar' }))
      await e.escribir('listo')
      expect(e.alTelefono(TEL).join('\n')).not.toMatch(PROMESA_EQUIPO)
      expect(e.t.repo.adopcion).toHaveLength(1)
      expect(e.t.repo.adopcion[0].nombre).toBe('Ana')
    })
  }

  it('[N-04] sin administradoras ni inactivas: la conversación sigue, no se promete visita y queda un warn en el log', async () => {
    e.t.repo.inactivos.add(CAROLINA.id)
    e.t.llm.responder(excelente({ nombre: 'Ana', respuesta: 'Qué hermoso hogar' }))
    await e.escribir('listo')
    expect(e.alTelefono(TEL).join('\n')).not.toMatch(PROMESA_EQUIPO)
    expect(e.t.repo.adopcion).toHaveLength(1)
    expect(e.consola.warn).toHaveBeenCalled()
  })

  it('[N-14] sin destinatario, se bloquea también la promesa de visita que invente el modelo', async () => {
    e.t.repo.inactivos.add(CAROLINA.id)
    e.t.llm.responder(excelente({ nombre: 'Ana', respuesta: 'Tu visita quedó confirmada y el equipo te escribirá mañana' }))
    await e.escribir('listo')
    expect(e.alTelefono(TEL).join('\n')).not.toMatch(/visita[^\n]{0,50}(confirmada|agendada)|equipo[^\n]{0,50}escribir/i)
  })

  it.todo('[N-05] fuera de la ventana de 24 h de WhatsApp hace falta una PLANTILLA aprobada por Meta para avisar a la administradora: requiere la API real de Meta (Salida solo tiene texto/botones/lista/imagen)')
})

describe('quién entra al agente (app.ts)', () => {
  it('[N-06] una administradora que escribe al bot va al flujo del equipo, no al agente emocional', async () => {
    const app = montarApp(e.t)
    e.t.llm.responder(crudo())
    await webhook(app, CAROLINA.telefono, 'wamid.admin', 'hola')
    await app.ociosa()
    expect(e.t.llm.llamadas).toHaveLength(0)
  })

  it('[N-07] el mismo wamid entregado dos veces por Meta se atiende una sola vez (un solo Gemini, una sola respuesta)', async () => {
    const app = montarApp(e.t)
    e.t.llm.responder(crudo({ respuesta: 'Una sola vez' }))
    await webhook(app, TEL, 'wamid.dup', 'cuéntame de los peluditos')
    await webhook(app, TEL, 'wamid.dup', 'cuéntame de los peluditos')
    await app.ociosa()
    expect(e.t.llm.llamadas).toHaveLength(1)
    expect(e.alTelefono(TEL)).toHaveLength(1)
    expect(e.alTelefono(TEL)[0]).toMatch(/^Una sola vez.*datos personales/s)
  })

  it('[N-08] dos wamid distintos casi a la vez del mismo número se atienden en orden y el aviso sale una sola vez', async () => {
    const app = montarApp(e.t)
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await Promise.all([webhook(app, TEL, 'wamid.a', 'listo'), webhook(app, TEL, 'wamid.b', 'listo otra vez')])
    await app.ociosa()
    expect(e.avisos()).toHaveLength(1)
    expect(e.t.llm.llamadas).toHaveLength(2)
  })
})

describe('contenido del aviso', () => {
  brecha('[N-09] una visita pedida desde la web trae un contacto con el que la administradora PUEDA escribirle (hoy dice "sin teléfono")', async () => {
    const app = new Hono()
    montarRutasAgente(app, e.t.deps, e.t.ctx)
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await app.request('/api/publico/agente-voz', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texto: 'listo' }) })
    expect(e.avisos()).toHaveLength(1)
    expect(e.avisos()[0]).not.toMatch(/sin tel[eé]fono/i)
  })

  it('[N-10] el aviso no trata de "Doña" a una administradora cuyo nombre es de hombre (p. ej. Luis)', async () => {
    const LUIS_ADMIN: Usuario = { id: 5, nombre: 'Luis', rol: 'admin', telefono: '573000000005' }
    e.agregarAdmin(LUIS_ADMIN)
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('listo')
    expect(e.alTelefono(LUIS_ADMIN.telefono).join('')).not.toMatch(/Doña Luis/)
  })

  it('[N-11] una salida excesiva del modelo no elimina la confirmación operativa de visita', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana', respuesta: 'palabra '.repeat(900) }))
    await e.escribir('listo')
    const enviado = e.alTelefono(TEL).join(' ')
    expect(e.alTelefono(TEL).every(m => m.length <= 600)).toBe(true)
    expect(enviado).toContain('la decisión de la adopción la toma el equipo')
  })

  it('[N-12] el aviso no incluye el texto literal de la conversación ni la transcripción del audio', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana', transcripcion: 'texto literal secreto' }))
    await e.escribir('texto literal secreto')
    expect(e.avisos().join('')).not.toContain('texto literal secreto')
  })
})

describe('abuso de las notificaciones', () => {
  brecha('[N-13] 15 "adoptantes perfectos" distintos en poco tiempo no inundan a la administradora (sin tope por hora hoy)', async () => {
    e.t.llm.responder(excelente({ nombre: 'Bot' }))
    for (let i = 0; i < 15; i++) await e.escribir('listo, soy perfecto', `57311555${String(1000 + i)}`)
    expect(e.avisos().length).toBeLessThan(15)
  })
})
