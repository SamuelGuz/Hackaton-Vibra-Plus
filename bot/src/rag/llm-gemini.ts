// Adaptador de Gemini para el agente, las campañas y el RAG: JSON por esquema y embeddings, por REST.
// El JSON pasa por `generarJSON` de ia/gemini.ts (misma llave, mismo modelo, mismas reglas de error);
// los embeddings van por batchEmbedContents. Sin SDK: master no depende de @google/genai.
import type { Env } from '../env'
import { generarJSON, type ParteIa } from '../ia/gemini'
import { quitarDatosSensibles } from '../ia/redact'
import type { Llm } from './tipos'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODELO_EMBEDDINGS = 'gemini-embedding-001'
const DIMENSIONES = 256
/** Gemini acepta hasta 100 textos por llamada de embeddings */
const LOTE = 100
const ESPERA_MS = 25_000
const TEMPERATURA_POR_DEFECTO = 0.7

/** Quién habló, para que Gemini entienda el historial aunque llegue en un solo turno */
const ROTULO = { user: 'Persona', model: 'Huellitas' } as const

/**
 * Corre `hacer` con un `fetch` que se cancela a los 25 s. Cubre también la lectura del cuerpo,
 * porque el temporizador solo se apaga cuando `hacer` termina.
 */
async function conLimite<T>(fetchFn: typeof fetch, hacer: (f: typeof fetch) => Promise<T>): Promise<T> {
  const control = new AbortController()
  const temporizador = setTimeout(() => control.abort(), ESPERA_MS)
  try {
    return await hacer((entrada, init) => fetchFn(entrada, { ...init, signal: control.signal }))
  } catch (e) {
    // Mensaje propio: el error de cancelación del runtime no dice quién tardó
    if (control.signal.aborted) throw new Error(`IA: Gemini no respondió en ${ESPERA_MS / 1000} s`)
    throw e
  } finally {
    clearTimeout(temporizador)
  }
}

function normalizarL2(v: number[]): number[] {
  const norma = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  return norma === 0 ? v : v.map((x) => x / norma)
}

/** Los esquemas de los llamadores ya se validan en código: aquí basta con que sea un objeto JSON */
const esObjeto = <T>(x: unknown): x is T => typeof x === 'object' && x !== null

/** Una copia exacta de los bytes: el `ArrayBuffer` de un Buffer puede ser un pool compartido con otros datos */
function aArrayBuffer(b: Buffer): ArrayBuffer {
  const copia = new ArrayBuffer(b.byteLength)
  new Uint8Array(copia).set(b)
  return copia
}

export function crearLlmGemini(env: Env, fetchFn: typeof fetch = fetch): Llm {
  return {
    async json<T>(p: Parameters<Llm['json']>[0]): Promise<T> {
      // Privacidad (S8): lo que escribió una persona pierde teléfonos, correos, cédulas y direcciones antes de salir.
      // Lo del modelo y el `sistema` los armamos nosotros desde datos ya públicos.
      const partes: ParteIa[] = p.mensajes.map((m) => ({
        texto: `${ROTULO[m.rol]}: ${m.rol === 'user' ? quitarDatosSensibles(m.texto) : m.texto}`,
      }))
      if (p.media) {
        // WhatsApp manda 'audio/ogg; codecs=opus'; Gemini quiere el tipo sin parámetros
        partes.push({ datos: aArrayBuffer(p.media.datos), mime: p.media.mime.split(';')[0]?.trim() ?? p.media.mime })
      }
      return conLimite(fetchFn, (f) =>
        generarJSON<T>(env, partes, p.esquema as object, p.sistema, esObjeto<T>, f, { temperatura: p.temperatura ?? TEMPERATURA_POR_DEFECTO }),
      )
    },

    async embeber(textos, tipo) {
      if (textos.length === 0) return []
      if (!env.GEMINI_API_KEY) throw new Error('IA: falta GEMINI_API_KEY')
      const llave = env.GEMINI_API_KEY
      const salida: number[][] = []
      for (let i = 0; i < textos.length; i += LOTE) {
        const lote = textos.slice(i, i + LOTE)
        const vectores = await conLimite(fetchFn, async (f) => {
          const r = await f(`${BASE}/${MODELO_EMBEDDINGS}:batchEmbedContents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': llave },
            body: JSON.stringify({
              requests: lote.map((text) => ({
                model: `models/${MODELO_EMBEDDINGS}`,
                content: { parts: [{ text }] },
                taskType: tipo === 'documento' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY',
                outputDimensionality: DIMENSIONES,
              })),
            }),
          })
          // Solo el código: el cuerpo del error puede repetir el texto enviado
          if (!r.ok) throw new Error(`IA: error ${r.status}`)
          const cuerpo = (await r.json().catch(() => undefined)) as { embeddings?: { values?: number[] }[] } | undefined
          return (cuerpo?.embeddings ?? []).map((e) => e.values ?? [])
        })
        if (vectores.length !== lote.length || vectores.some((v) => v.length === 0)) {
          throw new Error(`IA: Gemini devolvió ${vectores.length} embeddings para ${lote.length} textos`)
        }
        // Con dimensiones reducidas Gemini no entrega vectores de longitud 1: se normalizan aquí
        salida.push(...vectores.map(normalizarL2))
      }
      return salida
    },
  }
}
