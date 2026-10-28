// Módulo de medicinas: catálogo, lotes y contactos en una base interna (hoy un Excel local; mañana Google Sheets).
// Uso: const { servicio } = crearMedicinas(); await servicio.buscar('algo para el dolor')

import path from 'node:path'
import { crearAlmacenExcel } from './almacen-excel.js'
import { semillaMedicinas } from './semilla.js'
import { crearServicioMedicinas } from './servicio.js'
import type { AlmacenMedicinas, ServicioMedicinas } from './tipos.js'

export * from './tipos.js'
export { crearAlmacenMemoria } from './almacen-memoria.js'
export { crearAlmacenExcel, ErrorExcelMedicinas } from './almacen-excel.js'
export { crearServicioMedicinas } from './servicio.js'
export { semillaMedicinas } from './semilla.js'

export interface OpcionesMedicinas {
  /** Ruta del .xlsx. Por defecto MEDICINAS_XLSX o `datos/medicinas.xlsx` (relativa a donde corre el bot) */
  ruta?: string
  /** Reloj; por defecto el real */
  ahora?: () => Date
  /** Crear el archivo con datos de demostración si no existe (por defecto sí). Con false se crea vacío. */
  semilla?: boolean
}

export const RUTA_POR_DEFECTO = 'datos/medicinas.xlsx'

export function crearMedicinas(o: OpcionesMedicinas = {}): { servicio: ServicioMedicinas; almacen: AlmacenMedicinas } {
  const ahora = o.ahora ?? (() => new Date())
  const ruta = path.resolve(o.ruta ?? process.env.MEDICINAS_XLSX ?? RUTA_POR_DEFECTO)
  const almacen = crearAlmacenExcel(ruta, { semilla: o.semilla === false ? undefined : () => semillaMedicinas(ahora()) })
  return { servicio: crearServicioMedicinas(almacen, { ahora }), almacen }
}
