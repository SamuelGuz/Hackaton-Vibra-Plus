import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generarCampana, validarCampana } from '../../src/campanas/generar.js'
import type { ContextoExterno } from '../../src/rag/tipos.js'
import { LUNA, LlmFalso, MATEO, RagFalso, TOBY } from '../externo/fakes.js'

const URL_BASE = 'https://huellitas.test'
const BORRADOR = {
  asunto: 'Mateo y Toby esperan a alguien que los quiera',
  preheader: 'Una ayuda que cambia su día',
  saludo: 'Hola,',
  parrafos: ['Mateo ya camina solito y Toby mueve la cola con todos.', 'Apadrinar cuesta desde $20.000 al mes.'],
  llamado_texto: 'Quiero apadrinar',
}

let llm: LlmFalso
let rag: RagFalso

function ctx(whatsappPublico: string | null = null): ContextoExterno {
  return { rag, llm, whatsappPublico }
}

beforeEach(() => {
  llm = new LlmFalso()
  rag = new RagFalso()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generarCampana', () => {
  it('escribe con los perritos más urgentes y pasa sus datos a Gemini', async () => {
    llm.responder(BORRADOR)
    const c = await generarCampana(ctx(), { objetivo: 'padrinos', limite: 2, urlBase: URL_BASE })

    expect(c.perritos.map((p) => p.nombre)).toEqual(['Mateo', 'Toby'])
    expect(llm.llamadas).toHaveLength(1)
    const mensaje = llm.llamadas[0].mensajes[0].texto
    expect(mensaje).toContain('Mateo')
    expect(mensaje).toContain('Toby')
    expect(mensaje).not.toContain('Luna')

    expect(c.asunto).toBe(BORRADOR.asunto)
    expect(c.objetivo).toBe('padrinos')
    expect(c.html).toContain('Mateo')
    expect(c.html).toContain('Toby')
    expect(c.html).toContain('href="https://huellitas.test/?vista=adoptar"')
    expect(c.html).toContain('Quiero apadrinar')
  })

  it('con perroIds usa esos perfiles y no los urgentes', async () => {
    llm.responder(BORRADOR)
    const c = await generarCampana(ctx(), { objetivo: 'comida', perroIds: ['12'], urlBase: URL_BASE })

    expect(c.perritos.map((p) => p.nombre)).toEqual([LUNA.nombre])
    expect(c.objetivo).toBe('comida')
  })

  it('usa WhatsApp como llamado cuando hay número', async () => {
    llm.responder(BORRADOR)
    const c = await generarCampana(ctx('573001234567'), { objetivo: 'padrinos', limite: 1, urlBase: URL_BASE })

    expect(c.llamado.url.startsWith('https://wa.me/573001234567?text=')).toBe(true)
    expect(decodeURIComponent(c.llamado.url)).toContain('Mateo')
  })

  it('escapa el HTML que devuelve Gemini', async () => {
    llm.responder({
      ...BORRADOR,
      asunto: '<script>alert(1)</script> Mateo',
      parrafos: ['<img src=x onerror=alert(2)>Hola'],
      llamado_texto: '<b>Ayuda</b>',
    })
    const c = await generarCampana(ctx(), { objetivo: 'padrinos', limite: 1, urlBase: URL_BASE })

    expect(c.html).not.toContain('<script>')
    expect(c.html).not.toContain('<img src=x')
    expect(c.html).not.toContain('<b>Ayuda</b>')
    expect(c.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; Mateo')
  })

  it('si Gemini falla, usa la plantilla fija y no lanza', async () => {
    llm.responder(new Error('Gemini caído'))
    const c = await generarCampana(ctx(), { objetivo: 'padrinos', limite: 2, urlBase: URL_BASE })

    expect(c.asunto).toContain('Mateo')
    expect(c.html).toContain('Mateo')
    expect(c.llamado.texto).toBe('Quiero apadrinar')
    expect(console.error).toHaveBeenCalled()
  })

  it('si Gemini responde sin la forma pedida, también usa la plantilla fija', async () => {
    llm.responder({ foo: 1 })
    const c = await generarCampana(ctx(), { objetivo: 'comida', limite: 1, urlBase: URL_BASE })

    expect(c.asunto).toContain('Mateo')
    expect(c.llamado.texto).toBe('Quiero donar comida')
    expect(c.parrafos.length).toBeGreaterThan(0)
  })

  it('recorta el asunto a 80 caracteres y deja máximo 6 párrafos', async () => {
    llm.responder({ ...BORRADOR, asunto: 'a'.repeat(200), parrafos: Array.from({ length: 9 }, (_, i) => `Párrafo ${i}`) })
    const c = await generarCampana(ctx(), { objetivo: 'padrinos', limite: 1, urlBase: URL_BASE })

    expect(c.asunto.length).toBeLessThanOrEqual(80)
    expect(c.parrafos).toHaveLength(6)
  })

  it('sin perritos disponibles no llama a Gemini y arma una campaña genérica', async () => {
    rag = new RagFalso([])
    const c = await generarCampana(ctx(), { objetivo: 'comida', urlBase: URL_BASE })

    expect(llm.llamadas).toHaveLength(0)
    expect(c.perritos).toEqual([])
    expect(c.asunto.length).toBeGreaterThan(0)
    expect(c.html).toContain('Fundación Huellitas')
  })

  it('no manda a Gemini la historia de un perfil sin confirmar', async () => {
    rag = new RagFalso([{ ...TOBY, historiaConfirmada: false }])
    llm.responder(BORRADOR)
    const c = await generarCampana(ctx(), { objetivo: 'padrinos', limite: 1, urlBase: URL_BASE })

    expect(llm.llamadas[0].mensajes[0].texto).not.toContain('puente')
    expect(c.perritos[0].historiaCorta).toBe('')
  })

  it('pasa a Gemini lo que pasó hoy con el animal', async () => {
    llm.responder(BORRADOR)
    await generarCampana(ctx(), { objetivo: 'padrinos', limite: 1, urlBase: URL_BASE })

    expect(llm.llamadas[0].mensajes[0].texto).toContain(MATEO.hoy.notaDelDia ?? '')
  })
})

describe('validarCampana', () => {
  const valida = {
    asunto: 'Hola',
    preheader: 'p',
    saludo: 'Hola,',
    parrafos: ['Texto'],
    llamado: { texto: 'Ayuda', url: 'https://huellitas.test/' },
    perritos: [{ id: '1', nombre: 'Mateo', edadTexto: '9 años', foto: 'javascript:x', historiaCorta: 'Hola', urgencia: 0.9 }],
    objetivo: 'padrinos',
  }

  it('acepta una campaña bien formada y descarta fotos que no son http(s)', () => {
    const c = validarCampana(valida)
    expect(c?.llamado.url).toBe('https://huellitas.test/')
    expect(c?.perritos[0].foto).toBeNull()
  })

  it.each([
    ['URL javascript', { ...valida, llamado: { texto: 'Ayuda', url: 'javascript:alert(1)' } }],
    ['sin párrafos', { ...valida, parrafos: [] }],
    ['objetivo desconocido', { ...valida, objetivo: 'otro' }],
    ['no es un objeto', 'hola'],
  ])('rechaza: %s', (_, entrada) => {
    expect(validarCampana(entrada)).toBeNull()
  })
})
