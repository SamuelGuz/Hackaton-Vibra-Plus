// Respaldo del frente externo (agente, campañas, lector de comprobantes): si Gemini falla, el mismo pedido va a OpenRouter.
// Cuando a Gemini se le acaba la cuota, se salta un rato para no hacer esperar a la persona en cada mensaje.
// Los embeddings siguen con Gemini: si fallan, el buscador cae a palabras.
import type { Schema } from '@google/genai'
import { aJsonSchema, FORMATO_AUDIO } from '../ia/openrouter.js'
import { esFaltaDeCuota, PAUSA_SIN_CUOTA_MS } from '../ia/respaldo.js'
import type { Llm } from './tipos.js'

const URL = 'https://openrouter.ai/api/v1/chat/completions'
const ESPERA_MS = 25_000

export interface ConfigRespaldo {
  apiKey: string
  modelo: string
  fetch?: typeof fetch
  ahora?: () => number
}

type Pedido = Parameters<Llm['json']>[0]
type Parte =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'input_audio'; input_audio: { data: string; format: string } }

/** La foto o el audio van pegados al último mensaje de la persona */
function mensajesDe(p: Pedido) {
  const mensajes: { role: 'system' | 'user' | 'assistant'; content: string | Parte[] }[] = p.mensajes.map((m) => ({
    role: m.rol === 'model' ? 'assistant' : 'user',
    content: m.texto,
  }))
  if (p.media) {
    const mime = p.media.mime.split(';')[0].trim()
    const base64 = p.media.datos.toString('base64')
    const media: Parte = mime.startsWith('image/')
      ? { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }
      : { type: 'input_audio', input_audio: { data: base64, format: FORMATO_AUDIO[mime] ?? mime.split('/')[1] } }
    let ultimo = [...mensajes].reverse().find((m) => m.role === 'user')
    if (!ultimo) mensajes.push((ultimo = { role: 'user', content: '' }))
    const texto = String(ultimo.content)
    ultimo.content = [...(texto ? [{ type: 'text', text: texto } as Parte] : []), media]
  }
  return [{ role: 'system' as const, content: p.sistema }, ...mensajes]
}

async function pedirOpenRouter<T>(c: ConfigRespaldo, p: Pedido): Promise<T> {
  const r = await (c.fetch ?? fetch)(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Refugio Yesenia' },
    body: JSON.stringify({
      model: c.modelo,
      messages: mensajesDe(p),
      response_format: { type: 'json_schema', json_schema: { name: 'respuesta', schema: aJsonSchema(p.esquema as Schema) } },
      provider: { require_parameters: true },
      temperature: p.temperatura ?? 0.7,
    }),
    signal: AbortSignal.timeout(ESPERA_MS),
  })
  const json = (await r.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
  if (!r.ok) throw new Error(`OpenRouter respondió ${r.status}: ${json.error?.message ?? 'sin detalle'}`)
  const texto = json.choices?.[0]?.message?.content?.trim()
  if (!texto) throw new Error('OpenRouter respondió sin contenido')
  return JSON.parse(texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) as T
}

export function crearLlmConRespaldo(principal: Llm, c: ConfigRespaldo): Llm {
  const ahora = c.ahora ?? Date.now
  let pausadoHasta = 0

  return {
    async json<T>(p: Pedido): Promise<T> {
      if (pausadoHasta <= ahora()) {
        try {
          const r = await principal.json<T>(p)
          pausadoHasta = 0
          return r
        } catch (e) {
          const sinCuota = esFaltaDeCuota(e)
          if (sinCuota) pausadoHasta = ahora() + PAUSA_SIN_CUOTA_MS
          console.error(`Gemini falló en el frente externo${sinCuota ? ' (sin cuota, se pausa 10 min)' : ''}; sigue OpenRouter:`, e instanceof Error ? e.message : e)
        }
      }
      return pedirOpenRouter<T>(c, p)
    },
    embeber: (textos, tipo) => principal.embeber(textos, tipo),
  }
}
