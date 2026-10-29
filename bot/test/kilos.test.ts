import { describe, expect, it } from 'vitest'
import { validarEvento } from '../src/api/eventos.js'
import { conKilos, kilosDeTexto } from '../src/conversacion/kilos.js'
import type { Accion } from '../src/tipos.js'
import { diasDeComida, kgEnBodega } from '../src/datos/calculos.js'
import { convertir } from '../src/ia/esquema.js'
import { AHORA, datosDePrueba } from './fakes.js'

const sinMarca = (texto: string) => kilosDeTexto(texto).map(({ especieDicha: _, productoDicho: __, ...k }) => k)

describe('kilos sueltos en lo que se dice', () => {
  it('lee llegadas y gastos con su producto', () => {
    expect(sinMarca('llegaron 20 kilos de carne')).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: 20, unidad: 'kg', producto: 'carne' }])
    expect(sinMarca('Se gastaron 12 kilos de menudencia')).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: -12, unidad: 'kg', producto: 'menudencia' }])
    expect(sinMarca('Don Carlos trajo quince kilos de huesos para los gatos')).toEqual([{ tipo: 'inventario', especie: 'gato', cambio: 15, unidad: 'kg', producto: 'huesos' }])
    expect(sinMarca('llegaron 2,5 kg de pollo')[0].cambio).toBe(2.5)
    expect(sinMarca('trajeron un kilo y medio de carne')[0].cambio).toBe(1.5)
    expect(sinMarca('llegaron 3 kilos y medio de huesos')[0]).toMatchObject({ cambio: 3.5, producto: 'huesos' })
    expect(sinMarca('se gastó medio kilo de pollo')[0].cambio).toBe(-0.5)
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

  it('la especie de la frase siguiente no se pega a los kilos (encontrado en vivo con Gemini)', () => {
    const texto = 'don Carlos trajo 20 kilos de carne y se gastaron 5 kilos de menudencia, y abrí un bulto de gato'
    expect(kilosDeTexto(texto).map((k) => [k.cambio, k.especie, k.especieDicha])).toEqual([
      [20, 'perro', false],
      [-5, 'perro', false],
    ])
    // Lo que devolvió Gemini: los kilos bien, para el perro, y el bulto del gato. No se agrega nada.
    const deGemini: Accion[] = [
      { tipo: 'inventario', especie: 'perro', cambio: 20, unidad: 'kg', producto: 'carne' },
      { tipo: 'inventario', especie: 'perro', cambio: -5, unidad: 'kg', producto: 'menudencia' },
      { tipo: 'inventario', especie: 'gato', cambio: -1 },
    ]
    expect(conKilos(deGemini, texto)).toEqual(deGemini)
    // Si Gemini no anota el producto (queda "carne"), gana el que dijo la persona
    const sinProducto = deGemini.map((x, i) => (i === 1 ? { ...x, producto: 'carne' } : x))
    expect(conKilos(sinProducto, texto)).toEqual(deGemini)
  })

  it('si la IA ya anotó esos mismos kilos para otra especie, no se duplican', () => {
    const deLaIa: Accion[] = [{ tipo: 'inventario', especie: 'gato', cambio: 4, unidad: 'kg', producto: 'pollo' }]
    expect(conKilos(deLaIa, 'llegaron 4 kilos de pollo para los perros')).toEqual(deLaIa)
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
