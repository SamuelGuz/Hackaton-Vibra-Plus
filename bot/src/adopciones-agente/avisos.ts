// Aviso por WhatsApp a las administradoras cuando se agenda una visita.
import type { Deps } from '../tipos.js'
import { describirFecha, HORA_VISITA } from './decisiones.js'
import { telefonoBonito } from './textos.js'
import type { Evaluacion } from './tipos.js'

export interface DatosAviso {
  perro: string
  evaluacion: Evaluacion
  fecha: Date
  contacto: { tipo: 'whatsapp'; telefono: string } | { tipo: 'web' }
}

export interface Administradora {
  nombre: string
  telefono: string
}

function tratamiento(nombre: string): string {
  return /^(don|doña|dona)\s/i.test(nombre) ? nombre : `Doña ${nombre}`
}

function resumen(e: Evaluacion): string {
  const vivienda = e.viviendaTipo === 'desconocido' ? 'vivienda' : e.viviendaTipo
  const arriendo = e.permisoArriendo === 'si' ? 'arrienda, con permiso para mascotas' : e.permisoArriendo === 'no_aplica' ? 'no arrienda' : null
  const presupuesto = e.presupuestoVeterinario === 'si' ? 'sí' : e.presupuestoVeterinario === 'no' ? 'no' : 'sin confirmar'
  const tiempo = e.tiempoDisponible === 'desconocido' ? 'sin confirmar' : e.tiempoDisponible
  return [
    arriendo ? `${vivienda} (${arriendo})` : vivienda,
    `presupuesto veterinario: ${presupuesto}`,
    `tiempo disponible: ${tiempo}`,
    ...(e.ninos !== 'desconocido' ? [`niños: ${e.ninos}`] : []),
    ...(e.otrasMascotas !== 'desconocido' ? [`otras mascotas: ${e.otrasMascotas}`] : []),
  ].join(' · ')
}

/** El mensaje que recibe cada administradora */
export function armarAviso(nombreAdmin: string, d: DatosAviso): string {
  return [
    `${tratamiento(nombreAdmin)}, filtré a un adoptante excelente para ${d.perro} (Score ${d.evaluacion.suitability}%). Viene el sábado a las 10 AM`,
    `Fecha: ${describirFecha(d.fecha)}, ${HORA_VISITA}`,
    d.contacto.tipo === 'whatsapp' ? `Contacto: ${telefonoBonito(d.contacto.telefono)}` : 'Contacto: llamada web (sin teléfono)',
    ...(d.evaluacion.nombre ? [`Nombre: ${d.evaluacion.nombre}`] : []),
    `Resumen: ${resumen(d.evaluacion)}`,
    `Riesgo: ${d.evaluacion.risk}/100`,
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
    lista.push({ nombre: u.nombre, telefono: u.telefono })
  }
  return lista
}

/**
 * Avisa a todas las administradoras. Que una falle (p. ej. la ventana de 24 h de WhatsApp) no frena a las demás ni la charla.
 * Devuelve a cuántas les llegó.
 */
export async function avisarAdministradoras(deps: Deps, d: DatosAviso): Promise<{ destinatarias: number; enviados: number }> {
  let admins: Administradora[]
  try {
    admins = await buscarAdministradoras(deps)
  } catch (e) {
    console.error('No se pudo leer quiénes son las administradoras:', e)
    return { destinatarias: 0, enviados: 0 }
  }
  if (!admins.length) console.warn('Visita agendada pero no hay administradoras (rol admin/adopciones) a quién avisar')
  const resultados = await Promise.allSettled(
    admins.map((a) => deps.wa.enviar(a.telefono, { tipo: 'texto', texto: armarAviso(a.nombre, d) })),
  )
  let enviados = 0
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') enviados++
    else console.error(`No se pudo avisar a ${admins[i].nombre} de la visita de ${d.perro}:`, r.reason)
  })
  return { destinatarias: admins.length, enviados }
}
