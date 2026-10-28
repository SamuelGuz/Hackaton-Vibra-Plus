import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { crearRag } from '../../src/rag/servicio.js'
import { montarRutasRag } from '../../src/rag/rutas.js'
import type { ServicioRag } from '../../src/rag/tipos.js'
import { LlmFalso, RagFalso } from '../externo/fakes.js'
import { AHORA, PERFILES, datosRag } from './datos.js'

const WA = '573001234567'

function montar(rag: ServicioRag = new RagFalso(), opciones?: Parameters<typeof montarRutasRag>[2]) {
  const app = new Hono()
  montarRutasRag(app, { rag, llm: new LlmFalso(), whatsappPublico: WA }, opciones)
  return app
}

describe('GET /api/publico/rag/perritos', () => {
  it('devuelve total, contacto y perritos, con caché corto', async () => {
    const res = await montar().request('/api/publico/rag/perritos')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=15')
    const j = await res.json()
    expect(j.total).toBe(3)
    expect(j.contacto).toEqual({ whatsapp: WA })
    expect(j.perritos.map((p: any) => p.nombre)).toEqual(['Toby', 'Mateo', 'Luna'])
    expect(j.perritos[0]).toMatchObject({ id: '5', historia: expect.any(String), hoy: { comioHoy: true } })
  })

  it('filtra por especie y respeta limite', async () => {
    const app = montar()
    expect((await (await app.request('/api/publico/rag/perritos?especie=gato')).json()).perritos.map((p: any) => p.nombre)).toEqual(['Luna'])
    expect((await (await app.request('/api/publico/rag/perritos?limite=1')).json()).perritos).toHaveLength(1)
  })

  it('400 si la especie o el límite no son válidos', async () => {
    const app = montar()
    for (const q of ['especie=conejo', 'limite=0', 'limite=51', 'limite=abc', 'limite=2.5']) {
      const res = await app.request(`/api/publico/rag/perritos?${q}`)
      expect(res.status, q).toBe(400)
      expect(await res.json()).toEqual({ error: expect.any(String) })
    }
  })

  it('el contacto es null si no hay WhatsApp público', async () => {
    const app = new Hono()
    montarRutasRag(app, { rag: new RagFalso(), llm: new LlmFalso(), whatsappPublico: null })
    expect((await (await app.request('/api/publico/rag/perritos')).json()).contacto).toEqual({ whatsapp: null })
  })
})

describe('GET /api/publico/rag/buscar', () => {
  it('devuelve consulta, modo, contacto y resultados con perrito, puntaje y motivo', async () => {
    const rag = new RagFalso()
    const res = await montar(rag).request('/api/publico/rag/buscar?q=perro%20tranquilo')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=15')
    const j = await res.json()
    expect(j).toMatchObject({ consulta: 'perro tranquilo', modo: 'lexica', contacto: { whatsapp: WA } })
    expect(j.resultados).toHaveLength(3)
    expect(j.resultados[0]).toEqual({ perrito: expect.objectContaining({ nombre: 'Toby' }), puntaje: 0.8, motivo: expect.any(String) })
    expect(rag.consultas).toEqual(['perro tranquilo'])
  })

  it('limite por defecto 6 y máximo 50', async () => {
    const rag = new RagFalso()
    const app = montar(rag)
    expect((await (await app.request('/api/publico/rag/buscar?q=x&limite=2')).json()).resultados).toHaveLength(2)
    expect((await app.request('/api/publico/rag/buscar?q=x&limite=51')).status).toBe(400)
  })

  it('400 si falta q, está vacío o pasa de 300 caracteres', async () => {
    const app = montar()
    for (const url of ['/api/publico/rag/buscar', '/api/publico/rag/buscar?q=', '/api/publico/rag/buscar?q=%20%20', `/api/publico/rag/buscar?q=${'a'.repeat(301)}`]) {
      const res = await app.request(url)
      expect(res.status, url).toBe(400)
      expect(await res.json()).toEqual({ error: expect.any(String) })
    }
    expect((await app.request(`/api/publico/rag/buscar?q=${'a'.repeat(300)}`)).status).toBe(200)
  })

  it('429 cuando una IP pasa su cupo, sin afectar a otras', async () => {
    const app = montar(new RagFalso(), { busquedasPorMinuto: 2 })
    const pedir = (ip: string) => app.request('/api/publico/rag/buscar?q=x', { headers: { 'x-forwarded-for': ip } })
    expect((await pedir('1.1.1.1')).status).toBe(200)
    expect((await pedir('1.1.1.1')).status).toBe(200)
    const bloqueada = await pedir('1.1.1.1')
    expect(bloqueada.status).toBe(429)
    expect(await bloqueada.json()).toEqual({ error: expect.any(String) })
    expect((await pedir('2.2.2.2')).status).toBe(200)
  })

  it('500 con mensaje genérico si el RAG se cae, sin filtrar el error interno', async () => {
    const rag = new RagFalso()
    rag.buscar = async () => {
      throw new Error('password=secreto postgres://x')
    }
    const res = await montar(rag).request('/api/publico/rag/buscar?q=x')
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toMatch(/secreto|postgres/)
  })
})

describe('CORS y datos internos', () => {
  it('responde con CORS abierto a cualquier origen, también en el preflight', async () => {
    const app = montar()
    const res = await app.request('/api/publico/rag/perritos', { headers: { Origin: 'https://otra-web.example' } })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    const pre = await app.request('/api/publico/rag/buscar?q=x', { method: 'OPTIONS', headers: { Origin: 'https://otra-web.example', 'Access-Control-Request-Method': 'GET' } })
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('el CORS cubre otras rutas públicas (POST) que se monten después', async () => {
    const app = montar()
    app.post('/api/publico/agente-voz', (c) => c.json({ ok: true }))
    const pre = await app.request('/api/publico/agente-voz', { method: 'OPTIONS', headers: { Origin: 'https://x.example', 'Access-Control-Request-Method': 'POST' } })
    expect(pre.headers.get('access-control-allow-methods')).toMatch(/POST/)
    expect(pre.headers.get('access-control-allow-headers')).toMatch(/content-type/i)
  })

  it('con datos reales no sale nada interno: personas, deudas, teléfonos ni fotos privadas', async () => {
    const d = datosRag()
    d.notas.push({ id: 'n1', animalId: '3', texto: 'Ya comió. Elena dejó un comentario interno para el equipo', fechaHora: '2026-10-27T09:00', quien: '3' })
    d.notas.push({ id: 'n2', animalId: '2', texto: 'Nota de ayer interna', fechaHora: '2026-10-26T09:00', quien: '3' })
    const rag = crearRag({ datos: async () => d, ahora: () => AHORA, perfiles: PERFILES })
    const app = montar(rag)
    const a = await (await app.request('/api/publico/rag/perritos')).text()
    const b = await (await app.request('/api/publico/rag/buscar?q=perrito%20tranquilo')).text()
    for (const txt of [a, b]) {
      expect(txt).not.toMatch(/Carolina|Don Luis|Andrea|573000000|clinica|Clínica|deuda|comentario interno|ayer interna|archivos|"quien"|porConfirmar/i)
    }
    expect(a).toContain('"notaDelDia":null')
    expect(b).toContain('"notaDelDia":null')
    const perrito = JSON.parse(a).perritos[0]
    expect(Object.keys(perrito).sort()).toEqual(
      ['adoptable', 'compatibilidad', 'edadAnios', 'edadTexto', 'especie', 'estado', 'foto', 'historia', 'historiaConfirmada', 'hoy', 'id', 'meta', 'necesidadesMedicas', 'nombre', 'personalidad', 'tamano', 'urgencia'],
    )
  })
})
