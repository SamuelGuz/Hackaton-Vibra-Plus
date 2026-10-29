import { createHash } from 'node:crypto'
import { quitarDatosSensibles } from '../ia/redactar.js'
import { evaluacionInicial } from './decisiones.js'
import { MAX_MENSAJES_HISTORIAL } from './sesiones.js'
import type { Deps } from '../tipos.js'
import type { Evaluacion, Formulario, Sesion, TurnoHistorial } from './tipos.js'

/** Clave seudónima estable para memoria; nunca se persiste el teléfono como clave. */
export function claveMemoria(clave: string): string {
  return createHash('sha256').update(clave).digest('hex')
}

const bajasLocales = new WeakMap<Deps, Set<string>>()

export function claveBaja(telefono: string): string {
  return claveMemoria(`baja:${telefono.replace(/\D/g, '')}`)
}

export function registrarBaja(deps: Deps, telefono: string): void {
  const claves = bajasLocales.get(deps) ?? new Set<string>()
  claves.add(claveBaja(telefono))
  bajasLocales.set(deps, claves)
}

/** Consulta de baja compartida por el webhook y el agente. Si falla el almacén, no contacta a ciegas. */
export async function estaDeBaja(deps: Deps, telefono: string): Promise<boolean> {
  const clave = claveBaja(telefono)
  if (bajasLocales.get(deps)?.has(clave)) return true
  if (!deps.repo.leerMemoria) return false
  try {
    const valor = await deps.repo.leerMemoria(clave, deps.ahora())
    const activa = esObjeto(valor) && valor.no_contactar === true
    if (activa) registrarBaja(deps, telefono)
    return activa
  } catch {
    return true
  }
}

type SesionSerializada = Omit<Sesion, 'clave' | 'cola' | 'visitas'> & {
  version: 1
  visitas: [string, string][]
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const esTexto = (v: unknown): v is string => typeof v === 'string'
const esBooleano = (v: unknown): v is boolean => typeof v === 'boolean'

function evaluar(valor: unknown): Evaluacion | null {
  if (!esObjeto(valor)) return null
  const e = { ...evaluacionInicial(), ...valor }
  if (
    typeof e.suitability !== 'number' || !Number.isFinite(e.suitability) ||
    typeof e.risk !== 'number' || !Number.isFinite(e.risk) ||
    !['casa', 'apartamento', 'finca', 'otro', 'desconocido'].includes(e.viviendaTipo as string) ||
    !['si', 'no', 'no_aplica', 'desconocido'].includes(e.permisoArriendo as string) ||
    !['si', 'no', 'desconocido'].includes(e.presupuestoVeterinario as string) ||
    !['suficiente', 'poco', 'desconocido'].includes(e.tiempoDisponible as string) ||
    !esTexto(e.ninos) || !esTexto(e.otrasMascotas) || !(e.nombre === null || esTexto(e.nombre))
  ) return null
  return {
    ...e,
    ninos: quitarDatosSensibles(e.ninos),
    otrasMascotas: quitarDatosSensibles(e.otrasMascotas),
    nombre: e.nombre ? quitarDatosSensibles(e.nombre) : null,
  } as Evaluacion
}

function formularioValido(v: unknown): Formulario | null {
  if (!esObjeto(v) || !esTexto(v.animalId) || !esObjeto(v.respuestas)) return null
  const r = v.respuestas
  if (
    (r.vivienda !== undefined && !['propia', 'arriendo', 'nose'].includes(r.vivienda as string)) ||
    (r.tiempo !== undefined && !['mucho', 'medio', 'poco'].includes(r.tiempo as string)) ||
    (r.presupuesto !== undefined && !['si', 'nose', 'no'].includes(r.presupuesto as string))
  ) return null
  return { animalId: v.animalId, respuestas: { vivienda: r.vivienda as Formulario['respuestas']['vivienda'], tiempo: r.tiempo as Formulario['respuestas']['tiempo'], presupuesto: r.presupuesto as Formulario['respuestas']['presupuesto'] } }
}

export function serializarSesion(s: Sesion): SesionSerializada {
  return {
    version: 1,
    historial: s.historial.map((m) => ({ rol: m.rol, texto: quitarDatosSensibles(m.texto) })),
    evaluacion: {
      ...s.evaluacion,
      ninos: quitarDatosSensibles(s.evaluacion.ninos),
      otrasMascotas: quitarDatosSensibles(s.evaluacion.otrasMascotas),
      nombre: s.evaluacion.nombre ? quitarDatosSensibles(s.evaluacion.nombre) : null,
    },
    perroFoco: s.perroFoco,
    turnos: s.turnos,
    alertaBienestar: s.alertaBienestar,
    padrinazgoOfrecido: s.padrinazgoOfrecido,
    visitas: [...s.visitas].map(([id, fecha]) => [id, fecha.toISOString()]),
    ultimoUso: s.ultimoUso,
    bienvenida: s.bienvenida,
    webEnviada: s.webEnviada,
    donacionMostrada: s.donacionMostrada,
    formulario: s.formulario,
  }
}

/** Valida datos recuperados y reconstruye Map/cola en memoria; descarta datos vencidos o de forma desconocida. */
export function restaurarSesion(clave: string, valor: unknown, ahora: number, ttlMs: number): Omit<Sesion, 'clave' | 'cola'> | null {
  if (!esObjeto(valor) || valor.version !== 1) return null
  const evaluacion = evaluar(valor.evaluacion)
  if (
    !evaluacion || !Array.isArray(valor.historial) ||
    typeof valor.ultimoUso !== 'number' || !Number.isFinite(valor.ultimoUso) ||
    ahora - valor.ultimoUso > ttlMs ||
    typeof valor.turnos !== 'number' || !Number.isInteger(valor.turnos) || valor.turnos < 0 ||
    !(valor.perroFoco === null || esTexto(valor.perroFoco)) ||
    !esBooleano(valor.alertaBienestar) || !esBooleano(valor.padrinazgoOfrecido) ||
    !esBooleano(valor.bienvenida) || !esBooleano(valor.webEnviada) || !esBooleano(valor.donacionMostrada)
  ) return null

  const historial: TurnoHistorial[] = valor.historial
    .filter((m): m is Record<string, unknown> => esObjeto(m) && (m.rol === 'user' || m.rol === 'model') && esTexto(m.texto))
    .map((m) => ({ rol: m.rol as TurnoHistorial['rol'], texto: quitarDatosSensibles(m.texto as string) }))
    .slice(-MAX_MENSAJES_HISTORIAL)
  const visitas = new Map<string, Date>()
  if (Array.isArray(valor.visitas)) {
    for (const entrada of valor.visitas) {
      if (Array.isArray(entrada) && esTexto(entrada[0]) && esTexto(entrada[1])) {
        const fecha = new Date(entrada[1])
        if (!Number.isNaN(fecha.getTime())) visitas.set(entrada[0], fecha)
      }
    }
  }

  return {
    historial,
    evaluacion,
    perroFoco: valor.perroFoco as string | null,
    turnos: valor.turnos,
    alertaBienestar: valor.alertaBienestar,
    padrinazgoOfrecido: valor.padrinazgoOfrecido,
    visitas,
    ultimoUso: valor.ultimoUso,
    bienvenida: valor.bienvenida,
    webEnviada: valor.webEnviada,
    donacionMostrada: valor.donacionMostrada,
    formulario: formularioValido(valor.formulario),
  }
}
