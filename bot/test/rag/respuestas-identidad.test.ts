import { describe, expect, it } from 'vitest'
import { montarRespuestas } from './respuestas-datos.js'

describe('identidad del asistente público', () => {
  it.each(['¿Eres una IA?', '¿Eres inteligencia artificial?', '¿Estoy hablando con una persona?'])(
    'contesta su identidad sin inventar una persona: %s',
    async (pregunta) => {
      const r = await montarRespuestas().crear().preguntar(pregunta)
      expect(r.intencion).toBe('charla:capacidades')
      expect(r.respuesta).toMatch(/asistente virtual/i)
      expect(r.sinRespuesta).not.toBe(true)
    },
  )
})
