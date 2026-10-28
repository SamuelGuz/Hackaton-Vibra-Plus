// Entrada de WhatsApp para quien NO es del equipo. Se engancha al buzón durable de master: no escribe a la
// persona (devuelve la respuesta como RespuestaNueva y el buzón la manda con reintentos) y es idempotente por mensaje.
import type { Deps } from '../flujos/deps'
import type { ContextoExterno } from '../rag/tipos'
import type { Entrante, RespuestaNueva } from '../wa/buzon'
import { conversar, MAX_AUDIO_BYTES, MAX_TEXTO, obtenerAgente } from './agente'
import { textosAgente } from './textos'

const HORA_SEG = 3600
/** El buzón reintenta en minutos (5 s … 10 min): 6 h sobran para que un reintento encuentre su respuesta */
export const TTL_TURNO_SEG = 6 * 3600

/** Gemini quiere el tipo sin parámetros: WhatsApp manda 'audio/ogg; codecs=opus' */
export function mimeLimpio(mime: string): string {
  return (mime.split(';')[0] ?? '').trim().toLowerCase()
}

const claveTurno = (entranteId: string) => `ext:turno:${entranteId}`

/** Lo ya respondido a este mensaje, o null. Un Kv caído no frena la charla: se atiende como si fuera la primera vez. */
async function turnoAtendido(deps: Deps, entranteId: string): Promise<string[] | null> {
  try {
    const guardado = await deps.kv.get(claveTurno(entranteId))
    if (guardado === null) return null
    const cuerpos: unknown = JSON.parse(guardado)
    return Array.isArray(cuerpos) && cuerpos.every((c) => typeof c === 'string') ? (cuerpos as string[]) : null
  } catch {
    return null
  }
}

async function recordarTurno(deps: Deps, entranteId: string, cuerpos: string[]): Promise<void> {
  try {
    await deps.kv.put(claveTurno(entranteId), JSON.stringify(cuerpos), TTL_TURNO_SEG)
  } catch (e) {
    console.error('No se pudo recordar el turno atendido (un reintento volvería a llamar a Gemini):', e)
  }
}

/** Lo que se le dice a la persona en este mensaje (puede ser nada). Lanza solo si Gemini o el Kv fallan. */
async function responder(deps: Deps, entrante: Entrante, ctx: ContextoExterno, clave: string): Promise<string[]> {
  const { telefono, mensaje } = entrante
  const agente = obtenerAgente(deps)

  if (!agente.limiteWa.permitir(telefono)) {
    // Se avisa una sola vez por hora; los mensajes siguientes se dejan pasar en silencio
    const primera = await deps.kv.ponerSiNoExiste(`ext:limite:${telefono}`, '1', HORA_SEG)
    return primera ? [textosAgente.limite] : []
  }

  let texto: string | undefined
  let media: { datos: Buffer; mime: string } | undefined
  if (mensaje.tipo === 'texto' || mensaje.tipo === 'boton') texto = mensaje.texto
  else if (mensaje.tipo === 'audio') {
    try {
      if (!mensaje.mediaId) throw new Error('el audio no trae mediaId')
      const audio = await deps.wa.descargarMedia(mensaje.mediaId)
      if (audio.bytes.byteLength > MAX_AUDIO_BYTES) return [textosAgente.audioLargo]
      media = { datos: Buffer.from(audio.bytes), mime: mimeLimpio(audio.mime || mensaje.mime || 'audio/ogg') }
    } catch (e) {
      console.error(`No se pudo descargar el audio ${mensaje.mediaId ?? '(sin id)'}:`, e)
      return [textosAgente.audioNoLlego]
    }
  }
  if (!media && !texto?.trim()) return [textosAgente.soloTextoOVoz]

  const r = await conversar({
    deps,
    ctx,
    clave,
    canal: { tipo: 'whatsapp', telefono },
    texto: texto?.trim().slice(0, MAX_TEXTO),
    media,
  })
  return [r.respuesta]
}

/**
 * Atiende un mensaje de una persona externa (posible adoptante). Nunca lanza: si algo falla, le habla con cariño y lo deja en el log
 * (lanzar haría que el buzón reintentara y, al agotar los intentos, guardara su mensaje como nota cruda del equipo).
 *
 * Idempotente por `entrante.id`: si el buzón reintenta un mensaje que ya se atendió, devuelve la misma respuesta sin llamar a Gemini,
 * sin gastar cupo y sin volver a avisar a las administradoras. La respuesta lleva id `<entrante.id>:r1` para que el buzón no la duplique.
 */
export async function atenderInteresadoExterno(deps: Deps, entrante: Entrante, ctx: ContextoExterno): Promise<{ respuestas: RespuestaNueva[] }> {
  const aRespuestas = (cuerpos: string[]): { respuestas: RespuestaNueva[] } => ({
    respuestas: cuerpos.map((cuerpo, i) => ({ id: `${entrante.id}:r${i + 1}`, telefono: entrante.telefono, cuerpo })),
  })
  const clave = `wa:${entrante.telefono.replace(/\D/g, '')}`

  try {
    const cuerpos = await obtenerAgente(deps).enCola(clave, async () => {
      const previo = await turnoAtendido(deps, entrante.id)
      if (previo) return previo
      const nuevo = await responder(deps, entrante, ctx, clave)
      await recordarTurno(deps, entrante.id, nuevo)
      return nuevo
    })
    return aRespuestas(cuerpos)
  } catch (e) {
    console.error('El agente de adopciones falló con un mensaje de WhatsApp:', e)
    return aRespuestas([textosAgente.falla])
  }
}
