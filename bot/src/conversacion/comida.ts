// "Abrí un bulto" y "Llegó comida": perro o gato, y cuántos bultos llegaron.
import type { Especie } from '../panel-tipos.js'
import { botones, textos } from '../textos.js'
import type { Estado } from '../tipos.js'
import type { Ctx } from './ctx.js'
import { guardarYPreguntar } from './confirmar.js'
import { parsearCantidad } from './numeros.js'

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
      { id: `n:${especie}:1`, titulo: '1' },
      { id: `n:${especie}:2`, titulo: '2' },
      { id: `n:${especie}:otro`, titulo: 'Otro número' },
    ],
  })
  return { paso: 'comida_cantidad', especie }
}

/** Botón 'n:<especie>:<cantidad|otro>' */
export async function elegirCantidad(c: Ctx, id: string): Promise<Estado> {
  const [, especie, cantidad] = id.split(':') as [string, Especie, string]
  if (cantidad === 'otro') {
    await c.enviar({ tipo: 'texto', texto: textos.comidaEscribeNumero })
    return { paso: 'comida_cantidad', especie }
  }
  return guardarLlegada(c, especie, Number(cantidad))
}

/** Lo que escribió o dijo en el paso "¿cuántos bultos?" */
export async function cantidadEscrita(c: Ctx, especie: Especie, texto: string): Promise<Estado> {
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
