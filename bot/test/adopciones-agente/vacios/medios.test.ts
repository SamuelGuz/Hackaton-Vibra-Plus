// Vacíos de MEDIOS y formato de entrada por WhatsApp: audio, imágenes, stickers, vacío, emojis, texto enorme.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_AUDIO_BYTES } from '../../../src/adopciones-agente/agente.js'
import { mimeLimpio } from '../../../src/adopciones-agente/whatsapp.js'
import { textosAgente } from '../../../src/adopciones-agente/textos.js'
import { crudo, TEL } from '../ayudas.js'
import { brecha, escenario } from './ayudas-vacios.js'

let e: ReturnType<typeof escenario>
beforeEach(() => {
  e = escenario()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const audio = { tipo: 'audio' as const, mediaId: 'aud1', mime: 'audio/ogg; codecs=opus' }

describe('texto vacío, emojis y texto enorme', () => {
  for (const vacio of ['', '   ', '\n\t  \n']) {
    it(`[M-01] el mensaje en blanco ${JSON.stringify(vacio)} no gasta Gemini y pide texto o nota de voz`, async () => {
      await e.escribir(vacio)
      expect(e.t.llm.llamadas).toHaveLength(0)
      expect(e.alTelefono(TEL)[0]).toMatch(/^Gracias por escribirme.*datos personales/s)
    })
  }

  it('[M-02] un botón con título vacío se trata como mensaje vacío (no llama a Gemini)', async () => {
    await e.escribir({ tipo: 'boton', id: 'x', titulo: '' })
    expect(e.t.llm.llamadas).toHaveLength(0)
    expect(e.alTelefono(TEL)[0]).toMatch(/^Gracias por escribirme.*datos personales/s)
  })

  it('[M-03] solo emojis (🐶🐶💛) llegan al modelo como un mensaje normal y se responde', async () => {
    e.t.llm.responder(crudo({ respuesta: 'Qué ternura 🐶' }))
    await e.escribir('🐶🐶💛')
    expect(e.t.llm.llamadas[0].mensajes.at(-1)!.texto).toBe('🐶🐶💛')
    expect(e.alTelefono(TEL)[0]).toMatch(/^Qué ternura 🐶.*datos personales/s)
  })

  it('[M-04] un texto de 10.000 caracteres no rompe nada: Gemini recibe 1000 y la respuesta se manda', async () => {
    e.t.llm.responder(crudo({ respuesta: 'Te leo' }))
    await e.escribir('x'.repeat(10_000))
    expect(e.t.llm.llamadas[0].mensajes.at(-1)!.texto.length).toBe(1000)
    expect(e.alTelefono(TEL)[0]).toMatch(/^Te leo.*datos personales/s)
  })

  it('[M-05] si el texto se recortó a 1000 caracteres, la persona se entera', async () => {
    e.t.llm.responder(crudo({ respuesta: 'Te leo' }))
    await e.escribir('x'.repeat(5_000))
    expect(e.alTelefono(TEL).join('\n')).toMatch(/largo|resum|cort/i)
  })
})

describe('audio', () => {
  it('[M-06] el tope del audio es 2 MiB exactos: 2 MiB pasa, 2 MiB + 1 byte se rechaza', async () => {
    e.t.llm.responder(crudo())
    e.t.wa.descargar = async () => ({ datos: Buffer.alloc(MAX_AUDIO_BYTES), mime: 'audio/ogg' })
    await e.escribir(audio)
    expect(e.t.llm.llamadas).toHaveLength(1)
    e.t.wa.descargar = async () => ({ datos: Buffer.alloc(MAX_AUDIO_BYTES + 1), mime: 'audio/ogg' })
    await e.escribir(audio)
    expect(e.t.llm.llamadas).toHaveLength(1)
    expect(e.alTelefono(TEL).at(-1)).toBe(textosAgente.audioLargo)
  })

  it('[M-07] un audio de 0 bytes se rechaza con "no alcancé a escuchar" sin gastar Gemini', async () => {
    e.t.llm.responder(crudo())
    e.t.wa.descargar = async () => ({ datos: Buffer.alloc(0), mime: 'audio/ogg' })
    await e.escribir(audio)
    expect(e.t.llm.llamadas).toHaveLength(0)
    expect(e.alTelefono(TEL)[0]).toMatch(/^No alcancé a escuchar.*datos personales/s)
  })

  it('[M-08] si Meta devuelve un tipo que no es audio (pdf/video), no se manda a Gemini como si lo fuera', async () => {
    e.t.llm.responder(crudo())
    e.t.wa.descargar = async () => ({ datos: Buffer.from('%PDF-1.4'), mime: 'application/pdf' })
    await e.escribir(audio)
    expect(e.t.llm.llamadas).toHaveLength(0)
    expect(e.alTelefono(TEL).join('\n')).toMatch(/audio|escuchar/i)
  })

  it('[M-09] si la descarga del audio se cuelga (Meta no responde), la persona recibe algo antes de 2 minutos', async () => {
    vi.useFakeTimers()
    e.t.wa.descargar = () => new Promise(() => {})
    void e.escribir(audio)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(e.alTelefono(TEL).length).toBeGreaterThan(0)
  })

  it('[M-10] el tipo con parámetros y mayúsculas se limpia para Gemini', () => {
    expect(mimeLimpio('AUDIO/OGG; codecs=opus')).toBe('audio/ogg')
    expect(mimeLimpio(' audio/webm ;codecs=opus')).toBe('audio/webm')
  })

  it.todo('[M-11] audio largo en duración pero liviano en bytes (5 min de opus a baja tasa < 2 MiB): hace falta un audio real, el tope es solo por tamaño')
  it.todo('[M-12] transcripción real de audio con ruido, acento o varios hablantes: requiere Gemini')
  it.todo('[M-13] datos personales dichos en voz (cédula, celular) no se pueden tachar antes de Gemini porque viajan como audio')
  it.todo('[M-14] instrucciones de inyección dichas en un audio: requiere Gemini real')
})

describe('imágenes, stickers y ubicaciones', () => {
  it('[M-15] ubicación, sticker o contacto (tipo "otro") piden texto o nota de voz', async () => {
    await e.escribir({ tipo: 'otro' })
    expect(e.t.llm.llamadas).toHaveLength(0)
    expect(e.alTelefono(TEL)[0]).toMatch(/^Gracias por escribirme.*datos personales/s)
  })

  it('[M-16] una foto sola se lee una sola vez (para ver si es un comprobante de donación)', async () => {
    e.t.llm.responder({ es_comprobante: false, monto: 0, fecha: '', referencia: '', medio: '', descripcion: 'un perro' })
    await e.escribir({ tipo: 'imagen', mediaId: 'img1', mime: 'image/jpeg' })
    expect(e.t.llm.llamadas).toHaveLength(1)
  })

  it('[M-17] el pie de foto de una imagen ("así es mi patio, ¿puedo adoptar a Toby?") se lee como texto', async () => {
    e.t.llm.responder(crudo())
    await e.escribir({ tipo: 'imagen', mediaId: 'img1', mime: 'image/jpeg', texto: 'Así es mi patio, ¿puedo adoptar a Toby?' })
    expect(e.t.llm.llamadas).toHaveLength(1)
    expect(e.t.llm.llamadas[0].mensajes.at(-1)!.texto).toContain('mi patio')
  })

  it('[M-18] a quien manda solo una foto se le dice con claridad que la imagen no se puede ver (hoy el mensaje genérico no menciona fotos)', async () => {
    await e.escribir({ tipo: 'imagen', mediaId: 'img1', mime: 'image/jpeg' })
    expect(e.alTelefono(TEL).join('\n')).toMatch(/foto|imagen/i)
  })
})
