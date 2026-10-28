// Reglas de negocio del albergue. Funciones puras: se pueden copiar tal cual
// a Apps Script para que las alertas calculen lo mismo que el panel.

import type {
  Clinica,
  DatosAlbergue,
  DosisDada,
  Especie,
  EstadoAnimal,
  Tratamiento,
} from '../data/tipos'
import { fechaLocal } from './formato'

export type Nivel = 'bien' | 'ojo' | 'urgente'

// ---------- Comida ----------

export function bultosEnBodega(datos: DatosAlbergue, especie: Especie): number {
  const desde = datos.conteoInicial.fecha
  const cambios = datos.inventario
    .filter((m) => m.tipo === especie && m.fechaHora >= desde)
    .reduce((suma, m) => suma + m.cambio, 0)
  return Math.max(0, datos.conteoInicial.bultos[especie] + cambios)
}

/**
 * Días de comida que quedan contando solo los bultos cerrados.
 * Es a propósito conservador: el bulto abierto es el colchón de seguridad.
 */
export function diasDeComida(datos: DatosAlbergue, especie: Especie): number {
  const { kgPorBulto, consumoDiarioKg } = datos.configComida
  return (bultosEnBodega(datos, especie) * kgPorBulto[especie]) / consumoDiarioKg[especie]
}

export function nivelComida(datos: DatosAlbergue, dias: number): Nivel {
  const { diasAviso, diasUrgente } = datos.configComida
  if (dias < diasUrgente) return 'urgente'
  if (dias < diasAviso) return 'ojo'
  return 'bien'
}

/** Cuántos bultos comprar para volver a tener `diasMeta` días de margen */
export function bultosParaPedir(datos: DatosAlbergue, especie: Especie, diasMeta = 7): number {
  const { kgPorBulto, consumoDiarioKg } = datos.configComida
  const faltanKg = diasMeta * consumoDiarioKg[especie] - bultosEnBodega(datos, especie) * kgPorBulto[especie]
  return Math.max(0, Math.ceil(faltanKg / kgPorBulto[especie]))
}

// ---------- Plata ----------

export function plataEnCaja(datos: DatosAlbergue): number {
  const desde = datos.cajaInicial.fecha
  return datos.movimientos
    .filter((m) => m.fechaHora >= desde)
    .reduce((caja, m) => caja + (m.tipo === 'ingreso' ? m.monto : -m.monto), datos.cajaInicial.monto)
}

export function deudaTotal(datos: DatosAlbergue): number {
  return datos.clinicas.reduce((suma, c) => suma + c.deuda, 0)
}

/** Ojo desde el 80 % del límite; urgente desde el 95 % (ya casi no atienden). */
export function nivelClinica(clinica: Clinica): Nivel {
  const uso = clinica.deuda / clinica.limite
  if (uso >= 0.95) return 'urgente'
  if (uso >= 0.8) return 'ojo'
  return 'bien'
}

// ---------- Medicinas ----------

export type EstadoDosis = 'dada' | 'pendiente' | 'atrasada'

export interface DosisDelDia {
  tratamiento: Tratamiento
  hora: string
  estado: EstadoDosis
  dada: DosisDada | null
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
        datos.dosisDadas.find(
          (d) => d.tratamientoId === t.id && d.hora === hora && d.fechaHora.startsWith(hoy),
        ) ?? null
      const [h, m] = hora.split(':').map(Number)
      const atrasada = minutosAhora > h * 60 + m + 60
      lista.push({ tratamiento: t, hora, dada, estado: dada ? 'dada' : atrasada ? 'atrasada' : 'pendiente' })
    }
  }
  return lista.sort((a, b) => a.hora.localeCompare(b.hora))
}

// ---------- Animales ----------

/** Estados que cuentan como "está en el albergue o a cargo de Huellitas" */
export const ESTADOS_A_CARGO: EstadoAnimal[] = ['cuarentena', 'tratamiento', 'adoptable', 'hogar_temporal']

export function conteoPorEstado(datos: DatosAlbergue): Record<EstadoAnimal, number> {
  const conteo: Record<EstadoAnimal, number> = {
    cuarentena: 0,
    tratamiento: 0,
    adoptable: 0,
    hogar_temporal: 0,
    adoptado: 0,
    fallecido: 0,
    devuelto: 0,
  }
  for (const a of datos.animales) conteo[a.estado]++
  return conteo
}

export const NOMBRE_ESTADO: Record<EstadoAnimal, string> = {
  cuarentena: 'Cuarentena',
  tratamiento: 'En tratamiento',
  adoptable: 'Listo para adoptar',
  hogar_temporal: 'En hogar temporal',
  adoptado: 'Adoptado',
  fallecido: 'Falleció',
  devuelto: 'Devuelto',
}
