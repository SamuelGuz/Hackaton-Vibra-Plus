// Personas con nombre de usuario de WhatsApp: Meta no manda su número sino un id de la empresa (BSUID), p. ej. "CO.159103206567".
// Caso real (29 oct): "Alejandro Quiroga" escribió "hola" y el bot se cayó tres veces sin responderle (no traía `from`).
import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { crearApp } from '../src/app.js'
import { cuerpoMensaje } from '../src/wa/cliente.js'
import { leerMensajes } from '../src/wa/webhook.js'
import { normalizarTelefono } from '../src/wa/telefono.js'
import { crearDeps } from './fakes.js'
import { LlmFalso, RagFalso } from './externo/fakes.js'

const BSUID = 'CO.159103206567'
const SECRETO = 's'

/** Lo que manda Meta cuando la persona tiene nombre de usuario y no se comparte su número */
const conUsuario = (texto = 'hola', id = 'wamid.HBgTQ08uMTU5MTAzMjA2NTY3') => ({
  entry: [{ changes: [{ value: {
    contacts: [{ user_id: BSUID, profile: { name: 'Alejandro Quiroga' } }],
    messages: [{ id, from_user_id: BSUID, type: 'text', text: { body: texto } }],
  } }] }],
})

describe('mensajes de alguien con nombre de usuario (sin número)', () => {
  it('se leen con su id de usuario y su nombre', () => {
    expect(leerMensajes(conUsuario())).toEqual([{ id: 'wamid.HBgTQ08uMTU5MTAzMjA2NTY3', de: BSUID, nombre: 'Alejandro Quiroga', entrada: { tipo: 'texto', texto: 'hola' } }])
  })

  it('con número, todo sigue igual', () => {
    const m = leerMensajes({ entry: [{ changes: [{ value: { contacts: [{ wa_id: '573001112233', profile: { name: 'Ana' } }], messages: [{ id: 'w1', from: '573001112233', type: 'text', text: { body: 'x' } }] } }] }] })
    expect(m[0]).toMatchObject({ de: '573001112233', nombre: 'Ana' })
  })

  it('un mensaje sin número ni id no tumba nada: se ignora', () => {
    expect(leerMensajes({ entry: [{ changes: [{ value: { messages: [{ id: 'w2', type: 'text', text: { body: 'x' } }] } }] }] })).toEqual([])
  })

  it('a un id de usuario se le responde con "recipient" (Meta no acepta "to" sin número); a un número, con "to"', () => {
    const a = cuerpoMensaje(BSUID, { tipo: 'texto', texto: 'hola' })
    expect(a).toMatchObject({ recipient: BSUID })
    expect(a).not.toHaveProperty('to')
    expect(cuerpoMensaje('573001112233', { tipo: 'texto', texto: 'hola' })).toMatchObject({ to: '573001112233' })
  })

  it('normalizarTelefono no se cae con un id de usuario ni con nada', () => {
    expect(normalizarTelefono(BSUID)).toBe(BSUID)
    expect(normalizarTelefono(undefined as unknown as string)).toBe('')
  })

  it('de punta a punta por el webhook: le llega el menú al id de usuario', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const t = crearDeps()
    const externo = { rag: new RagFalso(), llm: new LlmFalso(), whatsappPublico: null, correo: { config: {} as never, enviador: null } }
    const app = crearApp({
      deps: t.deps, externo, usuarioPorSesion: async () => null,
      eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }), leerArchivo: async () => null, verifyToken: 'v', appSecret: SECRETO,
    })
    const cuerpo = JSON.stringify(conUsuario())
    const firma = `sha256=${createHmac('sha256', SECRETO).update(cuerpo).digest('hex')}`
    expect((await app.request('/wa', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': firma } })).status).toBe(200)
    await app.ociosa()
    const r = t.wa.enviados.filter((x) => x.telefono === BSUID)
    expect(r).toHaveLength(1)
    expect(r[0].salida.tipo).toBe('botones')
    expect(t.repo.buzon.get('wamid.HBgTQ08uMTU5MTAzMjA2NTY3')?.estado).toBe('atendido')
  })

  it('el aviso a la administración no inventa un teléfono con el id de usuario', async () => {
    const { telefonoBonito } = await import('../src/adopciones-agente/textos.js')
    expect(telefonoBonito(BSUID)).toMatch(/usuario de WhatsApp/i)
    expect(telefonoBonito('573001112233')).toBe('+573001112233')
  })
})

