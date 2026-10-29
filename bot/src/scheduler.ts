// El despertador: a las 7:00 a. m. (hora de Bogotá) el bot le manda a Yesenia la foto con lo del día, sin que lo pida.
// Revisa cada minuto. Si el bot estaba apagado a las 7, lo manda al prender, hasta las 11. Una sola vez por día,
// aunque haya dos copias del bot corriendo: el día se "reclama" en la base antes de mandar.
import { enviarResumenMatutino } from './conversacion/informe.js'
import { recordatorioTarde } from './conversacion/recordatorios.js'
import { fechaLocal } from './formato.js'
import type { Deps, Repo } from './tipos.js'
import { normalizarTelefono } from './wa/telefono.js'

export const HORA_RESUMEN = 7
/** Pasada esta hora ya no se manda: llegaría tarde para organizar el día */
export const HORA_LIMITE_RESUMEN = 11
const CLAVE = 'resumen_matutino_ultimo_dia'
/** El recordatorio de mandar la actualización: entre las 7 y las 9 p. m. */
export const HORA_RECORDATORIO_TARDE = 19
export const HORA_LIMITE_RECORDATORIO_TARDE = 21
const CLAVE_TARDE = 'recordatorio_tarde_ultimo_dia'
const CADA_MS = 60_000

export function tocaResumen(ahora: Date): boolean {
  const h = ahora.getHours()
  return h >= HORA_RESUMEN && h < HORA_LIMITE_RESUMEN
}

/** RESUMEN_MATUTINO_TELEFONOS (separados por coma) o, si no está, la administración activa */
export async function telefonosDelResumen(env: Record<string, string | undefined>, repo: Repo): Promise<string[]> {
  const lista = (env.RESUMEN_MATUTINO_TELEFONOS ?? '')
    .split(',')
    .map((t) => normalizarTelefono(t))
    .filter(Boolean)
  if (lista.length) return [...new Set(lista)]
  const { personas } = await repo.equipo()
  return personas.filter((p) => p.activo && p.rol === 'admin').map((p) => p.telefono)
}

/** Si ya toca y nadie lo ha mandado hoy, manda el resumen a cada teléfono. Devuelve a cuántos les llegó. */
export async function revisarDespertador(deps: Deps, telefonos: () => Promise<string[]>): Promise<number> {
  const ahora = deps.ahora()
  if (!tocaResumen(ahora)) return 0
  if (!(await deps.repo.reclamarDia(CLAVE, fechaLocal(ahora)))) return 0
  let enviados = 0
  for (const telefono of await telefonos()) {
    try {
      if (await enviarResumenMatutino(deps, telefono)) enviados++
      else console.error(`Resumen de la mañana: ${telefono} no es del equipo`)
    } catch (e) {
      // Lo normal: la persona no le ha escrito al bot en 24 h y Meta no deja escribirle primero sin plantilla
      console.error(`Resumen de la mañana: no le llegó a ${telefono}:`, e instanceof Error ? e.message : e)
    }
  }
  return enviados
}

/** A las 7 p. m.: a quien no ha contado nada hoy le pide la actualización; si faltan medicinas, se las recuerda. Una vez por día. */
export async function revisarRecordatorioTarde(deps: Deps, telefonos: () => Promise<string[]>): Promise<number> {
  const ahora = deps.ahora()
  const h = ahora.getHours()
  if (h < HORA_RECORDATORIO_TARDE || h >= HORA_LIMITE_RECORDATORIO_TARDE) return 0
  if (!(await deps.repo.reclamarDia(CLAVE_TARDE, fechaLocal(ahora)))) return 0
  let enviados = 0
  for (const telefono of await telefonos()) {
    try {
      const usuario = await deps.repo.usuarioPorTelefono(telefono)
      if (usuario && (await recordatorioTarde(deps, usuario))) enviados++
    } catch (e) {
      console.error(`Recordatorio de la tarde: no le llegó a ${telefono}:`, e instanceof Error ? e.message : e)
    }
  }
  return enviados
}

/** Prende el despertador (mañana y tarde). Devuelve con qué apagarlo. */
export function iniciarDespertador(deps: Deps, telefonos: () => Promise<string[]>): () => void {
  const revisar = () =>
    Promise.all([
      revisarDespertador(deps, telefonos).then((n) => n && console.log(`Resumen de la mañana enviado a ${n} persona(s)`)),
      revisarRecordatorioTarde(deps, telefonos).then((n) => n && console.log(`Recordatorio de la tarde enviado a ${n} persona(s)`)),
    ]).catch((e) => console.error('El despertador no pudo revisar:', e))
  void revisar()
  const t = setInterval(revisar, CADA_MS)
  return () => clearInterval(t)
}
