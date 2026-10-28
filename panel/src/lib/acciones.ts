// Registros que nacen de un toque en el panel. Funciones puras: reciben los datos
// y devuelven los datos nuevos más el id del registro (para poder deshacerlo).
// Lo que toca una persona nace confirmado (PLAN_INTEGRADO §3.3).

import type { DatosAlbergue, Especie } from '../data/tipos'
import { momentoLocal } from './formato'

export interface Resultado {
  datos: DatosAlbergue
  id: string
}

/** −1 al abrir un bulto, +N cuando llegan. */
export function moverBultos(
  datos: DatosAlbergue,
  especie: Especie,
  cambio: number,
  quien: string,
  ahora: Date = new Date(),
): Resultado {
  const id = crypto.randomUUID()
  const registro = { id, fechaHora: momentoLocal(ahora), tipo: especie, cambio, quien, origen: 'panel' as const }
  return { id, datos: { ...datos, inventario: [...datos.inventario, registro] } }
}

export function darDosis(
  datos: DatosAlbergue,
  tratamientoId: string,
  hora: string,
  quien: string,
  ahora: Date = new Date(),
): Resultado {
  const id = crypto.randomUUID()
  const registro = { id, tratamientoId, hora, fechaHora: momentoLocal(ahora), quien, origen: 'panel' as const }
  return { id, datos: { ...datos, dosisDadas: [...datos.dosisDadas, registro] } }
}

/** Quita un registro hecho desde el panel (el botón "Deshacer"). */
export function deshacer(datos: DatosAlbergue, id: string): DatosAlbergue {
  return {
    ...datos,
    inventario: datos.inventario.filter((m) => m.id !== id),
    dosisDadas: datos.dosisDadas.filter((d) => d.id !== id),
    movimientos: datos.movimientos.filter((m) => m.id !== id),
  }
}

/**
 * Confirma una dosis que alguien reportó por audio: queda dada a la hora y a nombre
 * de quien la reportó, y sale de la bandeja. El resto del audio sigue pendiente.
 */
export function confirmarDosisReportada(
  datos: DatosAlbergue,
  porConfirmarId: string,
  tratamientoId: string,
  hora: string,
): DatosAlbergue {
  const item = datos.porConfirmar.find((p) => p.id === porConfirmarId)
  if (!item) return datos
  const esEsta = (p: (typeof item.propuestas)[number]) =>
    p.tipo === 'dosis' && p.tratamientoId === tratamientoId && p.hora === hora
  const quedan = item.propuestas.filter((p) => !esEsta(p))
  const registro = {
    id: crypto.randomUUID(),
    tratamientoId,
    hora,
    fechaHora: item.fechaHora,
    quien: item.quien,
    origen: 'bot' as const,
  }
  return {
    ...datos,
    dosisDadas: [...datos.dosisDadas, registro],
    porConfirmar: datos.porConfirmar.map((p) =>
      p.id === porConfirmarId
        ? { ...p, propuestas: quedan, estado: quedan.length ? p.estado : ('confirmado' as const) }
        : p,
    ),
  }
}
