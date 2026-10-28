// "Contar algo de un animal": elegir el animal (lista o nombre) y contar qué se le notó.
import type { Animal, DatosAlbergue } from '../panel-tipos.js'
import { textos } from '../textos.js'
import type { Accion, Estado, Fila } from '../tipos.js'
import type { Ctx } from './ctx.js'
import { guardarYPreguntar, preguntarAlgoMas } from './confirmar.js'
import { sinTildes } from './numeros.js'

const MAX_FILAS = 9
const A_LA_VISTA = new Set(['tratamiento', 'cuarentena'])
const FUERA = new Set(['adoptado', 'fallecido'])

const normal = (t: string) => sinTildes(t.toLowerCase()).replace(/[^a-z0-9ñ ]/g, '').trim()

function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0]
    fila[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = fila[j]
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1))
      previo = tmp
    }
  }
  return fila[b.length]
}

/** Busca por nombre o apodo, tolerando tildes y un error de letra ("Tobi", "tobias", "Bruo"). */
export function buscarAnimal(d: DatosAlbergue, texto: string): Animal[] {
  const q = normal(texto).replace(/^(a|al|el|la|de|del)\s+/, '')
  if (!q) return []
  const nombresDe = (a: Animal & { alias?: string[] }) => [a.nombre, ...(a.alias ?? [])].map(normal)
  const puntaje = (a: Animal) => {
    const nombres = nombresDe(a)
    if (nombres.includes(q)) return 4
    if (nombres.some((n) => n.startsWith(q) && q.length >= 3)) return 3
    if (nombres.some((n) => q.split(' ').includes(n))) return 3
    if (q.length >= 4 && nombres.some((n) => distancia(n, q) <= 1)) return 2
    return 0
  }
  const con = d.animales.map((a) => ({ a, p: puntaje(a) - (FUERA.has(a.estado) ? 0.5 : 0) })).filter((x) => x.p > 0)
  const mejor = Math.max(0, ...con.map((x) => x.p))
  return con.filter((x) => x.p === mejor).map((x) => x.a)
}

function fila(a: Animal): Fila {
  return { id: `a:${a.id}`, titulo: a.nombre, descripcion: `${a.especie === 'perro' ? 'Perro' : 'Gato'} · ${a.estado.replace('_', ' ')}` }
}

export async function empezarAnimal(c: Ctx): Promise<Estado> {
  const d = await c.datos()
  const filas = d.animales
    .filter((a) => A_LA_VISTA.has(a.estado))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .slice(0, MAX_FILAS)
    .map(fila)
  filas.push({ id: 'a:otro', titulo: 'Otro animal', descripcion: 'Escribir el nombre' })
  await c.enviar({ tipo: 'lista', texto: textos.animalElegir, boton: textos.animalBoton, filas })
  return { paso: 'animal' }
}

/** Botón 'a:<id>' o 'a:otro' */
export async function elegirAnimal(c: Ctx, id: string): Promise<Estado> {
  if (id === 'a:otro') {
    await c.enviar({ tipo: 'texto', texto: textos.animalNombre })
    return { paso: 'animal_nombre' }
  }
  const d = await c.datos()
  const a = d.animales.find((x) => x.id === id.slice(2))
  if (!a) return preguntarAlgoMas(c, textos.seMePerdio)
  await c.enviar({ tipo: 'texto', texto: textos.animalNota(a.nombre) })
  return { paso: 'animal_nota', animalId: a.id }
}

export async function nombreEscrito(c: Ctx, texto: string): Promise<Estado> {
  const encontrados = buscarAnimal(await c.datos(), texto)
  if (encontrados.length === 0) {
    await c.enviar({ tipo: 'texto', texto: textos.animalNoEncontre(texto.trim()) })
    return { paso: 'animal_nombre' }
  }
  if (encontrados.length === 1) return elegirAnimal(c, `a:${encontrados[0].id}`)
  await c.enviar({ tipo: 'lista', texto: textos.animalVarios, boton: textos.animalBoton, filas: encontrados.slice(0, 10).map(fila) })
  return { paso: 'animal' }
}

/** La nota quedó escrita o dicha en audio. `otras` son acciones extra que la IA sacó del mismo audio. */
export function guardarNota(
  c: Ctx,
  animalId: string,
  texto: string,
  extra: { otras?: Accion[]; mediaUrl?: string | null; audio?: boolean } = {},
): Promise<Estado> {
  const acciones: Accion[] = [{ tipo: 'nota', animalId, texto: texto.trim() }, ...(extra.otras ?? []).filter((a) => a.tipo !== 'nota')]
  return guardarYPreguntar(c, {
    acciones,
    tipoEntrada: extra.audio ? 'audio' : 'texto',
    mediaUrl: extra.mediaUrl,
    transcripcion: texto,
  })
}
