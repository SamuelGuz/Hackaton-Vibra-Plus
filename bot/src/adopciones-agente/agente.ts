// Núcleo de la conversación: lo comparten WhatsApp y la llamada de voz de la web.
import { respuestasDelAgente } from '../adopcion/solicitudes.js'
import { crearLimitador, type Limitador } from '../rag/limitador.js'
import type { ContextoExterno, PerritoPublico } from '../rag/tipos.js'
import type { Deps } from '../tipos.js'
import { avisarAdministradoras, type DatosAviso } from './avisos.js'
import {
  aGuionVoz,
  combinarEvaluacion,
  describirFecha,
  debeOfrecerPadrinazgo,
  mencionaPadrinazgo,
  normalizarRespuesta,
  proximoSabado10,
  puedeAgendarVisita,
} from './decisiones.js'
import { CONOCIMIENTO } from '../rag/conocimiento-data.js'
import { indexarConocimiento, puntuarConocimiento } from '../rag/intenciones.js'
import { quitarDatosSensibles } from '../ia/redactar.js'
import { ESQUEMA_AGENTE, ESQUEMA_AGENTE_WHATSAPP } from './esquema.js'
import { construirSistema } from './prompt.js'
import { fragmentarRespuesta } from './comunicador.js'
import { crearAlmacenSesiones, MAX_MENSAJES_HISTORIAL, type AlmacenSesiones } from './sesiones.js'
import { confirmacionVisita, ofertaPadrinazgo, textosAgente } from './textos.js'
import { revisarSalidaModelo } from './seguridad-salida.js'
import type { AccionAgente, CanalAgente, Intencion, Sesion } from './tipos.js'
import type { SolicitudGuardada } from '../adopcion/solicitudes.js'

export const MAX_TEXTO = 1000
/** Tope de un audio (2 MiB): una nota de voz de un par de minutos pesa mucho menos */
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024
const ESPERA_MAXIMA_GEMINI_MS = 25_000
const CONSULTA_POR_DEFECTO = 'perrito para adoptar'
const TEMPERATURA = 0.7
/** Preguntas frecuentes que se le pasan al modelo: solo las que de verdad tienen que ver (0 a 1) */
const PUNTAJE_PREGUNTA_FRECUENTE = 0.6
const MAX_PREGUNTAS_FRECUENTES = 2

let indice: ReturnType<typeof indexarConocimiento> | null = null
/** Puntuar la base cuesta ~15 ms: los mensajes repetidos ("hola", "gracias") no se vuelven a calcular */
const yaPuntuadas = new Map<string, { pregunta: string; respuesta: string }[]>()
const MAX_CACHE = 300

function preguntasFrecuentes(texto: string) {
  if (!texto) return []
  const clave = texto.toLowerCase().trim()
  const guardada = yaPuntuadas.get(clave)
  if (guardada) return guardada
  indice ??= indexarConocimiento(CONOCIMIENTO)
  const lista = puntuarConocimiento(texto, indice)
    .filter((x) => x.puntaje >= PUNTAJE_PREGUNTA_FRECUENTE)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, MAX_PREGUNTAS_FRECUENTES)
    .map((x) => ({ pregunta: x.entrada.preguntas[0], respuesta: x.entrada.respuesta }))
  if (yaPuntuadas.size >= MAX_CACHE) yaPuntuadas.delete(yaPuntuadas.keys().next().value as string)
  yaPuntuadas.set(clave, lista)
  return lista
}

/** Lo que el modelo puede decir de la fundación, tal cual está configurado (nada inventado) */
function datosFundacion(ctx: ContextoExterno): string[] {
  const d = ctx.donaciones ?? {}
  return [
    ctx.sitioWeb && `Página web: ${ctx.sitioWeb}`,
    d.nequi && `Nequi para donar: ${d.nequi}`,
    d.llave && `Llave Bre-B: ${d.llave}`,
    d.cuenta && `Cuenta: ${d.cuenta}`,
    d.titular && `Titular: ${d.titular}`,
    d.telefono && `Teléfono para donar comida o insumos: ${d.telefono}`,
  ].filter((x): x is string => Boolean(x))
}

/** Límites y sesiones de un arranque del bot. Se guardan por `deps` para que WhatsApp y la web compartan memoria. */
export interface Agente {
  sesiones: AlmacenSesiones
  limiteWa: Limitador
  limiteWeb: Limitador
  /** Cuándo se le avisó por última vez a cada teléfono que llegó a su límite */
  avisosLimite: Map<string, number>
}

const agentes = new WeakMap<Deps, Agente>()

export interface OpcionesLimitesAgente {
  limiteWa?: { maximo?: number; ventanaMs?: number }
  limiteWeb?: { maximo?: number; ventanaMs?: number }
}

export function obtenerAgente(deps: Deps, opciones?: OpcionesLimitesAgente): Agente {
  let a = agentes.get(deps)
  if (!a) {
    const reloj = () => deps.ahora().getTime()
    a = {
      sesiones: crearAlmacenSesiones({ ahora: reloj }),
      limiteWa: crearLimitador(opciones?.limiteWa?.maximo ?? 30, opciones?.limiteWa?.ventanaMs ?? 3_600_000, reloj),
      limiteWeb: crearLimitador(opciones?.limiteWeb?.maximo ?? 20, opciones?.limiteWeb?.ventanaMs ?? 10 * 60_000, reloj),
      avisosLimite: new Map(),
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
  /** Intercepta solicitudes de atención humana transcritas antes de ejecutar decisiones. */
  interceptarTranscripcion?: (texto: string) => Promise<string | null>
}

export interface ResultadoConversacion {
  transcripcion: string
  respuesta: string
  guionVoz: string
  perritos: PerritoPublico[]
  accion: AccionAgente
  intencion: Intencion
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

/** La solicitud de esta conversación (una por clave: 'wa:<teléfono>' o 'web:<sesión>'). Si la base falla, la charla sigue. */
async function guardarSolicitud(
  deps: Deps,
  p: Pick<PeticionConversacion, 'clave' | 'canal'>,
  d: { animalId: string; evaluacion: Sesion['evaluacion']; fecha: Date },
): Promise<string | null> {
  try {
    return (await deps.repo.guardarSolicitudAdopcion(
      {
        origen: 'agente',
        claveOrigen: p.clave,
        respuestas: respuestasDelAgente({
          nombre: d.evaluacion.nombre,
          telefono: p.canal.tipo === 'whatsapp' ? p.canal.telefono : null,
          animalId: d.animalId,
          vivienda: d.evaluacion.viviendaTipo,
        }),
        visitaPropuesta: d.fecha,
        puntajeIdoneidad: Math.round(d.evaluacion.suitability),
        puntajeRiesgo: Math.round(d.evaluacion.risk),
      },
      deps.ahora(),
    )).id
  } catch (e) {
    console.error('No se pudo guardar la solicitud de adopción:', e)
    return null
  }
}

interface AvisoPendiente {
  datos: DatosAviso
  telefono: string
  perroId: string
  idSolicitud: string
  confirmarPersona: boolean
}

const pendientesPorSesion = new WeakMap<Sesion, Map<string, AvisoPendiente>>()
const idsSolicitudPorSesion = new WeakMap<Sesion, Map<string, string>>()

function mapaPendientes(sesion: Sesion): Map<string, AvisoPendiente> {
  let m = pendientesPorSesion.get(sesion)
  if (!m) { m = new Map(); pendientesPorSesion.set(sesion, m) }
  return m
}

function mapaIds(sesion: Sesion): Map<string, string> {
  let m = idsSolicitudPorSesion.get(sesion)
  if (!m) { m = new Map(); idsSolicitudPorSesion.set(sesion, m) }
  return m
}

async function solicitudActiva(deps: Deps, telefono: string): Promise<SolicitudGuardada | null> {
  try {
    const tel = telefono.replace(/\D/g, '')
    const solicitudes = await deps.repo.solicitudesAdopcion()
    return solicitudes.find((s) =>
      s.origen === 'agente' && s.telefono.replace(/\D/g, '') === tel &&
      (s.visitaEstado === 'propuesta' || s.visitaEstado === 'cambio_solicitado'),
    ) ?? null
  } catch (e) {
    console.error('No se pudo comprobar si ya había una visita propuesta:', e)
    return null
  }
}

async function reintentarAvisosPendientes(p: Pick<PeticionConversacion, 'deps' | 'ctx' | 'canal'>, sesion: Sesion): Promise<string | null> {
  const pendientes = mapaPendientes(sesion)
  let texto: string | null = null
  for (const [idSolicitud, pendiente] of [...pendientes]) {
    const resultado = await avisarAdministradoras(p.deps, pendiente.datos, pendiente.telefono ? { soloTelefonos: [pendiente.telefono] } : {})
    const entregado = resultado.enviados > 0
    if (entregado) {
      pendientes.delete(idSolicitud)
      if (!pendiente.datos.cambio) sesion.visitas.set(pendiente.perroId, pendiente.datos.fecha)
      if (pendiente.confirmarPersona && !texto) texto = confirmacionVisita(pendiente.datos.perro, pendiente.datos.fecha, p.canal, p.ctx.whatsappPublico)
      for (const admin of resultado.fallidos) pendientes.set(`${pendiente.idSolicitud}:${admin.telefono}`, { ...pendiente, telefono: admin.telefono, confirmarPersona: false })
    }
  }
  return texto
}

/**
 * Propone la visita del sábado: la deja en la base como PROPUESTA y avisa a la administración.
 * Devuelve el texto para la persona, o null si el aviso no le llegó a nadie (entonces no se le promete y se reintenta después).
 * La usan la conversación con la IA y el formulario por botones (recepcion.ts).
 */
export async function proponerVisita(
  p: Pick<PeticionConversacion, 'deps' | 'ctx' | 'clave' | 'canal'>,
  sesion: Sesion,
  perro: PerritoPublico,
  evaluacion: Sesion['evaluacion'],
): Promise<string | null> {
  if (sesion.visitas.size > 0) return null
  if (p.canal.tipo === 'whatsapp') {
    const anterior = await solicitudActiva(p.deps, p.canal.telefono)
    if (anterior) {
      if (anterior.animalId) sesion.visitas.set(String(anterior.animalId), anterior.visitaPropuesta ? new Date(anterior.visitaPropuesta) : proximoSabado10(p.deps.ahora()))
      return null
    }
  }
  const fecha = proximoSabado10(p.deps.ahora())
  const guardadaId = await guardarSolicitud(p.deps, p, { animalId: perro.id, evaluacion, fecha })
  // Si la base está temporalmente caída, el aviso al equipo todavía permite recuperar la solicitud.
  const idSolicitud = guardadaId ?? `sin-registro:${p.clave}:${perro.id}`
  mapaIds(sesion).set(perro.id, idSolicitud)
  const datos: DatosAviso = { perro: perro.nombre, evaluacion, fecha, contacto: p.canal }
  const aviso = await avisarAdministradoras(p.deps, datos)
  for (const admin of aviso.fallidos) mapaPendientes(sesion).set(`${idSolicitud}:${admin.telefono}`, { datos, telefono: admin.telefono, perroId: perro.id, idSolicitud, confirmarPersona: aviso.enviados === 0 })
  if (aviso.enviados === 0) {
    if (aviso.fallidos.length === 0) mapaPendientes(sesion).set(`${idSolicitud}:*`, { datos, telefono: '', perroId: perro.id, idSolicitud, confirmarPersona: true })
    return null
  }
  sesion.visitas.set(perro.id, fecha)
  return confirmacionVisita(perro.nombre, fecha, p.canal, p.ctx.whatsappPublico)
}

interface VisitaActual {
  id: string
  animalId: string
  fecha: Date
}

async function visitaActual(p: Pick<PeticionConversacion, 'deps' | 'canal'>, sesion: Sesion): Promise<VisitaActual | null> {
  if (p.canal.tipo === 'whatsapp') {
    const s = await solicitudActiva(p.deps, p.canal.telefono)
    if (s?.animalId && s.visitaPropuesta) return { id: s.id, animalId: String(s.animalId), fecha: new Date(s.visitaPropuesta) }
  }
  const [animalId, fecha] = sesion.visitas.entries().next().value ?? []
  if (!animalId || !fecha) return null
  const id = mapaIds(sesion).get(animalId)
  return id ? { id, animalId, fecha } : null
}

function disponibilidadSolicitada(texto: string): string | null {
  if (!/\b(solo puedo|prefiero|me queda|me sirve|no puedo el|no alcanzo el|cambiar (?:el )?d[ií]a|reprogramar|otro (?:d[ií]a|horario))\b/i.test(texto)) return null
  const dias = texto.match(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi)
  const hora = texto.match(/\b(?:en la )?(?:ma[nñ]ana|tarde|noche)|\b\d{1,2}(?::\d{2})?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)\b/gi)
  const detalle = [dias?.at(-1)?.toLocaleLowerCase(), hora?.at(-1)?.toLocaleLowerCase()].filter(Boolean).join(' ')
  return detalle ? `Disponibilidad solicitada: ${detalle}` : 'Solicita acordar otra fecha u hora'
}

async function notificarCambioVisita(
  p: Pick<PeticionConversacion, 'deps' | 'ctx' | 'clave' | 'canal'>,
  sesion: Sesion,
  visita: VisitaActual,
  evaluacion: Sesion['evaluacion'],
  tipo: 'retractada' | 'cancelada' | 'cambio_solicitado',
  detalle?: string,
): Promise<{ avisado: boolean; persistido: boolean }> {
  const cambio = { tipo, fechaAnterior: visita.fecha, ...(detalle ? { detalle } : {}) }
  const nota = `${tipo === 'retractada' ? 'Visita retractada' : tipo === 'cancelada' ? 'Visita cancelada por la persona' : 'Cambio de visita solicitado'}: ${describirFecha(visita.fecha)}${detalle ? `; ${detalle}` : ''}`
  let persistido = false
  try {
    const actual = (await p.deps.repo.solicitudesAdopcion()).find((s) => s.id === visita.id)
    persistido = await p.deps.repo.cambiarSolicitudAdopcion(visita.id, { visitaEstado: tipo, nota: [actual?.nota, nota].filter(Boolean).join('\n') })
    if (!persistido) console.error('No se encontró la solicitud al actualizar el estado de la visita:', visita.id)
  } catch (e) {
    console.error('No se pudo actualizar el estado de la visita propuesta:', e)
  }
  if (persistido) {
    sesion.visitas.delete(visita.animalId)
    for (const [id] of mapaPendientes(sesion)) if (id.startsWith(`${visita.id}:`)) mapaPendientes(sesion).delete(id)
  }
  const perro = await opcional('buscar animal para el aviso de cambio de visita', () => p.ctx.rag.porId(visita.animalId))
  const datos: DatosAviso = {
    perro: perro?.nombre ?? 'el animal de la solicitud',
    evaluacion,
    fecha: visita.fecha,
    contacto: p.canal,
    cambio,
  }
  const aviso = await avisarAdministradoras(p.deps, datos)
  const pendientes = mapaPendientes(sesion)
  for (const admin of aviso.fallidos) pendientes.set(`${visita.id}:${admin.telefono}`, {
    datos, telefono: admin.telefono, perroId: visita.animalId, idSolicitud: visita.id, confirmarPersona: false,
  })
  if (aviso.enviados === 0 && aviso.fallidos.length === 0) pendientes.set(`${visita.id}:*`, {
    datos, telefono: '', perroId: visita.animalId, idSolicitud: visita.id, confirmarPersona: false,
  })
  return { avisado: aviso.enviados > 0, persistido }
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
 * Un turno de la conversación. Lanza si Gemini falla o responde algo inservible (quien llama decide qué decirle a la persona);
 * no lanza por fallas del RAG ni por no poder avisar a las administradoras.
 */
export function responderConversacion(p: PeticionConversacion): Promise<ResultadoConversacion> {
  const sesion = obtenerAgente(p.deps).sesiones.obtener(p.clave)
  // Los mensajes de una misma sesión se atienden uno a la vez: así un aviso no se duplica por dos mensajes seguidos
  const turno = sesion.cola.then(() => atenderTurno(p, sesion))
  sesion.cola = turno.then(
    () => {},
    () => {},
  )
  return turno
}

async function atenderTurno(p: PeticionConversacion, sesion: Sesion): Promise<ResultadoConversacion> {
  const { ctx } = p
  // La misma versión redactada alimenta búsqueda, prompt, modelo e historial.
  // El mensaje original no debe cruzar a Gemini/RAG ni quedar en memoria.
  const textoPersona = quitarDatosSensibles(p.texto?.trim().slice(0, MAX_TEXTO) ?? '')

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
    fundacion: datosFundacion(ctx),
    preguntasFrecuentes: preguntasFrecuentes(textoPersona),
  })
  const mensajes = [...sesion.historial, { rol: 'user' as const, texto: textoPersona || textosAgente.marcadorAudio }]

  const crudo = await conTiempoLimite(
    ctx.llm.json<unknown>({
      sistema,
      mensajes,
      esquema: p.canal.tipo === 'whatsapp' ? ESQUEMA_AGENTE_WHATSAPP : ESQUEMA_AGENTE,
      media: p.media,
      temperatura: TEMPERATURA,
    }),
    ESPERA_MAXIMA_GEMINI_MS,
  )
  const r = normalizarRespuesta(crudo)
  const respuestaValidada = revisarSalidaModelo(r.respuesta, sistema)
  if (respuestaValidada === null) {
    const respuesta = textosAgente.salidaNoSegura
    sesion.historial.push({ rol: 'user', texto: textoPersona || '(nota de voz)' }, { rol: 'model', texto: respuesta })
    if (sesion.historial.length > MAX_MENSAJES_HISTORIAL) sesion.historial.splice(0, sesion.historial.length - MAX_MENSAJES_HISTORIAL)
    return { transcripcion: textoPersona, respuesta, guionVoz: aGuionVoz(respuesta), perritos: [], accion: 'ninguna', intencion: 'explorar' }
  }

  if (p.interceptarTranscripcion) {
    const transcripcion = quitarDatosSensibles(textoPersona || r.transcripcion)
    const respuesta = await p.interceptarTranscripcion(transcripcion)
    if (respuesta) {
      sesion.turnos++
      sesion.historial.push({ rol: 'user', texto: transcripcion }, { rol: 'model', texto: respuesta })
      if (sesion.historial.length > MAX_MENSAJES_HISTORIAL) sesion.historial.splice(0, sesion.historial.length - MAX_MENSAJES_HISTORIAL)
      return { transcripcion, respuesta, guionVoz: aGuionVoz(respuesta), perritos: [], accion: 'ninguna', intencion: 'explorar' }
    }
  }

  // ---------- Después de Gemini: todo lo que decide el código ----------
  sesion.turnos++
  const alertaBienestarAntes = sesion.alertaBienestar
  const evaluacion = combinarEvaluacion(sesion.evaluacion, r.evaluacion)
  if (r.alertaBienestar) sesion.alertaBienestar = true

  // Un id que Gemini invente no existe en el RAG: se ignora y el foco anterior se mantiene
  const validar = (id: string) => opcional('validar el animal en foco', () => ctx.rag.porId(id))
  let enFoco = r.perritoIdFoco ? await validar(r.perritoIdFoco) : null
  if (!enFoco && sesion.perroFoco) enFoco = await validar(sesion.perroFoco)

  let respuesta = quitarDatosSensibles(respuestaValidada)
  let guionVoz = revisarSalidaModelo(r.guionVoz, sistema) ? quitarDatosSensibles(r.guionVoz) : aGuionVoz(respuesta)
  if (p.canal.tipo === 'whatsapp') {
    // Validar antes de añadir avisos operativos: una salida excesiva del modelo
    // nunca debe hacer desaparecer una propuesta de visita que sí se notificó.
    try { fragmentarRespuesta(respuesta) }
    catch { respuesta = textosAgente.falla; guionVoz = aGuionVoz(respuesta) }
  }
  let accion: AccionAgente = 'ninguna'

  const solicitudVisitaActual = await visitaActual(p, sesion)
  let yaCambioVisita = false
  const mensajeOriginal = p.texto ?? ''
  if (solicitudVisitaActual && /\b(?:cancela(?:r)?|no puedo ir|no voy a ir|ya no puedo ir|ya no quiero ir)\b/i.test(mensajeOriginal)) {
    const estado = await notificarCambioVisita(p, sesion, solicitudVisitaActual, evaluacion, 'cancelada')
    respuesta = textosAgente.visitaCancelada(estado.avisado, estado.persistido)
    guionVoz = aGuionVoz(respuesta)
    yaCambioVisita = true
  } else if (solicitudVisitaActual && disponibilidadSolicitada(mensajeOriginal)) {
    const detalle = disponibilidadSolicitada(mensajeOriginal)!
    const estado = await notificarCambioVisita(p, sesion, solicitudVisitaActual, evaluacion, 'cambio_solicitado', detalle)
    // El cambio de fecha requiere confirmación del equipo; se conserva la fecha anterior como propuesta.
    sesion.visitas.set(solicitudVisitaActual.animalId, solicitudVisitaActual.fecha)
    respuesta = textosAgente.cambioVisitaSolicitado(estado.avisado, estado.persistido)
    guionVoz = aGuionVoz(respuesta)
    yaCambioVisita = true
  } else if (solicitudVisitaActual) {
    const cambioDescalificante =
      (!alertaBienestarAntes && r.alertaBienestar) ||
      (sesion.evaluacion.permisoArriendo !== 'no' && evaluacion.permisoArriendo === 'no') ||
      (sesion.evaluacion.presupuestoVeterinario !== 'no' && evaluacion.presupuestoVeterinario === 'no') ||
      (sesion.evaluacion.tiempoDisponible !== 'poco' && evaluacion.tiempoDisponible === 'poco')
    if (cambioDescalificante) {
      const estado = await notificarCambioVisita(p, sesion, solicitudVisitaActual, evaluacion, 'retractada')
      respuesta = textosAgente.visitaRetirada(estado.avisado, estado.persistido)
      guionVoz = aGuionVoz(respuesta)
      yaCambioVisita = true
    }
  }

  if (!yaCambioVisita) {
    const confirmacionPendiente = await reintentarAvisosPendientes(p, sesion)
    if (confirmacionPendiente) {
      respuesta = `${respuesta}\n\n${confirmacionPendiente}`
      guionVoz = `${guionVoz} ${aGuionVoz(confirmacionPendiente)}`
      accion = 'visita_agendada'
    }
  }

  if (
    !yaCambioVisita &&
    accion === 'ninguna' &&
    enFoco &&
    sesion.visitas.size === 0 &&
    puedeAgendarVisita({ evaluacion, intencion: r.intencion, alertaBienestar: sesion.alertaBienestar, perroAdoptable: enFoco.adoptable })
  ) {
    const confirmacion = await proponerVisita(p, sesion, enFoco, evaluacion)
    if (confirmacion) {
      respuesta = `${respuesta}\n\n${confirmacion}`
      guionVoz = `${guionVoz} ${aGuionVoz(confirmacion)}`
      accion = 'visita_agendada'
    }
  }

  if (accion === 'ninguna' && debeOfrecerPadrinazgo({ intencion: r.intencion, suitability: evaluacion.suitability, turnos: sesion.turnos, conexion: r.conexionEmocional })) {
    accion = 'padrinazgo'
    // Por WhatsApp con datos de donación, whatsapp.ts manda esos datos aparte (con el padrinazgo): no se repite aquí
    const vanLosDatos = p.canal.tipo === 'whatsapp' && Boolean(ctx.donaciones)
    if (!sesion.padrinazgoOfrecido && !vanLosDatos && !mencionaPadrinazgo(respuesta)) {
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
  const transcripcion = quitarDatosSensibles(textoPersona || r.transcripcion)
  sesion.historial.push({ rol: 'user', texto: transcripcion || '(nota de voz)' }, { rol: 'model', texto: respuesta })
  if (sesion.historial.length > MAX_MENSAJES_HISTORIAL) sesion.historial.splice(0, sesion.historial.length - MAX_MENSAJES_HISTORIAL)

  return { transcripcion, respuesta, guionVoz, perritos, accion, intencion: r.intencion }
}
