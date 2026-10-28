// Cliente de WhatsApp Cloud API (Graph). Los flujos dependen de WaApi; en pruebas entra una falsa.
import type { BotonWa, WaApi } from './tipos'

const GRAPH = 'https://graph.facebook.com/v21.0'
const MAX_BOTONES = 3
const MAX_TITULO = 20

function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

export class WaClient implements WaApi {
  constructor(
    private token: string,
    private phoneId: string,
    private fetchFn: typeof fetch = fetch,
  ) {}

  private async publicar(cuerpo: Record<string, unknown>): Promise<void> {
    const r = await this.fetchFn(`${GRAPH}/${this.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...cuerpo }),
    })
    if (!r.ok) throw new Error(`WhatsApp: ${r.status}`)
  }

  enviarTexto(to: string, cuerpo: string): Promise<void> {
    return this.publicar({ to, type: 'text', text: { body: cuerpo } })
  }

  enviarBotones(to: string, cuerpo: string, botones: BotonWa[]): Promise<void> {
    if (botones.length > MAX_BOTONES) return Promise.reject(new Error('max 3 botones'))
    return this.publicar({
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: cuerpo },
        action: {
          buttons: botones.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.titulo.slice(0, MAX_TITULO) } })),
        },
      },
    })
  }

  async descargarMedia(mediaId: string): Promise<{ bytes: ArrayBuffer; mime: string }> {
    const auth = { Authorization: `Bearer ${this.token}` }
    const meta = await this.fetchFn(`${GRAPH}/${mediaId}`, { headers: auth })
    if (!meta.ok) throw new Error(`WhatsApp: ${meta.status}`)
    const json: unknown = await meta.json()
    if (!esObjeto(json) || typeof json.url !== 'string') throw new Error('WhatsApp: media sin url')
    const archivo = await this.fetchFn(json.url, { headers: auth })
    if (!archivo.ok) throw new Error(`WhatsApp: ${archivo.status}`)
    const mime = typeof json.mime_type === 'string' ? json.mime_type : (archivo.headers.get('content-type') ?? 'application/octet-stream')
    return { bytes: await archivo.arrayBuffer(), mime }
  }

  enviarPlantilla(to: string, nombre: string, params: string[]): Promise<void> {
    return this.publicar({
      to,
      type: 'template',
      template: {
        name: nombre,
        language: { code: 'es' },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    })
  }
}
