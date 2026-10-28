// Tipos de vista que devuelven los módulos puros de shared/src/domain/. Viven aquí para que
// los módulos se escriban en paralelo contra la misma forma (placa viva Tasks 1, 4, 5, 6, adaptadas a D3/D4).

/** 'publica' = la que ve cualquiera con la placa (sin nombres ni teléfonos del equipo). 'equipo' = con sesión. */
export type Vista = 'publica' | 'equipo'

export type EstadoDosisFicha = 'dada' | 'por_confirmar' | 'pendiente' | 'atrasada'

export interface FichaVM {
  codigo: string
  nombre: string
  canil: string
  fotoUrl?: string
  encabezadoPublico: string
  advertencias: string[]
  comida: { estado: 'comio' | 'por_confirmar' | 'no_consta'; hora?: string; texto?: string }
  dosis: Array<{ medicamento: string; hora: string; estado: EstadoDosisFicha; texto?: string; llamarA?: string }>
  registrarUrl: string
  contactoUrl: string
  vista: Vista
}

/** Una dosis que toca hoy. `Tratamiento.horas` da una DosisProgramada por cada hora. */
export interface DosisProgramada {
  /** `${tratamientoId}@${YYYY-MM-DD}T${HH:mm}`, p. ej. 't-tob-1@2026-10-27T14:00' */
  compromisoId: string
  tratamientoId: string
  animalId: string
  medicamento: string
  /** 'HH:mm' */
  hora: string
}

/** Lo que dice el extractor (voz o texto) antes de convertirse en Propuesta. Vocabulario de placa viva. */
export type TipoAccion = 'comida' | 'dosis' | 'observacion' | 'avance' | 'inventario' | 'factura' | 'abono' | 'donacion' | 'nota'

export interface Accion {
  tipo: TipoAccion
  animalCodigo?: string
  medicamento?: string
  cantidad?: number
  unidad?: string
  monto?: number
  nota?: string
  /** "le voy a dar" es futuro: no cuenta como dosis dada */
  tiempo: 'pasado' | 'presente' | 'futuro'
  fraseExacta: string
  confianza: number
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo'

/** Un elemento de la lista de deuda por clínica (placa viva Task 6). */
export interface DeudaClinica {
  clinicaId: string
  nombre: string
  /** Pesos COP, entero */
  deuda: number
  limite: number
  /** deuda / límite en %, redondeado: 83 */
  pct: number
  /** verde < 60 %, amarillo hasta 85 %, rojo > 85 % */
  semaforo: Semaforo
}

/** Resultado del cierre del día (placa viva Task 5). */
export interface Cierre {
  todoBien: boolean
  /** Frases como 'Luna no consta que haya comido' o 'Tobías: dosis de las 2:00 PM pendiente' */
  faltantes: string[]
  /** Registros por confirmar, uno por línea: 'Tobías – anticonvulsivo – 2:01 PM – Andrea' */
  pendientes: Array<{ registroId: string; linea: string }>
}

/** Un hecho de la semana de un animal apadrinado (Task 7). Solo de registros confirmados y sin nombres del equipo. */
export interface HechoDiario {
  /** Id del registro del que sale el hecho */
  eventoId: string
  texto: string
}
