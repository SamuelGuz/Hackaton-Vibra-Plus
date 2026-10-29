// POST /api/publico/agente-voz: la llamada con el agente desde la página web. Sin sesión del panel; se protege con límite por IP.
// /api/publico/voz-adopcion es el mismo handler con otro nombre, mientras el frontend se pasa a uno solo.
import type { Context, Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { cors } from 'hono/cors'
import { ipDe } from '../rag/limitador.js'
import type { ContextoExterno } from '../rag/tipos.js'
import type { Deps } from '../tipos.js'
import { MAX_AUDIO_BYTES, MAX_TEXTO, obtenerAgente, responderConversacion } from './agente.js'
import { textosAgente } from './textos.js'
import { mimeLimpio } from './whatsapp.js'

/** Un audio de 2 MiB en base64 pesa unos 2,8 MB; el resto del cuerpo es poca cosa */
const MAX_CUERPO = 3_500_000
const SESION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MIME_AUDIO = /^audio\/[a-z0-9.+-]+$/
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/
const MIME_ADMITIDOS = new Set(['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr', 'audio/wav', 'audio/webm', 'audio/3gpp'])

type Entrada = { ok: { texto?: string; media?: { datos: Buffer; mime: string }; sesionId?: string; perroId?: string } } | { error: string }

function leerCuerpo(c: unknown): Entrada {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { error: 'Se espera un objeto JSON con "texto" o "audioBase64"' }
  const b = c as Record<string, unknown>
  if (b.texto !== undefined && typeof b.texto !== 'string') return { error: '"texto" debe ser texto' }
  if (b.sesionId !== undefined && b.sesionId !== null && (typeof b.sesionId !== 'string' || !SESION_ID.test(b.sesionId))) {
    return { error: '"sesionId" no tiene un formato válido' }
  }
  const sesionId = typeof b.sesionId === 'string' ? b.sesionId : undefined
  const perroId = typeof b.perroId === 'string' && b.perroId.length <= 40 ? b.perroId : undefined

  const texto = typeof b.texto === 'string' ? b.texto.trim() : ''
  if (texto) {
    if (texto.length > MAX_TEXTO) return { error: `El texto es muy largo (máximo ${MAX_TEXTO} caracteres)` }
    return { ok: { texto, sesionId, perroId } }
  }

  if (b.audioBase64 !== undefined && typeof b.audioBase64 !== 'string') return { error: '"audioBase64" debe ser texto en base64' }
  let base64 = typeof b.audioBase64 === 'string' ? b.audioBase64.trim() : ''
  if (!base64) return { error: 'Falta "texto" o "audioBase64"' }
  let mime = typeof b.mime === 'string' ? b.mime : 'audio/webm'
  const dataUrl = /^data:([^;,]+)(?:;[^,]*)?;base64,/.exec(base64)
  if (dataUrl) {
    if (typeof b.mime !== 'string') mime = dataUrl[1]
    base64 = base64.slice(dataUrl[0].length)
  }
  if (base64.length > Math.ceil((MAX_AUDIO_BYTES * 4) / 3) + 8) return { error: 'El audio es muy pesado (máximo 2 MB)' }
  if (!BASE64.test(base64) || base64.length % 4 === 1 || Buffer.from(base64, 'base64').toString('base64').replace(/=+$/, '') !== base64.replace(/=+$/, '')) return { error: '"audioBase64" no es base64 válido' }
  const datos = Buffer.from(base64, 'base64')
  if (!datos.length) return { error: 'El audio está vacío' }
  if (datos.length > MAX_AUDIO_BYTES) return { error: 'El audio es muy pesado (máximo 2 MB)' }
  const tipo = mimeLimpio(mime)
  if (!MIME_AUDIO.test(tipo) || !MIME_ADMITIDOS.has(tipo)) return { error: '"mime" debe ser un tipo de audio admitido, p. ej. audio/webm' }
  return { ok: { media: { datos, mime: tipo }, sesionId, perroId } }
}

export function montarRutasAgente(app: Hono<any>, deps: Deps, ctx: ContextoExterno): void {
  const agente = obtenerAgente(deps)
  const sesionesEmitidas = new Map<string, number>()
  let ventanaGlobal = deps.ahora().getTime()
  let solicitudesGlobales = 0
  app.use('/api/publico/agente-voz', cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'], allowHeaders: ['Content-Type'] }))
  app.use('/api/publico/voz-adopcion', cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'], allowHeaders: ['Content-Type'] }))

  /** El guion como WAV en base64, o null si no hay voz o falló: el texto se responde igual */
  const decir = async (guion: string): Promise<{ mime: string; base64: string } | null> => {
    if (!ctx.voz || !guion.trim()) return null
    try {
      const a = await ctx.voz.hablar(guion)
      return { mime: a.mime, base64: a.datos.toString('base64') }
    } catch (e) {
      console.error('La voz del agente falló:', e instanceof Error ? e.message : e)
      return null
    }
  }

  const atender = async (c: Context) => {
    c.header('Cache-Control', 'no-store')
    if (!agente.limiteWeb.permitir(ipDe(c.req.raw.headers))) return c.json({ error: textosAgente.limiteWeb }, 429)

    const ahora = deps.ahora().getTime()
    if (ahora - ventanaGlobal >= 60_000) { ventanaGlobal = ahora; solicitudesGlobales = 0 }
    if (solicitudesGlobales >= 300) return c.json({ error: textosAgente.limiteWeb }, 429)

    if (Number(c.req.header('content-length') ?? 0) > MAX_CUERPO) return c.json({ error: 'La petición es demasiado grande' }, 400)
    const contentType = c.req.header('content-type')?.split(';', 1)[0].trim().toLowerCase()
    if (contentType !== 'application/json') return c.json({ error: 'El content-type debe ser application/json' }, 415)
    const bruto = await c.req.text().catch(() => null)
    if (bruto === null || bruto.length > MAX_CUERPO) return c.json({ error: 'No se pudo leer la petición' }, 400)
    let json: unknown
    try {
      json = JSON.parse(bruto)
    } catch {
      return c.json({ error: 'El cuerpo no es JSON válido' }, 400)
    }
    const entrada = leerCuerpo(json)
    if ('error' in entrada) return c.json({ error: entrada.error }, 400)
    for (const [id, creada] of sesionesEmitidas) if (ahora - creada > 6 * 60 * 60_000) sesionesEmitidas.delete(id)
    if (entrada.ok.sesionId && !sesionesEmitidas.has(entrada.ok.sesionId)) return c.json({ error: 'La sesión no existe o venció; inicia una conversación nueva' }, 400)
    // Con "conAudio": true la respuesta trae el guion dicho como WAV (unos segundos más de espera)
    const conAudio = (json as Record<string, unknown>).conAudio
    if (conAudio !== undefined && typeof conAudio !== 'boolean') return c.json({ error: '"conAudio" debe ser true o false' }, 400)

    const sesionId = entrada.ok.sesionId ?? randomUUID()
    solicitudesGlobales++
    try {
      const r = await responderConversacion({
        deps,
        ctx,
        clave: `web:${sesionId}`,
        canal: { tipo: 'web' },
        texto: entrada.ok.texto,
        media: entrada.ok.media,
        perroId: entrada.ok.perroId,
      })
      if (sesionesEmitidas.size >= 500 && !sesionesEmitidas.has(sesionId)) return c.json({ error: textosAgente.limiteWeb }, 429)
      sesionesEmitidas.set(sesionId, ahora)
      return c.json({
        sesionId,
        transcripcion: r.transcripcion,
        respuesta: r.respuesta,
        guionVoz: r.guionVoz,
        perritos: r.perritos.map((p) => ({ id: p.id, nombre: p.nombre, especie: p.especie, edadTexto: p.edadTexto, foto: p.foto })),
        accion: r.accion,
        ...(conAudio ? { audio: await decir(r.guionVoz) } : {}),
      })
    } catch (e) {
      console.error('El agente de voz falló:', e)
      return c.json({ error: textosAgente.fallaWeb }, 502)
    }
  }
  app.post('/api/publico/agente-voz', atender)
  app.post('/api/publico/voz-adopcion', atender)
}
