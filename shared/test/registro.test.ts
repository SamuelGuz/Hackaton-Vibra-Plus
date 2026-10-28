import { describe, expect, it } from 'vitest'
import { animalIdDe } from '../src/registro'
import type { Propuesta } from '../src/tipos'

describe('animalIdDe', () => {
  it('devuelve el animal de las propuestas que lo traen', () => {
    const conAnimal: Propuesta[] = [
      { tipo: 'dosis', animalId: 'TOB', tratamientoId: 't-1', hora: '14:00' },
      { tipo: 'nota', animalId: 'MAT', texto: 'Ya camina' },
      { tipo: 'estado_animal', animalId: 'BRU', estado: 'adoptado' },
    ]
    expect(conAnimal.map(animalIdDe)).toEqual(['TOB', 'MAT', 'BRU'])
  })

  it('devuelve null en inventario, movimiento y deuda', () => {
    const sinAnimal: Propuesta[] = [
      { tipo: 'inventario', especie: 'perro', cambio: -1 },
      { tipo: 'deuda', clinicaId: 'cl-24h', monto: 1000, nota: '' },
      {
        tipo: 'movimiento',
        movimiento: { tipo: 'gasto', monto: 1000, categoria: 'otro', clinicaId: null, abonoDeuda: false, foto: null, nota: '' },
      },
    ]
    expect(sinAnimal.map(animalIdDe)).toEqual([null, null, null])
  })
})
