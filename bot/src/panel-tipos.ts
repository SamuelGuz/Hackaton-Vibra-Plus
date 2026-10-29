// Copia de panel/src/data/tipos.ts: es la forma que devuelve GET /api/hoy.
// Si el panel cambia sus tipos, se copian de nuevo aquí (docs/PLAN_INTEGRADO.md, §3.2).

export type Especie = 'perro' | 'gato'

export type EstadoAnimal =
  | 'cuarentena'
  | 'tratamiento'
  | 'adoptable'
  | 'hogar_temporal'
  | 'adoptado'
  | 'fallecido'
  | 'devuelto'

export type Rol = 'cuidador' | 'bienestar' | 'admin' | 'adopciones' | 'comunicacion' | 'voluntario'

export interface Persona {
  id: string
  nombre: string
  cargo: string
  rol: Rol
  color: string
  foto: string | null
}

export interface Animal {
  id: string
  nombre: string
  especie: Especie
  estado: EstadoAnimal
  foto: string | null
  fechaIngreso: string
  advertencias: string[]
  caracter: string
  padrino: string | null
}

export interface Tratamiento {
  id: string
  animalId: string
  medicamento: string
  dosis: string
  horas: string[]
  inicio: string
  fin: string
}

export interface DosisDada {
  id: string
  tratamientoId: string
  hora: string
  fechaHora: string
  quien: string
  origen: 'panel' | 'bot'
}

export interface MovimientoInventario {
  id: string
  fechaHora: string
  tipo: Especie
  /** En bultos. Los kilos sueltos llegan convertidos a bultos equivalentes, para que el panel calcule igual. */
  cambio: number
  quien: string
  origen: 'panel' | 'bot'
  /** Solo en kilos sueltos (carne, recortes…): los kilos tal cual */
  kg?: number
  unidad?: 'kg'
  producto?: string
}

export type CategoriaGasto = 'comida' | 'veterinaria' | 'limpieza' | 'servicios' | 'transporte' | 'otro'
export type CategoriaIngreso = 'donacion' | 'padrino' | 'rifa' | 'otro'

export interface Movimiento {
  id: string
  fechaHora: string
  tipo: 'ingreso' | 'gasto'
  monto: number
  categoria: CategoriaGasto | CategoriaIngreso
  clinicaId: string | null
  abonoDeuda: boolean
  foto: string | null
  quien: string
  nota: string
}

export interface Clinica {
  id: string
  nombre: string
  deuda: number
  limite: number
}

export interface PorConfirmar {
  id: string
  fechaHora: string
  origen: 'audio' | 'foto'
  quien: string
  textoOriginal: string
  propuestas: Propuesta[]
  estado: 'pendiente' | 'confirmado' | 'corregido' | 'descartado'
}

export type Propuesta =
  | { tipo: 'dosis'; animalId: string; tratamientoId: string; hora: string }
  /** `cambio` en bultos; con `unidad: 'kg'`, en kilos sueltos (carne, menudencia… de `producto`) */
  | { tipo: 'inventario'; especie: Especie; cambio: number; unidad?: 'kg'; producto?: string }
  | { tipo: 'movimiento'; movimiento: Omit<Movimiento, 'id' | 'fechaHora' | 'quien'> }
  | { tipo: 'nota'; animalId: string; texto: string }
  | { tipo: 'deuda'; clinicaId: string; monto: number; nota: string }
  | { tipo: 'estado_animal'; animalId: string; estado: EstadoAnimal }

export interface Nota {
  id: string
  animalId: string
  texto: string
  fechaHora: string
  quien: string
}

/** Una vacuna puesta y cuándo toca el refuerzo (eventos_salud de tipo 'vacuna'; `vence` en AAAA-MM-DD) */
export interface Vacuna {
  animalId: string
  vacuna: string
  vence: string
}

export interface ConfigComida {
  kgPorBulto: Record<Especie, number>
  consumoDiarioKg: Record<Especie, number>
  diasAviso: number
  diasUrgente: number
}

export interface DatosAlbergue {
  personas: Persona[]
  animales: Animal[]
  tratamientos: Tratamiento[]
  dosisDadas: DosisDada[]
  inventario: MovimientoInventario[]
  conteoInicial: { fecha: string; bultos: Record<Especie, number> }
  movimientos: Movimiento[]
  cajaInicial: { fecha: string; monto: number }
  clinicas: Clinica[]
  porConfirmar: PorConfirmar[]
  notas: Nota[]
  configComida: ConfigComida
  vidasCambiadas: number
  /** Solo la manda el bot: la meta de donaciones del día para la página pública (config meta_dia_kg y meta_dia_pesos) */
  metaDelDia?: { kg: number; pesos: number }
  /** Solo la manda el bot: la última de cada vacuna por animal */
  vacunas?: Vacuna[]
}
