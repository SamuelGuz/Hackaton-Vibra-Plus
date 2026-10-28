import { beforeEach, describe, expect, it } from 'vitest'
import { atender } from '../src/conversacion/atender.js'
import { informePedido } from '../src/conversacion/informe.js'
import { armarInforme, TIPOS_INFORME } from '../src/informes/armar.js'
import type { Entrada, Usuario } from '../src/tipos.js'
import { cuerpoMensaje } from '../src/wa/cliente.js'
import { ANDREA, CAROLINA, crearDeps, datosDePrueba, LUIS } from './fakes.js'

const texto = (t: string): Entrada => ({ tipo: 'texto', texto: t })
const boton = (id: string): Entrada => ({ tipo: 'boton', id, titulo: '' })
const audio = (): Entrada => ({ tipo: 'audio', mediaId: 'aud1', mime: 'audio/ogg' })

let t: ReturnType<typeof crearDeps>
const decir = (e: Entrada, u: Usuario = LUIS) => atender(t.deps, u, e)
const imagenes = () => t.wa.enviados.filter((m) => m.salida.tipo === 'imagen')

beforeEach(async () => {
  t = crearDeps()
  for (const u of [LUIS, ANDREA, CAROLINA]) await t.repo.guardarEstado(u.id, { paso: 'menu' })
})

describe('qué informe pide un texto', () => {
  it.each([
    ['Mándame el informe de la plata', 'plata'],
    ['quiero una gráfica de los gastos', 'plata'],
    ['reporte de la comida', 'comida'],
    ['cómo vamos con las medicinas?', 'medicinas'],
    ['estadísticas de los animales', 'animales'],
    ['mándame un informe', 'general'],
    ['cómo vamos', 'general'],
  ])('"%s" → %s', (frase, tipo) => {
    expect(informePedido(frase)).toBe(tipo)
  })

  it.each(['le di la pastilla a Tobías', 'entraron 50 mil de donación', 'abrí un bulto de perro'])(
    '"%s" no es un informe',
    (frase) => expect(informePedido(frase)).toBeNull(),
  )
})

describe('el bot manda informes como imagen', () => {
  it('el menú tiene "Ver un informe" y no se pasa de 10 filas', async () => {
    await decir(texto('menu'), CAROLINA)
    expect(t.wa.opciones()).toContain('m:informe')
    expect(t.wa.opciones().length).toBeLessThanOrEqual(10)
  })

  it('desde el menú se elige el informe y llega una imagen con pie de foto', async () => {
    await decir(boton('m:informe'), CAROLINA)
    expect(t.wa.opciones()).toEqual(TIPOS_INFORME.map((x) => `i:${x}`))
    await decir(boton('i:comida'), CAROLINA)
    expect(imagenes()).toHaveLength(1)
    const img = imagenes()[0].salida
    expect(img.tipo === 'imagen' && img.png.length).toBeGreaterThan(0)
    expect(img.texto).toContain('La comida')
    expect(t.dibujos[0]).toContain('Refugio Yesenia')
    expect(t.wa.ultimo().tipo).toBe('botones')
  })

  it('escribirlo con palabras también lo manda, sin pasar por la IA', async () => {
    await decir(texto('mándame el informe de la plata'), CAROLINA)
    expect(imagenes()).toHaveLength(1)
    expect(t.ia.llamadas).toHaveLength(0)
    expect(t.dibujos[0]).toContain('San Roque')
  })

  it('si la IA entiende en un audio que piden un informe, lo manda', async () => {
    t.ia.responder({ transcripcion: 'cómo va la comida', informe: 'comida' })
    await decir(audio())
    expect(imagenes()).toHaveLength(1)
    expect(t.repo.registros).toHaveLength(0)
  })

  it('el informe de plata es solo para la administración', async () => {
    await decir(boton('m:informe'))
    expect(t.wa.opciones()).not.toContain('i:plata')
    await decir(texto('informe de la plata'))
    expect(imagenes()).toHaveLength(0)
    expect(t.wa.ultimoTexto()).toContain('solo lo ve la administración')
  })

  it('el resumen general no muestra la caja a quien no es administración', async () => {
    await decir(boton('i:general'), ANDREA)
    expect(t.dibujos[0]).not.toContain('San Roque')
    await decir(boton('i:general'), CAROLINA)
    expect(t.dibujos[1]).toContain('San Roque')
  })

  it('si no se puede dibujar, avisa y no se cae', async () => {
    t.deps.dibujar = async () => {
      throw new Error('sin navegador')
    }
    await decir(boton('i:animales'))
    expect(imagenes()).toHaveLength(0)
    expect(t.wa.ultimoTexto()).toContain('no pude armar la imagen')
  })
})

describe('las hojas de los informes', () => {
  it.each(TIPOS_INFORME)('"%s" se arma con los datos y escapa los nombres', (tipo) => {
    const d = datosDePrueba()
    d.animales[0].nombre = '<b>Tobías</b>'
    const html = armarInforme(tipo, d, new Date('2026-10-28T15:00:00-05:00'), true)
    expect(html).toContain('<!doctype html>')
    expect(html).not.toContain('<b>Tobías</b>')
  })

  it('la imagen va a Meta con el id subido y el pie recortado', () => {
    const c = cuerpoMensaje('57300', { tipo: 'imagen', png: Buffer.from('x'), texto: 'a'.repeat(2000) }, 'med1')
    expect(c).toMatchObject({ type: 'image', image: { id: 'med1' } })
    expect((c.image as { caption: string }).caption).toHaveLength(1024)
    expect(() => cuerpoMensaje('57300', { tipo: 'imagen', png: Buffer.from('x'), texto: '' })).toThrow()
  })
})
