// Registros que nacen de un toque en el panel. Funciones puras: reciben los datos
// y devuelven los datos nuevos más el id del registro (para poder deshacerlo).
// Lo que toca una persona nace confirmado (PLAN_INTEGRADO §3.3).

import type { DatosAlbergue, Especie, EstadoAnimal, Movimiento, Propuesta } from '../data/tipos'
import { momentoLocal } from './formato'

/**
 * Id único generado en el celular. crypto.randomUUID solo existe con HTTPS o localhost;
 * al probar por http en la red local se arma el mismo formato con getRandomValues.
 */
export function nuevoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

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
  id: string = nuevoId(),
): Resultado {
  const registro = { id, fechaHora: momentoLocal(ahora), tipo: especie, cambio, quien, origen: 'panel' as const }
  return { id, datos: { ...datos, inventario: [...datos.inventario, registro] } }
}

export function darDosis(
  datos: DatosAlbergue,
  tratamientoId: string,
  hora: string,
  quien: string,
  ahora: Date = new Date(),
  id: string = nuevoId(),
): Resultado {
  const registro = { id, tratamientoId, hora, fechaHora: momentoLocal(ahora), quien, origen: 'panel' as const }
  return { id, datos: { ...datos, dosisDadas: [...datos.dosisDadas, registro] } }
}

/** Quita un registro de comida o de dosis hecho desde el panel (el botón "Deshacer"). */
export function deshacer(datos: DatosAlbergue, id: string): DatosAlbergue {
  return {
    ...datos,
    inventario: datos.inventario.filter((m) => m.id !== id),
    dosisDadas: datos.dosisDadas.filter((d) => d.id !== id),
  }
}

/**
 * Entrada o salida de plata. No tiene "Deshacer": con la plata se revisa antes de guardar.
 * Un abono a una clínica sale de la caja y además baja la deuda con ella.
 */
export function registrarMovimiento(
  datos: DatosAlbergue,
  movimiento: Omit<Movimiento, 'id' | 'fechaHora' | 'quien'>,
  quien: string,
  ahora: Date = new Date(),
  id: string = nuevoId(),
): DatosAlbergue {
  const registro: Movimiento = { ...movimiento, id, fechaHora: momentoLocal(ahora), quien }
  const { abonoDeuda, clinicaId, monto } = movimiento
  return {
    ...datos,
    movimientos: [...datos.movimientos, registro],
    clinicas: datos.clinicas.map((c) =>
      abonoDeuda && c.id === clinicaId ? { ...c, deuda: Math.max(0, c.deuda - monto) } : c,
    ),
  }
}

/**
 * Guarda lo que la IA entendió de un audio o una foto, tal como quedó después de revisarlo.
 * Si la persona quitó o cambió algo, queda marcado como "corregido".
 */
export function confirmarPorConfirmar(datos: DatosAlbergue, id: string, propuestas: Propuesta[]): DatosAlbergue {
  const item = datos.porConfirmar.find((p) => p.id === id)
  if (!item) return datos
  const { fechaHora, quien } = item
  let d = datos
  for (const p of propuestas) {
    const idNuevo = nuevoId()
    if (p.tipo === 'dosis') {
      const registro = { id: idNuevo, tratamientoId: p.tratamientoId, hora: p.hora, fechaHora, quien, origen: 'bot' as const }
      d = { ...d, dosisDadas: [...d.dosisDadas, registro] }
    } else if (p.tipo === 'inventario') {
      const registro = { id: idNuevo, fechaHora, tipo: p.especie, cambio: p.cambio, quien, origen: 'bot' as const }
      d = { ...d, inventario: [...d.inventario, registro] }
    } else if (p.tipo === 'nota') {
      d = { ...d, notas: [...d.notas, { id: idNuevo, animalId: p.animalId, texto: p.texto, fechaHora, quien }] }
    } else if (p.tipo === 'movimiento') {
      const registro: Movimiento = { ...p.movimiento, id: idNuevo, fechaHora, quien }
      d = {
        ...d,
        movimientos: [...d.movimientos, registro],
        clinicas: d.clinicas.map((c) =>
          registro.abonoDeuda && c.id === registro.clinicaId ? { ...c, deuda: Math.max(0, c.deuda - registro.monto) } : c,
        ),
      }
    } else if (p.tipo === 'deuda') {
      // Factura a crédito: no sale de caja, sube la deuda
      d = { ...d, clinicas: d.clinicas.map((c) => (c.id === p.clinicaId ? { ...c, deuda: c.deuda + p.monto } : c)) }
    } else {
      d = cambiarEstado(d, p.animalId, p.estado)
    }
  }
  const estado = mismasPropuestas(propuestas, item.propuestas) ? ('confirmado' as const) : ('corregido' as const)
  return { ...d, porConfirmar: d.porConfirmar.map((p) => (p.id === id ? { ...p, estado } : p)) }
}

/** true si la persona confirmó tal cual lo que entendió la IA (sin quitar ni cambiar nada) */
export function mismasPropuestas(a: Propuesta[], b: Propuesta[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function descartarPorConfirmar(datos: DatosAlbergue, id: string): DatosAlbergue {
  return {
    ...datos,
    porConfirmar: datos.porConfirmar.map((p) => (p.id === id ? { ...p, estado: 'descartado' as const } : p)),
  }
}

export function cambiarEstado(datos: DatosAlbergue, animalId: string, estado: EstadoAnimal): DatosAlbergue {
  return { ...datos, animales: datos.animales.map((a) => (a.id === animalId ? { ...a, estado } : a)) }
}
