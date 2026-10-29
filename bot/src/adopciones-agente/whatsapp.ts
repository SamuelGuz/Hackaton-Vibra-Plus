// Entrada de WhatsApp para quien NO es del equipo: app.ts llama a atenderInteresadoExterno con esos números.
import type { ContextoExterno } from '../rag/tipos.js'
import type { Deps, Entrada } from '../tipos.js'
import { MAX_AUDIO_BYTES, MAX_TEXTO, obtenerAgente, responderConversacion } from './agente.js'
import { pausaParaEscribir } from './humano.js'
import { textosAgente } from './textos.js'

const HORA_MS = 3_600_000

/** Gemini quiere el tipo sin parámetros: WhatsApp manda 'audio/ogg; codecs=opus' */
export function mimeLimpio(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase()
}

/**
 * Atiende un mensaje de una persona externa (posible adoptante). Nunca lanza: si algo falla, le habla con cariño y lo deja en el log.
 */
export async function atenderInteresadoExterno(
  deps: Deps,
  telefono: string,
  entrada: Entrada,
  ctx: ContextoExterno,
  opciones: { mensajeId?: string } = {},
): Promise<void> {
  // Como una persona: marca leído y sale "escribiendo…" apenas llega; responde después de lo que tardaría en escribir
  const inicio = deps.ahora().getTime()
  if (opciones.mensajeId && deps.wa.escribiendo) {
    await deps.wa.escribiendo(opciones.mensajeId).catch((e) => console.error(`No se pudo mostrar "escribiendo" a ${telefono}:`, e))
  }
  let yaEspero = false
  const decir = async (texto: string) => {
    if (ctx.pausaHumana && !yaEspero) {
      yaEspero = true
      await ctx.pausaHumana(pausaParaEscribir(texto, deps.ahora().getTime() - inicio))
    }
    try {
      await deps.wa.enviar(telefono, { tipo: 'texto', texto })
    } catch (e) {
      console.error(`No se pudo escribirle a ${telefono}:`, e)
    }
  }

  try {
    const agente = obtenerAgente(deps)
    if (!agente.limiteWa.permitir(telefono)) {
      // Se avisa una sola vez por hora; los mensajes siguientes se dejan pasar en silencio
      const ahora = deps.ahora().getTime()
      if (ahora - (agente.avisosLimite.get(telefono) ?? -Infinity) >= HORA_MS) {
        agente.avisosLimite.set(telefono, ahora)
        await decir(textosAgente.limite)
      }
      return
    }

    let texto: string | undefined
    let media: { datos: Buffer; mime: string } | undefined
    if (entrada.tipo === 'texto') texto = entrada.texto
    else if (entrada.tipo === 'boton') texto = entrada.titulo
    else if (entrada.tipo === 'audio') {
      try {
        const audio = await deps.wa.descargar(entrada.mediaId)
        if (audio.datos.length > MAX_AUDIO_BYTES) return await decir(textosAgente.audioLargo)
        media = { datos: audio.datos, mime: mimeLimpio(audio.mime || entrada.mime) }
      } catch (e) {
        console.error(`No se pudo descargar el audio ${entrada.mediaId}:`, e)
        return await decir(textosAgente.audioNoLlego)
      }
    }
    if (!media && !texto?.trim()) return await decir(textosAgente.soloTextoOVoz)

    const r = await responderConversacion({
      deps,
      ctx,
      clave: `wa:${telefono.replace(/\D/g, '')}`,
      canal: { tipo: 'whatsapp', telefono },
      texto: texto?.trim().slice(0, MAX_TEXTO),
      media,
    })
    await decir(r.respuesta)
  } catch (e) {
    console.error('El agente de adopciones falló con un mensaje de WhatsApp:', e)
    await decir(textosAgente.falla)
  }
}
