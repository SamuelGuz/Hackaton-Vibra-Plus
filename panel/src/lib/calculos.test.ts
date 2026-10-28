// Pruebas de las reglas existentes, con los datos demo como escenario fijo.
import { describe, expect, it } from 'vitest'
import { crearDatosDemo } from '../data/demo'
import { bultosEnBodega, diasDeComida, nivelClinica, nivelComida, plataEnCaja } from './calculos'

const AHORA = new Date(2026, 9, 27, 9, 30)

describe('comida', () => {
  it('cuenta los bultos cerrados desde el último conteo', () => {
    const datos = crearDatosDemo(AHORA)
    expect(bultosEnBodega(datos, 'perro')).toBe(3)
    expect(bultosEnBodega(datos, 'gato')).toBe(3)
  })

  it('3 bultos de perro alcanzan 4,4 días (ojo); abrir uno más lo pasa a urgente', () => {
    const datos = crearDatosDemo(AHORA)
    expect(nivelComida(datos, diasDeComida(datos, 'perro'))).toBe('ojo')
    const unoMenos = {
      ...datos,
      inventario: [...datos.inventario, { id: 'x', fechaHora: '2026-10-27T10:00', tipo: 'perro' as const, cambio: -1, quien: 'p-luis', origen: 'panel' as const }],
    }
    expect(nivelComida(unoMenos, diasDeComida(unoMenos, 'perro'))).toBe('urgente')
  })
})

describe('plata', () => {
  it('la caja suma ingresos y resta gastos desde el último cuadre', () => {
    expect(plataEnCaja(crearDatosDemo(AHORA))).toBe(1_050_000 + 300_000 + 40_000 - 150_000)
  })

  it('la clínica al 87 % del límite está en urgente', () => {
    expect(nivelClinica({ id: 'x', nombre: 'x', deuda: 2_600_000, limite: 3_000_000 })).toBe('urgente')
    expect(nivelClinica({ id: 'x', nombre: 'x', deuda: 1_550_000, limite: 2_500_000 })).toBe('ojo')
  })
})
