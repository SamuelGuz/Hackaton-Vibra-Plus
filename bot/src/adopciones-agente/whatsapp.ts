// Entrada de WhatsApp para quien NO es del equipo: app.ts llama a atenderInteresadoExterno con esos números.
// Primero la recepción por botones (menú, adoptar, donar); lo que la persona escribe con sus palabras lo responde la IA.
import type { ContextoExterno } from '../rag/tipos.js'
import type { Deps, Entrada, Salida } from '../tipos.js'
import { MAX_AUDIO_BYTES, MAX_TEXTO, obtenerAgente, responderConversacion } from './agente.js'
import { atenderFoto } from './comprobantes.js'
import { pausaParaEscribir } from './humano.js'
import { enviarDonacion, enviarMenu, esperaNombre, esSoloSaludo, leerNombre, pideMenu, recibirNombre, tocarBoton, webSiFalta, type Recepcion } from './recepcion.js'
import { textosAgente } from './textos.js'

const HORA_MS = 3_600_000

/** Gemini quiere el tipo sin parámetros: WhatsApp manda 'audio/ogg; codecs=opus' */
export function mimeLimpio(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase()
}

/**
 * Atiende un mensaje de una persona externa (posible adoptante o donante). Nunca lanza: si algo falla, le habla con cariño y lo deja en el log.
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
  const enviar = async (s: Salida) => {
    if (ctx.pausaHumana && !yaEspero) {
      yaEspero = true
      await ctx.pausaHumana(pausaParaEscribir(s.texto, deps.ahora().getTime() - inicio))
    }
    try {
      await deps.wa.enviar(telefono, s)
    } catch (e) {
      console.error(`No se pudo escribirle a ${telefono}:`, e)
    }
  }
  const decir = (texto: string) => enviar({ tipo: 'texto', texto })

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

    const clave = `wa:${telefono.replace(/\D/g, '')}`
    const sesion = agente.sesiones.obtener(clave)
    const r: Recepcion = { deps, ctx, sesion, clave, telefono, enviar }

    /** Lo que la persona dice con sus palabras lo responde la IA */
    const conversar = async (texto?: string, media?: { datos: Buffer; mime: string }) => {
      const respuesta = await responderConversacion({ deps, ctx, clave, canal: { tipo: 'whatsapp', telefono }, texto: texto?.trim().slice(0, MAX_TEXTO), media })
      await decir(respuesta.respuesta)
      // Si quiere donar o apadrinar, los datos van a la vista (los reales, nunca los que diga la IA)
      const quiereAyudar = respuesta.accion === 'padrinazgo' || respuesta.intencion === 'donar' || respuesta.intencion === 'apadrinar'
      if (quiereAyudar && !sesion.donacionMostrada && ctx.donaciones) await enviarDonacion(r)
      await webSiFalta(r)
    }

    // Botones de la recepción (menú, lista de animales, formulario, donar)
    if (entrada.tipo === 'boton' && entrada.id.startsWith('ext:')) return await tocarBoton(r, entrada.id)

    // Una foto: comprobante de donación, o una pregunta escrita en el pie
    if (entrada.tipo === 'imagen') return await atenderFoto(r, entrada, (pie) => conversar(pie))

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

    if (texto) {
      // Un saludo de entrada (o "menú" en cualquier momento) recibe el menú, sin gastar la IA
      if (pideMenu(texto) || (!sesion.bienvenida && sesion.turnos === 0 && esSoloSaludo(texto))) return await enviarMenu(r, !sesion.bienvenida)
      // El formulario estaba esperando el nombre
      if (esperaNombre(sesion)) {
        const nombre = leerNombre(texto)
        if (nombre) return await recibirNombre(r, nombre)
      }
    }

    await conversar(texto, media)
  } catch (e) {
    console.error('El agente de adopciones falló con un mensaje de WhatsApp:', e)
    await decir(textosAgente.falla)
  }
}
