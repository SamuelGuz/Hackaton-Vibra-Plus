// Núcleo de la conversación: lo comparten WhatsApp y la llamada de voz de la web.
import { crearLimitador, type Limitador } from '../rag/limitador'
import type { ContextoExterno, PerritoPublico } from '../rag/tipos'
import type { Deps } from '../flujos/deps'
import { avisarAdministradoras } from './avisos'
import {
  aGuionVoz,
  combinarEvaluacion,
  debeOfrecerPadrinazgo,
  mencionaPadrinazgo,
  normalizarRespuesta,
  proximoSabado10,
  puedeAgendarVisita,
} from './decisiones'
import { ESQUEMA_AGENTE } from './esquema'
import { construirSistema } from './prompt'
import { cargarSesion, guardarSesion, MAX_MENSAJES_HISTORIAL } from './sesiones'
import { confirmacionVisita, ofertaPadrinazgo, textosAgente } from './textos'
import type { AccionAgente, CanalAgente, Sesion } from './tipos'

export const MAX_TEXTO = 1000
/** Tope de un audio (2 MiB): una nota de voz de un par de minutos pesa mucho menos */
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024
const ESPERA_MAXIMA_GEMINI_MS = 25_000
const CONSULTA_POR_DEFECTO = 'perrito para adoptar'
const TEMPERATURA = 0.7

/**
 * Lo único que vive en la memoria del proceso: los límites de uso y la cola por conversación. Las sesiones, los avisos y los
 * turnos ya atendidos viven en el Kv de `deps`. Se guarda por `deps` para que WhatsApp y la web compartan límites.
 */
export interface Agente {
  limiteWa: Limitador
  limiteWeb: Limitador
  /** Atiende de a uno los mensajes de una misma conversación (un aviso no se duplica por dos mensajes seguidos) */
  enCola<T>(clave: string, trabajo: () => Promise<T>): Promise<T>
}

const agentes = new WeakMap<Deps, Agente>()

export function obtenerAgente(deps: Deps): Agente {
  let a = agentes.get(deps)
  if (!a) {
    const reloj = () => deps.ahora().getTime()
    const colas = new Map<string, Promise<unknown>>()
    a = {
      limiteWa: crearLimitador(30, 3_600_000, reloj),
      limiteWeb: crearLimitador(20, 10 * 60_000, reloj),
      enCola(clave, trabajo) {
        const turno = (colas.get(clave) ?? Promise.resolve()).then(trabajo)
        const cola = turno.then(
          () => {},
          () => {},
        )
        colas.set(clave, cola)
        // Sin esto el mapa crecería con cada conversación: se suelta la clave si nadie más se formó detrás
        void cola.then(() => {
          if (colas.get(clave) === cola) colas.delete(clave)
        })
        return turno
      },
    }
    agentes.set(deps, a)
  }
  return a
}

export interface PeticionConversacion {
  deps: Deps
  ctx: ContextoExterno
  /** 'wa:<teléfono>' o 'web:<sesionId>' */
  clave: string
  canal: CanalAgente
  texto?: string
  media?: { datos: Buffer; mime: string }
  /** Animal que la persona viene viendo (p. ej. la tarjeta donde tocó "llamar") */
  perroId?: string
}

export interface ResultadoConversacion {
  transcripcion: string
  respuesta: string
  guionVoz: string
  perritos: PerritoPublico[]
  accion: AccionAgente
}

function conTiempoLimite<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error(`Gemini no respondió en ${ms / 1000} s`)), ms)
    p.then(
      (v) => (clearTimeout(t), resolver(v)),
      (e) => (clearTimeout(t), rechazar(e)),
    )
  })
}

/** El RAG es un apoyo: si falla, la charla sigue sin esos datos en vez de caerse */
async function opcional<T>(que: string, f: () => Promise<T>): Promise<T | null> {
  try {
    return await f()
  } catch (e) {
    console.error(`El RAG falló al ${que}:`, e)
    return null
  }
}

/**
 * Un turno de la conversación, atendido en la cola de su clave. Lanza si Gemini falla o responde algo inservible (quien llama decide
 * qué decirle a la persona); no lanza por fallas del RAG ni por no poder avisar a las administradoras.
 */
export function responderConversacion(p: PeticionConversacion): Promise<ResultadoConversacion> {
  return obtenerAgente(p.deps).enCola(p.clave, () => conversar(p))
}

/**
 * El turno sin cola: quien llama ya debe estar dentro de `enCola` de esa clave. La sesión se lee del Kv y solo se guarda si el turno
 * salió bien: un turno fallido no deja nada en el historial.
 */
export async function conversar(p: PeticionConversacion): Promise<ResultadoConversacion> {
  const sesion = await cargarSesion(p.deps.kv, p.clave)
  const resultado = await atenderTurno(p, sesion)
  await guardarSesion(p.deps.kv, sesion)
  return resultado
}

async function atenderTurno(p: PeticionConversacion, sesion: Sesion): Promise<ResultadoConversacion> {
  const { deps, ctx } = p
  const textoPersona = p.texto?.trim().slice(0, MAX_TEXTO) ?? ''

  // El animal que la persona venía viendo queda en foco desde el primer turno
  if (p.perroId) {
    const visto = await opcional('buscar el animal en foco', () => ctx.rag.porId(p.perroId!))
    if (visto) sesion.perroFoco = visto.id
  }

  // Candidatos: lo que pide la persona + el animal en foco. Con audio aún no hay texto, así que se abre más la lista.
  const candidatos = new Map<string, { perrito: PerritoPublico; motivo?: string }>()
  if (sesion.perroFoco) {
    const foco = await opcional('buscar el animal en foco', () => ctx.rag.porId(sesion.perroFoco!))
    if (foco) candidatos.set(foco.id, { perrito: foco })
  }
  const busqueda = await opcional('buscar candidatos', () => ctx.rag.buscar(textoPersona || CONSULTA_POR_DEFECTO, p.media && !textoPersona ? 8 : 4))
  for (const r of busqueda?.resultados ?? []) if (!candidatos.has(r.perrito.id)) candidatos.set(r.perrito.id, { perrito: r.perrito, motivo: r.motivo })

  const sistema = construirSistema({
    candidatos: [...candidatos.values()],
    focoId: sesion.perroFoco,
    evaluacion: sesion.evaluacion,
    turnos: sesion.turnos + 1,
    canal: p.canal.tipo,
    whatsappPublico: ctx.whatsappPublico,
  })
  const mensajes = [...sesion.historial, { rol: 'user' as const, texto: textoPersona || textosAgente.marcadorAudio }]

  const crudo = await conTiempoLimite(
    ctx.llm.json<unknown>({ sistema, mensajes, esquema: ESQUEMA_AGENTE, media: p.media, temperatura: TEMPERATURA }),
    ESPERA_MAXIMA_GEMINI_MS,
  )
  const r = normalizarRespuesta(crudo)

  // ---------- Después de Gemini: todo lo que decide el código ----------
  sesion.turnos++
  const evaluacion = combinarEvaluacion(sesion.evaluacion, r.evaluacion)
  if (r.alertaBienestar) sesion.alertaBienestar = true

  // Un id que Gemini invente no existe en el RAG: se ignora y el foco anterior se mantiene
  const validar = (id: string) => opcional('validar el animal en foco', () => ctx.rag.porId(id))
  let enFoco = r.perritoIdFoco ? await validar(r.perritoIdFoco) : null
  if (!enFoco && sesion.perroFoco) enFoco = await validar(sesion.perroFoco)

  let respuesta = r.respuesta
  let guionVoz = r.guionVoz
  let accion: AccionAgente = 'ninguna'

  if (
    enFoco &&
    !Object.hasOwn(sesion.visitas, enFoco.id) &&
    puedeAgendarVisita({ evaluacion, intencion: r.intencion, alertaBienestar: sesion.alertaBienestar, perroAdoptable: enFoco.adoptable })
  ) {
    const fecha = proximoSabado10(deps.ahora())
    const aviso = await avisarAdministradoras(
      deps,
      { perro: enFoco.nombre, evaluacion, fecha, contacto: p.canal },
      `ext:aviso:${p.clave}:${enFoco.id}`,
    )
    // Si no le llegó a nadie, la visita no existe: no se le promete a la persona y se reintenta en el siguiente turno
    if (aviso.estado !== 'sin_alcanzar') {
      sesion.visitas[enFoco.id] = fecha.toISOString()
      const confirmacion = confirmacionVisita(enFoco.nombre, fecha, p.canal, ctx.whatsappPublico)
      respuesta = `${respuesta}\n\n${confirmacion}`
      guionVoz = `${guionVoz} ${aGuionVoz(confirmacion)}`
      accion = 'visita_agendada'
    }
  }

  if (accion === 'ninguna' && debeOfrecerPadrinazgo({ intencion: r.intencion, suitability: evaluacion.suitability, turnos: sesion.turnos, conexion: r.conexionEmocional })) {
    accion = 'padrinazgo'
    if (!sesion.padrinazgoOfrecido && !mencionaPadrinazgo(respuesta)) {
      const oferta = ofertaPadrinazgo(enFoco?.nombre ?? null, p.canal, ctx.whatsappPublico)
      respuesta = `${respuesta}\n\n${oferta}`
      guionVoz = `${guionVoz} ${aGuionVoz(oferta)}`
    }
    sesion.padrinazgoOfrecido = true
  }

  // Animales para mostrar: los que se mencionaron (que existan) o, si ninguno, el que está en foco
  const perritos: PerritoPublico[] = []
  for (const id of r.perritosMencionados) {
    const x = candidatos.get(id)?.perrito ?? (await opcional('buscar un animal mencionado', () => ctx.rag.porId(id)))
    if (x && !perritos.some((y) => y.id === x.id)) perritos.push(x)
  }
  if (!perritos.length && enFoco) perritos.push(enFoco)

  // ---------- Memoria ----------
  sesion.evaluacion = evaluacion
  if (enFoco) sesion.perroFoco = enFoco.id
  const transcripcion = textoPersona || r.transcripcion
  sesion.historial.push({ rol: 'user', texto: transcripcion || '(nota de voz)' }, { rol: 'model', texto: respuesta })
  if (sesion.historial.length > MAX_MENSAJES_HISTORIAL) sesion.historial.splice(0, sesion.historial.length - MAX_MENSAJES_HISTORIAL)

  return { transcripcion, respuesta, guionVoz, perritos, accion }
}
