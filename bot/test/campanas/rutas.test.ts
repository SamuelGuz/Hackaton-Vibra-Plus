import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { montarRutasCampanas } from '../../src/campanas/rutas'
import type { ConfigCorreo, Correo } from '../../src/campanas/tipos'
import type { ContextoExterno } from '../../src/rag/tipos'
import { LlmFalso, MATEO, RagFalso, TOBY } from '../externo/fakes'
import { CLAVE, CONFIG, CorreoFalso } from './fakes'

const RUTA = '/api/publico/campanas'
const CON_CLAVE = { 'x-campana-clave': CLAVE }
const BORRADOR = {
  asunto: 'Mateo y Toby esperan a alguien que los quiera',
  preheader: 'Una ayuda que cambia su día',
  saludo: 'Hola,',
  parrafos: ['Mateo ya camina solito y Toby mueve la cola con todos.'],
  llamado_texto: 'Quiero apadrinar',
}

/** Forma de las respuestas JSON que leen estas pruebas (Response.json() devuelve unknown) */
interface RespuestaRuta {
  campana: { asunto: string; perritos: { nombre: string }[] }
  asunto: string
  html: string
  texto: string
  modo: string
  destinatarios: string[]
  enviados: number
  fallidos: { para: string; error: string }[]
}

function leer(r: Response): Promise<RespuestaRuta> {
  return r.json() as Promise<RespuestaRuta>
}

let llm: LlmFalso
let correo: CorreoFalso

beforeEach(() => {
  llm = new LlmFalso()
  llm.responder(BORRADOR)
  correo = new CorreoFalso()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

function montar(opciones: { cfg?: Partial<ConfigCorreo>; correo?: Correo | null } = {}) {
  const app = new Hono()
  const ctx: ContextoExterno = { rag: new RagFalso([TOBY, MATEO]), llm, whatsappPublico: null }
  const cfg: ConfigCorreo = { ...CONFIG, claveEnvio: CLAVE, ...opciones.cfg }
  montarRutasCampanas(app, ctx, cfg, opciones.correo === undefined ? correo : opciones.correo)
  return app
}

type App = ReturnType<typeof montar>

function post(app: App, ruta: string, cuerpo?: unknown, cabeceras: Record<string, string> = {}) {
  return app.request(`${RUTA}/${ruta}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cabeceras },
    body: typeof cuerpo === 'string' ? cuerpo : cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
}

describe('POST /generar', () => {
  it('responde la campaña estructurada, el html y el texto, sin pedir sesión', async () => {
    const r = await post(montar(), 'generar', { objetivo: 'padrinos', limite: 2 })
    expect(r.status).toBe(200)

    const j = await leer(r)
    expect(j.campana.perritos.map((p: { nombre: string }) => p.nombre)).toEqual(['Mateo', 'Toby'])
    expect(j.campana.asunto).toBe(BORRADOR.asunto)
    expect(j.campana).not.toHaveProperty('html')
    expect(j.html).toContain('Mateo')
    expect(j.html).toContain('Quiero apadrinar')
    expect(j.texto).toContain('Quiero apadrinar')
  })

  it.each([
    ['objetivo desconocido', { objetivo: 'otro' }],
    ['limite fuera de rango', { limite: 9 }],
    ['limite con decimales', { limite: 1.5 }],
    ['limite como texto', { limite: '2' }],
    ['perroIds que no es lista', { perroIds: 'x' }],
    ['tono demasiado largo', { tono: 'x'.repeat(101) }],
    ['cuerpo que no es JSON', '{'],
    ['cuerpo que es una lista', []],
  ])('rechaza %s con 400 sin llamar a Gemini', async (_, cuerpo) => {
    const r = await post(montar(), 'generar', cuerpo)
    expect(r.status).toBe(400)
    expect(llm.llamadas).toHaveLength(0)
  })

  it('limita a 10 peticiones por ventana: la 11 responde 429', async () => {
    const app = montar()
    for (let i = 0; i < 10; i++) expect((await post(app, 'generar', { limite: 1 })).status).toBe(200)

    expect((await post(app, 'generar', { limite: 1 })).status).toBe(429)
    expect(llm.llamadas).toHaveLength(10)
  })

  it('CORS abierto, también en el preflight', async () => {
    const app = montar()
    const preflight = await app.request(`${RUTA}/enviar`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://otra.test',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'x-campana-clave,content-type',
      },
    })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*')
    expect(preflight.headers.get('access-control-allow-headers')).toContain('X-Campana-Clave')

    const r = await post(app, 'generar', {}, { origin: 'https://otra.test' })
    expect(r.headers.get('access-control-allow-origin')).toBe('*')
  })
})

describe('POST /enviar en modo preview (por defecto)', () => {
  it('solo previsualiza: no envía nada aunque haya destinatarios', async () => {
    const r = await post(montar(), 'enviar', { destinatarios: ['ana@ej.test'] })
    expect(r.status).toBe(200)

    const j = await leer(r)
    expect(j.modo).toBe('preview')
    expect(j.destinatarios).toEqual(['ana@ej.test'])
    expect(j.asunto).toBe(BORRADOR.asunto)
    expect(j.html).toContain('Mateo')
    expect(j.campana).toBeDefined()
    expect(correo.enviados).toHaveLength(0)
  })

  it('no usa el html que manda el cliente: lo rehace desde la campaña estructurada', async () => {
    const campana = {
      asunto: 'Hola',
      preheader: 'p',
      saludo: 'Hola,',
      parrafos: ['Texto de prueba'],
      llamado: { texto: 'Ayuda', url: 'https://huellitas.test/' },
      perritos: [],
      objetivo: 'comida',
      html: '<script>alert(1)</script>',
      texto: 'x',
    }
    const r = await post(montar(), 'enviar', { campana })
    expect(r.status).toBe(200)

    const j = await leer(r)
    expect(j.html).not.toContain('<script>')
    expect(j.html).toContain('Texto de prueba')
    expect(llm.llamadas).toHaveLength(0)
  })

  it('una campaña con un enlace que no es http(s) responde 400 y no envía', async () => {
    const campana = {
      asunto: 'Hola',
      parrafos: ['x'],
      llamado: { texto: 'Ayuda', url: 'javascript:alert(1)' },
      perritos: [],
      objetivo: 'comida',
    }
    const r = await post(montar(), 'enviar', { campana, modo: 'preview' })
    expect(r.status).toBe(400)
    expect(correo.enviados).toHaveLength(0)
  })

  it('un modo que no existe responde 400', async () => {
    const r = await post(montar(), 'enviar', { modo: 'directo' })
    expect(r.status).toBe(400)
  })
})

describe('POST /enviar en modo real', () => {
  it('sin clave configurada responde 403 aunque manden una', async () => {
    const app = montar({ cfg: { claveEnvio: undefined } })
    const r = await post(app, 'enviar', { modo: 'real', destinatarios: ['ana@ej.test'] }, CON_CLAVE)
    expect(r.status).toBe(403)
    expect(correo.enviados).toHaveLength(0)
  })

  it('sin cabecera o con clave incorrecta responde 403 y no envía', async () => {
    const app = montar()
    expect((await post(app, 'enviar', { modo: 'real', destinatarios: ['ana@ej.test'] })).status).toBe(403)
    expect((await post(app, 'enviar', { modo: 'real', destinatarios: ['ana@ej.test'] }, { 'x-campana-clave': 'otra' })).status).toBe(403)
    expect(correo.enviados).toHaveLength(0)
    expect(llm.llamadas).toHaveLength(0)
  })

  it('sin correo configurado en el servidor responde 503', async () => {
    const r = await post(montar({ correo: null }), 'enviar', { modo: 'real', destinatarios: ['ana@ej.test'] }, CON_CLAVE)
    expect(r.status).toBe(503)
  })

  it('más de 50 destinatarios responde 400 antes de generar nada', async () => {
    const destinatarios = Array.from({ length: 51 }, (_, i) => `p${i}@ej.test`)
    const r = await post(montar(), 'enviar', { modo: 'real', destinatarios }, CON_CLAVE)
    expect(r.status).toBe(400)
    expect(llm.llamadas).toHaveLength(0)
    expect(correo.enviados).toHaveLength(0)
  })

  it('sin ningún correo válido responde 400', async () => {
    const r = await post(montar(), 'enviar', { modo: 'real', destinatarios: ['no', 'x@'] }, CON_CLAVE)
    expect(r.status).toBe(400)
    expect(correo.enviados).toHaveLength(0)
  })

  it('envía exactamente una vez por destinatario válido, sin duplicados', async () => {
    const r = await post(montar(), 'enviar', { modo: 'real', destinatarios: ['Ana@ej.test', 'ana@ej.test ', 'luis@ej.test'] }, CON_CLAVE)
    expect(r.status).toBe(200)

    expect(await r.json()).toMatchObject({ modo: 'real', enviados: 2, fallidos: [] })
    expect(correo.enviados.map((m) => m.para).sort()).toEqual(['ana@ej.test', 'luis@ej.test'])
    expect(correo.enviados.every((m) => m.html.includes('Mateo'))).toBe(true)
    expect(llm.llamadas).toHaveLength(1)
  })

  it('envía la campaña que se previsualizó, sin volver a generarla', async () => {
    const app = montar()
    const previa = await leer(await post(app, 'enviar', { destinatarios: [] }))

    const r = await post(app, 'enviar', { modo: 'real', campana: previa.campana, destinatarios: ['ana@ej.test'] }, CON_CLAVE)
    expect((await leer(r)).enviados).toBe(1)
    expect(llm.llamadas).toHaveLength(1)
    expect(correo.enviados[0]?.asunto).toBe(previa.asunto)
  })

  it('un fallo no detiene el envío y se reporta', async () => {
    correo.fallarPara.add('luis@ej.test')
    const r = await post(montar(), 'enviar', { modo: 'real', destinatarios: ['ana@ej.test', 'luis@ej.test'] }, CON_CLAVE)
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ enviados: 1, fallidos: [{ para: 'luis@ej.test', error: 'rebotó luis@ej.test' }] })
  })

  it('limita a 10 intentos por ventana, también con clave incorrecta', async () => {
    const app = montar()
    const cuerpo = { modo: 'real', destinatarios: ['ana@ej.test'] }
    for (let i = 0; i < 10; i++) expect((await post(app, 'enviar', cuerpo, { 'x-campana-clave': 'mala' })).status).toBe(403)

    expect((await post(app, 'enviar', cuerpo, { 'x-campana-clave': 'mala' })).status).toBe(429)
    expect(llm.llamadas).toHaveLength(0)
  })
})
