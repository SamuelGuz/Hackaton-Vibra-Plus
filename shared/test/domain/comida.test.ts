import { describe, expect, it } from 'vitest'
import { diasDeComida } from '../../src/domain/comida'
import type { Animal, EstadoAnimal, Especie } from '../../src/tipos'
import type { ItemCatalogo, Registro } from '../../src/registro'
import { registro } from '../fixtures/semilla'

const BULTO_PERRO: ItemCatalogo = {
  id: 'cat-perro',
  nombre: 'Concentrado perro 25 kg',
  tipo: 'comida',
  kgPorUnidad: 25,
  especieObjetivo: 'perro',
  consumoDiarioKgPorAnimal: 0.375,
}

const BULTO_GATO: ItemCatalogo = {
  id: 'cat-gato',
  nombre: 'Concentrado gato 10 kg',
  tipo: 'comida',
  kgPorUnidad: 10,
  especieObjetivo: 'gato',
  consumoDiarioKgPorAnimal: 0.065,
}

function animales(n: number, especie: Especie = 'perro', estado: EstadoAnimal = 'adoptable'): Animal[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${especie}-${estado}-${i}`,
    nombre: `${especie} ${i}`,
    especie,
    estado,
    foto: null,
    fechaIngreso: '2026-03-14',
    advertencias: [],
    caracter: '',
    padrino: null,
  }))
}

function bultos(id: string, especie: Especie, cambio: number, parcial: Partial<Registro> = {}): Registro {
  return registro({
    id,
    origen: 'panel',
    estado: 'confirmado',
    propuesta: { tipo: 'inventario', especie, cambio },
    fraseExacta: undefined,
    compromisoId: undefined,
    ...parcial,
  })
}

describe('diasDeComida', () => {
  it('3 bultos de 25 kg y 45 perros a 0,375 kg/día → 4.4', () => {
    expect(diasDeComida([], BULTO_PERRO, animales(45), 3)).toBe(4.4)
  })

  it('los bultos pueden venir de un registro de inventario que suma', () => {
    expect(diasDeComida([bultos('i1', 'perro', 3)], BULTO_PERRO, animales(45))).toBe(4.4)
  })

  it('los registros de inventario restan (−1 bulto) y suman (llegada) sobre los bultos iniciales', () => {
    expect(diasDeComida([bultos('i1', 'perro', -1)], BULTO_PERRO, animales(45), 4)).toBe(4.4)
    expect(diasDeComida([bultos('i1', 'perro', 2)], BULTO_PERRO, animales(45), 1)).toBe(4.4)
  })

  it('el inventario de otra especie no mueve los bultos', () => {
    expect(diasDeComida([bultos('i1', 'gato', -2)], BULTO_PERRO, animales(45), 3)).toBe(4.4)
  })

  it('los animales adoptado, fallecido y hogar_temporal no cuentan, ni los de otra especie', () => {
    const todos = [
      ...animales(45),
      ...animales(5, 'perro', 'adoptado'),
      ...animales(5, 'perro', 'fallecido'),
      ...animales(5, 'perro', 'hogar_temporal'),
      ...animales(10, 'gato'),
    ]
    expect(diasDeComida([], BULTO_PERRO, todos, 3)).toBe(4.4)
  })

  it('los gatos usan su propio bulto y consumo', () => {
    // 2 bultos de 10 kg / (10 gatos × 0,065) = 30,77 días
    expect(diasDeComida([], BULTO_GATO, animales(10, 'gato'), 2)).toBe(30.8)
  })

  it('solo cuentan los registros confirmados: por_confirmar, corregido y anulado se ignoran', () => {
    const ignorados = [
      bultos('i1', 'perro', -3, { estado: 'por_confirmar' }),
      bultos('i2', 'perro', -3, { estado: 'corregido' }),
      bultos('i3', 'perro', -3, { estado: 'anulado' }),
    ]
    expect(diasDeComida(ignorados, BULTO_PERRO, animales(45), 3)).toBe(4.4)
  })

  it('si los registros dejan los bultos por debajo de cero, quedan 0 días', () => {
    expect(diasDeComida([bultos('i1', 'perro', -5)], BULTO_PERRO, animales(45), 3)).toBe(0)
  })

  it('sin animales de esa especie no hay consumo y los días son null', () => {
    expect(diasDeComida([], BULTO_PERRO, animales(5, 'gato'), 3)).toBeNull()
  })
})
