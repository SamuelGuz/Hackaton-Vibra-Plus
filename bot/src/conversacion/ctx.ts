import { manejaPlata, veraPlata } from '../api/permisos.js'
import type { DatosAlbergue } from '../panel-tipos.js'
import type { Deps, Salida, Usuario } from '../tipos.js'

/** Lo que necesita cada paso de la conversación para responder. */
export interface Ctx {
  deps: Deps
  usuario: Usuario
  ahora: Date
  enviar(s: Salida): Promise<void>
  /** Datos del albergue de este momento. Se leen una sola vez por mensaje, salvo que se pida refrescar. */
  datos(refrescar?: boolean): Promise<DatosAlbergue>
}

export function crearCtx(deps: Deps, usuario: Usuario): Ctx {
  const ahora = deps.ahora()
  let cache: Promise<DatosAlbergue> | null = null
  return {
    deps,
    usuario,
    ahora,
    enviar: (s) => deps.wa.enviar(usuario.telefono, s),
    datos(refrescar = false) {
      if (!cache || refrescar) cache = deps.repo.hoy(ahora)
      return cache
    },
  }
}

// La misma regla que aplica el servidor al panel (api/permisos.ts)
export const puedeManejarPlata = (c: Ctx) => manejaPlata(c.usuario.rol)
export const puedeVerPlata = (c: Ctx) => veraPlata(c.usuario.rol)
