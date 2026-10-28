import { describe, expect, it } from 'vitest'
import { crearLlmGemini, type ClienteGenAI } from '../../src/rag/llm-gemini.js'

function clienteFalso(texto = '{"ok":true}') {
  const generar: any[] = []
  const embeber: any[] = []
  const cliente: ClienteGenAI = {
    models: {
      generateContent: async (p) => (generar.push(p), { text: texto }),
      embedContent: async (p) => (embeber.push(p), { embeddings: (p.contents as string[]).map(() => ({ values: [3, 4] })) }),
    },
  }
  return { cliente, generar, embeber }
}

const conf = { apiKey: 'k', modelo: 'gemini-flash' }

describe('crearLlmGemini.json', () => {
  it('manda sistema, esquema, roles y devuelve el JSON parseado', async () => {
    const { cliente, generar } = clienteFalso()
    const llm = crearLlmGemini(conf, cliente)
    const esquema = { type: 'OBJECT' }
    const r = await llm.json<{ ok: boolean }>({
      sistema: 'Eres cálido', esquema, temperatura: 0.3,
      mensajes: [{ rol: 'user', texto: 'hola' }, { rol: 'model', texto: 'hola, ¿en qué te ayudo?' }, { rol: 'user', texto: 'busco perro' }],
    })
    expect(r).toEqual({ ok: true })
    expect(generar[0]).toMatchObject({
      model: 'gemini-flash',
      config: { systemInstruction: 'Eres cálido', responseMimeType: 'application/json', responseSchema: esquema, temperature: 0.3 },
    })
    expect(generar[0].contents.map((c: any) => c.role)).toEqual(['user', 'model', 'user'])
    expect(generar[0].contents[2].parts).toEqual([{ text: 'busco perro' }])
  })

  it('adjunta el audio al último mensaje del usuario sin parámetros en el mime', async () => {
    const { cliente, generar } = clienteFalso()
    await crearLlmGemini(conf, cliente).json({
      sistema: 's', esquema: {}, mensajes: [{ rol: 'user', texto: 'escucha' }],
      media: { datos: Buffer.from('abc'), mime: 'audio/ogg; codecs=opus' },
    })
    const partes = generar[0].contents[0].parts
    expect(partes[1]).toEqual({ inlineData: { mimeType: 'audio/ogg', data: Buffer.from('abc').toString('base64') } })
  })

  it('junta turnos seguidos del mismo rol y empieza siempre por el usuario', async () => {
    const { cliente, generar } = clienteFalso()
    await crearLlmGemini(conf, cliente).json({
      sistema: 's', esquema: {}, mensajes: [{ rol: 'model', texto: 'Hola, soy Huellitas' }, { rol: 'user', texto: 'a' }, { rol: 'user', texto: 'b' }],
    })
    const c = generar[0].contents
    expect(c[0].role).toBe('user')
    expect(c.map((x: any) => x.role)).toEqual(['user', 'model', 'user'])
    expect(c[2].parts[0].text).toBe('a\nb')
  })

  it('tolera JSON envuelto en ```json', async () => {
    const { cliente } = clienteFalso('```json\n{"ok":true}\n```')
    expect(await crearLlmGemini(conf, cliente).json({ sistema: 's', esquema: {}, mensajes: [{ rol: 'user', texto: 'x' }] })).toEqual({ ok: true })
  })

  it('falla con claridad si Gemini no devuelve texto', async () => {
    const { cliente } = clienteFalso('')
    await expect(crearLlmGemini(conf, cliente).json({ sistema: 's', esquema: {}, mensajes: [{ rol: 'user', texto: 'x' }] })).rejects.toThrow(/vac/i)
  })
})

describe('crearLlmGemini.embeber', () => {
  it('usa el modelo, la tarea y la dimensión pedidos, y normaliza a longitud 1', async () => {
    const { cliente, embeber } = clienteFalso()
    const v = await crearLlmGemini(conf, cliente).embeber(['a', 'b'], 'documento')
    expect(v).toEqual([[0.6, 0.8], [0.6, 0.8]])
    expect(embeber[0]).toMatchObject({ model: 'gemini-embedding-001', contents: ['a', 'b'], config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 256 } })
  })

  it('las consultas usan RETRIEVAL_QUERY y se puede cambiar el modelo', async () => {
    const { cliente, embeber } = clienteFalso()
    await crearLlmGemini({ ...conf, modeloEmbeddings: 'otro' }, cliente).embeber(['q'], 'consulta')
    expect(embeber[0]).toMatchObject({ model: 'otro', config: { taskType: 'RETRIEVAL_QUERY' } })
  })

  it('parte en lotes de 100', async () => {
    const { cliente, embeber } = clienteFalso()
    const v = await crearLlmGemini(conf, cliente).embeber(Array.from({ length: 250 }, (_, i) => `t${i}`), 'documento')
    expect(v).toHaveLength(250)
    expect(embeber.map((e) => e.contents.length)).toEqual([100, 100, 50])
  })

  it('sin textos no llama a Gemini', async () => {
    const { cliente, embeber } = clienteFalso()
    expect(await crearLlmGemini(conf, cliente).embeber([], 'documento')).toEqual([])
    expect(embeber).toHaveLength(0)
  })

  it('falla si Gemini devuelve menos vectores de los pedidos', async () => {
    const cliente: ClienteGenAI = { models: { generateContent: async () => ({ text: '{}' }), embedContent: async () => ({ embeddings: [{ values: [1, 0] }] }) } }
    await expect(crearLlmGemini(conf, cliente).embeber(['a', 'b'], 'documento')).rejects.toThrow(/embeddings/i)
  })
})
