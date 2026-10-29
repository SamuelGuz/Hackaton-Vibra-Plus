// Respaldo del frente externo: si Gemini se queda sin cupo (20 consultas al día en el plan gratis, visto en vivo el 29 oct)
// o se cae, el agente y el lector de comprobantes siguen con OpenRouter.
import { Type } from '@google/genai'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { crearLlmConRespaldo } from '../../src/rag/llm-respaldo.js'
import type { Llm } from '../../src/rag/tipos.js'

const ESQUEMA = { type: Type.OBJECT, properties: { respuesta: { type: Type.STRING } }, required: ['respuesta'] }

function principal(falla: unknown | null): Llm & { llamadas: number } {
  return {
    llamadas: 0,
    async json<T>() {
      this.llamadas++
      if (falla) throw falla
      return { respuesta: 'de Gemini' } as T
    },
    async embeber(textos: string[]) {
      return textos.map(() => [1, 0])
    },
  }
}

function openRouter(contenido = '{"respuesta":"de OpenRouter"}') {
  const pedidos: { url: string; cuerpo: any }[] = []
  const pedir = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, cuerpo: JSON.parse(String(init.body)) })
    return new Response(JSON.stringify({ choices: [{ message: { content: contenido } }] }), { status: 200 })
  }) as unknown as typeof fetch
  return { pedir, pedidos }
}

afterEach(() => vi.restoreAllMocks())

describe('LLM con respaldo', () => {
  it('con Gemini bien, no toca OpenRouter', async () => {
    const g = principal(null)
    const o = openRouter()
    const llm = crearLlmConRespaldo(g, { apiKey: 'k', modelo: 'google/gemini-2.5-flash', fetch: o.pedir })
    expect(await llm.json({ sistema: 's', mensajes: [{ rol: 'user', texto: 'hola' }], esquema: ESQUEMA })).toEqual({ respuesta: 'de Gemini' })
    expect(o.pedidos).toHaveLength(0)
  })

  it('sin cupo en Gemini: responde OpenRouter con el mismo sistema, historial, esquema y foto; y Gemini se salta un rato', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const g = principal(new Error('429 RESOURCE_EXHAUSTED: quota'))
    const o = openRouter()
    let ahora = 0
    const llm = crearLlmConRespaldo(g, { apiKey: 'k', modelo: 'google/gemini-2.5-flash', fetch: o.pedir, ahora: () => ahora })
    const foto = { datos: Buffer.from('jpg'), mime: 'image/jpeg' }
    const r = await llm.json({
      sistema: 'SISTEMA',
      mensajes: [
        { rol: 'user', texto: 'hola' },
        { rol: 'model', texto: 'qué tal' },
        { rol: 'user', texto: 'mira el comprobante' },
      ],
      esquema: ESQUEMA,
      media: foto,
      temperatura: 0,
    })
    expect(r).toEqual({ respuesta: 'de OpenRouter' })
    const { cuerpo } = o.pedidos[0]
    expect(cuerpo.model).toBe('google/gemini-2.5-flash')
    expect(cuerpo.messages[0]).toEqual({ role: 'system', content: 'SISTEMA' })
    expect(cuerpo.messages[1]).toEqual({ role: 'user', content: 'hola' })
    expect(cuerpo.messages[2]).toEqual({ role: 'assistant', content: 'qué tal' })
    expect(cuerpo.messages[3].content).toEqual([
      { type: 'text', text: 'mira el comprobante' },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${foto.datos.toString('base64')}` } },
    ])
    expect(cuerpo.response_format.json_schema.schema).toEqual({ type: 'object', properties: { respuesta: { type: 'string' } }, required: ['respuesta'] })
    // El siguiente mensaje ni intenta Gemini (10 minutos); pasado ese rato, vuelve a probar
    await llm.json({ sistema: 's', mensajes: [{ rol: 'user', texto: 'otra' }], esquema: ESQUEMA })
    expect(g.llamadas).toBe(1)
    ahora = 11 * 60_000
    await llm.json({ sistema: 's', mensajes: [{ rol: 'user', texto: 'otra' }], esquema: ESQUEMA })
    expect(g.llamadas).toBe(2)
  })

  it('un audio va como input_audio', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const o = openRouter()
    const llm = crearLlmConRespaldo(principal(new Error('caído')), { apiKey: 'k', modelo: 'm', fetch: o.pedir })
    await llm.json({ sistema: 's', mensajes: [{ rol: 'user', texto: '(audio)' }], esquema: ESQUEMA, media: { datos: Buffer.from('ogg'), mime: 'audio/ogg; codecs=opus' } })
    expect(o.pedidos[0].cuerpo.messages[1].content[1]).toEqual({ type: 'input_audio', input_audio: { data: Buffer.from('ogg').toString('base64'), format: 'ogg' } })
  })

  it('si los dos fallan, sube el error para que la persona reciba el mensaje amable de siempre', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const pedir = (async () => new Response(JSON.stringify({ error: { message: 'sin créditos' } }), { status: 402 })) as unknown as typeof fetch
    const llm = crearLlmConRespaldo(principal(new Error('caído')), { apiKey: 'k', modelo: 'm', fetch: pedir })
    await expect(llm.json({ sistema: 's', mensajes: [{ rol: 'user', texto: 'x' }], esquema: ESQUEMA })).rejects.toThrow(/OpenRouter/)
  })

  it('los embeddings siguen con Gemini (el buscador cae a palabras si fallan)', async () => {
    const llm = crearLlmConRespaldo(principal(null), { apiKey: 'k', modelo: 'm', fetch: openRouter().pedir })
    expect(await llm.embeber(['a'], 'consulta')).toEqual([[1, 0]])
  })

  it('el arranque arma el respaldo cuando hay OPENROUTER_API_KEY', async () => {
    const { armarExterno } = await import('../../src/externo.js')
    const { crearDeps } = await import('../fakes.js')
    const g = principal(new Error('429 quota'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const conRespaldo = armarExterno({ GEMINI_API_KEY: 'x', OPENROUTER_API_KEY: 'y' }, crearDeps().deps, { llm: g, fetchRespaldo: openRouter().pedir })!
    expect(await conRespaldo.llm.json({ sistema: 's', mensajes: [{ rol: 'user', texto: 'x' }], esquema: ESQUEMA })).toEqual({ respuesta: 'de OpenRouter' })
  })
})
