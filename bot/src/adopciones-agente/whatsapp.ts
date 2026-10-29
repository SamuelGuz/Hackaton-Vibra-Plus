// Entrada de WhatsApp para quien NO es del equipo: app.ts llama a atenderInteresadoExterno con esos números.
// Primero la recepción por botones (menú, adoptar, donar); lo que la persona escribe con sus palabras lo responde la IA.
import type { ContextoExterno } from '../rag/tipos.js'
import type { Deps, Entrada, Salida } from '../tipos.js'
import { quitarDatosSensibles } from '../ia/redactar.js'
import { MAX_AUDIO_BYTES, MAX_TEXTO, obtenerAgente, responderConversacion } from './agente.js'
import { TTL_SESION_MS } from './sesiones.js'
import { claveBaja, claveMemoria, estaDeBaja, registrarBaja, restaurarSesion, serializarSesion } from './memoria.js'
import { descargarConTimeout, validarEntradaAudio } from './medios.js'
import { atenderOfertaComida } from '../comunidad/apoyo.js'
import type { Sesion } from './tipos.js'
import { atenderFoto } from './comprobantes.js'
import { comunicar, fragmentarRespuesta } from './comunicador.js'
import { atenderEscalamiento, preguntaIdentidad } from './escalamiento.js'
import { enviarDonacion, enviarMenu, enviarLista, pideCatalogo, esperaNombre, esSoloSaludo, leerNombre, pideMenu, recibirNombre, tocarBoton, webSiFalta, type Recepcion } from './recepcion.js'
import { textosAgente } from './textos.js'

const HORA_MS = 3_600_000
const AVISO_PRIVACIDAD = 'Este chat trata tus datos personales para orientarte; tus mensajes pueden procesarse con un proveedor de IA. Evita compartir tu cédula o dirección exacta. Escribe «borren mis datos» para pedir que borremos el historial de esta conversación.'

function textoNormalizado(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function esSolicitudBaja(texto: string): boolean {
  return /^(baja|stop|no me escriban mas|ya no quiero que me escriban|cancelar suscripcion)$/.test(textoNormalizado(texto))
}

function esSolicitudBorrado(texto: string): boolean {
  const normal = textoNormalizado(texto)
  return /\b(borren|borra|borrenme|elimina|eliminen|suprime|supriman)\b.*\b(mis datos|mi historial|mis mensajes|mi conversacion)\b/.test(normal)
}

function anexarAviso(salida: Salida): Salida {
  return { ...salida, texto: `${salida.texto}\n\n${AVISO_PRIVACIDAD}` }
}

/** Gemini quiere el tipo sin parámetros: WhatsApp manda 'audio/ogg; codecs=opus' */
export function mimeLimpio(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase()
}

/**
 * Atiende un mensaje de una persona externa (posible adoptante o donante). Nunca lanza: si algo falla, le habla con cariño y lo deja en el log.
 */
async function prepararRespuesta(
  deps: Deps,
  telefono: string,
  entrada: Entrada,
  ctx: ContextoExterno,
  enviar: (s: Salida) => Promise<void>,
): Promise<void> {
  let decir = (texto: string) => enviar({ tipo: 'texto', texto })
  let sesionParaGuardar: Sesion | null = null
  let hashSesion = ''

  try {
    const agente = obtenerAgente(deps)
    const clave = `wa:${telefono.replace(/\D/g, '')}`
    const numero = claveBaja(telefono)

    // Solicitudes de privacidad y baja se atienden antes de cuota, IA, RAG o avisos al equipo.
    if (entrada.tipo === 'texto' && esSolicitudBaja(entrada.texto)) {
      registrarBaja(deps, telefono)
      agente.sesiones.eliminarSesion(clave)
      try {
        await deps.repo.borrarMemoria?.(claveMemoria(clave))
        await deps.repo.guardarMemoria?.(numero, { version: 1, no_contactar: true }, null)
        const persistente = Boolean(deps.repo.guardarMemoria)
        await decir(persistente
          ? 'Listo, quedó registrada tu baja. No te volveremos a escribir ni avisaremos al equipo por esta conversación.'
          : 'Listo, detuve los mensajes de esta conversación en el proceso actual. No pude guardar la baja para futuros reinicios.')
      } catch {
        await decir('Detuve los mensajes de esta conversación en el proceso actual, pero no pude guardar la baja para futuros reinicios.')
      }
      return
    }
    if (entrada.tipo === 'texto' && esSolicitudBorrado(entrada.texto)) {
      const eliminada = agente.sesiones.eliminarSesion(clave)
      let eliminadaPersistida = false
      let falloPersistencia = false
      try { eliminadaPersistida = await deps.repo.borrarMemoria?.(claveMemoria(clave)) ?? false }
      catch { falloPersistencia = true }
      await decir(falloPersistencia
        ? eliminada
          ? 'Eliminé la sesión activa en memoria, pero no pude confirmar el borrado del estado persistente.'
          : 'No pude confirmar el borrado del estado de esta conversación.'
        : eliminada || eliminadaPersistida
          ? 'Eliminé el historial y la evaluación de esta conversación que estaban guardados.'
          : 'No había un historial activo de esta conversación para eliminar.')
      return
    }
    if (await estaDeBaja(deps, telefono)) return

    if (!agente.limiteWa.permitir(telefono)) {
      // Se avisa una sola vez por hora; los mensajes siguientes se dejan pasar en silencio
      const ahora = deps.ahora().getTime()
      if (ahora - (agente.avisosLimite.get(telefono) ?? -Infinity) >= HORA_MS) {
        agente.avisosLimite.set(telefono, ahora)
        await decir(textosAgente.limite)
      }
      return
    }

    const existiaEnMemoria = agente.sesiones.tiene(clave)
    const sesion = agente.sesiones.obtener(clave)
    hashSesion = claveMemoria(clave)
    if (!existiaEnMemoria && deps.repo.leerMemoria) {
      try {
        const guardada = await deps.repo.leerMemoria(hashSesion, deps.ahora())
        const restaurada = restaurarSesion(clave, guardada, deps.ahora().getTime(), TTL_SESION_MS)
        if (restaurada) Object.assign(sesion, restaurada)
      } catch {
        console.error('No se pudo restaurar el historial de conversación')
      }
    }
    sesion.ultimoUso = deps.ahora().getTime()
    sesionParaGuardar = sesion
    let avisoPendiente = !sesion.bienvenida
    const enviarConAviso = async (salida: Salida) => {
      if (avisoPendiente) {
        avisoPendiente = false
        sesion.bienvenida = true
        return enviar(anexarAviso(salida))
      }
      return enviar(salida)
    }
    const decirConAviso = (texto: string) => enviarConAviso({ tipo: 'texto', texto })
    decir = decirConAviso
    const r: Recepcion = { deps, ctx, sesion, clave, telefono, enviar: enviarConAviso }

    if (entrada.tipo === 'texto' && await atenderOfertaComida(deps, telefono, entrada.texto, r.enviar)) return

    /** Lo que la persona dice con sus palabras lo responde la IA */
    const conversar = async (texto?: string, media?: { datos: Buffer; mime: string }) => {
      const textoLargo = Boolean(texto && texto.trim().length > MAX_TEXTO)
      const respuesta = await responderConversacion({ deps, ctx, clave, canal: { tipo: 'whatsapp', telefono }, texto: texto?.trim().slice(0, MAX_TEXTO), media,
        interceptarTranscripcion: media ? async transcripcion => {
          const oferta: string[] = []
          if (await atenderOfertaComida(deps, telefono, transcripcion, async salida => { oferta.push(salida.texto) })) return oferta.join(' ')
          if (preguntaIdentidad(transcripcion)) return 'Soy el asistente de inteligencia artificial del Refugio Yesenia. Puedo orientarte y pedir apoyo al equipo cuando lo necesites'
          const avisos: string[] = []
          const derivado = await atenderEscalamiento({ ...r, enviar: async salida => { avisos.push(salida.texto) } }, transcripcion)
          return derivado ? avisos.join(' ') : null
        } : undefined,
      })
      // Si quiere donar o apadrinar, los datos van a la vista (los reales, nunca los que diga la IA)
      const quiereAyudar = respuesta.accion === 'padrinazgo' || respuesta.intencion === 'donar' || respuesta.intencion === 'apadrinar'
      if (quiereAyudar && !sesion.donacionMostrada && ctx.donaciones) return await enviarDonacion(r)
      const partes = fragmentarRespuesta(respuesta.respuesta)
      for (const parte of partes) await decirConAviso(parte)
      if (textoLargo) await decirConAviso('Tu mensaje era largo y solo alcancé a leer los primeros 1000 caracteres. Si faltó algo, mándame un resumen más corto.')
      if (partes.length < 3) await webSiFalta(r)
    }

    if (entrada.tipo === 'texto') {
      if (preguntaIdentidad(entrada.texto)) return await decir('Soy el asistente de inteligencia artificial del Refugio Yesenia. Puedo orientarte y pedir apoyo al equipo cuando lo necesites')
      if (await atenderEscalamiento(r, entrada.texto)) return
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
        const audio = await descargarConTimeout(() => deps.wa.descargar(entrada.mediaId), 20_000)
        if (audio.datos.length > MAX_AUDIO_BYTES) return await decir(textosAgente.audioLargo)
        const valido = validarEntradaAudio(audio)
        media = { datos: valido.datos, mime: mimeLimpio(valido.mime || entrada.mime) }
      } catch (e) {
        console.error(`No se pudo descargar el audio ${entrada.mediaId}:`, e)
        return await decir(textosAgente.audioNoLlego)
      }
    }
    if (!media && !texto?.trim()) return await decir(textosAgente.soloTextoOVoz)

    if (texto) {
      if (pideCatalogo(texto)) return await enviarLista(r, /interesad|quiero adoptar$/i.test(texto) ? undefined : quitarDatosSensibles(texto))
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
  } finally {
    if (sesionParaGuardar && deps.repo.guardarMemoria) {
      try {
        await deps.repo.guardarMemoria(hashSesion, serializarSesion(sesionParaGuardar), new Date(deps.ahora().getTime() + TTL_SESION_MS))
      } catch {
        console.error('No se pudo guardar el historial de conversación')
      }
    }
  }
}

/** Prepara una vez; el transporte fallido se propaga para reintentar desde el cursor */
export function atenderInteresadoExterno(deps: Deps, telefono: string, entrada: Entrada, ctx: ContextoExterno,
  opciones: { mensajeId?: string } = {}): Promise<void> {
  return comunicar(deps, telefono, ctx, opciones.mensajeId, enviar => prepararRespuesta(deps, telefono, entrada, ctx, enviar))
}
