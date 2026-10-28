// Bitácora del servidor. /api/hoy es una vista calculada de estos registros (docs: odd/tasks/backend-y-adopcion.md, D3).
import type { DatosAlbergue, Especie, Propuesta } from './tipos'

export type EstadoRegistro = 'por_confirmar' | 'confirmado' | 'corregido' | 'anulado'

/** De dónde salió el registro. 'panel' = lo tocó una persona; el resto nace por_confirmar. */
export type OrigenRegistro = 'panel' | 'audio' | 'foto' | 'texto'

/**
 * Lo que guarda la bitácora: las propuestas del panel más tres que solo nacen del bot y que el panel
 * todavía no conoce. En /api/hoy se muestran como `nota` (odd/tasks/backend-y-adopcion.md, D13).
 */
export type PropuestaServidor =
  | Propuesta
  /** El animal comió (cuenta para la ficha y el cierre del día) */
  | { tipo: 'comida'; animalId: string; texto: string }
  | { tipo: 'observacion'; animalId: string; texto: string }
  /** Un avance de salud o de conducta, p. ej. "ya camina solo" */
  | { tipo: 'avance'; animalId: string; texto: string }

/**
 * Un hecho guardado en la bitácora. Una acción de la IA con varias propuestas
 * genera varios registros que comparten `registroIaId`; ese id es el `id` del PorConfirmar del panel.
 */
export interface Registro {
  /** uuid. Un id repetido se ignora (idempotencia de los reenvíos del panel y de los webhooks de Meta). */
  id: string
  /** Hora de Bogotá con zona, p. ej. '2026-10-27T14:01:00-05:00'. Sus 10 primeros caracteres son la fecha del día. */
  fechaHora: string
  /** Id de la Persona que lo reportó */
  agenteId: string
  origen: OrigenRegistro
  estado: EstadoRegistro
  propuesta: PropuestaServidor
  /** Lo que dijo la persona, tal cual */
  fraseExacta?: string
  /** 0 a 1, solo si lo extrajo la IA */
  confianza?: number
  registroIaId?: string
  mediaUrl?: string
  /** Solo en dosis: `${tratamientoId}@${YYYY-MM-DD}T${HH:mm}` */
  compromisoId?: string
  confirmadoPor?: string
  confirmadoEn?: string
}

/** Id del animal al que se refiere la propuesta, o null si no es de un animal (inventario, plata). */
export function animalIdDe(p: PropuestaServidor): string | null {
  switch (p.tipo) {
    case 'dosis':
    case 'nota':
    case 'estado_animal':
    case 'comida':
    case 'observacion':
    case 'avance':
      return p.animalId
    default:
      return null
  }
}

/** Parámetros de placa viva que el servidor lee de la hoja Config. */
export interface ConfigServidor {
  /** Debajo de esta confianza el bot pregunta en vez de proponer (0,7) */
  umbralPreguntar: number
  /** Desde esta confianza lo de bajo riesgo se autoconfirma (0,85) */
  umbralAutoconfirmar: number
  /** Minutos que espera antes de autoconfirmar (30) */
  minutosAutoconfirmar: number
  /** Alerta de comida a ≤ estos días (4) */
  diasAlertaComida: number
  /** Hora de Bogotá del cierre del día, 'HH:mm' ('18:30') */
  horaCierre: string
  /** Teléfono del albergue para el enlace "Llamar al albergue" */
  telefonoAlbergue: string
  /** Dirección pública del servidor, sin "/" final */
  baseUrl: string
}

/** Un padrino que sigue a un animal (diario semanal, Task 21 de placa viva). */
export interface Padrinazgo {
  id: string
  personaTelefono: string
  personaNombre: string
  animalId: string
  activo: boolean
}

/** Alimento que se compra: sirve para calcular los días de comida. */
export interface ItemCatalogo {
  id: string
  nombre: string
  tipo: string
  kgPorUnidad: number
  especieObjetivo?: Especie
  consumoDiarioKgPorAnimal?: number
}

/** Lo que /api/hoy parte de una base y no de la bitácora: último conteo, último cuadre y contador de vidas. */
export type BaseAlbergue = Pick<DatosAlbergue, 'conteoInicial' | 'cajaInicial' | 'vidasCambiadas'>

