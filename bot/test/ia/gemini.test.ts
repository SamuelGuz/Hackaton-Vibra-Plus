import { describe, expect, it } from 'vitest'
import { leerEnv } from '../../src/env'
import { generarJSON } from '../../src/ia/gemini'

interface Llamada {
  url: string
  method: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

function fetchFalso(respuesta: () => Response) {
  const llamadas: Llamada[] = []
  const fetchFn: typeof fetch = async (input, init) => {
    llamadas.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    })
    return respuesta()
  }
  return { fetchFn, llamadas }
}

/** Respuesta de generateContent cuyo único texto es `texto`. */
function conTexto(texto: string): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: texto }] } }] }), { status: 200 })
}

const env = leerEnv({ SESSION_SECRET: 's', GEMINI_API_KEY: 'llave-de-prueba' })
const esquema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }
const esOk = (x: unknown): x is { ok: boolean } =>
  typeof x === 'object' && x !== null && typeof (x as { ok?: unknown }).ok === 'boolean'

describe('generarJSON', () => {
  it('pide JSON con responseMimeType y responseSchema, y devuelve el objeto', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{"ok":true}'))
    const r = await generarJSON(env, [{ texto: 'hola' }], esquema, 'Eres un extractor', esOk, fetchFn)
    expect(r).toEqual({ ok: true })
    expect(llamadas).toHaveLength(1)
    const [llamada] = llamadas
    expect(llamada?.method).toBe('POST')
    expect(llamada?.body.generationConfig).toMatchObject({ responseMimeType: 'application/json', responseSchema: esquema })
    expect(llamada?.body.systemInstruction).toEqual({ parts: [{ text: 'Eres un extractor' }] })
    expect(llamada?.body.contents).toEqual([{ role: 'user', parts: [{ text: 'hola' }] }])
  })

  it('usa la llave en una cabecera y no en la URL, con el modelo por defecto o el de GEMINI_MODEL', async () => {
    const por = fetchFalso(() => conTexto('{"ok":true}'))
    await generarJSON(env, [{ texto: 'x' }], esquema, 's', esOk, por.fetchFn)
    expect(por.llamadas[0]?.headers['x-goog-api-key']).toBe('llave-de-prueba')
    expect(por.llamadas[0]?.url).not.toContain('llave-de-prueba')
    expect(por.llamadas[0]?.url).toMatch(/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-[\w.-]*flash[\w.-]*:generateContent$/)

    const propio = fetchFalso(() => conTexto('{"ok":true}'))
    const envPropio = leerEnv({ SESSION_SECRET: 's', GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-modelo-x' })
    await generarJSON(envPropio, [{ texto: 'x' }], esquema, 's', esOk, propio.fetchFn)
    expect(propio.llamadas[0]?.url).toContain('/models/gemini-modelo-x:generateContent')
  })

  it('manda el audio como inline_data en base64', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{"ok":true}'))
    const bytes = new Uint8Array([1, 2, 3, 250]).buffer
    await generarJSON(env, [{ texto: 'transcribe' }, { datos: bytes, mime: 'audio/ogg' }], esquema, 's', esOk, fetchFn)
    expect(llamadas[0]?.body.contents).toEqual([
      {
        role: 'user',
        parts: [{ text: 'transcribe' }, { inline_data: { mime_type: 'audio/ogg', data: Buffer.from([1, 2, 3, 250]).toString('base64') } }],
      },
    ])
  })

  it("una respuesta que no es JSON lanza 'IA: respuesta no es JSON'", async () => {
    const { fetchFn } = fetchFalso(() => conTexto('esto no es json'))
    await expect(generarJSON(env, [{ texto: 'x' }], esquema, 's', esOk, fetchFn)).rejects.toThrow('IA: respuesta no es JSON')
  })

  it("una respuesta sin candidatos lanza 'IA: respuesta no es JSON'", async () => {
    const { fetchFn } = fetchFalso(() => new Response(JSON.stringify({ candidates: [] }), { status: 200 }))
    await expect(generarJSON(env, [{ texto: 'x' }], esquema, 's', esOk, fetchFn)).rejects.toThrow('IA: respuesta no es JSON')
  })

  it("un JSON con otra forma lanza 'IA: respuesta con forma inesperada'", async () => {
    const { fetchFn } = fetchFalso(() => conTexto('{"ok":"si"}'))
    await expect(generarJSON(env, [{ texto: 'x' }], esquema, 's', esOk, fetchFn)).rejects.toThrow('IA: respuesta con forma inesperada')
  })

  it('sin GEMINI_API_KEY lanza un error claro y no llama a la red', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{"ok":true}'))
    const sinLlave = leerEnv({ SESSION_SECRET: 's' })
    await expect(generarJSON(sinLlave, [{ texto: 'x' }], esquema, 's', esOk, fetchFn)).rejects.toThrow('IA: falta GEMINI_API_KEY')
    expect(llamadas).toHaveLength(0)
  })

  it('un error HTTP lanza el código sin filtrar el cuerpo ni la llave', async () => {
    const { fetchFn } = fetchFalso(() => new Response('cuerpo con llave-de-prueba', { status: 429 }))
    const error = await generarJSON(env, [{ texto: 'x' }], esquema, 's', esOk, fetchFn).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('IA: error 429')
  })
})
