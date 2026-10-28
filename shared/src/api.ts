// Contrato HTTP entre el panel y el servidor (PLAN_INTEGRADO §3.1, forma de panel/src/data/api.ts).
// Todas las rutas /api/* exigen sesión (Authorization: Bearer o cookie hk) y responden JSON.
import type { Propuesta, DatosAlbergue } from './tipos'
import type { Seguimiento, Solicitud, Clasificacion } from './adopcion/tipos'

/** Una propuesta creada en el panel. El id lo genera el celular (uuid) y hace idempotente el reenvío. */
export type Evento = Propuesta & { id: string }

/** Cambio de estado que puede pedir el panel (el servidor además usa 'por_confirmar'). */
export type EstadoCambio = 'confirmado' | 'corregido' | 'anulado'

/** Lo que el panel le manda al servidor. Se guarda en la cola mientras no hay señal. */
export type Envio =
  | { tipo: 'eventos'; eventos: Evento[] }
  | { tipo: 'estado'; ids: string[]; estado: EstadoCambio }

/** GET /api/hoy */
export type DatosServidor = DatosAlbergue & { yo: string }

/** POST /api/eventos: cuerpo */
export interface CuerpoEventos {
  eventos: Evento[]
}

/** POST /api/eventos: respuesta. Un id repetido cuenta como guardado (idempotente). */
export interface RespuestaEventos {
  guardados: string[]
  errores: { id: string; error: string }[]
}

/** POST /api/eventos/estado: cuerpo. Los ids pueden ser de registro o de grupo (registroIaId). */
export interface CuerpoEstado {
  ids: string[]
  estado: EstadoCambio
}

/** POST /api/eventos/estado: respuesta */
export interface RespuestaEstado {
  cambiados: number
}

/** Cualquier error: 401 { error: 'Falta iniciar sesión' }, 400, 403, 404... */
export interface ErrorJson {
  error: string
}

/** Solicitud tal como la ve el panel de adopción: con la clasificación sugerida por las reglas. */
export type SolicitudConSugerencia = Solicitud & { sugerencia: Clasificacion }

/** GET /api/adopciones/solicitudes (solo roles adopciones y admin) */
export interface RespuestaSolicitudes {
  solicitudes: SolicitudConSugerencia[]
}

/** GET /api/adopciones/seguimientos (solo roles adopciones y admin) */
export interface RespuestaSeguimientos {
  seguimientos: Seguimiento[]
}
