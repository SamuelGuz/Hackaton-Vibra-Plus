// La voz del agente en la página: con "conAudio" la respuesta trae un WAV que el navegador puede reproducir.
// Si la voz falla, el texto llega igual y "audio" va en null: nunca se dice que hubo audio cuando no lo hubo.
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { montarRutasAgente } from '../../src/adopciones-agente/index.js'
import { pcmAWav, type Voz } from '../../src/adopciones-agente/voz.js'
import { crudo, montar, silenciarConsola } from './ayudas.js'

/** Voz falsa: guarda lo que le piden decir y devuelve un WAV de 4 muestras */
class VozFalsa implements Voz {
  dichos: string[] = []
  falla = false
  async hablar(texto: string) {
    this.dichos.push(texto)
    if (this.falla) throw new Error('sin cuota de voz')
    return { mime: 'audio/wav' as const, datos: pcmAWav(Buffer.alloc(8), 24_000) }
  }
}

let t: ReturnType<typeof montar>
let voz: VozFalsa
let app: Hono<any>

beforeEach(() => {
  t = montar()
  silenciarConsola()
  voz = new VozFalsa()
  app = new Hono()
  montarRutasAgente(app, t.deps, { ...t.ctx, voz })
  t.llm.responder(crudo({ respuesta: 'Mira, te cuento la historia de Toby 🐶', guion_voz: 'Mira, te cuento la historia de Toby.' }))
})
afterEach(() => vi.restoreAllMocks())

const llamar = (cuerpo: unknown, ruta = '/api/publico/agente-voz') =>
  app.request(ruta, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' }, body: JSON.stringify(cuerpo) })
type Respuesta = { respuesta: string; guionVoz: string; audio?: { mime: string; base64: string } | null }

describe('voz del agente', () => {
  it('con conAudio la respuesta trae el guion dicho como WAV', async () => {
    const r = (await (await llamar({ texto: 'hola', conAudio: true })).json()) as Respuesta
    expect(voz.dichos).toEqual(['Mira, te cuento la historia de Toby.'])
    expect(r.audio?.mime).toBe('audio/wav')
    expect(Buffer.from(r.audio!.base64, 'base64').subarray(0, 4).toString()).toBe('RIFF')
    expect(r.respuesta).toContain('Toby')
  })

  it('el alias voz-adopcion también la trae', async () => {
    const r = (await (await llamar({ texto: 'hola', conAudio: true }, '/api/publico/voz-adopcion')).json()) as Respuesta
    expect(r.audio?.mime).toBe('audio/wav')
  })

  it('sin conAudio no se genera voz y la respuesta es la de siempre', async () => {
    const r = (await (await llamar({ texto: 'hola' })).json()) as Respuesta
    expect(voz.dichos).toEqual([])
    expect(r).not.toHaveProperty('audio')
  })

  it('si la voz falla, el texto llega igual y audio va en null', async () => {
    voz.falla = true
    const res = await llamar({ texto: 'hola', conAudio: true })
    expect(res.status).toBe(200)
    const r = (await res.json()) as Respuesta
    expect(r.audio).toBeNull()
    expect(r.respuesta).toContain('Toby')
  })

  it('sin voz configurada, conAudio devuelve audio en null', async () => {
    const sinVoz = new Hono()
    montarRutasAgente(sinVoz, t.deps, t.ctx)
    const r = (await (await sinVoz.request('/api/publico/agente-voz', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texto: 'hola', conAudio: true }) })).json()) as Respuesta
    expect(r.audio).toBeNull()
  })

  it('conAudio que no es true/false se rechaza con 400', async () => {
    expect((await llamar({ texto: 'hola', conAudio: 'sí' })).status).toBe(400)
  })
})

describe('pcmAWav', () => {
  it('arma una cabecera WAV válida: mono, 16 bits, la frecuencia pedida y el largo de los datos', () => {
    const pcm = Buffer.from([1, 0, 2, 0, 3, 0])
    const wav = pcmAWav(pcm, 24_000)
    expect(wav.length).toBe(44 + pcm.length)
    expect(wav.subarray(0, 4).toString()).toBe('RIFF')
    expect(wav.readUInt32LE(4)).toBe(36 + pcm.length)
    expect(wav.subarray(8, 16).toString()).toBe('WAVEfmt ')
    expect(wav.readUInt16LE(20)).toBe(1) // PCM
    expect(wav.readUInt16LE(22)).toBe(1) // mono
    expect(wav.readUInt32LE(24)).toBe(24_000)
    expect(wav.readUInt32LE(28)).toBe(48_000) // bytes por segundo
    expect(wav.readUInt16LE(34)).toBe(16)
    expect(wav.subarray(36, 40).toString()).toBe('data')
    expect(wav.readUInt32LE(40)).toBe(pcm.length)
    expect(wav.subarray(44).equals(pcm)).toBe(true)
  })
})
