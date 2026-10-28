// Webhook de WhatsApp: firma de Meta, parseo del payload e idempotencia por message.id.
import type { Kv } from '../store/kv'
import type { InboundMessage } from './tipos'

const TTL_PROCESADO_SEGUNDOS = 2 * 24 * 60 * 60
const PREFIJO_FIRMA = 'sha256='

function hexABytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function iguales(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

/** Valida el header X-Hub-Signature-256 ("sha256=<hex>") con HMAC-SHA256 y comparación en tiempo constante. */
export async function verificarFirma(cuerpo: string, header: string | null, appSecret: string): Promise<boolean> {
  if (header === null || !header.startsWith(PREFIJO_FIRMA)) return false
  const recibida = hexABytes(header.slice(PREFIJO_FIRMA.length))
  if (!recibida) return false
  const enc = new TextEncoder()
  const llave = await crypto.subtle.importKey('raw', enc.encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const esperada = new Uint8Array(await crypto.subtle.sign('HMAC', llave, enc.encode(cuerpo)))
  return iguales(esperada, recibida)
}

type Obj = Record<string, unknown>

function esObjeto(x: unknown): x is Obj {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function lista(x: unknown): unknown[] {
  return Array.isArray(x) ? x : []
}

function texto(x: unknown): string | undefined {
  return typeof x === 'string' ? x : undefined
}

function aMensaje(m: Obj, nombres: Map<string, string>): InboundMessage | null {
  const id = texto(m.id)
  const from = texto(m.from)
  const timestamp = Number(m.timestamp)
  if (!id || !from || !Number.isFinite(timestamp)) return null
  const nombrePerfil = nombres.get(from)
  // Las claves opcionales sin valor no se incluyen: el mensaje queda exactamente como lo define InboundMessage
  const base = { id, from, timestamp, ...(nombrePerfil !== undefined && { nombrePerfil }) }

  switch (m.type) {
    case 'text': {
      const cuerpo = esObjeto(m.text) ? texto(m.text.body) : undefined
      return cuerpo === undefined ? null : { ...base, tipo: 'texto', texto: cuerpo }
    }
    case 'audio':
    case 'image': {
      const media = m.type === 'audio' ? m.audio : m.image
      const mediaId = esObjeto(media) ? texto(media.id) : undefined
      if (!esObjeto(media) || !mediaId) return null
      const caption = texto(media.caption)
      const mime = texto(media.mime_type)
      return {
        ...base,
        tipo: m.type === 'audio' ? 'audio' : 'imagen',
        mediaId,
        ...(caption !== undefined && { texto: caption }),
        ...(mime !== undefined && { mime }),
      }
    }
    case 'interactive': {
      const respuesta = esObjeto(m.interactive) ? m.interactive.button_reply : undefined
      const botonId = esObjeto(respuesta) ? texto(respuesta.id) : undefined
      if (!esObjeto(respuesta) || !botonId) return null
      const titulo = texto(respuesta.title)
      return { ...base, tipo: 'boton', botonId, ...(titulo !== undefined && { texto: titulo }) }
    }
    default:
      return null
  }
}

function nombresDeContactos(value: Obj): Map<string, string> {
  const nombres = new Map<string, string>()
  for (const c of lista(value.contacts)) {
    if (!esObjeto(c)) continue
    const waId = texto(c.wa_id)
    const nombre = esObjeto(c.profile) ? texto(c.profile.name) : undefined
    if (waId && nombre) nombres.set(waId, nombre)
  }
  return nombres
}

/** Mensajes entrantes de un payload de Meta. Statuses, tipos no soportados y basura devuelven []. */
export function parsearEntrantes(json: unknown): InboundMessage[] {
  if (!esObjeto(json)) return []
  const salida: InboundMessage[] = []
  for (const entry of lista(json.entry)) {
    if (!esObjeto(entry)) continue
    for (const change of lista(entry.changes)) {
      if (!esObjeto(change) || !esObjeto(change.value)) continue
      const nombres = nombresDeContactos(change.value)
      for (const m of lista(change.value.messages)) {
        const msg = esObjeto(m) ? aMensaje(m, nombres) : null
        if (msg) salida.push(msg)
      }
    }
  }
  return salida
}

/**
 * Marca el message.id y dice si ya estaba marcado (Meta reenvía el mismo webhook). TTL 2 días.
 * El camino real no usa esto como “ya está hecho”: el buzón guarda el mensaje y solo lo cierra
 * cuando el registro quedó en la base (`buzon.ts`).
 */
export async function yaProcesado(kv: Kv, messageId: string): Promise<boolean> {
  const esNuevo = await kv.ponerSiNoExiste(`wa:visto:${messageId}`, '1', TTL_PROCESADO_SEGUNDOS)
  return !esNuevo
}
