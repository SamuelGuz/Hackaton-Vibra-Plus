import type { EntradaIa, Entendido } from '../tipos.js'
import { contextoEquipo } from './contexto.js'
import type { Ctx } from './ctx.js'

/** Baja el audio o la foto de Meta y lo guarda en el disco. */
export async function bajarYGuardar(c: Ctx, mediaId: string) {
  const { datos, mime } = await c.deps.wa.descargar(mediaId)
  const url = await c.deps.archivos.guardar(datos, mime)
  return { datos, mime, url }
}

/** Llama a la IA. Si falla o se demora, devuelve null y la conversación sigue por el camino guiado. */
export async function entenderSeguro(c: Ctx, e: Omit<EntradaIa, 'datos' | 'ahora'>): Promise<Entendido | null> {
  try {
    // En lo libre la persona puede estar preguntando algo: la IA recibe los datos para responderle
    const extra = e.pista === 'libre' ? await contextoEquipo(c).catch(() => undefined) : undefined
    return await c.deps.ia.entender({ ...e, ...(extra ? { extra } : {}), datos: await c.datos(), ahora: c.ahora })
  } catch (err) {
    console.error('La IA no respondió:', err instanceof Error ? err.message : err)
    return null
  }
}
