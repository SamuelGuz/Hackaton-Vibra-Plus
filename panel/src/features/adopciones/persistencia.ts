import type { Solicitud } from '@huellitas/shared/adopcion/tipos'

export type CambiosDemo = Record<string, Partial<Solicitud>>
export const CLAVE_CAMBIOS_ADOPCION = 'huellitas.adopciones.demo.v1'

export function leerCambios(): CambiosDemo {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CLAVE_CAMBIOS_ADOPCION) ?? '{}')
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? valor as CambiosDemo : {}
  } catch {
    return {}
  }
}

export function guardarCambios(cambios: CambiosDemo): boolean {
  try {
    localStorage.setItem(CLAVE_CAMBIOS_ADOPCION, JSON.stringify(cambios))
    return true
  } catch {
    return false
  }
}
