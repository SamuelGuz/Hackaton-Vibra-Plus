// Conexión con el servidor (bot/). Rutas de PLAN_INTEGRADO §3.1.
// Se entra con el enlace personal que manda el bot: PANEL_URL/?t=<token>.
import type { DatosAlbergue, Propuesta, Rol } from './tipos'

const CLAVE_TOKEN = 'huellitas.token'

/** Dirección del servidor, p. ej. http://localhost:8787. Sin ella el panel funciona en modo demo. */
export function urlApi(): string | null {
  const url = import.meta.env.VITE_API_URL as string | undefined
  return url ? url.replace(/\/$/, '') : null
}

/** Toma el token del enlace (?t=) y lo quita de la barra de direcciones; si no viene, usa el guardado. */
export function tomarToken(): string | null {
  const url = new URL(window.location.href)
  const delEnlace = url.searchParams.get('t')
  if (delEnlace) {
    try {
      localStorage.setItem(CLAVE_TOKEN, delEnlace)
    } catch {
      // Sin almacenamiento: dura mientras la pestaña esté abierta
    }
    url.searchParams.delete('t')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    return delEnlace
  }
  try {
    return localStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

export function olvidarToken() {
  try {
    localStorage.removeItem(CLAVE_TOKEN)
  } catch {
    // nada que borrar
  }
}

/** El servidor respondió con un error (no es falta de señal). */
export class ErrorApi extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

export type Evento = Propuesta & { id: string }

/** Lo que el panel le manda al servidor. Se guarda en la cola mientras no hay señal. */
export type Envio =
  | { tipo: 'eventos'; eventos: Evento[] }
  | { tipo: 'estado'; ids: string[]; estado: 'confirmado' | 'corregido' | 'anulado' }

export type DatosServidor = DatosAlbergue & {
  yo: string
  /** Cuántos le escribieron al bot sin estar en el equipo (solo le llega a la administradora) */
  solicitudesEquipo?: number
}

async function pedir<T>(token: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(`${urlApi()}${ruta}`, {
    method: cuerpo === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new ErrorApi(r.status, json.error ?? `El servidor respondió ${r.status}`)
  return json as T
}

export function pedirHoy(token: string): Promise<DatosServidor> {
  return pedir<DatosServidor>(token, '/api/hoy')
}

export async function mandar(token: string, envio: Envio): Promise<void> {
  if (envio.tipo === 'estado') {
    await pedir(token, '/api/eventos/estado', { ids: envio.ids, estado: envio.estado })
    return
  }
  const r = await pedir<{ errores?: { error: string }[] }>(token, '/api/eventos', { eventos: envio.eventos })
  if (r.errores?.length) throw new ErrorApi(400, r.errores.map((e) => e.error).join('; '))
}

// ---------- Equipo (solo la administradora, sin cola: necesita señal) ----------

export interface MiembroEquipo {
  id: number
  nombre: string
  rol: Rol
  telefono: string
  activo: boolean
}

export interface SolicitudEquipo {
  telefono: string
  /** Nombre del perfil de WhatsApp */
  nombre: string | null
  mensajes: number
  ultimoMensajeEn: string
}

export interface Equipo {
  personas: MiembroEquipo[]
  solicitudes: SolicitudEquipo[]
}

export function pedirEquipo(token: string): Promise<Equipo> {
  return pedir<Equipo>(token, '/api/equipo')
}

export function agregarAlEquipo(token: string, m: { nombre: string; rol: Rol; telefono: string }) {
  return pedir<{ persona: MiembroEquipo; avisado: boolean }>(token, '/api/equipo', m)
}

export function cambiarActivo(token: string, id: number, activo: boolean) {
  return pedir<{ ok: true }>(token, `/api/equipo/${id}/activo`, { activo })
}

export function descartarSolicitud(token: string, telefono: string) {
  return pedir<{ ok: true }>(token, '/api/equipo/solicitudes/descartar', { telefono })
}
