// Lo que de verdad pasó hoy con un animal, tomado de los registros del albergue (notas y dosis).
// Si no hay registro, se dice que no hay: nunca se adivina.
import { fechaLocal } from '../formato.js'
import { quitarDatosSensibles } from '../ia/redactar.js'
import type { DatosAlbergue } from '../panel-tipos.js'
import { normalizar, tratamientosActivos } from './perfil.js'
import type { ActividadHoy } from './tipos.js'

const NO_COMIO = /\bno (quiso |ha querido |quiere |pudo |ha |habia )?(comer|comio|comido|come|probo)|\bsin (comer|apetito)|\brechaz\w* (la )?comida|\bno tiene apetito|\bnada de comida/
const COMIO = /\bcomio\b|\bcomiendo\b|\bya comio\b|\bha comido\b|\bse comio\b|\bdesayuno\b|\balmorzo\b|\bceno\b|\bdevoro\b|\bcomio (bien|todo|poquito|mucho)/

const LARGO_MAXIMO_NOTA = 240

/** true si la nota dice que comió, false si dice que no, null si no habla de comida */
function comioSegun(texto: string): boolean | null {
  const t = normalizar(texto)
  if (NO_COMIO.test(t)) return false
  if (COMIO.test(t)) return true
  return null
}

export function actividadHoy(animalId: string, datos: DatosAlbergue, ahora: Date): ActividadHoy {
  const hoy = fechaLocal(ahora)

  const activos = tratamientosActivos(animalId, datos, hoy)
  const programadas = activos.reduce((suma, t) => suma + t.horas.length, 0)
  const tomadas = activos.reduce((suma, t) => {
    const dadas = datos.dosisDadas.filter((d) => d.tratamientoId === t.id && d.fechaHora.startsWith(hoy)).length
    return suma + Math.min(dadas, t.horas.length)
  }, 0)

  // Las más recientes primero; la última que habla de comida manda
  const notasDeHoy = datos.notas
    .filter((n) => n.animalId === animalId && n.fechaHora.startsWith(hoy))
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))

  let comioHoy: boolean | null = null
  for (const n of notasDeHoy) {
    const dice = comioSegun(n.texto)
    if (dice !== null) {
      comioHoy = dice
      break
    }
  }

  const ultima = notasDeHoy[0]
  const notaDelDia = ultima ? quitarDatosSensibles(ultima.texto.trim()).slice(0, LARGO_MAXIMO_NOTA) || null : null

  return { comioHoy, medicinas: { programadas, tomadas }, notaDelDia }
}
