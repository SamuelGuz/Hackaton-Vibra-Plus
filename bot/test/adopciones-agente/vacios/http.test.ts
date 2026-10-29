// Vacíos del endpoint público POST /api/publico/agente-voz (voz y texto desde la web) y del guion de voz.
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aGuionVoz } from '../../../src/adopciones-agente/decisiones.js'
import { montarRutasAgente } from '../../../src/adopciones-agente/index.js'
import { crudo, excelente } from '../ayudas.js'
import { brecha, escenario, montarApp } from './ayudas-vacios.js'

let e: ReturnType<typeof escenario>
let app: Hono<any>
beforeEach(() => {
  e = escenario()
  app = new Hono()
  montarRutasAgente(app, e.t.deps, e.t.ctx)
})
afterEach(() => vi.restoreAllMocks())

const RUTA = '/api/publico/agente-voz'
function llamar(cuerpo: unknown, cabeceras: Record<string, string> = {}, aplicacion: Hono<any> = app) {
  return aplicacion.request(RUTA, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4', ...cabeceras },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  })
}

describe('cuerpo de la petición', () => {
  it('[H-01] un content-length declarado de más de 3,5 MB se rechaza con 400 sin leer el cuerpo', async () => {
    const r = await llamar({ texto: 'hola' }, { 'content-length': '4000000' })
    expect(r.status).toBe(400)
    expect(e.t.llm.llamadas).toHaveLength(0)
  })

  it('[H-02] un cuerpo real de más de 3,5 MB (sin cabecera de largo) también se rechaza', async () => {
    const r = await llamar(JSON.stringify({ texto: 'a'.repeat(3_600_000) }))
    expect(r.status).toBe(400)
    expect(e.t.llm.llamadas).toHaveLength(0)
  })

  for (const malo of ['', 'null', '[]', '42', '"hola"', '{no es json']) {
    it(`[H-03] el cuerpo ${JSON.stringify(malo)} responde 400`, async () => {
      expect((await llamar(malo)).status).toBe(400)
    })
  }

  it('[H-04] base64 con caracteres inválidos o espacios en medio responde 400', async () => {
    expect((await llamar({ audioBase64: 'abc$%^&*()' })).status).toBe(400)
    expect((await llamar({ audioBase64: 'aGVsbG8 gd29ybGQ=' })).status).toBe(400)
  })

  it('[H-05] "texto" numérico o "audioBase64" que no es texto responden 400', async () => {
    expect((await llamar({ texto: 12345 })).status).toBe(400)
    expect((await llamar({ audioBase64: 12345 })).status).toBe(400)
  })

  it('[H-06] el texto de 1000 caracteres pasa y el de 1001 responde 400', async () => {
    e.t.llm.responder(crudo())
    expect((await llamar({ texto: 'a'.repeat(1000) })).status).toBe(200)
    expect((await llamar({ texto: 'a'.repeat(1001) })).status).toBe(400)
  })

  it('[H-07] un perroId larguísimo o con basura se ignora sin romper', async () => {
    e.t.llm.responder(crudo({ perrito_id_foco: null, perritos_mencionados: [] }))
    expect((await llamar({ texto: 'hola', perroId: "5'; DROP TABLE animales;--" })).status).toBe(200)
    expect((await llamar({ texto: 'hola', perroId: 'x'.repeat(500) })).status).toBe(200)
    expect(e.t.llm.llamadas[0].sistema).not.toMatch(/PERRITO EN FOCO/)
  })

  it('[H-08] un GET a la ruta no existe (404), no devuelve nada de la conversación', async () => {
    const r = await app.request(RUTA)
    expect(r.status).toBe(404)
  })

  it('[H-09] un POST con content-type text/plain (formulario cruzado, sin preflight) se rechaza con 415/400', async () => {
    e.t.llm.responder(crudo())
    const r = await llamar({ texto: 'hola' }, { 'content-type': 'text/plain' })
    expect([400, 415]).toContain(r.status)
  })
})

describe('sesionId', () => {
  it('[H-10] el servidor entrega un UUID de 36 caracteres y ese se acepta de vuelta', async () => {
    e.t.llm.responder(crudo(), crudo())
    const a = await (await llamar({ texto: 'hola' })).json()
    expect(a.sesionId).toHaveLength(36)
    expect((await llamar({ texto: 'otra', sesionId: a.sesionId })).status).toBe(200)
  })

  for (const malo of ['corto', 'con espacios aqui', 'a'.repeat(65), 'con/barra/mala', '<script>alert(1)</script>']) {
    it(`[H-11] el sesionId ${JSON.stringify(malo.slice(0, 20))} responde 400`, async () => {
      expect((await llamar({ texto: 'hola', sesionId: malo })).status).toBe(400)
    })
  }

  it('[H-12] solo se aceptan sesionId largos/adivinables-imposibles (>= 32): uno de 8 letras permite que dos personas compartan o envenenen una sesión', async () => {
    e.t.llm.responder(crudo())
    expect((await llamar({ texto: 'hola', sesionId: 'abcdefgh' })).status).toBe(400)
  })

  it('[H-13] solo se aceptan sesionId que el servidor emitió (uno inventado no crea sesiones nuevas)', async () => {
    e.t.llm.responder(crudo())
    expect((await llamar({ texto: 'hola', sesionId: 'inventado-por-el-cliente-0000000000000000' })).status).toBe(400)
  })

  it('[H-14] quien inunda con sesionId nuevos (cada uno con su "IP") no expulsa la conversación de una persona real (tope 500)', async () => {
    e.t.llm.responder(crudo())
    const legit = await (await llamar({ texto: 'hola' }, { 'x-forwarded-for': '10.0.0.1' })).json()
    for (let i = 0; i < 520; i++) await llamar({ texto: 'x', sesionId: `ataque-${String(i).padStart(10, '0')}` }, { 'x-forwarded-for': `203.0.113.${i % 250}, 8.8.8.${i}` })
    await llamar({ texto: 'sigo aquí', sesionId: legit.sesionId }, { 'x-forwarded-for': '10.0.0.1' })
    const ultima = e.t.llm.llamadas.at(-1)!
    expect(ultima.sistema).toContain('MENSAJE NÚMERO 2')
  })
})

describe('límites y gasto de Gemini', () => {
  it('[H-15] la petición 21 desde la misma IP en 10 minutos responde 429 con texto amable; otra IP sigue', async () => {
    e.t.llm.responder(crudo())
    for (let i = 0; i < 20; i++) expect((await llamar({ texto: 'hola' })).status).toBe(200)
    const r = await llamar({ texto: 'hola' })
    expect(r.status).toBe(429)
    expect((await r.json()).error).toMatch(/minutos/)
    expect((await llamar({ texto: 'hola' }, { 'x-forwarded-for': '9.9.9.9' })).status).toBe(200)
  })

  it('[H-16] inventar una IP en X-Forwarded-For no salta el límite: el primer valor lo controla el cliente, el último lo pone el proxy', async () => {
    e.t.llm.responder(crudo())
    const estados: number[] = []
    for (let i = 0; i < 30; i++) estados.push((await llamar({ texto: 'hola' }, { 'x-forwarded-for': `${i + 1}.7.7.7, 198.51.100.9` })).status)
    expect(estados).toContain(429)
  })

  it('[H-17] hay un tope global (diario o por minuto) que protege el gasto de Gemini aunque lleguen miles de IPs distintas', async () => {
    e.t.llm.responder(crudo())
    const estados = new Set<number>()
    for (let i = 0; i < 400; i++) estados.add((await llamar({ texto: 'hola' }, { 'x-forwarded-for': `10.${i % 250}.${Math.floor(i / 250)}.1` })).status)
    expect(estados.has(429)).toBe(true)
  })

  it('[H-18] si Gemini falla, el 502 trae un texto amable y NO filtra el error interno (claves, URLs)', async () => {
    e.t.llm.responder(new Error('API key AIzaSyFAKE inválida en https://generativelanguage.googleapis.com'))
    const r = await llamar({ texto: 'hola' })
    expect(r.status).toBe(502)
    const cuerpo = await r.text()
    expect(cuerpo).not.toMatch(/AIza|googleapis|API key/)
    expect(cuerpo).toMatch(/intentamos de nuevo/)
  })
})

describe('integración con la app completa (CORS y cabeceras)', () => {
  it('[H-19] el preflight de un navegador desde otro origen pasa (CORS abierto en /api/publico/*)', async () => {
    const completa = montarApp(e.t)
    const r = await completa.request(RUTA, {
      method: 'OPTIONS',
      headers: { origin: 'https://huellitas.test', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
    })
    expect(r.headers.get('access-control-allow-origin')).toBe('*')
    expect(r.headers.get('access-control-allow-headers')).toMatch(/content-type/i)
  })

  it('[H-20] la respuesta POST de la app completa trae el CORS abierto', async () => {
    const completa = montarApp(e.t)
    e.t.llm.responder(crudo())
    const r = await llamar({ texto: 'hola' }, { origin: 'https://huellitas.test' }, completa)
    expect(r.status).toBe(200)
    expect(r.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('[H-21] la respuesta (con la conversación) lleva Cache-Control: no-store', async () => {
    e.t.llm.responder(crudo())
    const r = await llamar({ texto: 'hola' })
    expect(r.headers.get('cache-control') ?? '').toMatch(/no-store/)
  })

  it('[H-22] las rutas del agente traen su propio CORS (hoy dependen de que montarRutasRag se monte antes)', async () => {
    e.t.llm.responder(crudo())
    const r = await llamar({ texto: 'hola' }, { origin: 'https://huellitas.test' })
    expect(r.headers.get('access-control-allow-origin')).toBeTruthy()
  })
})

describe('guion de voz', () => {
  it('[H-23] el guion que sale por la web no tiene emojis ni markdown, y los pesos se leen como pesos', async () => {
    e.t.llm.responder(crudo({ intencion: 'apadrinar', respuesta: '**Toby** te espera 🐶', guion_voz: 'Toby te espera 🐶 con _cariño_' }))
    const j = await (await llamar({ texto: 'quiero apadrinar' })).json()
    expect(j.guionVoz).not.toMatch(/[\p{Extended_Pictographic}*_`#]/u)
    expect(j.guionVoz).toMatch(/20\.000 pesos/)
    expect(j.guionVoz).not.toContain('$')
  })

  it('[H-24] sin guion_voz del modelo, se arma a partir de la respuesta', async () => {
    e.t.llm.responder({ ...crudo({ respuesta: 'Hola 🐶 amigo' }), guion_voz: '' })
    const j = await (await llamar({ texto: 'hola' })).json()
    expect(j.guionVoz).toBe('Hola amigo.')
  })

  it('[H-25] los montos con $ y COP se dicen en pesos', () => {
    expect(aGuionVoz('Desde $20.000 COP al mes')).toBe('Desde 20.000 pesos al mes.')
    expect(aGuionVoz('Son $1.500.000')).toBe('Son 1.500.000 pesos.')
  })

  it('[H-26] viñetas y numeración se vuelven frases', () => {
    expect(aGuionVoz('Mira:\n- Toby\n2) Luna')).toBe('Mira: Toby. Luna.')
  })

  it('[H-27] el teléfono de la fundación en la confirmación de visita se dice en grupos de dígitos, no como un número de 12 cifras', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    const j = await (await llamar({ texto: 'listo' })).json()
    expect(j.accion).toBe('visita_agendada')
    expect(j.guionVoz).not.toMatch(/\+?\d{10,}/)
  })

  it('[H-28] los enlaces markdown [texto](url) se leen solo con el texto', () => {
    expect(aGuionVoz('Mira [nuestra web](https://huellitas.org) hoy')).not.toMatch(/https?:|huellitas\.org|\(|\]/)
  })

  it('[H-29] las banderas emoji (🇨🇴) no se dejan para que el sintetizador las lea', () => {
    expect(aGuionVoz('Desde Colombia 🇨🇴 con amor')).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u)
  })

  it('[H-30] "10:00 a. m." se dice "10 de la mañana" (el sintetizador deletrea "a punto m punto")', () => {
    expect(aGuionVoz('Te espero a las 10:00 a. m. en la fundación')).toMatch(/de la mañana/)
  })

  it('[H-31] emojis con tono de piel (👍🏽) se quitan completos: hoy queda el modificador suelto', () => {
    expect(aGuionVoz('Hola 👨‍👩‍👧 amigos 👍🏽 felices')).toBe('Hola amigos felices.')
  })
})
