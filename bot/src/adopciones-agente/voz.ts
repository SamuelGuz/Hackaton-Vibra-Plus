// La voz del agente para la página: el guion se dice con Gemini TTS y se entrega como WAV, que el navegador reproduce.
// Gemini devuelve sonido crudo (PCM de 16 bits, mono, 24 kHz); aquí se le pone la cabecera WAV.
import { GoogleGenAI } from '@google/genai'

export interface Voz {
  hablar(texto: string): Promise<{ mime: 'audio/wav'; datos: Buffer }>
}

/** Un guion largo cuesta más y tarda más: se dice hasta aquí */
export const MAX_GUION = 1200
const ESPERA_MAXIMA_MS = 35_000
const FRECUENCIA_POR_DEFECTO = 24_000

/** PCM de 16 bits mono → WAV (cabecera RIFF de 44 bytes) */
export function pcmAWav(pcm: Buffer, frecuencia: number): Buffer {
  const cabecera = Buffer.alloc(44)
  cabecera.write('RIFF', 0)
  cabecera.writeUInt32LE(36 + pcm.length, 4)
  cabecera.write('WAVEfmt ', 8)
  cabecera.writeUInt32LE(16, 16) // largo del bloque fmt
  cabecera.writeUInt16LE(1, 20) // PCM
  cabecera.writeUInt16LE(1, 22) // mono
  cabecera.writeUInt32LE(frecuencia, 24)
  cabecera.writeUInt32LE(frecuencia * 2, 28) // bytes por segundo
  cabecera.writeUInt16LE(2, 32) // bytes por muestra
  cabecera.writeUInt16LE(16, 34) // bits por muestra
  cabecera.write('data', 36)
  cabecera.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([cabecera, pcm])
}

export function crearVozGemini(c: { apiKey: string; modelo: string; voz: string }): Voz {
  const ai = new GoogleGenAI({ apiKey: c.apiKey })
  return {
    async hablar(texto) {
      const pedido = ai.models.generateContent({
        model: c.modelo,
        contents: [{ role: 'user', parts: [{ text: `Dilo con calidez y a ritmo natural de conversación, en español de Colombia: ${texto.slice(0, MAX_GUION)}` }] }],
        config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: c.voz } } } },
      })
      let reloj: ReturnType<typeof setTimeout> | undefined
      const limite = new Promise<never>((_, rechazar) => {
        reloj = setTimeout(() => rechazar(new Error(`La voz no respondió en ${ESPERA_MAXIMA_MS / 1000} s`)), ESPERA_MAXIMA_MS)
      })
      const r = await Promise.race([pedido, limite]).finally(() => clearTimeout(reloj))
      const parte = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
      if (!parte?.inlineData?.data) throw new Error('Gemini no devolvió audio')
      // "audio/L16;codec=pcm;rate=24000"
      const frecuencia = Number(/rate=(\d+)/.exec(parte.inlineData.mimeType ?? '')?.[1]) || FRECUENCIA_POR_DEFECTO
      return { mime: 'audio/wav', datos: pcmAWav(Buffer.from(parte.inlineData.data, 'base64'), frecuencia) }
    },
  }
}
