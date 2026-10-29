import { describe, expect, it, vi } from 'vitest'
import { MAX_AUDIO_BYTES } from '../../src/adopciones-agente/agente.js'
import { descargarConTimeout, validarEntradaAudio } from '../../src/adopciones-agente/medios.js'

describe('validarEntradaAudio', () => {
  it('acepta audio OGG de hasta 2 MiB y limpia parámetros del MIME', () => {
    const a = validarEntradaAudio({ datos: Buffer.alloc(MAX_AUDIO_BYTES), mime: 'AUDIO/OGG; codecs=opus' })
    expect(a.mime).toBe('audio/ogg')
    expect(a.datos.length).toBe(MAX_AUDIO_BYTES)
  })

  it('rechaza audio vacío, demasiado grande o con MIME no admitido', () => {
    expect(() => validarEntradaAudio({ datos: Buffer.alloc(0), mime: 'audio/ogg' })).toThrow()
    expect(() => validarEntradaAudio({ datos: Buffer.alloc(MAX_AUDIO_BYTES + 1), mime: 'audio/ogg' })).toThrow()
    expect(() => validarEntradaAudio({ datos: Buffer.from('%PDF'), mime: 'application/pdf' })).toThrow()
  })
})

describe('descargarConTimeout', () => {
  it('rechaza descargas colgadas al vencer el plazo', async () => {
    vi.useFakeTimers()
    try {
      const descarga = descargarConTimeout(() => new Promise<never>(() => {}), 20_000)
      const rechazo = expect(descarga).rejects.toThrow(/tiempo máximo/)
      await vi.advanceTimersByTimeAsync(20_000)
      await rechazo
    } finally {
      vi.useRealTimers()
    }
  })
})
