// Audio, foto o texto → acciones, con Gemini Flash y salida JSON por esquema.
import { GoogleGenAI } from '@google/genai'
import type { EntradaIa, Ia } from '../tipos.js'
import { convertir, ESQUEMA, type RespuestaCruda } from './esquema.js'
import { conTiempoLimite, ESPERA_MAXIMA_MS, INSTRUCCIONES, mimeSinParametros, textosDe } from './instrucciones.js'

export function crearIa(c: { apiKey: string; modelo: string }): Ia {
  const ai = new GoogleGenAI({ apiKey: c.apiKey })

  return {
    async entender(e: EntradaIa) {
      const partes: { text?: string; inlineData?: { mimeType: string; data: string } }[] = textosDe(e).map((text) => ({ text }))
      if (e.media) {
        partes.push({ inlineData: { mimeType: mimeSinParametros(e.media.mime), data: e.media.datos.toString('base64') } })
      }

      const r = await conTiempoLimite(
        ai.models.generateContent({
          model: c.modelo,
          contents: [{ role: 'user', parts: partes }],
          config: {
            systemInstruction: INSTRUCCIONES,
            responseMimeType: 'application/json',
            responseSchema: ESQUEMA,
            temperature: 0.1,
          },
        }),
        ESPERA_MAXIMA_MS,
        'Gemini',
      )
      const crudo = JSON.parse(r.text ?? '{}') as RespuestaCruda
      return convertir(crudo, e.datos, e.ahora)
    },
  }
}
