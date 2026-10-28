// Mismas reglas que panel/src/lib/calculos.ts, para que el bot y el panel digan lo mismo.

import { fechaLocal } from '../formato.js'
import type { Clinica, DatosAlbergue, DosisDada, Especie, PorConfirmar, Tratamiento } from '../panel-tipos.js'

export type Nivel = 'bien' | 'ojo' | 'urgente'

export function bultosEnBodega(datos: DatosAlbergue, especie: Especie): number {
  const desde = datos.conteoInicial.fecha
  const cambios = datos.inventario
    .filter((m) => m.tipo === especie && m.fechaHora >= desde)
    .reduce((suma, m) => suma + m.cambio, 0)
  return Math.max(0, datos.conteoInicial.bultos[especie] + cambios)
}

export function diasDeComida(datos: DatosAlbergue, especie: Especie): number {
  const { kgPorBulto, consumoDiarioKg } = datos.configComida
  if (consumoDiarioKg[especie] === 0) return Infinity
  return (bultosEnBodega(datos, especie) * kgPorBulto[especie]) / consumoDiarioKg[especie]
}

export function nivelComida(datos: DatosAlbergue, dias: number): Nivel {
  const { diasAviso, diasUrgente } = datos.configComida
  if (dias <= diasUrgente) return 'urgente'
  if (dias <= diasAviso) return 'ojo'
  return 'bien'
}

export function plataEnCaja(datos: DatosAlbergue): number {
  const desde = datos.cajaInicial.fecha
  return datos.movimientos
    .filter((m) => m.fechaHora >= desde)
    .reduce((caja, m) => caja + (m.tipo === 'ingreso' ? m.monto : -m.monto), datos.cajaInicial.monto)
}

/** Semáforo de placa viva: bien < 60 % del límite, ojo hasta 85 %, urgente > 85 %. */
export function nivelClinica(clinica: Clinica): Nivel {
  if (clinica.limite <= 0) return 'bien'
  const uso = clinica.deuda / clinica.limite
  if (uso > 0.85) return 'urgente'
  if (uso >= 0.6) return 'ojo'
  return 'bien'
}

export type EstadoDosis = 'dada' | 'pendiente' | 'atrasada'

export interface DosisDelDia {
  tratamiento: Tratamiento
  hora: string
  estado: EstadoDosis
  dada: DosisDada | null
  /** Alguien ya la reportó y falta confirmarla: no se deja registrar dos veces */
  reporte: PorConfirmar | null
}

/** Una dosis se considera atrasada si pasó más de 1 hora de su hora programada. */
export function dosisDeHoy(datos: DatosAlbergue, ahora: Date = new Date()): DosisDelDia[] {
  const hoy = fechaLocal(ahora)
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()

  const lista: DosisDelDia[] = []
  for (const t of datos.tratamientos) {
    if (t.inicio > hoy || t.fin < hoy) continue
    for (const hora of t.horas) {
      const dada =
        datos.dosisDadas.find((d) => d.tratamientoId === t.id && d.hora === hora && d.fechaHora.startsWith(hoy)) ?? null
      const reporte = dada
        ? null
        : (datos.porConfirmar.find(
            (p) =>
              p.estado === 'pendiente' &&
              p.fechaHora.startsWith(hoy) &&
              p.propuestas.some((x) => x.tipo === 'dosis' && x.tratamientoId === t.id && x.hora === hora),
          ) ?? null)
      const [h, m] = hora.split(':').map(Number)
      const atrasada = minutosAhora > h * 60 + m + 60
      lista.push({ tratamiento: t, hora, dada, reporte, estado: dada ? 'dada' : atrasada ? 'atrasada' : 'pendiente' })
    }
  }
  return lista.sort((a, b) => a.hora.localeCompare(b.hora))
}
