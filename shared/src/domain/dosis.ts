// Dosis programadas del día. Puro: sin E/S, el día entra por parámetro.
import type { Tratamiento } from '../tipos'
import type { DosisProgramada } from '../vistas'

/** Tolerancia entre la hora en que alguien dice que dio la dosis y la hora programada */
const MARGEN_MINUTOS = 180

/** Minúsculas, sin tildes y sin espacios: 'Anticonvulsívo ' -> 'anticonvulsivo' */
export function normalizarMedicamento(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

function minutosDelDia(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':')
  return Number(h) * 60 + Number(m)
}

/**
 * Las dosis que tocan en `fecha` (YYYY-MM-DD), ordenadas por hora dentro de cada tratamiento.
 * Un tratamiento suspendido (`activo === false`), ya terminado (`fin` anterior) o que aún no empieza
 * (`inicio` posterior) no da dosis. Un `fin` o `inicio` vacío se lee como sin límite.
 */
export function dosisDelDia(trats: Tratamiento[], fecha: string): DosisProgramada[] {
  return trats
    .filter((t) => t.activo !== false && !(t.fin !== '' && t.fin < fecha) && !(t.inicio !== '' && t.inicio > fecha))
    .flatMap((t) =>
      [...t.horas]
        .sort()
        .map((hora) => ({
          compromisoId: `${t.id}@${fecha}T${hora}`,
          tratamientoId: t.id,
          animalId: t.animalId,
          medicamento: t.medicamento,
          hora,
        })),
    )
}

/** La dosis programada más cercana (hasta ±180 min) a la hora en que dicen que la dieron, o undefined. */
export function asignarCompromiso(
  animalId: string,
  medicamento: string,
  horaHHmm: string,
  dosis: DosisProgramada[],
): DosisProgramada | undefined {
  const buscado = normalizarMedicamento(medicamento)
  const minutos = minutosDelDia(horaHHmm)
  let mejor: DosisProgramada | undefined
  let menorDiferencia = Infinity
  for (const d of dosis) {
    if (d.animalId !== animalId || normalizarMedicamento(d.medicamento) !== buscado) continue
    const diferencia = Math.abs(minutosDelDia(d.hora) - minutos)
    if (diferencia <= MARGEN_MINUTOS && diferencia < menorDiferencia) {
      mejor = d
      menorDiferencia = diferencia
    }
  }
  return mejor
}
