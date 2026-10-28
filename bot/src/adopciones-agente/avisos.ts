// Aviso por WhatsApp a las administradoras cuando se agenda una visita.
// Va directo por deps.wa (no por el buzón): solo se puede escribir dentro de la ventana de 24 h de cada una
// y la visita solo se le confirma a la persona si el aviso le llegó al menos a una.
import type { Deps } from '../flujos/deps'
import { ventanaAbierta } from '../wa/ventana'
import { describirFecha, HORA_VISITA } from './decisiones'
import { telefonoBonito } from './textos'
import type { Evaluacion } from './tipos'

/** El aviso vive 24 h por (sesión, animal): ni un reintento del buzón ni otro proceso lo repiten */
export const TTL_GUARDIA_AVISO_SEG = 24 * 3600

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

export type EstadoAviso =
  /** Se avisó ahora a `enviados` administradoras */
  | 'avisada'
  /** Otro intento ya había avisado (reintento del buzón, otro proceso): no se repite, la visita sigue en pie */
  | 'ya_avisada'
  /** No le llegó a nadie (sin administradoras, ventana cerrada, error): no hay visita que prometer */
  | 'sin_alcanzar'

const soloDigitos = (t: string) => t.replace(/\D/g, '')

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

/** Administradoras = personas activas del equipo con rol admin o adopciones y teléfono; un mismo número cuenta una vez. */
export async function buscarAdministradoras(deps: Deps): Promise<Administradora[]> {
  const vistos = new Set<string>()
  const lista: Administradora[] = []
  for (const p of await deps.repo.personas()) {
    if (p.rol !== 'admin' && p.rol !== 'adopciones') continue
    if (p.activo === false) continue
    const digitos = soloDigitos(p.telefono ?? '')
    if (!digitos || vistos.has(digitos)) continue
    vistos.add(digitos)
    lista.push({ nombre: p.nombre, telefono: digitos })
  }
  return lista
}

/** Escribe a una administradora solo si su ventana de 24 h está abierta; true si el mensaje salió. */
async function avisarA(deps: Deps, a: Administradora, d: DatosAviso): Promise<boolean> {
  if (!(await ventanaAbierta(deps.kv, a.telefono, deps.ahora().getTime()))) {
    console.warn(`No se pudo avisar a ${a.nombre} de la visita de ${d.perro}: su ventana de 24 h de WhatsApp está cerrada`)
    return false
  }
  try {
    await deps.wa.enviarTexto(a.telefono, armarAviso(a.nombre, d))
    return true
  } catch (e) {
    console.error(`No se pudo avisar a ${a.nombre} de la visita de ${d.perro}:`, e)
    return false
  }
}

/**
 * Avisa a todas las administradoras, una sola vez por `guardia` (clave del Kv: sesión + animal).
 * La guardia se toma ANTES de escribir; si no le llegó a nadie se suelta para que un turno posterior reintente.
 * Que una falle (ventana cerrada, error de Meta) no frena a las demás. Nunca lanza.
 */
export async function avisarAdministradoras(deps: Deps, d: DatosAviso, guardia: string): Promise<{ estado: EstadoAviso; enviados: number }> {
  let tomada = false
  try {
    const admins = await buscarAdministradoras(deps)
    if (!admins.length) {
      console.warn('Visita agendada pero no hay administradoras (rol admin/adopciones, activas, con teléfono) a quién avisar')
      return { estado: 'sin_alcanzar', enviados: 0 }
    }
    tomada = await deps.kv.ponerSiNoExiste(guardia, '1', TTL_GUARDIA_AVISO_SEG)
    if (!tomada) return { estado: 'ya_avisada', enviados: 0 }
    const resultados = await Promise.all(admins.map((a) => avisarA(deps, a, d)))
    const enviados = resultados.filter(Boolean).length
    if (enviados === 0) {
      await deps.kv.delete(guardia)
      return { estado: 'sin_alcanzar', enviados: 0 }
    }
    return { estado: 'avisada', enviados }
  } catch (e) {
    console.error('El aviso a las administradoras falló:', e)
    if (tomada) await deps.kv.delete(guardia).catch(() => {})
    return { estado: 'sin_alcanzar', enviados: 0 }
  }
}
