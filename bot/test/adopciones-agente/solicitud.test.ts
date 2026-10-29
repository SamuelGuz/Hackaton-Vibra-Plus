// Cuando el agente propone una visita, la solicitud queda en la base (no solo en memoria) para que la coordinación la vea.
import { beforeEach, describe, expect, it } from 'vitest'
import { proximoSabado10 } from '../../src/adopciones-agente/decisiones.js'
import { crudo, excelente, TEL } from './ayudas.js'
import { escenario } from './vacios/ayudas-vacios.js'

let e: ReturnType<typeof escenario>
beforeEach(() => {
  e = escenario()
})

describe('la visita que propone el agente queda guardada', () => {
  it('guarda la solicitud con la visita propuesta, los puntajes, el nombre y el teléfono', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('vivo en casa con patio y puedo pagar el veterinario')
    expect(e.t.repo.adopcion).toHaveLength(1)
    expect(e.t.repo.adopcion[0]).toMatchObject({
      origen: 'agente',
      claveOrigen: `wa:${TEL}`,
      nombre: 'Ana',
      telefono: TEL,
      vivienda: 'casa',
      visitaEstado: 'propuesta',
      visitaPropuesta: proximoSabado10(e.t.repo.ahora).toISOString(),
      puntajeIdoneidad: 82,
      puntajeRiesgo: 15,
      montonManual: null,
    })
  })

  it('la misma conversación no crea otra solicitud', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('cuéntame de los peluditos')
    await e.escribir('sigo aquí')
    expect(e.t.repo.adopcion).toHaveLength(1)
  })

  it('si el agente no propone visita, no se guarda nada', async () => {
    e.t.llm.responder(crudo({ suitability: 40, risk: 60 }))
    await e.escribir('vivo en arriendo y no sé si me dejan')
    expect(e.t.repo.adopcion).toHaveLength(0)
  })

  it('a la persona se le dice que la visita es una propuesta por confirmar, no una cita hecha', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('cuéntame de los peluditos')
    const respuesta = e.alTelefono(TEL).join('\n')
    expect(respuesta).toContain('te propongo una visita')
    expect(respuesta).toContain('por confirmar')
    expect(respuesta).not.toContain('te dejé una visita')
  })

  it('si la base falla, la conversación sigue y el aviso a la coordinación sale igual', async () => {
    e.t.repo.guardarSolicitudAdopcion = async () => {
      throw new Error('base caída')
    }
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL).length).toBeGreaterThan(0)
    expect(e.avisos()[0]).toContain('Le propuse visita, por confirmar.')
  })
})
