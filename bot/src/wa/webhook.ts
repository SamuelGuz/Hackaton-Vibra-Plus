// Lectura del webhook de WhatsApp: firma de Meta y mensajes que trae.
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Entrada } from '../tipos.js'

/** Revisa la cabecera X-Hub-Signature-256 contra el cuerpo crudo. */
export function firmaValida(cuerpo: string, cabecera: string | undefined, secreto: string): boolean {
  if (!cabecera?.startsWith('sha256=')) return false
  const esperada = createHmac('sha256', secreto).update(cuerpo, 'utf8').digest()
  const recibida = Buffer.from(cabecera.slice('sha256='.length), 'hex')
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada)
}

export interface MensajeWa {
  /** id de Meta, para no atender dos veces el mismo mensaje */
  id: string
  /** Número de quien escribe, solo dígitos con indicativo */
  de: string
  /** Nombre de perfil de WhatsApp */
  nombre: string | null
  entrada: Entrada
}

type Json = Record<string, any>

function entradaDe(m: Json): Entrada {
  switch (m.type) {
    case 'text':
      return { tipo: 'texto', texto: String(m.text?.body ?? '') }
    case 'audio':
      return { tipo: 'audio', mediaId: m.audio.id, mime: m.audio.mime_type ?? 'audio/ogg' }
    case 'image':
      return { tipo: 'imagen', mediaId: m.image.id, mime: m.image.mime_type ?? 'image/jpeg', texto: m.image.caption }
    case 'interactive': {
      const r = m.interactive?.button_reply ?? m.interactive?.list_reply
      return r ? { tipo: 'boton', id: String(r.id), titulo: String(r.title ?? '') } : { tipo: 'otro' }
    }
    case 'button':
      // Respuesta rápida de una plantilla
      return { tipo: 'boton', id: String(m.button?.payload ?? ''), titulo: String(m.button?.text ?? '') }
    default:
      return { tipo: 'otro' }
  }
}

/** Saca los mensajes entrantes del cuerpo del webhook. Los avisos de "entregado" o "leído" se ignoran. */
export function leerMensajes(cuerpo: Json): MensajeWa[] {
  const lista: MensajeWa[] = []
  for (const entry of cuerpo?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const v = change?.value
      if (!v?.messages) continue
      const nombres = new Map<string, string>()
      for (const c of v.contacts ?? []) nombres.set(c.wa_id, c.profile?.name)
      for (const m of v.messages) {
        lista.push({ id: m.id, de: m.from, nombre: nombres.get(m.from) ?? null, entrada: entradaDe(m) })
      }
    }
  }
  return lista
}
