// Con quien quiere adoptar, el agente se comporta como una persona: marca leído, sale "escribiendo…"
// y responde después de lo que tardaría en escribir. El bot del equipo sigue respondiendo de una vez.
import { beforeEach, describe, expect, it } from 'vitest'
import { atenderInteresadoExterno } from '../../src/adopciones-agente/whatsapp.js'
import { pausaParaEscribir } from '../../src/adopciones-agente/humano.js'
import { atender } from '../../src/conversacion/atender.js'
import { cuerpoEscribiendo } from '../../src/wa/cliente.js'
import { LUIS } from '../fakes.js'
import { crudo, montar, silenciarConsola, TEL } from './ayudas.js'

let t: ReturnType<typeof montar>
/** Lo que pasa, en orden: escribiendo, pausas y envíos */
let pasos: string[]

beforeEach(() => {
  t = montar()
  silenciarConsola()
  pasos = []
  t.wa.escribiendo = async (id: string) => {
    pasos.push(`escribiendo ${id}`)
  }
  const enviar = t.wa.enviar.bind(t.wa)
  t.wa.enviar = async (tel, s) => {
    pasos.push('enviar')
    return enviar(tel, s)
  }
  t.ctx.pausaHumana = async (ms: number) => {
    pasos.push(`pausa ${ms}`)
  }
  t.llm.responder(crudo({ respuesta: 'Mira, te cuento la historia de Toby. Lo encontraron bajo un puente 🐶' }))
})

const texto = (s: string) => ({ tipo: 'texto' as const, texto: s })

describe('agente con quien quiere adoptar', () => {
  it('marca leído y muestra "escribiendo…" apenas llega, espera y después responde', async () => {
    await atenderInteresadoExterno(t.deps, TEL, texto('cuéntame de los peluditos'), t.ctx, { mensajeId: 'wamid.ABC' })
    const respuesta = 'Mira, te cuento la historia de Toby. Lo encontraron bajo un puente 🐶'
    expect(pasos).toEqual(['escribiendo wamid.ABC', `pausa ${pausaParaEscribir(respuesta, 0)}`, 'enviar'])
  })

  it('la pausa depende del largo y descuenta lo que ya tardó en pensar', () => {
    expect(pausaParaEscribir('Hola', 0)).toBe(2500)
    expect(pausaParaEscribir('x'.repeat(100), 0)).toBe(1500 + 100 * 35)
    expect(pausaParaEscribir('x'.repeat(1000), 0)).toBe(9000)
    expect(pausaParaEscribir('x'.repeat(100), 3000)).toBe(1500 + 100 * 35 - 3000)
    expect(pausaParaEscribir('Hola', 20_000)).toBe(0)
  })

  it('si "escribiendo…" falla, igual responde', async () => {
    t.wa.escribiendo = async () => {
      throw new Error('Meta dijo 400')
    }
    await atenderInteresadoExterno(t.deps, TEL, texto('cuéntame de los peluditos'), t.ctx, { mensajeId: 'wamid.ABC' })
    expect(t.wa.enviados.map((e) => e.telefono)).toEqual([TEL])
  })

  it('sin id del mensaje (la página web) no hay "escribiendo…", pero sí la pausa', async () => {
    await atenderInteresadoExterno(t.deps, TEL, texto('cuéntame de los peluditos'), t.ctx)
    expect(pasos.filter((p) => p.startsWith('escribiendo'))).toEqual([])
    expect(pasos.filter((p) => p.startsWith('pausa'))).toHaveLength(1)
  })
})

describe('bot del equipo', () => {
  it('responde de una vez: sin "escribiendo…" ni pausas', async () => {
    await t.repo.guardarEstado(LUIS.id, { paso: 'menu' })
    await atender(t.deps, LUIS, { tipo: 'texto', texto: 'hola' })
    expect(pasos).toEqual(['enviar'])
  })
})

describe('cuerpo de "escribiendo…" para WhatsApp', () => {
  it('marca el mensaje como leído y pide el indicador de escritura', () => {
    expect(cuerpoEscribiendo('wamid.ABC')).toEqual({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: 'wamid.ABC',
      typing_indicator: { type: 'text' },
    })
  })
})
