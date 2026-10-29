// Recepción por botones para quien escribe de afuera (caso real del 29 oct: "Hola" → 7 preguntas seguidas de la IA).
// Ahora: menú de 3 opciones con la web, y adoptar en 3 toques + el nombre. Las preguntas libres siguen yendo a la IA.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atenderInteresadoExterno } from '../../src/adopciones-agente/index.js'
import type { Entrada, Salida } from '../../src/tipos.js'
import { CAROLINA } from '../fakes.js'
import { crudo, enviadosSinAviso, montar, silenciarConsola, TEL, texto } from './ayudas.js'

const WEB = 'https://huellitasrefugio.lat'
const boton = (id: string, titulo = ''): Entrada => ({ tipo: 'boton', id, titulo })

let t: ReturnType<typeof montar>
beforeEach(() => {
  t = montar()
  t.ctx.sitioWeb = WEB
  t.ctx.donaciones = { nequi: '3001234567', llave: '@huellitas', titular: 'Fundación Huellitas', telefono: '3009876543' }
  silenciarConsola()
})
afterEach(() => vi.restoreAllMocks())

const escribir = (msg: string | Entrada, tel = TEL) => atenderInteresadoExterno(t.deps, tel, typeof msg === 'string' ? texto(msg) : msg, t.ctx)
const recibidos = (tel = TEL): Salida[] => enviadosSinAviso(t.wa.enviados).filter((e) => e.telefono === tel).map((e) => e.salida)
const ultimo = () => recibidos().at(-1)!
const ids = (s: Salida) => (s.tipo === 'botones' ? s.botones.map((b) => b.id) : s.tipo === 'lista' ? s.filas.map((f) => f.id) : [])

describe('el primer mensaje', () => {
  it('"Hola" recibe el menú de 3 opciones con la web, sin gastar la IA', async () => {
    await escribir('Hola')
    const m = ultimo()
    expect(m.tipo).toBe('botones')
    expect(ids(m)).toEqual(['ext:adoptar', 'ext:donar', 'ext:info'])
    expect(m.texto).toContain(WEB)
    expect(m.texto).toMatch(/pregúntame aquí/i)
    expect(t.llm.llamadas).toHaveLength(0)
  })

  it('una pregunta concreta de entrada se responde con la IA y la web llega una sola vez', async () => {
    t.llm.responder(crudo({ respuesta: 'Claro, te cuento de Toby 🐶', intencion: 'explorar' }))
    await escribir('¿tienen perritos pequeños para apartamento?')
    await escribir('¿y gatos?')
    const textos = recibidos().map((s) => s.texto)
    expect(textos.filter((x) => x.includes(WEB))).toHaveLength(1)
    expect(textos[0]).toBe('te cuento de Toby 🐶')
    expect(t.llm.llamadas).toHaveLength(2)
  })

  it('después del menú, la web no se vuelve a mandar', async () => {
    await escribir('buenas tardes')
    t.llm.responder(crudo({ respuesta: 'Te cuento 🐾' }))
    await escribir('¿cómo es el proceso?')
    expect(recibidos().filter((s) => s.texto.includes(WEB))).toHaveLength(1)
  })
})

describe('adoptar en pocos toques', () => {
  it('lista de animales → ficha → vivienda, tiempo y presupuesto con botones → nombre → visita propuesta y aviso', async () => {
    t.repo.usuarios.push(CAROLINA)
    t.repo.datos.personas.find((p) => p.id === String(CAROLINA.id))!.rol = 'admin'
    await escribir('hola')
    await escribir(boton('ext:adoptar'))
    const lista = ultimo()
    expect(recibidos().slice(-3).map(s => s.tipo)).toEqual(['texto', 'imagen', 'texto'])
    expect(lista.texto).toContain('Cuál')

    await escribir(boton('ext:a:5'))
    expect(ultimo().texto).toContain('Toby')
    expect(ultimo().texto).toContain('Lo encontraron bajo un puente')
    expect(ids(ultimo())).toEqual(['ext:q:5', 'ext:adoptar', 'ext:p:5'])

    await escribir(boton('ext:q:5'))
    expect(ids(ultimo())).toEqual(['ext:f:v:propia', 'ext:f:v:arriendo', 'ext:f:v:nose'])
    await escribir(boton('ext:f:v:propia'))
    expect(ids(ultimo())).toEqual(['ext:f:t:mucho', 'ext:f:t:medio', 'ext:f:t:poco'])
    await escribir(boton('ext:f:t:mucho'))
    expect(ids(ultimo())).toEqual(['ext:f:p:si', 'ext:f:p:nose', 'ext:f:p:no'])
    await escribir(boton('ext:f:p:si'))
    expect(ultimo().texto).toMatch(/cómo te llamas/i)

    await escribir('Laura')
    expect(ultimo().texto).toContain('Laura')
    expect(ultimo().texto).toMatch(/visita/)
    expect(ultimo().texto).toContain('sábado 31 de octubre')
    // Sin la IA en todo el camino
    expect(t.llm.llamadas).toHaveLength(0)
    const aviso = t.wa.enviados.find((e) => e.telefono === CAROLINA.telefono)?.salida.texto ?? ''
    expect(aviso).toContain('👤 Nombre: Laura')
    expect(aviso).toContain('Toby')
    expect(t.repo.adopcion).toHaveLength(1)
    // (El repo falso no tiene a Toby, id 5 del RAG falso, así que la solicitud queda sin animal; en la base real sí existe)
    expect(t.repo.adopcion[0]).toMatchObject({ nombre: 'Laura', origen: 'agente', visitaEstado: 'propuesta', puntajeIdoneidad: 100 })
  })

  it('si casi nunca hay alguien en casa, no se propone visita: se sugiere apadrinar, con cariño', async () => {
    t.repo.usuarios.push(CAROLINA)
    for (const id of ['ext:q:5', 'ext:f:v:propia', 'ext:f:t:poco', 'ext:f:p:si']) await escribir(boton(id))
    await escribir('Pedro')
    expect(ultimo().texto).toMatch(/apadrin/i)
    expect(ids(ultimo())).toContain('ext:donar')
    expect(t.wa.enviados.some((e) => e.telefono === CAROLINA.telefono)).toBe(false)
  })

  it('si vive en arriendo y no sabe si dejan mascotas, se le pide preguntar antes', async () => {
    for (const id of ['ext:q:5', 'ext:f:v:nose', 'ext:f:t:mucho', 'ext:f:p:si']) await escribir(boton(id))
    await escribir('Ana')
    expect(ultimo().texto).toMatch(/dueño|arrend/i)
  })

  it('un animal que solo se puede apadrinar no abre el formulario de adopción', async () => {
    t.rag.perritos[0] = { ...t.rag.perritos[0], adoptable: false }
    await escribir(boton('ext:q:5'))
    expect(recibidos().map(s => s.texto).join(' ')).toMatch(/apadrin/i)
  })

  it('si escribe en vez de tocar, la IA le responde y el formulario sigue donde iba', async () => {
    await escribir(boton('ext:q:5'))
    t.llm.responder(crudo({ respuesta: 'Sí, Toby se lleva bien con niños 😊' }))
    await escribir('¿Toby se lleva con niños?')
    expect(recibidos().map((s) => s.texto)).toContain('Sí, Toby se lleva bien con niños 😊')
    await escribir(boton('ext:f:v:propia'))
    expect(ids(ultimo())).toEqual(['ext:f:t:mucho', 'ext:f:t:medio', 'ext:f:t:poco'])
  })
})

describe('donar e información', () => {
  it('"Donar" muestra de una los datos de pago, el teléfono para donar comida y cómo mandar el comprobante', async () => {
    await escribir(boton('ext:donar'))
    const m = ultimo()
    const contenido = recibidos().map(s => s.texto).join(' ')
    for (const dato of ['3001234567', '@huellitas', 'Fundación Huellitas', '3009876543', 'comprobante']) expect(contenido).toContain(dato)
    expect(recibidos()).toHaveLength(3)
    expect(ids(m)).toEqual(['ext:comprobante', 'ext:adoptar', 'ext:duda'])
  })

  it('sin datos de pago configurados no inventa números', async () => {
    t.ctx.donaciones = {}
    await escribir(boton('ext:donar'))
    expect(ultimo().texto).not.toMatch(/\d{7,}/)
    expect(recibidos().map(s => s.texto).join(' ')).toMatch(/datos de pago confirmados/i)
  })

  it('"Saber más" cuenta qué es el refugio, horarios y visitas, con la web', async () => {
    await escribir(boton('ext:info'))
    const m = ultimo()
    expect(m.texto).toMatch(/perros y gatos rescatados/i)
    expect(m.texto).toMatch(/sábados a las 10/i)
    expect(m.texto).toContain(WEB)
    expect(ids(m)).toEqual(['ext:adoptar', 'ext:donar', 'ext:duda'])
  })

  it('"Tengo una duda" invita a escribir, y la pregunta la responde la IA', async () => {
    await escribir(boton('ext:duda'))
    expect(ultimo().texto).toMatch(/contarme tu duda/i)
    t.llm.responder(crudo({ respuesta: 'Las visitas son los sábados 🐾' }))
    await escribir('¿cuándo puedo ir?')
    // La respuesta de la IA, y detrás la web (la única vez que se manda)
    expect(recibidos().slice(-2).map((s) => s.texto)).toEqual(['Las visitas son los sábados 🐾', expect.stringContaining(WEB)])
  })

  it('si escribe que quiere donar, la IA le responde y detrás van los datos reales (una sola vez)', async () => {
    t.llm.responder(crudo({ respuesta: '¡Qué lindo que quieras ayudar! 💛', intencion: 'donar' }))
    await escribir('quiero donar plata para la comida')
    await escribir('¿y también aceptan cobijas?')
    const conDatos = recibidos().filter((s) => s.texto.includes('3001234567'))
    expect(conDatos).toHaveLength(1)
    expect(recibidos()[0].texto).toContain('Tu ayuda')
  })

  it('el arranque lee la web y los datos de donación del .env; sin ellos, no hay', async () => {
    const { armarExterno } = await import('../../src/externo.js')
    const con = armarExterno({ GEMINI_API_KEY: 'x', SITIO_WEB_URL: 'https://huellitasrefugio.lat/', DONACIONES_NEQUI: '3001234567' }, t.deps, { llm: t.llm })!
    expect(con.sitioWeb).toBe('https://huellitasrefugio.lat')
    expect(con.donaciones).toMatchObject({ nequi: '3001234567' })
    const sin = armarExterno({ GEMINI_API_KEY: 'x' }, t.deps, { llm: t.llm })!
    expect(sin.sitioWeb).toBeUndefined()
    expect(sin.donaciones).toBeUndefined()
  })

  it('a la IA le llegan los datos reales de la fundación y las preguntas frecuentes que tienen que ver; por WhatsApp sin guion de voz', async () => {
    t.llm.responder(crudo({ respuesta: 'Los sábados a las 10 🐾' }))
    await escribir('¿cuándo puedo ir a visitar?')
    const { sistema, esquema } = t.llm.llamadas[0]
    expect(sistema).toContain('Nequi para donar: 3001234567')
    expect(sistema).toContain(`Página web: ${WEB}`)
    expect(sistema).toMatch(/PREGUNTAS FRECUENTES[\s\S]*sábados a las 10:00/)
    const props = (esquema as { properties: Record<string, unknown> }).properties
    expect(props).not.toHaveProperty('guion_voz')
    expect(props).toHaveProperty('respuesta')
  })

  it('un mensaje sin relación con la base no le pasa preguntas frecuentes de relleno', async () => {
    t.llm.responder(crudo())
    await escribir('me encantan los atardeceres')
    expect(t.llm.llamadas[0].sistema).not.toContain('PREGUNTAS FRECUENTES (respuestas oficiales)')
  })

  it('un botón viejo o inventado no rompe nada: muestra el menú', async () => {
    await escribir(boton('ext:a:999'))
    expect(ids(ultimo())).toEqual(['ext:adoptar', 'ext:donar', 'ext:info'])
  })
})
