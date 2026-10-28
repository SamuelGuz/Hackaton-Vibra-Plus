import { describe, expect, it } from 'vitest'
import { WaClient } from '../../src/wa/client'
import type { WaApi } from '../../src/wa/tipos'

interface Llamada {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

function fetchFalso(respuestas: Response[]) {
  const llamadas: Llamada[] = []
  const fetchFn: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers)
    llamadas.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: Object.fromEntries(headers.entries()),
      body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
    })
    const r = respuestas.shift()
    if (!r) throw new Error('fetch inesperado')
    return r
  }
  return { fetchFn, llamadas }
}

const ok = () => new Response(JSON.stringify({ messages: [{ id: 'wamid.OUT' }] }), { status: 200 })
const GRAPH = 'https://graph.facebook.com/v21.0'

describe('WaClient', () => {
  it('implementa WaApi', () => {
    const cliente: WaApi = new WaClient('TOKEN', '106540352242922')
    expect(cliente).toBeInstanceOf(WaClient)
  })

  it('enviarTexto manda un text a /{phoneId}/messages con Bearer', async () => {
    const { fetchFn, llamadas } = fetchFalso([ok()])
    await new WaClient('TOKEN', 'PH1', fetchFn).enviarTexto('573001234567', 'Listo')
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]).toMatchObject({
      url: `${GRAPH}/PH1/messages`,
      method: 'POST',
      headers: { authorization: 'Bearer TOKEN', 'content-type': 'application/json' },
      body: { messaging_product: 'whatsapp', to: '573001234567', type: 'text', text: { body: 'Listo' } },
    })
  })

  it('enviarBotones con 4 botones lanza Error(max 3 botones) y no llama a la red', async () => {
    const { fetchFn, llamadas } = fetchFalso([ok()])
    const cuatro = ['a', 'b', 'c', 'd'].map((id) => ({ id, titulo: id }))
    await expect(new WaClient('T', 'PH1', fetchFn).enviarBotones('57300', '¿Cuál?', cuatro)).rejects.toThrow(new Error('max 3 botones'))
    expect(llamadas).toHaveLength(0)
  })

  it('enviarBotones sigue el formato interactive.type button de Cloud API', async () => {
    const { fetchFn, llamadas } = fetchFalso([ok()])
    await new WaClient('T', 'PH1', fetchFn).enviarBotones('573001234567', '¿De qué animal hablas?', [
      { id: 'animal:TOB01', titulo: 'Tobías' },
      { id: 'animal:MAT01', titulo: 'Mateo' },
    ])
    expect(llamadas[0]?.body).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '573001234567',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: '¿De qué animal hablas?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'animal:TOB01', title: 'Tobías' } },
            { type: 'reply', reply: { id: 'animal:MAT01', title: 'Mateo' } },
          ],
        },
      },
    })
  })

  it('enviarBotones acepta 3 botones y trunca los títulos a 20 caracteres', async () => {
    const { fetchFn, llamadas } = fetchFalso([ok()])
    const largo = 'Confirmar el registro completo'
    await new WaClient('T', 'PH1', fetchFn).enviarBotones('57300', 'x', [
      { id: '1', titulo: largo },
      { id: '2', titulo: 'Corto' },
      { id: '3', titulo: '12345678901234567890' },
    ])
    const botones = (llamadas[0]?.body as { interactive: { action: { buttons: { reply: { title: string } }[] } } }).interactive.action.buttons
    expect(botones.map((b) => b.reply.title)).toEqual([largo.slice(0, 20), 'Corto', '12345678901234567890'])
    expect(botones[0]?.reply.title).toHaveLength(20)
  })

  it('descargarMedia hace 2 llamadas: la URL y luego los bytes con Bearer', async () => {
    const bytes = new Uint8Array([79, 103, 103, 83, 0, 2]).buffer
    const { fetchFn, llamadas } = fetchFalso([
      new Response(JSON.stringify({ url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1', mime_type: 'audio/ogg', id: 'M1' }), { status: 200 }),
      new Response(bytes, { status: 200 }),
    ])
    const r = await new WaClient('TOKEN', 'PH1', fetchFn).descargarMedia('M1')
    expect(llamadas).toHaveLength(2)
    expect(llamadas[0]).toMatchObject({ url: `${GRAPH}/M1`, method: 'GET', headers: { authorization: 'Bearer TOKEN' } })
    expect(llamadas[1]).toMatchObject({
      url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1',
      method: 'GET',
      headers: { authorization: 'Bearer TOKEN' },
    })
    expect(r.mime).toBe('audio/ogg')
    expect(Array.from(new Uint8Array(r.bytes))).toEqual([79, 103, 103, 83, 0, 2])
  })

  it('descargarMedia falla con un mensaje claro si Meta responde error', async () => {
    const { fetchFn } = fetchFalso([new Response('{}', { status: 404 })])
    await expect(new WaClient('T', 'PH1', fetchFn).descargarMedia('M1')).rejects.toThrow('WhatsApp: 404')
  })

  it('enviarPlantilla manda un template con los parámetros en el cuerpo', async () => {
    const { fetchFn, llamadas } = fetchFalso([ok()])
    await new WaClient('T', 'PH1', fetchFn).enviarPlantilla('573001234567', 'cierre_dia_huellitas', ['Andrea', '4'])
    expect(llamadas[0]?.body).toEqual({
      messaging_product: 'whatsapp',
      to: '573001234567',
      type: 'template',
      template: {
        name: 'cierre_dia_huellitas',
        language: { code: 'es' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Andrea' },
              { type: 'text', text: '4' },
            ],
          },
        ],
      },
    })
  })

  it('un error HTTP al enviar se propaga', async () => {
    const { fetchFn } = fetchFalso([new Response('{"error":{}}', { status: 400 })])
    await expect(new WaClient('T', 'PH1', fetchFn).enviarTexto('57300', 'x')).rejects.toThrow('WhatsApp: 400')
  })
})
