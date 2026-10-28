// Adaptador de Gemini para el agente, las campañas y el RAG: JSON por esquema y embeddings.
import { GoogleGenAI, type Schema } from '@google/genai'
import type { Llm } from './tipos.js'

const ESPERA_JSON_MS = 25_000
const ESPERA_EMBEDDINGS_MS = 15_000
const DIMENSIONES = 256
/** Gemini acepta hasta 100 textos por llamada de embeddings */
const LOTE = 100
const MODELO_EMBEDDINGS = 'gemini-embedding-001'

/** Lo mínimo del cliente de Gemini que se usa; en pruebas se reemplaza por uno falso */
export interface ClienteGenAI {
  models: {
    // `any`: el tipo real de los parámetros es enorme y aquí solo importa la forma que se manda
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generateContent(p: any): Promise<{ text?: string }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    embedContent(p: any): Promise<{ embeddings?: { values?: number[] }[] }>
  }
}

export interface ConfigLlmGemini {
  apiKey: string
  modelo: string
  /** Por defecto gemini-embedding-001 */
  modeloEmbeddings?: string
}

function conTiempoLimite<T>(p: Promise<T>, ms: number, que: string): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error(`${que} no respondió en ${ms / 1000} s`)), ms)
    p.then(
      (v) => (clearTimeout(t), resolver(v)),
      (e) => (clearTimeout(t), rechazar(e)),
    )
  })
}

/** Gemini quiere turnos que alternen y empiecen por el usuario: se juntan los seguidos del mismo rol */
function turnos(mensajes: { rol: 'user' | 'model'; texto: string }[]) {
  const salida: { role: 'user' | 'model'; texto: string }[] = []
  for (const m of mensajes) {
    const ultimo = salida[salida.length - 1]
    if (ultimo && ultimo.role === m.rol) ultimo.texto += `\n${m.texto}`
    else salida.push({ role: m.rol, texto: m.texto })
  }
  if (salida[0]?.role === 'model') salida.unshift({ role: 'user', texto: '(la persona abrió la conversación)' })
  return salida
}

/** Quita las cercas ```json si el modelo las puso a pesar del esquema */
function sinCercas(texto: string): string {
  return texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
}

function normalizarL2(v: number[]): number[] {
  const norma = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  return norma === 0 ? v : v.map((x) => x / norma)
}

export function crearLlmGemini(c: ConfigLlmGemini, cliente?: ClienteGenAI): Llm {
  const ai: ClienteGenAI = cliente ?? new GoogleGenAI({ apiKey: c.apiKey })
  const modeloEmbeddings = c.modeloEmbeddings ?? MODELO_EMBEDDINGS

  return {
    async json<T>(p: Parameters<Llm['json']>[0]): Promise<T> {
      const contents = turnos(p.mensajes).map((t) => ({ role: t.role, parts: [{ text: t.texto }] as { text?: string; inlineData?: { mimeType: string; data: string } }[] }))
      if (p.media) {
        // WhatsApp manda 'audio/ogg; codecs=opus'; Gemini quiere el tipo sin parámetros
        const media = { inlineData: { mimeType: p.media.mime.split(';')[0].trim(), data: p.media.datos.toString('base64') } }
        const ultimoUsuario = [...contents].reverse().find((t) => t.role === 'user')
        if (ultimoUsuario) ultimoUsuario.parts.push(media)
        else contents.push({ role: 'user', parts: [media] })
      }

      const r = await conTiempoLimite(
        ai.models.generateContent({
          model: c.modelo,
          contents,
          config: {
            systemInstruction: p.sistema,
            responseMimeType: 'application/json',
            responseSchema: p.esquema as Schema,
            temperature: p.temperatura ?? 0.7,
          },
        }),
        ESPERA_JSON_MS,
        'Gemini',
      )
      const texto = r.text?.trim()
      if (!texto) throw new Error('Gemini devolvió una respuesta vacía')
      return JSON.parse(sinCercas(texto)) as T
    },

    async embeber(textos, tipo) {
      const salida: number[][] = []
      for (let i = 0; i < textos.length; i += LOTE) {
        const lote = textos.slice(i, i + LOTE)
        const r = await conTiempoLimite(
          ai.models.embedContent({
            model: modeloEmbeddings,
            contents: lote,
            config: { taskType: tipo === 'documento' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY', outputDimensionality: DIMENSIONES },
          }),
          ESPERA_EMBEDDINGS_MS,
          'Gemini (embeddings)',
        )
        const vectores = (r.embeddings ?? []).map((e) => e.values ?? [])
        if (vectores.length !== lote.length || vectores.some((v) => v.length === 0)) {
          throw new Error(`Gemini devolvió ${vectores.length} embeddings para ${lote.length} textos`)
        }
        // Con dimensiones reducidas Gemini no entrega vectores de longitud 1: se normalizan aquí
        salida.push(...vectores.map(normalizarL2))
      }
      return salida
    },
  }
}
