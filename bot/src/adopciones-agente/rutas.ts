// POST /api/publico/agente-voz: la llamada con el agente desde la página web. Sin sesión del panel; se protege con límite por IP.
import type { Hono } from 'hono'
import { ipDe } from '../rag/limitador.js'
import type { ContextoExterno } from '../rag/tipos.js'
import type { Deps } from '../tipos.js'
import { MAX_AUDIO_BYTES, MAX_TEXTO, obtenerAgente, responderConversacion } from './agente.js'
import { textosAgente } from './textos.js'
import { mimeLimpio } from './whatsapp.js'

/** Un audio de 2 MiB en base64 pesa unos 2,8 MB; el resto del cuerpo es poca cosa */
const MAX_CUERPO = 3_500_000
const SESION_ID = /^[A-Za-z0-9_-]{8,64}$/
const MIME_AUDIO = /^audio\/[a-z0-9.+-]+$/
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

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
  if (!BASE64.test(base64)) return { error: '"audioBase64" no es base64 válido' }
  const datos = Buffer.from(base64, 'base64')
  if (!datos.length) return { error: 'El audio está vacío' }
  if (datos.length > MAX_AUDIO_BYTES) return { error: 'El audio es muy pesado (máximo 2 MB)' }
  const tipo = mimeLimpio(mime)
  if (!MIME_AUDIO.test(tipo)) return { error: '"mime" debe ser un tipo de audio, p. ej. audio/webm' }
  return { ok: { media: { datos, mime: tipo }, sesionId, perroId } }
}

export function montarRutasAgente(app: Hono<any>, deps: Deps, ctx: ContextoExterno): void {
  const agente = obtenerAgente(deps)

  app.post('/api/publico/agente-voz', async (c) => {
    if (!agente.limiteWeb.permitir(ipDe(c.req.raw.headers))) return c.json({ error: textosAgente.limiteWeb }, 429)

    if (Number(c.req.header('content-length') ?? 0) > MAX_CUERPO) return c.json({ error: 'La petición es demasiado grande' }, 400)
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

    const sesionId = entrada.ok.sesionId ?? crypto.randomUUID()
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
      return c.json({
        sesionId,
        transcripcion: r.transcripcion,
        respuesta: r.respuesta,
        guionVoz: r.guionVoz,
        perritos: r.perritos.map((p) => ({ id: p.id, nombre: p.nombre, especie: p.especie, edadTexto: p.edadTexto, foto: p.foto })),
        accion: r.accion,
      })
    } catch (e) {
      console.error('El agente de voz falló:', e)
      return c.json({ error: textosAgente.fallaWeb }, 502)
    }
  })
}
