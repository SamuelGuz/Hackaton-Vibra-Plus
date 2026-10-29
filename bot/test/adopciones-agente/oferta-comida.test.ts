// Oferta de comida de un vecino (el carnicero) por el webhook real: no es inventario, ni dinero, ni apadrinamiento.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crudo, TEL } from './ayudas.js'
import { escenario, montarApp, webhook } from './vacios/ayudas-vacios.js'

const OFERTA = 'Soy el carnicero del barrio, mañana puedo donar 20 kilos de carne para los perros'

let e: ReturnType<typeof escenario>
let app: ReturnType<typeof montarApp>

beforeEach(() => {
  e = escenario()
  app = montarApp(e.t)
})
afterEach(() => vi.restoreAllMocks())

const enviar = async (id: string, texto: string) => {
  await webhook(app, TEL, id, texto)
  await app.ociosa()
}

describe('oferta de comida por WhatsApp', () => {
  it('la recibe sin gastar IA, avisa al equipo una vez y no toca inventario ni caja', async () => {
    await enviar('wamid.1', OFERTA)

    expect(e.t.llm.llamadas).toHaveLength(0)
    expect(e.t.repo.datos.inventario).toHaveLength(0)
    expect(e.t.repo.datos.movimientos).toHaveLength(0)
    expect(e.t.repo.registros).toHaveLength(1)
    expect(e.t.repo.registros[0].estado).toBe('por_confirmar')

    const respuesta = e.alTelefono(TEL).join(' ')
    expect(respuesta).toMatch(/gracias por querer apoyar/i)
    expect(respuesta).toMatch(/le avis[eé] al equipo/i)
    expect(respuesta).toMatch(/qué día|en qué horario/i)
    expect(respuesta).not.toMatch(/padrin|20\.000|\$/i)

    const avisos = e.avisos().filter((a) => a.includes('oferta de alimento'))
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toContain(TEL)
    expect(avisos[0]).toMatch(/pendiente de entrega/i)
  })

  it('el primer envío conserva el aviso de privacidad aunque no intervenga la IA', async () => {
    await enviar('wamid.1', OFERTA)
    expect(e.alTelefono(TEL)[0]).toMatch(/datos personales/i)
  })

  it('la misma oferta reenviada por WhatsApp no duplica registro ni aviso', async () => {
    await enviar('wamid.1', OFERTA)
    await enviar('wamid.2', OFERTA)
    expect(e.t.repo.registros).toHaveLength(1)
    expect(e.avisos().filter((a) => a.includes('oferta de alimento'))).toHaveLength(1)
  })

  it('si el aviso al equipo falla, no le dice a la persona que avisó', async () => {
    const enviarReal = e.t.wa.enviar.bind(e.t.wa)
    e.t.wa.enviar = async (tel, salida) => {
      if (tel !== TEL) throw new Error('sin ventana de 24 h')
      return enviarReal(tel, salida)
    }
    await enviar('wamid.1', OFERTA)

    const respuesta = e.alTelefono(TEL).join(' ')
    expect(respuesta).toMatch(/no pude avisar/i)
    expect(respuesta).not.toMatch(/le avis[eé] al equipo/i)
    expect(e.t.repo.registros).toHaveLength(1)
  })

  it('dinero para comprar comida no es una entrega: va a la IA y a los datos de donación', async () => {
    e.t.llm.responder(crudo({ respuesta: '¡Qué lindo que quieras ayudar! 💛', intencion: 'donar' }))
    await enviar('wamid.1', 'quiero donar plata para la comida')

    expect(e.t.llm.llamadas).toHaveLength(1)
    expect(e.t.repo.registros).toHaveLength(0)
    expect(e.avisos().filter((a) => a.includes('oferta de alimento'))).toHaveLength(0)
  })

  it('la conversación sigue con normalidad después de la oferta', async () => {
    await enviar('wamid.1', OFERTA)
    e.t.llm.responder(crudo({ respuesta: 'Los sábados atendemos de 9 a 12 🐾' }))
    await enviar('wamid.2', '¿a qué horas puedo llevarla?')
    expect(e.t.llm.llamadas).toHaveLength(1)
    expect(e.alTelefono(TEL).at(-1)).toContain('sábados')
  })
})
