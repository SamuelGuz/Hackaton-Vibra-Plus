// Contrato del módulo de medicinas: catálogo, lotes y contactos ("clientes": proveedores, clínicas, padrinos, donantes…).
// Hoy la fuente es un Excel local (medicinas/excel.ts); mañana puede ser Google Sheets cambiando solo el AlmacenMedicinas.
import type { Tratamiento } from '../panel-tipos.js'

export type CategoriaMedicamento =
  | 'antibiotico'
  | 'antiparasitario'
  | 'analgesico'
  | 'antiinflamatorio'
  | 'anticonvulsivante'
  | 'vitamina'
  | 'dermatologico'
  | 'oftalmico'
  | 'vacuna'
  | 'suero'
  | 'otro'

export type UnidadMedicamento = 'tableta' | 'ml' | 'frasco' | 'ampolla' | 'sobre' | 'tubo' | 'dosis'

export interface Medicamento {
  id: string
  nombre: string
  /** Nombres comerciales o como lo dice el equipo ("amoxi") */
  alias: string[]
  principioActivo: string
  categoria: CategoriaMedicamento
  presentacion: string
  unidad: UnidadMedicamento
  especies: ('perro' | 'gato')[]
  usoComun: string
  dosisReferencia: string
  contraindicaciones: string
  requiereFormula: boolean
  /** Por debajo de esto se avisa que toca comprar */
  stockMinimo: number
  /** Id de un Contacto de tipo proveedor o clinica; null si no se sabe */
  proveedorId: string | null
  precioUnitarioCOP: number
}

export interface LoteMedicamento {
  id: string
  medicamentoId: string
  numeroLote: string
  /** YYYY-MM-DD */
  vence: string
  cantidad: number
  /** YYYY-MM-DD */
  ingreso: string
}

export type TipoContacto = 'proveedor' | 'clinica' | 'padrino' | 'donante' | 'adoptante' | 'voluntario'

export interface Contacto {
  id: string
  tipo: TipoContacto
  nombre: string
  telefono: string
  correo: string
  ciudad: string
  nota: string
  activo: boolean
}

export interface DatosMedicinas {
  medicamentos: Medicamento[]
  lotes: LoteMedicamento[]
  contactos: Contacto[]
}

/** Dónde viven los datos. Implementaciones: memoria (pruebas), Excel local (hoy), Google Sheets (después). */
export interface AlmacenMedicinas {
  leer(): Promise<DatosMedicinas>
  guardar(datos: DatosMedicinas): Promise<void>
}

export interface ResumenMedicamento {
  medicamento: Medicamento
  /** Suma de los lotes no vencidos */
  stock: number
  lotes: LoteMedicamento[]
  bajoMinimo: boolean
  /** Fecha (YYYY-MM-DD) del lote no vencido que vence primero; null si no hay lotes */
  venceProximo: string | null
  proveedor: Contacto | null
}

export interface LoteQueVence extends ResumenMedicamento {
  lote: LoteMedicamento
  diasRestantes: number
}

export interface ServicioMedicinas {
  datos(): Promise<DatosMedicinas>
  /** Búsqueda por nombre, alias, principio activo, categoría o uso ("algo para el dolor") */
  buscar(texto: string, limite?: number): Promise<ResumenMedicamento[]>
  porId(id: string): Promise<ResumenMedicamento | null>
  stockBajo(): Promise<ResumenMedicamento[]>
  /** Lotes no vencidos que vencen en los próximos `dias` días */
  porVencer(dias: number, ahora: Date): Promise<LoteQueVence[]>
  vencidos(ahora: Date): Promise<LoteQueVence[]>
  contactos(tipo?: TipoContacto): Promise<Contacto[]>
  /** Días que alcanza el stock con los tratamientos activos hoy; null si nadie lo usa */
  diasDeStock(medicamentoId: string, tratamientos: Tratamiento[], ahora: Date): Promise<number | null>
}
