import { MAX_AUDIO_BYTES } from './agente.js'

export const TIEMPO_MAXIMO_DESCARGA_AUDIO_MS = 25_000
const TIPOS_AUDIO = new Set(['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr', 'audio/wav', 'audio/webm', 'audio/3gpp'])

export type AudioDescargado = { datos: Buffer; mime: string }
const mimeLimpio = (mime: string) => mime.split(';')[0].trim().toLowerCase()

/** Valida tamaño, contenido y MIME informado por el proveedor antes de invocar Gemini. */
export function validarEntradaAudio(audio: AudioDescargado): AudioDescargado {
  if (!Buffer.isBuffer(audio.datos) || audio.datos.length === 0) throw new Error('El audio llegó vacío')
  if (audio.datos.length > MAX_AUDIO_BYTES) throw new Error('El audio excede el tamaño máximo')
  const mime = mimeLimpio(audio.mime)
  if (!TIPOS_AUDIO.has(mime)) throw new Error('El proveedor devolvió un archivo que no es audio admitido')
  return { datos: audio.datos, mime }
}

/** Evita que una descarga externa colgada retenga indefinidamente el turno de WhatsApp. */
export function descargarConTimeout<T>(descargar: () => Promise<T>, timeoutMs = TIEMPO_MAXIMO_DESCARGA_AUDIO_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('La descarga del audio excedió el tiempo máximo')), timeoutMs)
    Promise.resolve().then(descargar).then(
      (valor) => { clearTimeout(timer); resolve(valor) },
      (error: unknown) => { clearTimeout(timer); reject(error) },
    )
  })
}
