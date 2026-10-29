import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearVozGemini, MAX_GUION } from '../../src/adopciones-agente/voz.js'

const { generar } = vi.hoisted(() => ({ generar: vi.fn() }))
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: generar }
  },
}))

beforeEach(() => {
  generar.mockReset()
  generar.mockResolvedValue({ candidates: [{ content: { parts: [{ inlineData: { data: 'AAA=', mimeType: 'audio/L16;rate=24000' } }] } }] })
})

describe('guion de voz Gemini', () => {
  const voz = () => crearVozGemini({ apiKey: 'prueba', modelo: 'tts', voz: 'Kore' })

  it('rechaza un guion largo antes de pedir audio para no cortar una advertencia al final', async () => {
    const guion = `${'a'.repeat(MAX_GUION)} El equipo debe verificar el pago`
    await expect(voz().hablar(guion)).rejects.toThrow('guion')
    expect(generar).not.toHaveBeenCalled()
  })

  it('envía completo el guion permitido, incluida su advertencia final', async () => {
    const advertencia = ' El equipo debe verificar el pago'
    const guion = `${'a'.repeat(MAX_GUION - advertencia.length)}${advertencia}`
    const audio = await voz().hablar(guion)
    expect(generar.mock.calls[0][0].contents[0].parts[0].text).toContain(guion)
    expect(audio.datos.subarray(0, 4).toString()).toBe('RIFF')
  })
})
