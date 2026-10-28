// Respaldo de Gemini por OpenRouter (API compatible con OpenAI). Mismas instrucciones y mismo esquema.
import type { Schema } from '@google/genai'
import type { EntradaIa, Ia } from '../tipos.js'
import { convertir, ESQUEMA, type RespuestaCruda } from './esquema.js'
import { ESPERA_MAXIMA_MS, INSTRUCCIONES, mimeSinParametros, textosDe } from './instrucciones.js'

const URL = 'https://openrouter.ai/api/v1/chat/completions'

/** Tipos de audio de WhatsApp → formato que pide OpenRouter */
const FORMATO_AUDIO: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
}

/** El esquema de Gemini (type: 'OBJECT') en JSON Schema (type: 'object') */
export function aJsonSchema(s: Schema): Record<string, unknown> {
  const r: Record<string, unknown> = {}
  if (s.type) r.type = String(s.type).toLowerCase()
  if (s.description) r.description = s.description
  if (s.enum) r.enum = s.enum
  if (s.required) r.required = s.required
  if (s.items) r.items = aJsonSchema(s.items)
  if (s.properties) r.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, aJsonSchema(v)]))
  return r
}

type Parte =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'input_audio'; input_audio: { data: string; format: string } }

export function partesDe(e: EntradaIa): Parte[] {
  const partes: Parte[] = textosDe(e).map((text) => ({ type: 'text', text }))
  if (e.media) {
    const mime = mimeSinParametros(e.media.mime)
    const base64 = e.media.datos.toString('base64')
    if (mime.startsWith('image/')) partes.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } })
    else partes.push({ type: 'input_audio', input_audio: { data: base64, format: FORMATO_AUDIO[mime] ?? mime.split('/')[1] } })
  }
  return partes
}

/** Algunos modelos envuelven el JSON en ```json … ``` aunque se les pida JSON puro */
function leerJson(texto: string): RespuestaCruda {
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(limpio) as RespuestaCruda
}

export function crearIaOpenRouter(c: { apiKey: string; modelo: string; fetch?: typeof fetch }): Ia {
  const pedir = c.fetch ?? fetch
  return {
    async entender(e: EntradaIa) {
      const r = await pedir(URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${c.apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Refugio Yesenia' },
        body: JSON.stringify({
          model: c.modelo,
          messages: [
            { role: 'system', content: INSTRUCCIONES },
            { role: 'user', content: partesDe(e) },
          ],
          response_format: { type: 'json_schema', json_schema: { name: 'registro', schema: aJsonSchema(ESQUEMA) } },
          // Solo proveedores que respeten el esquema JSON
          provider: { require_parameters: true },
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
      })
      const json = (await r.json().catch(() => ({}))) as {
        choices?: { message?: { content?: string } }[]
        error?: { message?: string }
      }
      if (!r.ok) throw new Error(`OpenRouter respondió ${r.status}: ${json.error?.message ?? 'sin detalle'}`)
      const texto = json.choices?.[0]?.message?.content
      if (!texto) throw new Error('OpenRouter respondió sin contenido')
      return convertir(leerJson(texto), e.datos, e.ahora)
    },
  }
}
