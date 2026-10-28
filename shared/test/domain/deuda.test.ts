import { describe, expect, it } from 'vitest'
import { deudaPorClinica } from '../../src/domain/deuda'
import type { Clinica } from '../../src/tipos'
import type { PropuestaServidor, Registro } from '../../src/registro'
import { registro } from '../fixtures/semilla'

const CLINICA: Clinica = { id: 'c-vida', nombre: 'Clínica Vida', deuda: 0, limite: 3_000_000 }

function factura(id: string, clinicaId: string, monto: number, parcial: Partial<Registro> = {}): Registro {
  const propuesta: PropuestaServidor = { tipo: 'deuda', clinicaId, monto, nota: 'cirugía' }
  return registro({ id, origen: 'panel', estado: 'confirmado', propuesta, fraseExacta: undefined, compromisoId: undefined, ...parcial })
}

function abono(id: string, clinicaId: string, monto: number, parcial: Partial<Registro> = {}): Registro {
  const propuesta: PropuestaServidor = {
    tipo: 'movimiento',
    movimiento: { tipo: 'gasto', monto, categoria: 'veterinaria', clinicaId, abonoDeuda: true, foto: null, nota: 'abono' },
  }
  return registro({ id, origen: 'panel', estado: 'confirmado', propuesta, fraseExacta: undefined, compromisoId: undefined, ...parcial })
}

describe('deudaPorClinica', () => {
  it('facturas por 2.800.000 y un abono de 300.000, límite 3.000.000 → deuda 2.500.000, pct 83, amarillo', () => {
    const registros = [factura('f1', 'c-vida', 2_800_000), abono('a1', 'c-vida', 300_000)]
    expect(deudaPorClinica(registros, [CLINICA])).toEqual([
      { clinicaId: 'c-vida', nombre: 'Clínica Vida', deuda: 2_500_000, limite: 3_000_000, pct: 83, semaforo: 'amarillo' },
    ])
  })

  it('con deuda 2.600.000 → rojo y con 1.700.000 → verde', () => {
    expect(deudaPorClinica([factura('f1', 'c-vida', 2_600_000)], [CLINICA])[0]).toMatchObject({ pct: 87, semaforo: 'rojo' })
    expect(deudaPorClinica([factura('f1', 'c-vida', 1_700_000)], [CLINICA])[0]).toMatchObject({ pct: 57, semaforo: 'verde' })
  })

  it('los límites exactos 60 % y 85 % son amarillo; apenas por debajo de 60 % es verde y apenas por encima de 85 % es rojo', () => {
    const con = (monto: number) => deudaPorClinica([factura('f1', 'c-vida', monto)], [CLINICA])[0]?.semaforo
    expect(con(1_799_999)).toBe('verde')
    expect(con(1_800_000)).toBe('amarillo')
    expect(con(2_550_000)).toBe('amarillo')
    expect(con(2_550_001)).toBe('rojo')
  })

  it('la deuda base de la clínica se suma a los registros', () => {
    const base: Clinica = { ...CLINICA, deuda: 1_000_000 }
    const registros = [factura('f1', 'c-vida', 800_000), abono('a1', 'c-vida', 100_000)]
    expect(deudaPorClinica(registros, [base])[0]).toMatchObject({ deuda: 1_700_000, semaforo: 'verde' })
  })

  it('los registros anulados, corregidos y por confirmar se ignoran', () => {
    const registros = [
      factura('f1', 'c-vida', 1_000_000),
      factura('f2', 'c-vida', 900_000, { estado: 'anulado' }),
      factura('f3', 'c-vida', 800_000, { estado: 'por_confirmar' }),
      factura('f4', 'c-vida', 700_000, { estado: 'corregido' }),
      abono('a1', 'c-vida', 400_000, { estado: 'anulado' }),
    ]
    expect(deudaPorClinica(registros, [CLINICA])[0]?.deuda).toBe(1_000_000)
  })

  it('cada clínica lleva su cuenta, en el orden recibido, y un gasto que no es abono no baja la deuda', () => {
    const otra: Clinica = { id: 'c-otra', nombre: 'Clínica Otra', deuda: 0, limite: 1_000_000 }
    const gastoNormal = abono('g1', 'c-vida', 500_000)
    if (gastoNormal.propuesta.tipo === 'movimiento') gastoNormal.propuesta.movimiento.abonoDeuda = false
    const registros = [factura('f1', 'c-otra', 900_000), factura('f2', 'c-vida', 600_000), abono('a1', 'c-otra', 100_000), gastoNormal]
    expect(deudaPorClinica(registros, [CLINICA, otra])).toEqual([
      { clinicaId: 'c-vida', nombre: 'Clínica Vida', deuda: 600_000, limite: 3_000_000, pct: 20, semaforo: 'verde' },
      { clinicaId: 'c-otra', nombre: 'Clínica Otra', deuda: 800_000, limite: 1_000_000, pct: 80, semaforo: 'amarillo' },
    ])
  })

  it('una clínica sin registros conserva su deuda base', () => {
    const base: Clinica = { ...CLINICA, deuda: 3_000_000 }
    expect(deudaPorClinica([], [base])[0]).toMatchObject({ deuda: 3_000_000, pct: 100, semaforo: 'rojo' })
  })

  it('una clínica sin límite no divide por cero: sin deuda es verde y con deuda es roja', () => {
    const sinLimite: Clinica = { ...CLINICA, limite: 0 }
    expect(deudaPorClinica([], [sinLimite])[0]).toMatchObject({ pct: 0, semaforo: 'verde' })
    expect(deudaPorClinica([factura('f1', 'c-vida', 1)], [sinLimite])[0]).toMatchObject({ pct: 100, semaforo: 'rojo' })
  })
})
