import { afterEach, describe, expect, it, vi } from 'vitest'
import { leerEnv } from '../../src/env'
import { crearLlmGemini } from '../../src/rag/llm-gemini'

interface Llamada {
  url: string
  headers: Record<string, string>
  body: any
}

/** fetch falso: guarda cada llamada y responde con lo que devuelva `responder`; respeta la señal de cancelación */
function fetchFalso(responder: (llamada: Llamada) => Response | Promise<Response>) {
  const llamadas: Llamada[] = []
  const fetchFn: typeof fetch = (input, init) => {
    const llamada: Llamada = {
      url: String(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: JSON.parse(String(init?.body)),
    }
    llamadas.push(llamada)
    return new Promise<Response>((resolver, rechazar) => {
      init?.signal?.addEventListener('abort', () => rechazar(new DOMException('aborted', 'AbortError')))
      Promise.resolve(responder(llamada)).then(resolver, rechazar)
    })
  }
  return { fetchFn, llamadas }
}

const conTexto = (texto: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: texto }] } }] }), { status: 200 })
const env = leerEnv({ SESSION_SECRET: 's', GEMINI_API_KEY: 'llave-de-prueba' })

afterEach(() => vi.useRealTimers())

describe('crearLlmGemini.json', () => {
  it('va por generateContent REST con sistema, esquema y la temperatura pedida, y devuelve el JSON parseado', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{"ok":true}'))
    const esquema = { type: 'OBJECT' }
    const r = await crearLlmGemini(env, fetchFn).json<{ ok: boolean }>({
      sistema: 'Eres cálido', esquema, temperatura: 0.3, mensajes: [{ rol: 'user', texto: 'busco perro' }],
    })
    expect(r).toEqual({ ok: true })
    const [l] = llamadas
    expect(l?.url).toMatch(/\/v1beta\/models\/[\w.-]+:generateContent$/)
    expect(l?.headers['x-goog-api-key']).toBe('llave-de-prueba')
    expect(l?.url).not.toContain('llave-de-prueba')
    expect(l?.body.systemInstruction).toEqual({ parts: [{ text: 'Eres cálido' }] })
    expect(l?.body.generationConfig).toMatchObject({ responseMimeType: 'application/json', responseSchema: esquema, temperature: 0.3 })
  })

  it('sin temperatura usa 0.7 (conversación del agente)', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{}'))
    await crearLlmGemini(env, fetchFn).json({ sistema: 's', esquema: {}, mensajes: [{ rol: 'user', texto: 'x' }] })
    expect(llamadas[0]?.body.generationConfig.temperature).toBe(0.7)
  })

  it('el historial va como partes de texto con rótulo, en orden, en un solo turno de usuario', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{}'))
    await crearLlmGemini(env, fetchFn).json({
      sistema: 's', esquema: {},
      mensajes: [{ rol: 'model', texto: 'Hola, soy Huellitas' }, { rol: 'user', texto: 'busco perro' }, { rol: 'model', texto: '¿Qué tamaño?' }, { rol: 'user', texto: 'mediano' }],
    })
    const contents = llamadas[0]?.body.contents
    expect(contents).toHaveLength(1)
    expect(contents[0].role).toBe('user')
    expect(contents[0].parts).toEqual([
      { text: 'Huellitas: Hola, soy Huellitas' },
      { text: 'Persona: busco perro' },
      { text: 'Huellitas: ¿Qué tamaño?' },
      { text: 'Persona: mediano' },
    ])
  })

  it('PRIVACIDAD: quita teléfonos, correos y cédulas de lo que escribió la persona antes de enviarlo', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{}'))
    await crearLlmGemini(env, fetchFn).json({
      sistema: 's', esquema: {},
      mensajes: [{ rol: 'user', texto: 'Soy Ana, mi cel es 300 123 4567 y mi correo ana@correo.co, cédula 1098765432' }],
    })
    const enviado = JSON.stringify(llamadas[0]?.body)
    expect(enviado).not.toMatch(/4567|ana@correo|1098765432/)
    expect(enviado).toContain('[tel]')
    expect(enviado).toContain('[email]')
  })

  it('adjunta el audio como inline_data en base64, sin parámetros en el mime, después del texto', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{}'))
    await crearLlmGemini(env, fetchFn).json({
      sistema: 's', esquema: {}, mensajes: [{ rol: 'user', texto: 'escucha' }],
      media: { datos: Buffer.from('abc'), mime: 'audio/ogg; codecs=opus' },
    })
    const partes = llamadas[0]?.body.contents[0].parts
    expect(partes).toHaveLength(2)
    expect(partes[1]).toEqual({ inline_data: { mime_type: 'audio/ogg', data: Buffer.from('abc').toString('base64') } })
  })

  it('el audio de un Buffer que es parte de un pool se manda completo y sin bytes de más', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{}'))
    const grande = Buffer.from('xxabcxx')
    await crearLlmGemini(env, fetchFn).json({ sistema: 's', esquema: {}, mensajes: [], media: { datos: grande.subarray(2, 5), mime: 'audio/ogg' } })
    expect(llamadas[0]?.body.contents[0].parts[0].inline_data.data).toBe(Buffer.from('abc').toString('base64'))
  })

  it('sin GEMINI_API_KEY falla con un error claro y sin llamar a la red', async () => {
    const { fetchFn, llamadas } = fetchFalso(() => conTexto('{}'))
    const sinLlave = leerEnv({ SESSION_SECRET: 's' })
    await expect(crearLlmGemini(sinLlave, fetchFn).json({ sistema: 's', esquema: {}, mensajes: [{ rol: 'user', texto: 'x' }] })).rejects.toThrow('IA: falta GEMINI_API_KEY')
    expect(llamadas).toHaveLength(0)
  })

  it('un error HTTP lanza solo el código: el cuerpo puede repetir el mensaje de la persona', async () => {
    const { fetchFn } = fetchFalso(() => new Response('cuerpo con busco perro', { status: 429 }))
    const error = await crearLlmGemini(env, fetchFn).json({ sistema: 's', esquema: {}, mensajes: [{ rol: 'user', texto: 'busco perro' }] }).catch((e: unknown) => e)
    expect((error as Error).message).toBe('IA: error 429')
  })

  it('una respuesta que no es un objeto JSON falla con IA: respuesta con forma inesperada', async () => {
    const { fetchFn } = fetchFalso(() => conTexto('"hola"'))
    await expect(crearLlmGemini(env, fetchFn).json({ sistema: 's', esquema: {}, mensajes: [{ rol: 'user', texto: 'x' }] })).rejects.toThrow('IA: respuesta con forma inesperada')
  })

  it('si Gemini no responde en 25 s, corta con un error claro', async () => {
    vi.useFakeTimers()
    const { fetchFn } = fetchFalso(() => new Promise<Response>(() => {}))
    const pendiente = crearLlmGemini(env, fetchFn).json({ sistema: 's', esquema: {}, mensajes: [{ rol: 'user', texto: 'x' }] }).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(25_000)
    expect(((await pendiente) as Error).message).toMatch(/no respondió en 25 s/)
  })
})

describe('crearLlmGemini.embeber', () => {
  const vectores = (n: number) => new Response(JSON.stringify({ embeddings: Array.from({ length: n }, () => ({ values: [3, 4] })) }), { status: 200 })
  const embeddingsFalso = () => fetchFalso((l) => vectores(l.body.requests.length))

  it('usa batchEmbedContents con el modelo, la tarea y la dimensión pedidos, y normaliza a longitud 1', async () => {
    const { fetchFn, llamadas } = embeddingsFalso()
    const v = await crearLlmGemini(env, fetchFn).embeber(['a', 'b'], 'documento')
    expect(v).toEqual([[0.6, 0.8], [0.6, 0.8]])
    const [l] = llamadas
    expect(l?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents')
    expect(l?.headers['x-goog-api-key']).toBe('llave-de-prueba')
    expect(l?.body).toEqual({
      requests: ['a', 'b'].map((text) => ({
        model: 'models/gemini-embedding-001', content: { parts: [{ text }] }, taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 256,
      })),
    })
  })

  it('las consultas usan RETRIEVAL_QUERY', async () => {
    const { fetchFn, llamadas } = embeddingsFalso()
    await crearLlmGemini(env, fetchFn).embeber(['q'], 'consulta')
    expect(llamadas[0]?.body.requests[0].taskType).toBe('RETRIEVAL_QUERY')
  })

  it('parte en lotes de 100', async () => {
    const { fetchFn, llamadas } = embeddingsFalso()
    const v = await crearLlmGemini(env, fetchFn).embeber(Array.from({ length: 250 }, (_, i) => `t${i}`), 'documento')
    expect(v).toHaveLength(250)
    expect(llamadas.map((l) => l.body.requests.length)).toEqual([100, 100, 50])
  })

  it('sin textos no llama a Gemini', async () => {
    const { fetchFn, llamadas } = embeddingsFalso()
    expect(await crearLlmGemini(env, fetchFn).embeber([], 'documento')).toEqual([])
    expect(llamadas).toHaveLength(0)
  })

  it('falla si Gemini devuelve menos vectores de los pedidos', async () => {
    const { fetchFn } = fetchFalso(() => vectores(1))
    await expect(crearLlmGemini(env, fetchFn).embeber(['a', 'b'], 'documento')).rejects.toThrow(/embeddings/i)
  })

  it('sin GEMINI_API_KEY lanza IA: falta GEMINI_API_KEY (la búsqueda cae a modo léxico)', async () => {
    const { fetchFn, llamadas } = embeddingsFalso()
    const sinLlave = leerEnv({ SESSION_SECRET: 's' })
    await expect(crearLlmGemini(sinLlave, fetchFn).embeber(['a'], 'documento')).rejects.toThrow('IA: falta GEMINI_API_KEY')
    expect(llamadas).toHaveLength(0)
  })

  it('un error HTTP lanza solo el código, sin el texto enviado ni el cuerpo', async () => {
    const { fetchFn } = fetchFalso(() => new Response('eco: texto secreto de la consulta', { status: 500 }))
    const error = await crearLlmGemini(env, fetchFn).embeber(['texto secreto de la consulta'], 'consulta').catch((e: unknown) => e)
    expect((error as Error).message).toBe('IA: error 500')
  })

  it('si Gemini no responde en 25 s, corta con un error claro', async () => {
    vi.useFakeTimers()
    const { fetchFn } = fetchFalso(() => new Promise<Response>(() => {}))
    const pendiente = crearLlmGemini(env, fetchFn).embeber(['a'], 'documento').catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(25_000)
    expect(((await pendiente) as Error).message).toMatch(/no respondió en 25 s/)
  })
})
