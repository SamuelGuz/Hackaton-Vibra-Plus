// De dónde saca el RAG lo que pasó hoy: la bitácora de registros del Repo (D3). Aquí se lee una vez y se
// reduce a lo mínimo público; ninguna otra pieza del RAG toca el Repo ni ve quién reportó cada cosa.
import { ahoraBogota } from '@huellitas/shared/domain/hora'
import type { Animal, Tratamiento } from '@huellitas/shared/tipos'
import type { Repo } from '../store/repo'

/** Una dosis registrada hoy. Sin `agenteId`: quién la dio es dato interno del equipo. */
export interface DosisHoy {
  tratamientoId: string
  /** Hora programada que se cumplió, 'HH:mm' */
  hora: string
  fechaHora: string
}

/** Una nota, observación o avance de hoy. Sin `agenteId` ni frase exacta. */
export interface NotaHoy {
  animalId: string
  texto: string
  fechaHora: string
}

/** La foto del albergue que el RAG necesita para armar perfiles y actividad de hoy */
export interface DatosRag {
  animales: Animal[]
  tratamientos: Tratamiento[]
  dosisDadas: DosisHoy[]
  notas: NotaHoy[]
  /** Ids de los animales con un registro de comida (no anulado) hoy: así se sabe, de verdad, que ya comieron */
  comieronHoy: Set<string>
  /** Padrinazgos activos por animal (solo el conteo: nombres y teléfonos de padrinos no salen del Repo) */
  padrinosPorAnimal: Record<string, number>
}

/** Lee del Repo lo de hoy (día de Bogotá). Los registros anulados no cuentan. */
export async function cargarDatosRag(repo: Repo, ahora: Date): Promise<DatosRag> {
  const hoy = ahoraBogota(ahora).fecha
  const [animales, tratamientos, registros, padrinazgos] = await Promise.all([
    repo.animales(),
    repo.tratamientos(),
    repo.registrosDelDia(hoy),
    repo.padrinazgosActivos(),
  ])

  const dosisDadas: DosisHoy[] = []
  const notas: NotaHoy[] = []
  const comieronHoy = new Set<string>()
  for (const r of registros) {
    if (r.estado === 'anulado') continue
    const p = r.propuesta
    switch (p.tipo) {
      case 'dosis':
        dosisDadas.push({ tratamientoId: p.tratamientoId, hora: p.hora, fechaHora: r.fechaHora })
        break
      case 'comida':
        comieronHoy.add(p.animalId)
        break
      case 'nota':
      case 'observacion':
      case 'avance':
        notas.push({ animalId: p.animalId, texto: p.texto, fechaHora: r.fechaHora })
        break
      default:
        break
    }
  }

  const padrinosPorAnimal: Record<string, number> = {}
  for (const pad of padrinazgos) {
    if (pad.activo) padrinosPorAnimal[pad.animalId] = (padrinosPorAnimal[pad.animalId] ?? 0) + 1
  }

  return { animales, tratamientos, dosisDadas, notas, comieronHoy, padrinosPorAnimal }
}
