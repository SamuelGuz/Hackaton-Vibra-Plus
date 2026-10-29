// "Abrí un bulto" y "Llegó comida": perro o gato, y cuántos bultos (o kilos sueltos de carne) llegaron.
import type { Especie } from '../panel-tipos.js'
import { botones, textos } from '../textos.js'
import type { Estado } from '../tipos.js'
import type { Ctx } from './ctx.js'
import { guardarYPreguntar } from './confirmar.js'
import { kilosDeTexto, MAX_KG } from './kilos.js'
import { parsearCantidad, sinTildes } from './numeros.js'

const MAX_BULTOS = 200

export async function empezarComida(c: Ctx, llegada: boolean): Promise<Estado> {
  const l = llegada ? 1 : 0
  await c.enviar({
    tipo: 'botones',
    texto: textos.comidaEspecie(llegada),
    botones: [
      { id: `e:${l}:perro`, titulo: '🐶 Perro' },
      { id: `e:${l}:gato`, titulo: '🐱 Gato' },
      botones.volver,
    ],
  })
  return { paso: 'comida_especie', llegada }
}

export async function elegirEspecie(c: Ctx, llegada: boolean, especie: Especie): Promise<Estado> {
  if (!llegada) {
    return guardarYPreguntar(c, { acciones: [{ tipo: 'inventario', especie, cambio: -1 }], tipoEntrada: 'boton' })
  }
  await c.enviar({
    tipo: 'botones',
    texto: textos.comidaCantidad(especie),
    botones: [
      { id: `n:${especie}:1`, titulo: '1 bulto' },
      { id: `n:${especie}:otro`, titulo: 'Varios bultos' },
      { id: `n:${especie}:kg`, titulo: '🥩 Kilos sueltos' },
    ],
  })
  return { paso: 'comida_cantidad', especie }
}

/** Botón 'n:<especie>:<cantidad|otro|kg>' */
export async function elegirCantidad(c: Ctx, id: string): Promise<Estado> {
  const [, especie, cantidad] = id.split(':') as [string, Especie, string]
  if (cantidad === 'otro') {
    await c.enviar({ tipo: 'texto', texto: textos.comidaEscribeNumero })
    return { paso: 'comida_cantidad', especie }
  }
  if (cantidad === 'kg') {
    await c.enviar({ tipo: 'texto', texto: textos.comidaCuantosKilos(especie) })
    return { paso: 'comida_cantidad', especie, unidad: 'kg' }
  }
  return guardarLlegada(c, especie, Number(cantidad))
}

/** "15", "15,5", "quince" → kilos; null si no hay un número que sirva */
function leerKilos(texto: string): number | null {
  const cifra = sinTildes(texto.toLowerCase()).match(/\d+(?:[.,]\d+)?/)
  const n = cifra ? Number(cifra[0].replace(',', '.')) : parsearCantidad(texto)
  return n && n > 0 && n <= MAX_KG ? Math.round(n * 10) / 10 : null
}

/** Lo que escribió o dijo en el paso "¿cuántos bultos?" o "¿cuántos kilos?" */
export async function cantidadEscrita(c: Ctx, especie: Especie, texto: string, unidad?: 'kg'): Promise<Estado> {
  // "15 kilos de carnaza" se anota en kilos aunque se haya preguntado por bultos
  const dichos = kilosDeTexto(texto)
  if (unidad === 'kg' || dichos.length) {
    const kg = dichos[0] ? Math.abs(dichos[0].cambio) : leerKilos(texto)
    if (!kg) {
      await c.enviar({ tipo: 'texto', texto: textos.comidaKilosNoEntendi })
      return { paso: 'comida_cantidad', especie, unidad: 'kg' }
    }
    const producto = dichos[0]?.producto ?? 'carne'
    return guardarYPreguntar(c, {
      acciones: [{ tipo: 'inventario', especie, cambio: kg, unidad: 'kg', producto }],
      tipoEntrada: 'boton',
    })
  }
  const n = parsearCantidad(texto)
  if (!n || n < 1 || n > MAX_BULTOS) {
    await c.enviar({ tipo: 'texto', texto: textos.comidaNoEntendi })
    return { paso: 'comida_cantidad', especie }
  }
  return guardarLlegada(c, especie, n)
}

function guardarLlegada(c: Ctx, especie: Especie, n: number): Promise<Estado> {
  return guardarYPreguntar(c, { acciones: [{ tipo: 'inventario', especie, cambio: n }], tipoEntrada: 'boton' })
}

/** "perro", "de gato", "perrito" → especie */
export function especieDeTexto(texto: string): Especie | null {
  const t = texto.toLowerCase()
  if (/perr|canin/.test(t)) return 'perro'
  if (/gat|felin/.test(t)) return 'gato'
  return null
}
