// Kilos sueltos de comida: "llegaron 20 kilos de carne", "se gastaron 12 kilos de menudencia".
// A Yesenia le llegan recortes y huesos del carnicero por kilos, no en bultos cerrados.
// Se leen del texto (o de lo que se escuchó en el audio) aunque la IA falle o los tome por bultos.
import type { Especie } from '../panel-tipos.js'
import type { Accion } from '../tipos.js'
import { especieDeTexto } from './comida.js'
import { sinTildes } from './numeros.js'

/** Más que esto en un solo registro es casi seguro un error de lectura */
export const MAX_KG = 2000

type InventarioKg = Extract<Accion, { tipo: 'inventario' }> & { unidad: 'kg' }

const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, cien: 100,
}

const PRODUCTOS = 'carne|carnaza|menudencias?|recortes?|huesos?|pollo|visceras|higado|bofe|pescado|concentrado|comida|croquetas'
const CANTIDAD = `(\\d+(?:[.,]\\d+)?|medio|${Object.keys(NUMEROS).join('|')})`
const KILOS = new RegExp(`${CANTIDAD}\\s*(?:kilos?|kg|kgs|kilogramos?)\\b(\\s+y\\s+medio)?(?:\\s+(?:de|del)\\s+(${PRODUCTOS}))?`, 'g')
const SALIDA = /\b(gast\w*|us(e|amos|aron|o)|consum\w*|sali\w*|se fue(ron)?|dimos|les di|di\b|servi\w*|repart\w*|abri\w*|sacamos|se acab\w*|se dano|se danaron|bot(e|amos|aron))\b/
const FUTURO = /\b(voy|vamos|van|va) a\b|\b(toca|hay que|tocaria|necesit\w*|falta\w*|pedir|manana|ojala)\b/

function cantidad(palabra: string): number {
  if (palabra === 'medio') return 0.5
  return NUMEROS[palabra] ?? Number(palabra.replace(',', '.'))
}

const redondear = (n: number) => Math.round(n * 10) / 10

/** Kilos leídos del texto; `especieDicha` y `productoDicho` dicen si se nombraron o se supusieron */
type KilosDichos = InventarioKg & { especieDicha: boolean; productoDicho: boolean }

/** Cada mención de kilos ya ocurrida, con su signo: + llegaron, − se gastaron. */
export function kilosDeTexto(texto: string): KilosDichos[] {
  const t = sinTildes(texto.toLowerCase())
  const lista: KilosDichos[] = []
  let desde = 0
  for (const m of t.matchAll(KILOS)) {
    // "un kilo y medio" = 1,5
    const kg = redondear(cantidad(m[1]) + (m[2] ? 0.5 : 0))
    // La frase de esta cantidad (desde la coma, el punto o la "y" anterior) dice si llegó, se gastó o todavía no pasa
    const antes = t.slice(desde, m.index).split(/[.;:!?\n]|, | y | e /).pop() ?? ''
    // "…para los perros" sí; "…, y abrí un bulto de gato" ya es otra frase
    const despues = t.slice(m.index + m[0].length, m.index + m[0].length + 25).split(/[.;:!?\n,]| y | e /)[0]
    desde = m.index + m[0].length
    if (!(kg > 0 && kg <= MAX_KG)) continue
    if (FUTURO.test(antes)) continue
    const especie = especieDeTexto(`${antes} ${despues}`)
    lista.push({
      tipo: 'inventario',
      especie: especie ?? 'perro',
      especieDicha: especie !== null,
      productoDicho: Boolean(m[3]),
      cambio: SALIDA.test(antes) ? -kg : kg,
      unidad: 'kg',
      producto: m[3] ? m[3].replace(/^(menudencia|recorte)s$/, '$1') : 'carne',
    })
  }
  return lista
}

/**
 * Junta lo que anotó la IA con los kilos que se leen del texto:
 * - si la IA tomó "20 kilos" como 20 bultos (o como otro número de bultos sin que se hablara de bultos), se pasa a kilos;
 * - si la IA no los anotó, se agregan;
 * - si ya venían en kilos, se dejan como están.
 */
export function conKilos(acciones: Accion[], texto: string): Accion[] {
  const kilos = kilosDeTexto(texto)
  if (kilos.length === 0) return acciones
  const hablaDeBultos = /\b(bultos?|costal\w*)\b/.test(sinTildes(texto.toLowerCase()))
  const resultado = [...acciones]
  for (const { especieDicha, productoDicho, ...k } of kilos) {
    const mismaEspecie = (e: Especie) => !especieDicha || e === k.especie
    // Los mismos kilos que ya anotó la IA son los mismos, aunque cada uno haya entendido otra especie
    const yaEnKilos = resultado.findIndex((a) => a.tipo === 'inventario' && a.unidad === 'kg' && a.cambio === k.cambio)
    if (yaEnKilos >= 0) {
      // Si la persona nombró el producto ("menudencia"), gana sobre el que puso la IA
      if (productoDicho) resultado[yaEnKilos] = { ...(resultado[yaEnKilos] as InventarioKg), producto: k.producto }
      continue
    }
    const i = resultado.findIndex(
      (a) =>
        a.tipo === 'inventario' &&
        a.unidad !== 'kg' &&
        mismaEspecie(a.especie) &&
        Math.sign(a.cambio) === Math.sign(k.cambio) &&
        (Math.abs(a.cambio) === Math.abs(k.cambio) || !hablaDeBultos),
    )
    if (i >= 0) {
      const ia = resultado[i] as Extract<Accion, { tipo: 'inventario' }>
      resultado[i] = { ...k, especie: especieDicha ? k.especie : ia.especie }
    } else resultado.push(k)
  }
  return resultado
}
