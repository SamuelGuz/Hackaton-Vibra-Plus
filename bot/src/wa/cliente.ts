// Cliente mínimo de la WhatsApp Cloud API (Graph API de Meta).
import type { Salida, Wa } from '../tipos.js'
import { esUsuarioWa } from './telefono.js'

export interface ConfigWa {
  token: string
  phoneId: string
  version: string
}

/** Recorta a `max` caracteres: WhatsApp rechaza el mensaje entero si un título se pasa. */
export function recortar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, max - 1)}…`
}

/** Convierte una Salida en el cuerpo que espera la API de Meta. Una imagen necesita el id con que se subió. */
/** Marca el mensaje como leído y muestra "escribiendo…" a la persona */
export function cuerpoEscribiendo(mensajeId: string): Record<string, unknown> {
  return { messaging_product: 'whatsapp', status: 'read', message_id: mensajeId, typing_indicator: { type: 'text' } }
}

export function cuerpoMensaje(telefono: string, s: Salida, mediaId?: string): Record<string, unknown> {
  // A quien no comparte su número se le escribe por su id de usuario: Meta pide `recipient` en vez de `to`
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', ...(esUsuarioWa(telefono) ? { recipient: telefono } : { to: telefono }) }
  switch (s.tipo) {
    case 'imagen':
      if (!mediaId) throw new Error('La imagen se sube primero a Meta')
      return { ...base, type: 'image', image: { id: mediaId, caption: recortar(s.texto, 1024) } }
    case 'texto':
      return { ...base, type: 'text', text: { body: recortar(s.texto, 4096), preview_url: true } }
    case 'botones':
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: recortar(s.texto, 1024) },
          action: {
            buttons: s.botones.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: recortar(b.titulo, 20) } })),
          },
        },
      }
    case 'lista':
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: recortar(s.texto, 1024) },
          action: {
            button: recortar(s.boton, 20),
            sections: [
              {
                title: 'Opciones',
                rows: s.filas.slice(0, 10).map((f) => ({
                  id: f.id,
                  title: recortar(f.titulo, 24),
                  ...(f.descripcion ? { description: recortar(f.descripcion, 72) } : {}),
                })),
              },
            ],
          },
        },
      }
  }
}

export function crearWa(c: ConfigWa): Wa {
  const api = `https://graph.facebook.com/${c.version}`
  const auth = { Authorization: `Bearer ${c.token}` }

  async function subir(datos: Buffer, mime = 'image/png'): Promise<string> {
    const form = new FormData()
    form.append('messaging_product', 'whatsapp')
    form.append('type', mime)
    form.append('file', new Blob([new Uint8Array(datos)], { type: mime }), mime === 'image/png' ? 'informe.png' : 'foto.jpg')
    const r = await fetch(`${api}/${c.phoneId}/media`, { method: 'POST', headers: auth, body: form })
    if (!r.ok) throw new Error(`WhatsApp no aceptó la imagen (${r.status}): ${await r.text()}`)
    return ((await r.json()) as { id: string }).id
  }

  return {
    async enviar(telefono, salida) {
      const mediaId = salida.tipo === 'imagen' ? await subir(salida.png, salida.mime) : undefined
      const r = await fetch(`${api}/${c.phoneId}/messages`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoMensaje(telefono, salida, mediaId)),
      })
      if (!r.ok) throw new Error(`WhatsApp respondió ${r.status}: ${await r.text()}`)
    },

    async escribiendo(mensajeId) {
      const r = await fetch(`${api}/${c.phoneId}/messages`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoEscribiendo(mensajeId)),
      })
      if (!r.ok) throw new Error(`WhatsApp no mostró "escribiendo" (${r.status}): ${await r.text()}`)
    },

    async descargar(mediaId) {
      const info = await fetch(`${api}/${mediaId}`, { headers: auth })
      if (!info.ok) throw new Error(`No se pudo pedir el archivo ${mediaId}: ${info.status}`)
      const { url, mime_type } = (await info.json()) as { url: string; mime_type: string }
      const archivo = await fetch(url, { headers: auth })
      if (!archivo.ok) throw new Error(`No se pudo descargar el archivo ${mediaId}: ${archivo.status}`)
      return { datos: Buffer.from(await archivo.arrayBuffer()), mime: mime_type }
    },
  }
}
