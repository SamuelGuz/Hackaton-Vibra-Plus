import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi, type Envio } from './api'
import { crearCola, type Cola } from './cola'

const bulto = (id: string): Envio => ({ tipo: 'eventos', eventos: [{ id, tipo: 'inventario', especie: 'perro', cambio: -1 }] })

let cola: Cola | null = null
afterEach(async () => {
  await cola?.cerrar(true)
  cola = null
})

describe('cola de envíos', () => {
  it('manda en el orden en que se tocó y queda vacía', async () => {
    const enviados: Envio[] = []
    cola = crearCola({ enviar: async (e) => void enviados.push(e) })
    await cola.encolar(bulto('a'))
    await cola.encolar(bulto('b'))
    await cola.procesar()
    expect(enviados.map((e) => (e.tipo === 'eventos' ? e.eventos[0].id : ''))).toEqual(['a', 'b'])
    expect(await cola.pendientes()).toBe(0)
  })

  it('sin señal guarda todo y lo manda cuando vuelve', async () => {
    let senal = false
    const enviados: Envio[] = []
    cola = crearCola({
      enviar: async (e) => {
        if (!senal) throw new TypeError('Failed to fetch')
        enviados.push(e)
      },
    })
    await cola.encolar(bulto('a'))
    await cola.encolar(bulto('b'))
    await cola.procesar()
    expect(await cola.pendientes()).toBe(2)
    senal = true
    await cola.procesar()
    expect(enviados.length).toBe(2)
    expect(await cola.pendientes()).toBe(0)
  })

  it('si el servidor rechaza un envío (datos malos) lo saca, avisa y sigue con el resto', async () => {
    const rechazos = vi.fn()
    const enviados: Envio[] = []
    cola = crearCola({
      enviar: async (e) => {
        if (e.tipo === 'eventos' && e.eventos[0].id === 'malo') throw new ErrorApi(400, 'Evento incompleto')
        enviados.push(e)
      },
      alRechazar: rechazos,
    })
    await cola.encolar(bulto('malo'))
    await cola.encolar(bulto('bueno'))
    await cola.procesar()
    expect(rechazos).toHaveBeenCalledWith('Evento incompleto')
    expect(enviados.length).toBe(1)
    expect(await cola.pendientes()).toBe(0)
  })

  it('si la sesión venció no pierde nada: espera', async () => {
    cola = crearCola({
      enviar: async () => {
        throw new ErrorApi(401, 'Falta iniciar sesión')
      },
    })
    await cola.encolar(bulto('a'))
    await cola.procesar()
    expect(await cola.pendientes()).toBe(1)
  })
})
