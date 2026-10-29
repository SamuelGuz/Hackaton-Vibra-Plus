// Seguimientos después de la entrega (días 2, 5, 15, 30 y 90): a quién toca llamar hoy y cómo salió.
// Las fechas salen de `adopciones.fecha_entrega` con programarSeguimientos(); lo que ya se anotó vive en `checkins`.
import { fechaLocal } from '../formato.js'
import type { Rol } from '../panel-tipos.js'
import { programarSeguimientos, seguimientosDeHoy } from './clasificar.js'
import type { DiaSeguimiento, Monton, Seguimiento } from './tipos.js'

export const DIAS_SEGUIMIENTO: readonly DiaSeguimiento[] = [2, 5, 15, 30, 90]

/** Un seguimiento con lo que hace falta para llamar y para anotarlo */
export interface SeguimientoDeAdopcion extends Seguimiento {
  adopcionId: string
  animalNombre: string
}

/** Una adopción entregada (fila de `adopciones` con su animal y su adoptante) */
export interface Entrega {
  adopcionId: string
  solicitudId: string | null
  animalId: string
  animalNombre: string
  /** AAAA-MM-DD */
  fechaEntrega: string
  adoptanteNombre: string
  adoptanteTelefono: string
}

/** Cómo salió una llamada ya hecha (fila de `checkins`) */
export interface ResultadoSeguimiento {
  adopcionId: string
  dia: number
  resultado: Monton
  nota: string
}

/** Los 5 seguimientos de cada entrega, con el resultado de los que ya se llamaron */
export function armarSeguimientos(entregas: readonly Entrega[], resultados: readonly ResultadoSeguimiento[]): SeguimientoDeAdopcion[] {
  return entregas.flatMap((e) =>
    programarSeguimientos(e.solicitudId, { nombre: e.adoptanteNombre, telefono: e.adoptanteTelefono }, e.animalId, e.fechaEntrega).map(
      (s): SeguimientoDeAdopcion => {
        const r = resultados.find((x) => x.adopcionId === e.adopcionId && x.dia === s.dia)
        return {
          ...s,
          adopcionId: e.adopcionId,
          animalNombre: e.animalNombre,
          resultado: r?.resultado ?? null,
          llamadaHumana: r ? r.resultado !== 'verde' : false,
          nota: r?.nota ?? '',
        }
      },
    ),
  )
}

/** Los que toca llamar hoy (y los atrasados), del más atrasado al más nuevo */
export function pendientesDeHoy<T extends Seguimiento>(lista: readonly T[], ahora: Date): T[] {
  return seguimientosDeHoy(lista, fechaLocal(ahora)) as T[]
}

/** El teléfono del adoptante lo ven quienes ya ven las solicitudes de adopción */
export const veAdoptantes = (rol: Rol) => rol === 'admin' || rol === 'adopciones'

export const esDiaSeguimiento = (n: number): n is DiaSeguimiento => (DIAS_SEGUIMIENTO as readonly number[]).includes(n)

/** '573115550101' → '311 555 0101' */
export function telefonoBonito(telefono: string): string {
  const d = telefono.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '')
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d
}

/** "• Rocky (Día 5) — Adoptante: Juan Gómez (311 555 0101)". Sin teléfono para quien no ve adoptantes. */
export function lineaSeguimiento(s: SeguimientoDeAdopcion, hoy: string, conTelefono: boolean): string {
  const telefono = conTelefono && s.adoptanteTelefono ? ` (${telefonoBonito(s.adoptanteTelefono)})` : ''
  const atrasado = s.fecha < hoy ? ' ⏰ atrasado' : ''
  return `• ${s.animalNombre} (Día ${s.dia}) — Adoptante: ${s.adoptanteNombre}${telefono}${atrasado}`
}
