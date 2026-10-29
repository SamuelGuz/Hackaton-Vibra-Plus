import { describe, expect, it } from 'vitest'
import { validarEvento } from '../src/api/eventos.js'
import { conKilos, kilosDeTexto } from '../src/conversacion/kilos.js'
import { diasDeComida, kgEnBodega } from '../src/datos/calculos.js'
import { convertir } from '../src/ia/esquema.js'
import { AHORA, datosDePrueba } from './fakes.js'

const sinMarca = (texto: string) => kilosDeTexto(texto).map(({ especieDicha: _, ...k }) => k)

describe('kilos sueltos en lo que se dice', () => {
  it('lee llegadas y gastos con su producto', () => {
    expect(sinMarca('llegaron 20 kilos de carne')).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: 20, unidad: 'kg', producto: 'carne' }])
    expect(sinMarca('Se gastaron 12 kilos de menudencia')).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: -12, unidad: 'kg', producto: 'menudencia' }])
    expect(sinMarca('Don Carlos trajo quince kilos de huesos para los gatos')).toEqual([{ tipo: 'inventario', especie: 'gato', cambio: 15, unidad: 'kg', producto: 'huesos' }])
    expect(sinMarca('llegaron 2,5 kg de pollo')[0].cambio).toBe(2.5)
  })

  it('varias menciones en un mismo mensaje, cada una con su signo', () => {
    const k = sinMarca('Le di la pastilla a Tobías, llegaron 20 kilos de carne y se gastaron 5 kilos de recortes')
    expect(k.map((x) => [x.cambio, x.producto])).toEqual([[20, 'carne'], [-5, 'recorte']])
  })

  it('lo que todavía no pasa no se anota', () => {
    expect(kilosDeTexto('mañana van a llegar 20 kilos de carne')).toEqual([])
    expect(kilosDeTexto('hay que pedir 10 kilos de carne')).toEqual([])
  })

  it('cantidades absurdas o sin kilos no se anotan', () => {
    expect(kilosDeTexto('llegaron 5000 kilos de carne')).toEqual([])
    expect(kilosDeTexto('llegaron 3 bultos de perro')).toEqual([])
  })

  it('si la IA ya lo anotó en kilos, no se duplica; si lo tomó por bultos, se corrige', () => {
    const enKilos = [{ tipo: 'inventario' as const, especie: 'perro' as const, cambio: 20, unidad: 'kg' as const, producto: 'carne' }]
    expect(conKilos(enKilos, 'llegaron 20 kilos de carne')).toEqual(enKilos)
    expect(conKilos([{ tipo: 'inventario', especie: 'perro', cambio: 20 }], 'llegaron 20 kilos de carne')).toEqual(enKilos)
  })

  it('un bulto y unos kilos en el mismo mensaje quedan los dos', () => {
    const r = conKilos([{ tipo: 'inventario', especie: 'perro', cambio: 1 }], 'llegó un bulto de perro y 20 kilos de carne')
    expect(r).toEqual([
      { tipo: 'inventario', especie: 'perro', cambio: 1 },
      { tipo: 'inventario', especie: 'perro', cambio: 20, unidad: 'kg', producto: 'carne' },
    ])
  })
})

describe('kilos en la IA, el cálculo y el panel', () => {
  it('la IA puede devolver kilos; sin especie se toman para los perros', () => {
    const e = convertir(
      { transcripcion: 'llegaron 15 kilos de carne', confianza: 0.95, acciones: [{ tipo: 'inventario', ya_ocurrio: true, cantidad: 15, unidad: 'kilos', producto: 'Carne' }] },
      datosDePrueba(),
      AHORA,
    )
    expect(e.acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: 15, unidad: 'kg', producto: 'carne' }])
  })

  it('los días de comida suman concentrado y carne', () => {
    const d = datosDePrueba()
    d.inventario.push({ id: 'k', fechaHora: '2026-10-27T10:00', tipo: 'perro', cambio: 0.6, kg: 15, unidad: 'kg', quien: '1', origen: 'bot' })
    expect(kgEnBodega(d, 'perro')).toBe(3 * 25 + 15)
    expect(diasDeComida(d, 'perro')).toBeCloseTo(90 / 16.875)
  })

  it('el panel puede mandar kilos con decimales; los bultos siguen siendo enteros', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e'
    expect(validarEvento({ id, tipo: 'inventario', especie: 'perro', cambio: 7.5, unidad: 'kg', producto: 'carne' })).toEqual({
      ok: { id, tipo: 'inventario', especie: 'perro', cambio: 7.5, unidad: 'kg', producto: 'carne' },
    })
    expect(validarEvento({ id, tipo: 'inventario', especie: 'perro', cambio: 1.5 })).toHaveProperty('error')
    expect(validarEvento({ id, tipo: 'inventario', especie: 'perro', cambio: 3 })).toEqual({ ok: { id, tipo: 'inventario', especie: 'perro', cambio: 3 } })
  })
})
