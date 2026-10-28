// Lo que manda el panel para agregar a alguien al equipo.
import type { Rol } from '../panel-tipos.js'
import type { NuevoMiembro } from '../tipos.js'
import { normalizarTelefono } from '../wa/telefono.js'

export const ROLES: readonly Rol[] = ['admin', 'cuidador', 'bienestar', 'adopciones', 'comunicacion', 'voluntario']

export function validarMiembro(crudo: unknown): { ok: NuevoMiembro } | { error: string } {
  if (!crudo || typeof crudo !== 'object') return { error: 'Se espera { nombre, rol, telefono }' }
  const { nombre, rol, telefono } = crudo as Record<string, unknown>
  const limpio = typeof nombre === 'string' ? nombre.trim().replace(/\s+/g, ' ') : ''
  if (!limpio || limpio.length > 60) return { error: 'Falta el nombre (máximo 60 letras)' }
  if (!ROLES.includes(rol as Rol)) return { error: `El rol debe ser uno de: ${ROLES.join(', ')}` }
  const numero = typeof telefono === 'string' ? normalizarTelefono(telefono) : ''
  // Con indicativo: 57 + 10 dígitos en Colombia; otros países entre 8 y 15
  if (numero.length < 8 || numero.length > 15) return { error: 'El teléfono no parece válido: escríbelo con el indicativo, p. ej. 57 300 123 4567' }
  return { ok: { nombre: limpio, rol: rol as Rol, telefono: numero } }
}
