// Modelo de datos del panel (provisional).
// El contrato final es src/domain/types.ts de placa viva (ver docs/PLAN_INTEGRADO.md, §3.2):
// cuando exista, este archivo reexporta esos tipos y deja solo los tipos de vista del panel.

export type Especie = 'perro' | 'gato'

export type EstadoAnimal =
  | 'cuarentena'
  | 'tratamiento'
  | 'adoptable'
  | 'hogar_temporal'
  | 'adoptado'
  | 'fallecido'
  | 'devuelto'

/** Mismos roles que placa viva; el panel principal usa los 3 primeros y el de adopción, 'adopciones'. */
export type Rol = 'cuidador' | 'bienestar' | 'admin' | 'adopciones' | 'comunicacion' | 'voluntario'

export interface Persona {
  id: string
  nombre: string
  /** Cómo se presenta en la pantalla "¿Quién eres?", p. ej. "Cuidador" */
  cargo: string
  rol: Rol
  /** Color del círculo con la inicial mientras no haya foto */
  color: string
  foto: string | null
}

export interface Animal {
  id: string
  nombre: string
  especie: Especie
  estado: EstadoAnimal
  foto: string | null
  fechaIngreso: string // ISO, p. ej. '2026-03-14'
  /** Cosas que NO pueden pasar (caso Bruno). Se muestran en rojo arriba de la ficha. */
  advertencias: string[]
  /** Carácter y convivencia, en palabras del equipo */
  caracter: string
  padrino: string | null
}

export interface Tratamiento {
  id: string
  animalId: string
  medicamento: string
  /** Dosis como se dice en voz alta: "3 ml", "1 pastilla" */
  dosis: string
  /** Horas del día en que toca, formato 24 h: ['08:00', '20:00'] */
  horas: string[]
  inicio: string
  fin: string
}

export interface DosisDada {
  id: string
  tratamientoId: string
  /** Hora programada que se cumplió, p. ej. '08:00' */
  hora: string
  fechaHora: string
  quien: string
  origen: 'panel' | 'bot'
}

export interface MovimientoInventario {
  id: string
  fechaHora: string
  tipo: Especie
  /** -1 al abrir un bulto, +N cuando llegan */
  cambio: number
  quien: string
  origen: 'panel' | 'bot'
}

export type CategoriaGasto = 'comida' | 'veterinaria' | 'limpieza' | 'servicios' | 'transporte' | 'otro'
export type CategoriaIngreso = 'donacion' | 'padrino' | 'rifa' | 'otro'

export interface Movimiento {
  id: string
  fechaHora: string
  tipo: 'ingreso' | 'gasto'
  monto: number // pesos colombianos, sin decimales
  categoria: CategoriaGasto | CategoriaIngreso
  /** Si el gasto es veterinario: a qué clínica. Si es un abono, también. */
  clinicaId: string | null
  /** true = abono a la deuda de la clínica (sale de caja, baja la deuda) */
  abonoDeuda: boolean
  foto: string | null
  quien: string
  nota: string
}

export interface Clinica {
  id: string
  nombre: string
  /** Deuda que se tiene hoy con la clínica */
  deuda: number
  /** Límite implícito: si se pasa, dejan de atender */
  limite: number
}

export interface PorConfirmar {
  id: string
  fechaHora: string
  origen: 'audio' | 'foto'
  quien: string
  /** Lo que la IA escuchó o leyó, tal cual */
  textoOriginal: string
  /** Lo que la IA propone guardar, en frases cortas */
  propuestas: Propuesta[]
  estado: 'pendiente' | 'confirmado' | 'corregido' | 'descartado'
}

export type Propuesta =
  | { tipo: 'dosis'; animalId: string; tratamientoId: string; hora: string }
  | { tipo: 'inventario'; especie: Especie; cambio: number }
  | { tipo: 'movimiento'; movimiento: Omit<Movimiento, 'id' | 'fechaHora' | 'quien'> }
  | { tipo: 'nota'; animalId: string; texto: string }
  /** Factura a crédito: no sale de caja, sube la deuda con la clínica */
  | { tipo: 'deuda'; clinicaId: string; monto: number; nota: string }

export interface ConfigComida {
  kgPorBulto: Record<Especie, number>
  consumoDiarioKg: Record<Especie, number>
  /** "Ojo" desde estos días o menos */
  diasAviso: number
  /** "Urgente" desde estos días o menos. Igual a la alerta de WhatsApp de placa viva (≤ 4). */
  diasUrgente: number
}

export interface DatosAlbergue {
  personas: Persona[]
  animales: Animal[]
  tratamientos: Tratamiento[]
  dosisDadas: DosisDada[]
  inventario: MovimientoInventario[]
  /** Bultos cerrados en bodega al momento del último conteo manual */
  conteoInicial: { fecha: string; bultos: Record<Especie, number> }
  movimientos: Movimiento[]
  /** Plata en caja al momento del último cuadre */
  cajaInicial: { fecha: string; monto: number }
  clinicas: Clinica[]
  porConfirmar: PorConfirmar[]
  configComida: ConfigComida
  /** Total histórico de adopciones (para el contador de vidas) */
  vidasCambiadas: number
}
