// El arranque conecta el frente externo (catálogo, agente de adopciones, campañas) al mismo servidor del equipo.
import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { crearApp } from '../../src/app.js'
import { armarExterno } from '../../src/externo.js'
import { textos } from '../../src/textos.js'
import { crearDeps, LUIS } from '../fakes.js'
import { LlmFalso } from './fakes.js'

const SECRETO = 'secreto-de-prueba'
const PANEL = 'https://panel.huellitas.test'
const ENV = { GEMINI_API_KEY: 'llave-falsa', WA_NUMERO_BOT: '+57 300 111 2233', PANEL_URL: PANEL }

let t: ReturnType<typeof crearDeps>
let llm: LlmFalso

beforeEach(() => {
  t = crearDeps()
  llm = new LlmFalso()
})

function app(env: Record<string, string | undefined> = ENV) {
  return crearApp({
    deps: t.deps,
    externo: armarExterno(env, t.deps, { llm, pausaHumana: async () => {} }),
    usuarioPorSesion: async () => null,
    eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
    leerArchivo: async () => null,
    verifyToken: 'verificar',
    appSecret: SECRETO,
  })
}

function webhook(a: ReturnType<typeof app>, de: string, id: string, texto: string) {
  const cuerpo = JSON.stringify({
    entry: [{ changes: [{ value: { contacts: [{ wa_id: de, profile: { name: 'X' } }], messages: [{ id, from: de, type: 'text', text: { body: texto } }] } }] }],
  })
  const firma = `sha256=${createHmac('sha256', SECRETO).update(cuerpo).digest('hex')}`
  return a.request('/wa', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': firma, 'content-type': 'application/json' } })
}

const enviadosA = (tel: string) => t.wa.enviados.filter((e) => e.telefono === tel)

describe('armar el frente externo', () => {
  it('sin GEMINI_API_KEY no se arma: el bot sigue solo con el equipo', () => {
    expect(armarExterno({ PANEL_URL: PANEL }, t.deps)).toBeUndefined()
  })

  it('con la llave arma catálogo, respuestas y el número público solo con dígitos', () => {
    const e = armarExterno(ENV, t.deps, { llm })!
    expect(e.rag).toBeDefined()
    expect(e.respuestas).toBeDefined()
    expect(e.llm).toBe(llm)
    expect(e.whatsappPublico).toBe('573001112233')
    expect(e.correo.config.urlBase).toBe(PANEL)
    expect(typeof e.pausaHumana).toBe('function')
    // La voz de la página se arma con la misma llave (no se llama a Gemini al armarla)
    expect(typeof e.voz?.hablar).toBe('function')
  })

  it('sin RESEND_API_KEY ni SMTP_HOST no hay quien envíe correos (no se mandan campañas)', () => {
    expect(armarExterno(ENV, t.deps, { llm })!.correo.enviador).toBeNull()
    expect(armarExterno({ ...ENV, RESEND_API_KEY: 're_falsa' }, t.deps, { llm })!.correo.enviador).not.toBeNull()
  })
})

describe('un solo servidor para el equipo y para el público', () => {
  it('el catálogo público responde sin sesión y con los animales de la base', async () => {
    const r = await app().request('/api/publico/rag/perritos')
    expect(r.status).toBe(200)
    const cuerpo = (await r.json()) as { perritos: { nombre: string }[] }
    expect(cuerpo.perritos.map((p) => p.nombre)).toContain('Luna')
  })

  it('la API del panel sigue pidiendo sesión', async () => {
    expect((await app().request('/api/hoy')).status).toBe(401)
  })

  it('el panel (otro origen) puede llamar las rutas públicas', async () => {
    const r = await app().request('/api/publico/rag/perritos', { headers: { Origin: 'http://localhost:5173' } })
    expect(r.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('sin frente externo no hay rutas públicas', async () => {
    expect((await app({ PANEL_URL: PANEL }).request('/api/publico/rag/perritos')).status).toBe(401)
  })

  it('un número desconocido lo atiende el agente, no el aviso del equipo', async () => {
    llm.responder(new Error('sin red en pruebas'))
    const a = app()
    await webhook(a, '573009998877', 'm1', 'hola, quiero adoptar un perrito')
    await a.ociosa()
    const aDesconocido = enviadosA('573009998877')
    expect(aDesconocido.length).toBeGreaterThan(0)
    expect(aDesconocido.map((e) => e.salida.texto)).not.toContain(textos.desconocido)
    expect(t.repo.registros).toHaveLength(0)
  })

  it('alguien del equipo sigue en el menú de siempre', async () => {
    const a = app()
    await webhook(a, LUIS.telefono, 'm2', 'hola')
    await a.ociosa()
    expect(enviadosA(LUIS.telefono).at(-1)?.salida.tipo).toBe('lista')
  })
})

describe('ruta de voz', () => {
  it('/api/publico/voz-adopcion es la misma que /api/publico/agente-voz', async () => {
    const a = app()
    const pedir = (ruta: string) => a.request(ruta, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })
    const [vieja, nueva] = await Promise.all([pedir('/api/publico/agente-voz'), pedir('/api/publico/voz-adopcion')])
    expect(nueva.status).toBe(vieja.status)
    expect(vieja.status).toBe(400)
    expect(await nueva.json()).toEqual(await vieja.json())
  })
})
