// Privacidad de las solicitudes (PLAN_INTEGRADO §5): cédula, dirección y teléfono solo los ve el rol de adopción.
import type { Solicitud } from './tipos'

/** Solicitud sin los datos que no pueden salir del rol de adopción */
export type SolicitudSinDatosSensibles = Omit<Solicitud, 'cedula' | 'direccion' | 'telefono'>

/** Copia sin cédula, dirección ni teléfono, para cualquier cosa que salga del rol de adopción (S42) */
export function sinDatosSensibles(s: Solicitud): SolicitudSinDatosSensibles {
  const { cedula, direccion, telefono, ...resto } = s
  void [cedula, direccion, telefono]
  return resto
}
