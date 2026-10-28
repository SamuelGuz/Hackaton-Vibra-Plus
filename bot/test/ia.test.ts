// Gemini con OpenRouter de respaldo, sin red.
import { describe, expect, it, vi } from 'vitest'
import { crearIaOpenRouter } from '../src/ia/openrouter.js'
import { crearIaConRespaldo, esFaltaDeCuota, PAUSA_SIN_CUOTA_MS } from '../src/ia/respaldo.js'
import type { EntradaIa, Entendido, Ia } from '../src/tipos.js'
import { AHORA, datosDePrueba } from './fakes.js'

const ENTRADA: EntradaIa = { texto: 'le di la pastilla a Tobías', datos: datosDePrueba(), ahora: AHORA }
const BIEN: Entendido = { transcripcion: 'ok', acciones: [], confianza: 0.9, futuras: 0 }

function iaFalsa(respuestas: (Entendido | Error)[]) {
  const ia: Ia & { llamadas: number } = {
    llamadas: 0,
    async entender() {
      const r = respuestas[Math.min(ia.llamadas++, respuestas.length - 1)]
      if (r instanceof Error) throw r
      return r
    },
  }
  return ia
}

describe('IA con respaldo', () => {
  it('usa Gemini si responde, sin tocar OpenRouter', async () => {
    const gemini = iaFalsa([BIEN])
    const openrouter = iaFalsa([BIEN])
    const ia = crearIaConRespaldo([{ nombre: 'Gemini', ia: gemini }, { nombre: 'OpenRouter', ia: openrouter }])
    expect(await ia.entender(ENTRADA)).toBe(BIEN)
    expect(openrouter.llamadas).toBe(0)
  })

  it('si Gemini falla, el mismo mensaje se entiende con OpenRouter', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const otra = { ...BIEN, transcripcion: 'de openrouter' }
    const ia = crearIaConRespaldo([
      { nombre: 'Gemini', ia: iaFalsa([new Error('Gemini no respondió en 25 s')]) },
      { nombre: 'OpenRouter', ia: iaFalsa([otra]) },
    ])
    expect((await ia.entender(ENTRADA)).transcripcion).toBe('de openrouter')
  })

  it('sin cuota, Gemini se salta 10 minutos y luego se vuelve a intentar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let reloj = 0
    const gemini = iaFalsa([new Error('429 RESOURCE_EXHAUSTED'), BIEN])
    const openrouter = iaFalsa([BIEN])
    const ia = crearIaConRespaldo([{ nombre: 'Gemini', ia: gemini }, { nombre: 'OpenRouter', ia: openrouter }], () => reloj)

    await ia.entender(ENTRADA)
    await ia.entender(ENTRADA)
    expect(gemini.llamadas).toBe(1)
    expect(openrouter.llamadas).toBe(2)

    reloj += PAUSA_SIN_CUOTA_MS + 1
    await ia.entender(ENTRADA)
    expect(gemini.llamadas).toBe(2)
  })

  it('si las dos fallan, el error sale para que el bot diga que no entendió', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const ia = crearIaConRespaldo([
      { nombre: 'Gemini', ia: iaFalsa([new Error('uno')]) },
      { nombre: 'OpenRouter', ia: iaFalsa([new Error('dos')]) },
    ])
    await expect(ia.entender(ENTRADA)).rejects.toThrow('dos')
  })

  it('reconoce la falta de cuota de Gemini y de OpenRouter', () => {
    expect(esFaltaDeCuota(new Error('got status: 429 Too Many Requests'))).toBe(true)
    expect(esFaltaDeCuota(new Error('OpenRouter respondió 402: Insufficient credits'))).toBe(true)
    expect(esFaltaDeCuota(new Error('Gemini no respondió en 25 s'))).toBe(false)
  })
})

describe('OpenRouter', () => {
  function conRespuesta(cuerpo: unknown, estado = 200) {
    const pedidos: { url: string; init: RequestInit }[] = []
    const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      pedidos.push({ url: String(url), init: init! })
      return new Response(JSON.stringify(cuerpo), { status: estado })
    }) as unknown as typeof globalThis.fetch
    return { pedidos, ia: crearIaOpenRouter({ apiKey: 'llave', modelo: 'google/gemini-2.5-flash', fetch }) }
  }
  const contenido = (c: string) => ({ choices: [{ message: { content: c } }] })

  it('manda la nota de voz como ogg, las instrucciones y el esquema JSON', async () => {
    const { pedidos, ia } = conRespuesta(contenido('{"transcripcion":"x","confianza":0.8,"acciones":[]}'))
    await ia.entender({ ...ENTRADA, texto: undefined, media: { datos: Buffer.from('audio'), mime: 'audio/ogg; codecs=opus' } })
    const cuerpo = JSON.parse(String(pedidos[0].init.body))
    expect(pedidos[0].url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(new Headers(pedidos[0].init.headers).get('Authorization')).toBe('Bearer llave')
    expect(cuerpo.model).toBe('google/gemini-2.5-flash')
    expect(cuerpo.messages[0]).toMatchObject({ role: 'system', content: expect.stringContaining('Huellitas') })
    expect(cuerpo.messages[1].content.at(-1)).toEqual({
      type: 'input_audio',
      input_audio: { data: Buffer.from('audio').toString('base64'), format: 'ogg' },
    })
    expect(cuerpo.response_format.json_schema.schema).toMatchObject({
      type: 'object',
      required: ['transcripcion', 'confianza', 'acciones'],
      properties: { acciones: { type: 'array', items: { type: 'object' } } },
    })
  })

  it('manda la foto como imagen en base64', async () => {
    const { pedidos, ia } = conRespuesta(contenido('{"transcripcion":"x","confianza":0.8,"acciones":[]}'))
    await ia.entender({ ...ENTRADA, media: { datos: Buffer.from('foto'), mime: 'image/jpeg' }, pista: 'factura' })
    const partes = JSON.parse(String(pedidos[0].init.body)).messages[1].content
    expect(partes.at(-1)).toEqual({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${Buffer.from('foto').toString('base64')}` } })
    expect(partes.some((p: { text?: string }) => p.text?.includes('FACTURA'))).toBe(true)
  })

  it('convierte la respuesta en acciones válidas, aunque venga envuelta en ```json', async () => {
    const respuesta = { transcripcion: 'le di la pastilla a Tobi', confianza: 0.9, acciones: [{ tipo: 'dosis', ya_ocurrio: true, tratamiento_id: '100', hora: '14:00' }] }
    const { ia } = conRespuesta(contenido('```json\n' + JSON.stringify(respuesta) + '\n```'))
    const r = await ia.entender(ENTRADA)
    expect(r.acciones).toEqual([{ tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' }])
  })

  it('un error de OpenRouter sale con el estado, para saber si fue falta de créditos', async () => {
    const { ia } = conRespuesta({ error: { message: 'Insufficient credits' } }, 402)
    await expect(ia.entender(ENTRADA)).rejects.toThrow('OpenRouter respondió 402: Insufficient credits')
  })
})
