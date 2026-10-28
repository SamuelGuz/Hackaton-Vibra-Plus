// Cliente mínimo de la WhatsApp Cloud API (Graph API de Meta).
import type { Salida, Wa } from '../tipos.js'

export interface ConfigWa {
  token: string
  phoneId: string
  version: string
}

/** Recorta a `max` caracteres: WhatsApp rechaza el mensaje entero si un título se pasa. */
export function recortar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, max - 1)}…`
}

/** Convierte una Salida en el cuerpo que espera la API de Meta. */
export function cuerpoMensaje(telefono: string, s: Salida): Record<string, unknown> {
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to: telefono }
  switch (s.tipo) {
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

  return {
    async enviar(telefono, salida) {
      const r = await fetch(`${api}/${c.phoneId}/messages`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoMensaje(telefono, salida)),
      })
      if (!r.ok) throw new Error(`WhatsApp respondió ${r.status}: ${await r.text()}`)
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
