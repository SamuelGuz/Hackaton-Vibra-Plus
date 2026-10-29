// Tipos del agente emocional de adopciones (WhatsApp y voz web).

export const INTENCIONES = ['adoptar', 'apadrinar', 'donar', 'explorar', 'no_puede_adoptar'] as const
export type Intencion = (typeof INTENCIONES)[number]

export const TIPOS_VIVIENDA = ['casa', 'apartamento', 'finca', 'otro', 'desconocido'] as const
export type TipoVivienda = (typeof TIPOS_VIVIENDA)[number]

export const PERMISOS = ['si', 'no', 'no_aplica', 'desconocido'] as const
export type Permiso = (typeof PERMISOS)[number]

export const SI_NO = ['si', 'no', 'desconocido'] as const
export type SiNo = (typeof SI_NO)[number]

export const TIEMPOS = ['suficiente', 'poco', 'desconocido'] as const
export type Tiempo = (typeof TIEMPOS)[number]

/** Lo que se va sabiendo de la persona a lo largo de la conversación. Nunca se le muestra. */
export interface Evaluacion {
  /** 0 a 100 */
  suitability: number
  /** 0 a 100 */
  risk: number
  viviendaTipo: TipoVivienda
  permisoArriendo: Permiso
  presupuestoVeterinario: SiNo
  tiempoDisponible: Tiempo
  /** Texto corto, o 'desconocido' */
  ninos: string
  otrasMascotas: string
  nombre: string | null
}

/** Lo que trae un turno: solo los campos que Gemini sí supo (el resto queda sin definir) */
export type EvaluacionParcial = Partial<Omit<Evaluacion, 'nombre'>> & { nombre?: string }

/** La respuesta de Gemini ya validada y con los valores acotados */
export interface RespuestaModelo {
  transcripcion: string
  respuesta: string
  guionVoz: string
  perritoIdFoco: string | null
  perritosMencionados: string[]
  intencion: Intencion
  conexionEmocional: boolean
  alertaBienestar: boolean
  evaluacion: EvaluacionParcial
}

export type AccionAgente = 'ninguna' | 'visita_agendada' | 'padrinazgo'

export interface TurnoHistorial {
  rol: 'user' | 'model'
  texto: string
}

export interface Sesion {
  clave: string
  historial: TurnoHistorial[]
  evaluacion: Evaluacion
  /** Id del animal del que se viene hablando */
  perroFoco: string | null
  /** Mensajes de la persona hasta ahora */
  turnos: number
  /** Una vez que la persona dijo algo preocupante, no se agenda nada en esta sesión */
  alertaBienestar: boolean
  padrinazgoOfrecido: boolean
  /** Visitas ya agendadas y avisadas a las administradoras, por id de animal (una sola vez por sesión y animal) */
  visitas: Map<string, Date>
  /** Milisegundos (reloj de deps.ahora) del último uso, para caducar la sesión */
  ultimoUso: number
  /** Cola para atender los mensajes de una misma sesión uno a la vez */
  cola: Promise<void>
  /** Ya se le mostró el menú de bienvenida (WhatsApp) */
  bienvenida: boolean
  /** Ya se le compartió la página web: se manda una sola vez */
  webEnviada: boolean
  /** Ya se le mostraron los datos para donar */
  donacionMostrada: boolean
  /** Formulario de adopción por botones en curso (WhatsApp) */
  formulario: Formulario | null
}

/** Las 3 preguntas con botones y el nombre. Las respuestas quedan en `Sesion.evaluacion`. */
export interface Formulario {
  animalId: string
  respuestas: { vivienda?: 'propia' | 'arriendo' | 'nose'; tiempo?: 'mucho' | 'medio' | 'poco'; presupuesto?: 'si' | 'nose' | 'no' }
}

export type CanalAgente = { tipo: 'whatsapp'; telefono: string } | { tipo: 'web' }
