// Copia de shared/src/adopcion/tipos.ts (el bot no importa shared/: cambiaría la carpeta de salida del build).
// Si shared cambia, se copia de nuevo aquí.
// Tipos del panel de adopción (PLAN_INTEGRADO §5). Solo tipos: las reglas de clasificación van en
// shared/src/adopcion/ (Task T11). El sistema jamás decide una adopción: la clasificación es una sugerencia.

/** Verde = para llamar · amarillo = revisar · rojo = descartada (se puede rescatar) */
export type Monton = 'verde' | 'amarillo' | 'rojo'

export type Vivienda = 'casa' | 'apartamento' | 'finca' | 'otra'

/** Para quién es el animal. 'regalo' = para un tercero (regla roja). */
export type ParaQuien = 'yo' | 'familia' | 'regalo'

/** Dónde va a vivir el animal. 'guardia', 'amarrado' y 'azotea' son reglas rojas. */
export type DondeVivira = 'dentro_casa' | 'patio' | 'guardia' | 'amarrado' | 'azotea'

/** Una solicitud de adopción (Google Form -> hoja Solicitudes). Trae cédula y dirección: nunca va a Gemini. */
export interface Solicitud {
  id: string
  /** ISO de cuándo llegó */
  fecha: string
  nombre: string
  telefono: string
  cedula: string
  direccion: string
  /** Animal que pidió; null si preguntó en general */
  animalId: string | null

  // Respuestas clave (las que van arriba del detalle)
  /** "Toda la familia está de acuerdo" */
  familiaDeAcuerdo: boolean
  paraQuien: ParaQuien
  /** Para quién dijo que es, con sus palabras ("su mamá"). Opcional: la razón del regalo lo cita si existe. */
  destinatario?: string
  vivienda: Vivienda
  /** Tiene mallas o cerramientos en ventanas, balcones y patio */
  viviendaConMallas: boolean
  dondeVivira: DondeVivira
  aceptaEsterilizar: boolean
  aceptaVacunar: boolean
  aceptaSeguimiento: boolean
  /** Prisa por la entrega inmediata (señal de devolución) */
  quiereEntregaInmediata: boolean
  /** Preguntó por el carácter o la rutina del animal (si no, señal de devolución) */
  preguntoPorCaracter: boolean

  // Respuestas de texto libre, tal como las escribió
  planEmergencia: string
  mascotasAnteriores: string
  motivo: string

  /** Montón que puso a mano la coordinadora; manda sobre la sugerencia. null = sin mover. */
  montonManual: Monton | null
  nota: string
  /** ISO de la llamada agendada; null = sin agendar */
  llamadaAgendada: string | null
}

/** Resultado de las reglas: el montón sugerido y la razón en una frase ("Dice que es un regalo para su mamá"). */
export interface Clasificacion {
  monton: Monton
  razon: string
}

/** POST /api/adopciones/solicitudes/:id: solo viaja lo que cambió. */
export interface CambioSolicitud {
  montonManual?: Monton | null
  nota?: string
  llamadaAgendada?: string | null
}

/** Días después de la entrega en que se llama al adoptante */
export type DiaSeguimiento = 2 | 5 | 15 | 30 | 90

export interface Seguimiento {
  id: string
  /** Solicitud de la que salió; null si el adoptante no vino por el formulario */
  solicitudId: string | null
  adoptanteNombre: string
  adoptanteTelefono: string
  animalId: string
  /** YYYY-MM-DD */
  fechaEntrega: string
  dia: DiaSeguimiento
  /** YYYY-MM-DD en que toca llamar (fechaEntrega + dia) */
  fecha: string
  /** Cómo salió la llamada; null = pendiente. Amarillo y rojo exigen llamada humana. */
  resultado: Monton | null
  /** true cuando el resultado fue amarillo o rojo: una persona tiene que llamar (regla del cliente). Opcional para no romper filas guardadas antes; ausente = false. */
  llamadaHumana?: boolean
  nota: string
}
