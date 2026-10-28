// Sesiones del agente en el Kv de master (JSON, vencen a las 6 h sin hablar): sobreviven a un reinicio
// y a los reintentos del buzón. Es una charla, no un expediente: si el Kv las pierde, se empieza de cero.
import type { Kv } from '../store/kv'
import { acotarPuntaje, evaluacionInicial } from './decisiones'
import { PERMISOS, SI_NO, TIEMPOS, TIPOS_VIVIENDA, type Evaluacion, type Sesion, type TurnoHistorial } from './tipos'

export const TTL_SESION_SEG = 6 * 3600
/** 12 turnos = 12 mensajes de la persona y 12 respuestas */
export const MAX_MENSAJES_HISTORIAL = 24

export const claveSesionKv = (clave: string) => `ext:ses:${clave}`

export function sesionNueva(clave: string): Sesion {
  return {
    clave,
    historial: [],
    evaluacion: evaluacionInicial(),
    perroFoco: null,
    turnos: 0,
    alertaBienestar: false,
    padrinazgoOfrecido: false,
    visitas: {},
  }
}

function objeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function elegir<T extends string>(v: unknown, validos: readonly T[], porDefecto: T): T {
  return typeof v === 'string' && (validos as readonly string[]).includes(v) ? (v as T) : porDefecto
}

function texto(v: unknown, porDefecto: string): string {
  return typeof v === 'string' ? v : porDefecto
}

/** Lo que se leyó del Kv se revisa campo por campo: un JSON dañado o viejo nunca tumba la conversación */
function evaluacionDe(v: unknown): Evaluacion {
  const base = evaluacionInicial()
  const o = objeto(v)
  if (!o) return base
  return {
    suitability: acotarPuntaje(o.suitability) ?? base.suitability,
    risk: acotarPuntaje(o.risk) ?? base.risk,
    viviendaTipo: elegir(o.viviendaTipo, TIPOS_VIVIENDA, base.viviendaTipo),
    permisoArriendo: elegir(o.permisoArriendo, PERMISOS, base.permisoArriendo),
    presupuestoVeterinario: elegir(o.presupuestoVeterinario, SI_NO, base.presupuestoVeterinario),
    tiempoDisponible: elegir(o.tiempoDisponible, TIEMPOS, base.tiempoDisponible),
    ninos: texto(o.ninos, base.ninos),
    otrasMascotas: texto(o.otrasMascotas, base.otrasMascotas),
    nombre: typeof o.nombre === 'string' && o.nombre ? o.nombre : null,
  }
}

function historialDe(v: unknown): TurnoHistorial[] {
  if (!Array.isArray(v)) return []
  const turnos: TurnoHistorial[] = []
  for (const t of v) {
    const o = objeto(t)
    if (o && (o.rol === 'user' || o.rol === 'model') && typeof o.texto === 'string') turnos.push({ rol: o.rol, texto: o.texto })
  }
  return turnos.slice(-MAX_MENSAJES_HISTORIAL)
}

function visitasDe(v: unknown): Record<string, string> {
  const o = objeto(v)
  const visitas: Record<string, string> = {}
  if (o) for (const [id, fecha] of Object.entries(o)) if (typeof fecha === 'string') visitas[id] = fecha
  return visitas
}

export function sesionDesdeJson(clave: string, json: string | null): Sesion {
  if (json === null) return sesionNueva(clave)
  let crudo: unknown
  try {
    crudo = JSON.parse(json)
  } catch {
    return sesionNueva(clave)
  }
  const o = objeto(crudo)
  if (!o) return sesionNueva(clave)
  return {
    clave,
    historial: historialDe(o.historial),
    evaluacion: evaluacionDe(o.evaluacion),
    perroFoco: typeof o.perroFoco === 'string' ? o.perroFoco : null,
    turnos: typeof o.turnos === 'number' && Number.isFinite(o.turnos) ? Math.max(0, Math.floor(o.turnos)) : 0,
    alertaBienestar: o.alertaBienestar === true,
    padrinazgoOfrecido: o.padrinazgoOfrecido === true,
    visitas: visitasDe(o.visitas),
  }
}

export async function cargarSesion(kv: Kv, clave: string): Promise<Sesion> {
  return sesionDesdeJson(clave, await kv.get(claveSesionKv(clave)))
}

/** Guardar renueva las 6 h: cada mensaje de la persona alarga la sesión */
export async function guardarSesion(kv: Kv, sesion: Sesion): Promise<void> {
  await kv.put(claveSesionKv(sesion.clave), JSON.stringify(sesion), TTL_SESION_SEG)
}
