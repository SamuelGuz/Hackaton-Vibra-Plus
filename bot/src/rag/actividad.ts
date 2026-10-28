// Lo que de verdad pasó hoy con un animal, tomado de la bitácora (registros de comida, dosis y notas).
// Si no hay registro, se dice que no hay: nunca se adivina.
import { ahoraBogota } from '@huellitas/shared/domain/hora'
import { quitarDatosSensibles } from '../ia/redact'
import type { DatosRag } from './datos'
import { tratamientosActivos } from './perfil'
import type { ActividadHoy } from './tipos'

const LARGO_MAXIMO_NOTA = 240

export function actividadHoy(animalId: string, datos: DatosRag, ahora: Date): ActividadHoy {
  const hoy = ahoraBogota(ahora).fecha

  const activos = tratamientosActivos(animalId, datos, hoy)
  const programadas = activos.reduce((suma, t) => suma + t.horas.length, 0)
  const tomadas = activos.reduce((suma, t) => {
    const dadas = datos.dosisDadas.filter((d) => d.tratamientoId === t.id && d.fechaHora.startsWith(hoy)).length
    return suma + Math.min(dadas, t.horas.length)
  }, 0)

  // Solo un registro de comida dice que comió; sin él no se sabe (null), aunque no haya motivo para pensar que no
  const comioHoy = datos.comieronHoy.has(animalId) ? true : null

  // La nota más reciente de hoy
  const ultima = datos.notas
    .filter((n) => n.animalId === animalId && n.fechaHora.startsWith(hoy))
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))[0]
  const notaDelDia = ultima ? quitarDatosSensibles(ultima.texto.trim()).slice(0, LARGO_MAXIMO_NOTA) || null : null

  return { comioHoy, medicinas: { programadas, tomadas }, notaDelDia }
}
