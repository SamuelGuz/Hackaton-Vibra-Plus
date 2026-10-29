// Sesiones del agente en memoria: se pierden si el bot se reinicia (es una charla, no un expediente).
import { evaluacionInicial } from './decisiones.js'
import type { Sesion } from './tipos.js'

export const TTL_SESION_MS = 6 * 3_600_000
export const MAX_SESIONES = 500
/** 12 turnos = 12 mensajes de la persona y 12 respuestas */
export const MAX_MENSAJES_HISTORIAL = 24
const almacenesVivos = new Set<WeakRef<AlmacenSesiones>>()
let temporizadorBarrido: ReturnType<typeof setInterval> | null = null

function registrarBarrido(almacen: AlmacenSesiones): void {
  almacenesVivos.add(new WeakRef(almacen))
  if (temporizadorBarrido) return
  temporizadorBarrido = setInterval(() => {
    for (const referencia of almacenesVivos) {
      const actual = referencia.deref()
      if (!actual) almacenesVivos.delete(referencia)
      else actual.barridoTTL()
    }
  }, 60_000)
  temporizadorBarrido.unref?.()
}

export interface AlmacenSesiones {
  /** Devuelve la sesión viva de esa clave (renovándola) o crea una nueva */
  obtener(clave: string): Sesion
  tiene(clave: string): boolean
  tamano(): number
  /** Elimina una sesión solo si existía. */
  eliminarSesion(clave: string): boolean
  /** Elimina sesiones vencidas y devuelve cuántas se borraron. */
  barridoTTL(): number
}

export function crearAlmacenSesiones(opc: { ttlMs?: number; maxSesiones?: number; ahora: () => number }): AlmacenSesiones {
  const ttl = opc.ttlMs ?? TTL_SESION_MS
  const max = opc.maxSesiones ?? MAX_SESIONES
  // Un Map recuerda el orden de inserción: la primera clave es la que lleva más tiempo sin usarse
  const sesiones = new Map<string, Sesion>()
  const caducada = (s: Sesion, t: number) => t - s.ultimoUso > ttl

  function barridoTTL(): number {
    const t = opc.ahora()
    let eliminadas = 0
    for (const [clave, sesion] of sesiones) {
      if (caducada(sesion, t)) {
        sesiones.delete(clave)
        eliminadas++
      }
    }
    return eliminadas
  }

  function nueva(clave: string, t: number): Sesion {
    return {
      clave,
      historial: [],
      evaluacion: evaluacionInicial(),
      perroFoco: null,
      turnos: 0,
      alertaBienestar: false,
      padrinazgoOfrecido: false,
      visitas: new Map(),
      ultimoUso: t,
      cola: Promise.resolve(),
      bienvenida: false,
      webEnviada: false,
      donacionMostrada: false,
      formulario: null,
    }
  }

  const almacen: AlmacenSesiones = {
    obtener(clave) {
      const t = opc.ahora()
      const actual = sesiones.get(clave)
      if (actual && !caducada(actual, t)) {
        actual.ultimoUso = t
        sesiones.delete(clave)
        sesiones.set(clave, actual)
        return actual
      }
      sesiones.delete(clave)
      if (sesiones.size >= max) {
        for (const [k, s] of sesiones) if (caducada(s, t)) sesiones.delete(k)
        while (sesiones.size >= max) sesiones.delete(sesiones.keys().next().value as string)
      }
      const creada = nueva(clave, t)
      sesiones.set(clave, creada)
      return creada
    },
    tiene(clave) {
      const sesion = sesiones.get(clave)
      if (sesion && caducada(sesion, opc.ahora())) sesiones.delete(clave)
      return sesiones.has(clave)
    },
    tamano() {
      barridoTTL()
      return sesiones.size
    },
    eliminarSesion: (clave) => sesiones.delete(clave),
    barridoTTL,
  }
  // El temporizador global usa referencias débiles: no retiene los almacenes de pruebas o procesos cerrados.
  registrarBarrido(almacen)
  return almacen
}
