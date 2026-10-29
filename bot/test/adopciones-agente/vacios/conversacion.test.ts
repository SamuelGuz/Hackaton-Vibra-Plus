// Vacíos de LÓGICA DE CONVERSACIÓN: foco, cambios de opinión, puntajes, visitas, padrinos, fechas.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { describirFecha, proximoSabado10 } from '../../../src/adopciones-agente/decisiones.js'
import { ESQUEMA_AGENTE } from '../../../src/adopciones-agente/esquema.js'
import { perrito } from '../../externo/fakes.js'
import { AHORA } from '../../fakes.js'
import { crudo, excelente, TEL } from '../ayudas.js'
import { brecha, escenario } from './ayudas-vacios.js'

let e: ReturnType<typeof escenario>
beforeEach(() => {
  e = escenario()
})
afterEach(() => vi.restoreAllMocks())

const HORA = 3_600_000
const claves = () => Object.keys((ESQUEMA_AGENTE as { properties: object }).properties).join(' ')
const clavesEvaluacion = () =>
  Object.keys(((ESQUEMA_AGENTE as { properties: { evaluacion: { properties: object } } }).properties.evaluacion).properties).join(' ')

describe('foco del animal', () => {
  it('[C-01] cambiar de animal a mitad de charla mueve el foco y muestra el nuevo', async () => {
    e.t.llm.responder(crudo({ perrito_id_foco: '5', perritos_mencionados: ['5'] }), crudo({ perrito_id_foco: '1', perritos_mencionados: ['1'] }))
    await e.escribir('cuéntame de Toby')
    await e.escribir('mejor cuéntame de Mateo')
    expect(e.t.llm.llamadas[1].sistema).toMatch(/PERRITO EN FOCO[^\n]*Toby/) // el turno 2 arranca con el foco anterior
    await e.escribir('y de él, ¿qué más?')
    expect(e.t.llm.llamadas[2].sistema).toMatch(/PERRITO EN FOCO[^\n]*Mateo/)
  })

  it('[C-02] si el animal en foco solo se puede apadrinar, no se agenda visita aunque la persona sea excelente', async () => {
    e.t.rag.perritos = [perrito({ id: '5', nombre: 'Toby', adoptable: false })]
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('lo quiero adoptar')
    expect(e.avisos()).toEqual([])
  })

  brecha('[C-03] a una persona excelente que quiere un animal "solo apadrinable" se le ofrece ser Padrino (no se queda en el vacío)', async () => {
    e.t.rag.perritos = [perrito({ id: '5', nombre: 'Toby', adoptable: false })]
    e.t.llm.responder(excelente({ nombre: 'Ana', conexion_emocional: true }))
    await e.escribir('lo quiero adoptar')
    expect(e.alTelefono(TEL).join('\n')).toMatch(/padrin/i)
  })

  it('[C-04] una persona no puede agendar visitas para varios animales en cascada (spam de avisos a las administradoras)', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana', perrito_id_foco: '5' }), excelente({ nombre: 'Ana', perrito_id_foco: '1' }), excelente({ nombre: 'Ana', perrito_id_foco: '12' }))
    await e.escribir('Toby')
    await e.escribir('y Mateo')
    await e.escribir('y Luna')
    expect(e.avisos()).toHaveLength(1)
  })

  it('[C-05] sin animales en el RAG, el prompt dice que no hay nada que mostrar y no inventar', async () => {
    e.t.rag.perritos = []
    e.t.llm.responder(crudo({ perrito_id_foco: null, perritos_mencionados: [] }))
    await e.escribir('cuéntame de los peluditos')
    expect(e.t.llm.llamadas[0].sistema).toMatch(/no hay animales para mostrar: no inventes ninguno/)
  })
})

describe('cambios de opinión y puntajes raros', () => {
  it('[C-06] dijo que sí podía pagar el veterinario y luego que no: ya no agenda aunque el modelo siga con score 80', async () => {
    e.t.llm.responder(
      crudo({ suitability: 80, risk: 10, tipo: 'casa', permiso: 'no_aplica', presupuesto: 'desconocido', tiempo: 'suficiente' }),
      excelente({ presupuesto: 'no', suitability: 80 }),
    )
    await e.escribir('tengo casa y tiempo')
    await e.escribir('ah, pero no podría pagar el veterinario')
    expect(e.avisos()).toEqual([])
  })

  it('[C-07] score que oscila (82 → 20 → 82) no repite el aviso de la misma visita', async () => {
    e.t.llm.responder(excelente(), excelente({ suitability: 20 }), excelente())
    await e.escribir('uno')
    await e.escribir('dos')
    await e.escribir('tres')
    expect(e.avisos()).toHaveLength(1)
  })

  it('[C-08] riesgo 40 todavía agenda; riesgo 41 no', async () => {
    e.t.llm.responder(excelente({ risk: 41 }))
    await e.escribir('a')
    expect(e.avisos()).toEqual([])
    e.t.llm.respuestas = []
    e.t.llm.responder(excelente({ risk: 40 }))
    await e.escribir('b')
    expect(e.avisos()).toHaveLength(1)
  })

  it('[C-09] si el modelo omite risk_score, queda el riesgo inicial (50) y no se agenda', async () => {
    const r = excelente() as { evaluacion: Record<string, unknown> }
    delete r.evaluacion.risk_score
    e.t.llm.responder(r)
    await e.escribir('todo bien')
    expect(e.avisos()).toEqual([])
  })

  it('[C-10] 74,6 no cuenta como 75: el umbral se evalúa sobre el número real, no sobre el redondeado', async () => {
    e.t.llm.responder(excelente({ suitability: 74.6 }))
    await e.escribir('todo bien')
    expect(e.avisos()).toEqual([])
  })

  it('[C-11] el puntaje que el modelo manda como texto numérico ("82") se acepta; como "alto" se ignora', async () => {
    const r = excelente() as { evaluacion: Record<string, unknown> }
    r.evaluacion.suitability_score = '82'
    e.t.llm.responder(r)
    await e.escribir('a')
    expect(e.avisos()).toHaveLength(1)
    const mala = excelente() as { evaluacion: Record<string, unknown> }
    mala.evaluacion.suitability_score = 'alto'
    const otro = escenario()
    otro.t.llm.responder(mala)
    await otro.escribir('a')
    expect(otro.avisos()).toEqual([])
  })
})

describe('visita agendada y después...', () => {
  it('[C-12] si luego dice que no puede pagar el veterinario, las administradoras reciben una retractación del aviso', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }), excelente({ presupuesto: 'no', suitability: 30 }))
    await e.escribir('todo bien')
    await e.escribir('ay, la verdad no podría pagar el veterinario')
    expect(e.avisos()).toHaveLength(2)
    expect(e.t.repo.adopcion[0].visitaEstado).toBe('retractada')
  })

  it('[C-13] si luego cuenta algo preocupante del bienestar (alerta), las administradoras reciben una retractación', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }), crudo({ alerta_bienestar: true }))
    await e.escribir('todo bien')
    await e.escribir('lo dejaría atado en el patio todo el día')
    expect(e.avisos()).toHaveLength(2)
    expect(e.t.repo.adopcion[0].visitaEstado).toBe('retractada')
  })

  it('[C-14] "cancela mi visita" / "no puedo ir" avisa a las administradoras que se cancela', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }), crudo())
    await e.escribir('todo bien')
    await e.escribir('Ya no puedo ir el sábado, cancela la visita')
    expect(e.avisos().join('\n')).toMatch(/cancel/i)
    expect(e.t.repo.adopcion[0].visitaEstado).toBe('cancelada')
  })

  it('[C-15] pedir otro día u hora ("solo puedo el domingo") llega a las administradoras (hoy el sábado 10 AM es fijo)', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }), crudo())
    await e.escribir('todo bien')
    await e.escribir('El sábado trabajo, solo puedo el domingo en la tarde')
    expect(e.avisos().join('\n')).toMatch(/domingo/i)
    expect(e.t.repo.adopcion[0].visitaEstado).toBe('cambio_solicitado')
  })

  it('[C-16] 7 h después (sesión nueva) la misma persona no vuelve a disparar un segundo aviso por el mismo animal', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('todo bien')
    e.t.repo.ahora = new Date(AHORA.getTime() + 7 * HORA)
    await e.escribir('hola de nuevo, ya tengo todo listo')
    expect(e.avisos()).toHaveLength(1)
    expect(e.t.repo.adopcion).toHaveLength(1)
  })

  it('[C-17] dos mensajes simultáneos del mismo número no duplican el aviso', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await Promise.all([e.escribir('listo'), e.escribir('listo, de verdad')])
    expect(e.avisos()).toHaveLength(1)
  })

  it('[C-18] personas distintas agendan por separado (cada una su aviso)', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('listo', '573115550001')
    await e.escribir('listo', '573115550002')
    expect(e.avisos()).toHaveLength(2)
    expect(e.avisos()[0]).toContain('+573115550001')
    expect(e.avisos()[1]).toContain('+573115550002')
  })
})

describe('padrinazgo y donaciones', () => {
  brecha('[C-19] un lead de padrino/donante con conexión emocional se le avisa a las administradoras (hoy se pierde)', async () => {
    e.t.llm.responder(crudo({ intencion: 'apadrinar', conexion_emocional: true, nombre: 'Ana' }))
    await e.escribir('quiero apadrinar a Toby con $50.000 al mes')
    expect(e.avisos().join('\n')).toMatch(/padrin|apadrin|donaci/i)
  })

  brecha('[C-20] si el modelo ya habló de padrinos con otras palabras ("veinte mil pesos") no se duplica la oferta fija', async () => {
    e.t.llm.responder(crudo({ intencion: 'apadrinar', respuesta: 'Puedes ser Padrino desde veinte mil pesos al mes 💛' }))
    await e.escribir('quiero apadrinar')
    expect(e.alTelefono(TEL).join('\n').match(/Padrino/gi)).toHaveLength(1)
  })

  it('[C-21] pedir ayuda para pagar la mensualidad no produce datos de pago inventados por el código', async () => {
    e.t.llm.responder(crudo({ intencion: 'donar', conexion_emocional: true }))
    await e.escribir('¿cómo pago?')
    expect(e.alTelefono(TEL).join('\n')).not.toMatch(/nequi|bancolombia|daviplata|cuenta de ahorros|\b\d{9,}\b/i)
  })
})

describe('lo que el esquema no puede expresar', () => {
  brecha('[C-22] hay un campo para pedir hablar con una persona (handoff a humano)', () => {
    expect(claves()).toMatch(/humano|persona|derivar|handoff|escalar/i)
  })
  brecha('[C-23] hay un campo para el día/hora que la persona puede (hoy siempre es sábado 10 AM)', () => {
    expect(clavesEvaluacion() + claves()).toMatch(/disponibilidad|dia_preferido|horario|fecha_visita/i)
  })
  brecha('[C-24] hay un campo para el teléfono de contacto cuando escribe por la web', () => {
    expect(clavesEvaluacion() + claves()).toMatch(/telefono|contacto|celular/i)
  })
  brecha('[C-25] hay un campo para marcar que la persona es menor de edad', () => {
    expect(clavesEvaluacion() + claves()).toMatch(/menor|edad/i)
  })
  brecha('[C-26] las intenciones cubren reportar un animal (abandonado, perdido, maltrato) o entregar uno propio', async () => {
    const { INTENCIONES } = await import('../../../src/adopciones-agente/tipos.js')
    expect(INTENCIONES.join(' ')).toMatch(/report|denunci|entregar|rescate/i)
  })
})

describe('"hola" repetido y fechas', () => {
  it('[C-27] "hola" después de más de 6 h: conversación nueva (mensaje número 1, sin historial)', async () => {
    e.t.llm.responder(crudo(), crudo())
    await e.escribir('cuéntame de los peluditos')
    e.t.repo.ahora = new Date(AHORA.getTime() + 6 * HORA + 60_000)
    await e.escribir('cuéntame de los peluditos')
    expect(e.t.llm.llamadas[1].sistema).toContain('MENSAJE NÚMERO 1')
  })

  it('[C-28] "hola" dentro de las 6 h sigue la misma conversación', async () => {
    e.t.llm.responder(crudo(), crudo())
    await e.escribir('cuéntame de los peluditos')
    e.t.repo.ahora = new Date(AHORA.getTime() + 5 * HORA)
    await e.escribir('cuéntame de los peluditos')
    expect(e.t.llm.llamadas[1].sistema).toContain('MENSAJE NÚMERO 2')
  })

  it('[C-29] viernes 8 p. m. en Bogotá (ya es sábado en UTC) la visita es el sábado de mañana, no la del otro', () => {
    const f = proximoSabado10(new Date('2026-10-30T20:00:00-05:00'))
    expect(describirFecha(f)).toBe('sábado 31 de octubre')
    expect(f.toISOString()).toBe('2026-10-31T15:00:00.000Z')
  })

  it('[C-30] sábado 11:30 p. m. en Bogotá (ya es domingo en UTC) la visita es el sábado de la semana siguiente', () => {
    const f = proximoSabado10(new Date('2026-10-31T23:30:00-05:00'))
    expect(describirFecha(f)).toBe('sábado 7 de noviembre')
  })

  it('[C-31] el aviso dice que es una visita propuesta, por confirmar, con la fecha real del sábado a las 10', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('listo')
    expect(e.avisos()[0]).toContain('Le propuse visita, por confirmar.')
    expect(e.avisos()[0]).toContain('sábado 31 de octubre, 10:00 a. m.')
    expect(e.avisos()[0]).toContain('sábado 31 de octubre')
  })
})
