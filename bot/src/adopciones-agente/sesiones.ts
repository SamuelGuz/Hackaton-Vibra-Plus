// Sesiones del agente en memoria: se pierden si el bot se reinicia (es una charla, no un expediente).
import { evaluacionInicial } from './decisiones.js'
import type { Sesion } from './tipos.js'

export const TTL_SESION_MS = 6 * 3_600_000
export const MAX_SESIONES = 500
/** 12 turnos = 12 mensajes de la persona y 12 respuestas */
export const MAX_MENSAJES_HISTORIAL = 24

export interface AlmacenSesiones {
  /** Devuelve la sesión viva de esa clave (renovándola) o crea una nueva */
  obtener(clave: string): Sesion
  tiene(clave: string): boolean
  tamano(): number
}

export function crearAlmacenSesiones(opc: { ttlMs?: number; maxSesiones?: number; ahora: () => number }): AlmacenSesiones {
  const ttl = opc.ttlMs ?? TTL_SESION_MS
  const max = opc.maxSesiones ?? MAX_SESIONES
  // Un Map recuerda el orden de inserción: la primera clave es la que lleva más tiempo sin usarse
  const sesiones = new Map<string, Sesion>()
  const caducada = (s: Sesion, t: number) => t - s.ultimoUso > ttl

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

  return {
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
    tiene: (clave) => sesiones.has(clave),
    tamano: () => sesiones.size,
  }
}
