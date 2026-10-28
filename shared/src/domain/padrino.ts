// Hechos de la semana de un animal apadrinado (placa viva, Task 7). Puro: sin E/S.
// Solo registros confirmados; los textos nunca llevan el nombre de quien los reportó.
import type { Animal } from '../tipos'
import { animalIdDe, type Registro } from '../registro'
import type { HechoDiario } from '../vistas'

/** Una dosis es "a tiempo" si se reportó hasta 60 min después de su hora (más allá la ficha la da por atrasada). */
const MINUTOS_A_TIEMPO = 60

function aTiempo(r: Registro): boolean {
  const programada = r.compromisoId?.split('@')[1]
  if (programada === undefined) return true
  const demora = Date.parse(r.fechaHora) - Date.parse(`${programada}:00-05:00`)
  return demora <= MINUTOS_A_TIEMPO * 60 * 1000
}

function hechoDeDosis(dosis: Registro[]): HechoDiario | null {
  const ultima = dosis[dosis.length - 1]
  if (ultima === undefined) return null
  const aTiempoN = dosis.filter(aTiempo).length
  const texto =
    aTiempoN < dosis.length
      ? `Recibió ${aTiempoN} de ${dosis.length} dosis a tiempo`
      : dosis.length === 1
        ? 'Recibió su dosis a tiempo'
        : `Recibió sus ${dosis.length} dosis a tiempo`
  return { eventoId: ultima.id, texto }
}

function hechoDeComida(comidas: Registro[]): HechoDiario | null {
  const ultima = comidas[comidas.length - 1]
  if (ultima === undefined) return null
  const dias = new Set(comidas.map((r) => r.fechaHora.slice(0, 10))).size
  return { eventoId: ultima.id, texto: `Comió bien ${dias} ${dias === 1 ? 'día' : 'días'} de la semana` }
}

/** Dosis, comida y luego cada avance u observación con su `fraseExacta` (o el texto de la propuesta si falta). */
export function hechosSemana(animal: Animal, registros: Registro[]): HechoDiario[] {
  const propios = registros.filter((r) => r.estado === 'confirmado' && animalIdDe(r.propuesta) === animal.id)
  const dosis = propios.filter((r) => r.propuesta.tipo === 'dosis')
  const comidas = propios.filter((r) => r.propuesta.tipo === 'comida')

  const hechos: HechoDiario[] = []
  const deDosis = hechoDeDosis(dosis)
  if (deDosis !== null) hechos.push(deDosis)
  const deComida = hechoDeComida(comidas)
  if (deComida !== null) hechos.push(deComida)

  for (const r of propios) {
    const p = r.propuesta
    if (p.tipo === 'avance' || p.tipo === 'observacion') hechos.push({ eventoId: r.id, texto: r.fraseExacta ?? p.texto })
  }
  return hechos
}
