// Aviso por WhatsApp a las administradoras cuando se agenda una visita.
import type { Rol } from '../panel-tipos.js'
import type { Deps } from '../tipos.js'
import { describirFecha, HORA_VISITA } from './decisiones.js'
import { telefonoBonito } from './textos.js'
import { limpiarDatoNoConfiable } from './seguridad-salida.js'
import type { Evaluacion } from './tipos.js'

export interface DatosAviso {
  perro: string
  evaluacion: Evaluacion
  fecha: Date
  contacto: { tipo: 'whatsapp'; telefono: string } | { tipo: 'web' }
  cambio?: { tipo: 'retractada' | 'cancelada' | 'cambio_solicitado'; fechaAnterior?: Date; detalle?: string }
}

export interface Administradora {
  nombre: string
  telefono: string
  rol: Rol
}

function resumen(e: Evaluacion): string {
  // 'otro' es lo que deja el formulario por botones: solo se sabe si es propia o en arriendo
  const vivienda = e.viviendaTipo === 'desconocido' || e.viviendaTipo === 'otro' ? 'vivienda' : e.viviendaTipo
  const arriendo = e.permisoArriendo === 'si' ? 'arrienda, con permiso para mascotas' : e.permisoArriendo === 'no_aplica' ? 'no arrienda' : null
  const presupuesto = e.presupuestoVeterinario === 'si' ? 'sí' : e.presupuestoVeterinario === 'no' ? 'no' : 'sin confirmar'
  const tiempo = e.tiempoDisponible === 'desconocido' ? 'sin confirmar' : e.tiempoDisponible
  return [
    arriendo ? `${vivienda} (${arriendo})` : vivienda,
    `presupuesto veterinario: ${presupuesto}`,
    `tiempo disponible: ${tiempo}`,
    ...(e.ninos !== 'desconocido' ? [`niños: ${limpiarDatoNoConfiable(e.ninos)}`] : []),
    ...(e.otrasMascotas !== 'desconocido' ? [`otras mascotas: ${limpiarDatoNoConfiable(e.otrasMascotas)}`] : []),
  ].join(' · ')
}

/** El mensaje que recibe cada administradora */
export function armarAviso(nombreAdmin: string, d: DatosAviso): string {
  if (d.cambio) {
    const fechaAnterior = d.cambio.fechaAnterior ? describirFecha(d.cambio.fechaAnterior) : 'la fecha propuesta'
    const accion = d.cambio.tipo === 'retractada'
      ? `REVISAR: la visita propuesta de ${d.perro} debe quedar retractada`
      : d.cambio.tipo === 'cancelada'
        ? `CANCELACIÓN: la persona canceló la visita propuesta de ${d.perro}`
        : `CAMBIO SOLICITADO: la persona pide revisar la visita de ${d.perro}`
    return [
      `🐾 ${nombreAdmin}, ${accion}.`,
      `👤 Nombre: ${d.evaluacion.nombre ? limpiarDatoNoConfiable(d.evaluacion.nombre) : 'todavía no lo dijo'}`,
      d.contacto.tipo === 'whatsapp' ? `📞 Contacto: ${telefonoBonito(d.contacto.telefono)}` : '📞 Contacto: llamada web (sin teléfono)',
      `📅 Fecha anterior: ${fechaAnterior}`,
      ...(d.cambio.detalle ? [`Detalle: ${limpiarDatoNoConfiable(d.cambio.detalle)}`] : []),
    ].join('\n')
  }
  // Sin "Doña": el nombre del equipo puede ser de hombre. Es una propuesta, no una cita: no hay cupos guardados todavía.
  return [
    `🐾 ${nombreAdmin}, hay un interesado muy bueno para ${d.perro} (idoneidad ${d.evaluacion.suitability}/100). Le propuse visita, por confirmar.`,
    `👤 Nombre: ${d.evaluacion.nombre ? limpiarDatoNoConfiable(d.evaluacion.nombre) : 'todavía no lo dijo'}`,
    d.contacto.tipo === 'whatsapp' ? `📞 Contacto: ${telefonoBonito(d.contacto.telefono)}` : '📞 Contacto: llamada web (sin teléfono)',
    `📅 Visita propuesta (por confirmar): ${describirFecha(d.fecha)}, ${HORA_VISITA}`,
    `🏠 ${resumen(d.evaluacion)}`,
    `Riesgo: ${d.evaluacion.risk}/100`,
    'Escríbele para confirmar la visita. Si me preguntas algo de esta persona, te respondo.',
  ].join('\n')
}

/** Administradoras = gente del equipo con rol admin o adopciones. El Repo no las lista, así que salen de hoy().personas. */
export async function buscarAdministradoras(deps: Deps): Promise<Administradora[]> {
  const datos = await deps.repo.hoy(deps.ahora())
  const vistos = new Set<string>()
  const lista: Administradora[] = []
  for (const p of datos.personas) {
    if (p.rol !== 'admin' && p.rol !== 'adopciones') continue
    const id = Number(p.id)
    if (!Number.isInteger(id)) continue
    const u = await deps.repo.usuarioPorId(id)
    const digitos = u?.telefono.replace(/\D/g, '')
    if (!u || !digitos || vistos.has(digitos)) continue
    vistos.add(digitos)
    lista.push({ nombre: u.nombre, telefono: u.telefono, rol: u.rol })
  }
  return lista
}

/**
 * Avisa a todas las administradoras. Que una falle (p. ej. la ventana de 24 h de WhatsApp) no frena a las demás ni la charla.
 * Devuelve a cuántas les llegó.
 */
export async function avisarAdministradoras(
  deps: Deps,
  d: DatosAviso,
  opciones: { soloTelefonos?: string[] } = {},
): Promise<{ destinatarias: number; enviados: number; fallidos: Administradora[] }> {
  let admins: Administradora[]
  try {
    admins = await buscarAdministradoras(deps)
  } catch (e) {
    console.error('No se pudo leer quiénes son las administradoras:', e)
    return { destinatarias: 0, enviados: 0, fallidos: [] }
  }
  if (opciones.soloTelefonos) {
    const pendientes = new Set(opciones.soloTelefonos.map((t) => t.replace(/\D/g, '')))
    admins = admins.filter((a) => pendientes.has(a.telefono.replace(/\D/g, '')))
  }
  if (!admins.length) console.warn('Visita agendada pero no hay administradoras (rol admin/adopciones) a quién avisar')
  const resultados = await Promise.allSettled(
    admins.map((a) => deps.wa.enviar(a.telefono, { tipo: 'texto', texto: armarAviso(a.nombre, d) })),
  )
  let enviados = 0
  const fallidos: Administradora[] = []
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') enviados++
    else {
      fallidos.push(admins[i])
      console.error(`No se pudo avisar a ${admins[i].nombre} de la visita de ${d.perro}:`, r.reason)
    }
  })
  return { destinatarias: admins.length, enviados, fallidos }
}
