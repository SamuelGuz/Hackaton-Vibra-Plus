// Cliente mínimo de Gemini (REST generateContent) que devuelve JSON validado. Los flujos no lo usan
// directo: pasan por extractor/comprobante/redactor. Con texto, el llamador aplica quitarDatosSensibles.
import type { Env } from '../env'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODELO_POR_DEFECTO = 'gemini-flash-latest'

export type ParteIa = { texto: string } | { datos: ArrayBuffer; mime: string }

function aParteGemini(parte: ParteIa): Record<string, unknown> {
  if ('texto' in parte) return { text: parte.texto }
  return { inline_data: { mime_type: parte.mime, data: Buffer.from(parte.datos).toString('base64') } }
}

function textoDeLaRespuesta(respuesta: unknown): string | undefined {
  const candidatos = (respuesta as { candidates?: unknown } | null)?.candidates
  if (!Array.isArray(candidatos)) return undefined
  const partes = (candidatos[0] as { content?: { parts?: unknown } } | undefined)?.content?.parts
  if (!Array.isArray(partes)) return undefined
  const texto = (partes[0] as { text?: unknown } | undefined)?.text
  return typeof texto === 'string' ? texto : undefined
}

export async function generarJSON<T>(
  env: Env,
  partes: ParteIa[],
  esquema: object,
  sistema: string,
  esValido: (x: unknown) => x is T,
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  if (!env.GEMINI_API_KEY) throw new Error('IA: falta GEMINI_API_KEY')
  const modelo = env.GEMINI_MODEL ?? MODELO_POR_DEFECTO

  const r = await fetchFn(`${BASE}/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: 'user', parts: partes.map(aParteGemini) }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: esquema, temperature: 0 },
    }),
  })
  // Solo el código: el cuerpo del error puede repetir el prompt (datos del albergue).
  if (!r.ok) throw new Error(`IA: error ${r.status}`)

  const texto = textoDeLaRespuesta(await r.json().catch(() => undefined))
  if (texto === undefined) throw new Error('IA: respuesta no es JSON')
  let valor: unknown
  try {
    valor = JSON.parse(texto)
  } catch {
    throw new Error('IA: respuesta no es JSON')
  }
  if (!esValido(valor)) throw new Error('IA: respuesta con forma inesperada')
  return valor
}
