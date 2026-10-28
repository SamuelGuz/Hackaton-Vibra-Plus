// Perfil rico de un animal: lo que guarda la base (nombre, estado, carácter, advertencias, padrino)
// más lo que la dueña enriquece a mano (historia, edad, tamaño, compatibilidad). Sin perfil curado
// se arma uno determinista y honesto: nunca se inventan detalles de rescate.
import { ahoraBogota } from '@huellitas/shared/domain/hora'
import type { Animal, Tratamiento } from '@huellitas/shared/tipos'
import { quitarDatosSensibles } from '../ia/redact'
import type { DatosRag } from './datos'
import type { Compatibilidad, PerfilCurado, PerfilRico, Tamano } from './tipos'

export const MENSUAL_COP_POR_DEFECTO = 40_000

/** Minúsculas y sin tildes: la llave con la que se busca un perfil curado por nombre */
export function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

/** Los adoptados y los fallecidos no se muestran en listas públicas */
export function esVisible(p: Pick<PerfilRico, 'estado'>): boolean {
  return p.estado !== 'adoptado' && p.estado !== 'fallecido'
}

export function edadTexto(anios: number, estimada = false): string {
  if (anios < 1) return estimada ? 'menos de un año' : 'menos de 1 año'
  const n = Math.round(anios)
  const base = n === 1 ? '1 año' : `${n} años`
  return estimada ? `unos ${base}` : base
}

/** Etiquetas de personalidad a partir del texto libre de `caracter` (comparado sin tildes) */
const PALABRAS_PERSONALIDAD: [RegExp, string][] = [
  [/tranquil|calmad|seren|pacific/, 'tranquilo'],
  [/juguet/, 'juguetón'],
  [/timid|asustadiz|miedos/, 'tímido'],
  [/carinos|ronronea|apegad|mimos/, 'cariñoso'],
  [/viej|senior|ancian/, 'viejito'],
  [/energia|activ|travies/, 'enérgico'],
  [/independient/, 'independiente'],
  [/curios/, 'curioso'],
  [/noble|docil/, 'noble'],
  [/celos/, 'celoso'],
]

function personalidadDe(caracter: string): string[] {
  const t = normalizar(caracter)
  return PALABRAS_PERSONALIDAD.filter(([re]) => re.test(t)).map(([, etiqueta]) => etiqueta)
}

/** Edad estimada solo con lo que dice la base. Si no dice nada, 4 años (adulto joven) y se marca como estimada */
function edadPorDefecto(caracter: string): number {
  const t = normalizar(caracter)
  const dicha = /tiene (\d{1,2}) anos/.exec(t)
  if (dicha) return Number(dicha[1])
  if (/viej|senior|ancian/.test(t)) return 10
  if (/cachorr|bebe/.test(t)) return 0.5
  if (/jovencit|\bjoven\b/.test(t)) return 2
  return 4
}

function tamanoPorDefecto(a: Animal): Tamano {
  const t = normalizar(a.caracter)
  if (/grande|corpulent/.test(t)) return 'grande'
  if (/pequen|chiquit|\bmini\b/.test(t) || a.especie === 'gato') return 'pequeno'
  return 'mediano'
}

function compatibilidadPorDefecto(caracter: string): Compatibilidad {
  const t = normalizar(caracter)
  const perros = /(se )?lleva bien con (otros )?perros/.test(t) ? true : /asustadiz\w* con los perros|sin perros|no se lleva con (otros )?perros|reactiv/.test(t) ? false : null
  const gatos = /sin gatos|no (convive|se lleva) con gatos/.test(t) ? false : null
  const ninos = /no (es )?apto para ninos|no (convive|se lleva) con ninos/.test(t) ? false : null
  return { ninos, gatos, perros, apartamento: null }
}

function historiaPorDefecto(a: Animal): string {
  const desde = new Date(`${a.fechaIngreso.slice(0, 10)}T12:00:00Z`)
  const cuando = Number.isNaN(desde.getTime()) ? '' : ` desde ${desde.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`
  const caracter = a.caracter.trim()
  const rasgos = caracter ? ` ${/[.!?]$/.test(caracter) ? caracter : `${caracter}.`}` : ''
  return `${a.nombre} vive en Huellitas${cuando}.${rasgos} Aún estamos escribiendo su historia completa; escríbenos y te contamos lo que sabemos.`
}

function horasHablado(horas: string[]): string {
  if (horas.length <= 1) return horas[0] ?? ''
  return `${horas.slice(0, -1).join(', ')} y ${horas[horas.length - 1]}`
}

/** Los tratamientos que tocan hoy (YYYY-MM-DD): no suspendidos y dentro de inicio–fin; un límite vacío es sin límite (igual que dosisDelDia) */
export function tratamientosActivos(animalId: string, datos: Pick<DatosRag, 'tratamientos'>, hoy: string): Tratamiento[] {
  return datos.tratamientos.filter(
    (t) => t.animalId === animalId && t.activo !== false && (t.inicio === '' || t.inicio <= hoy) && (t.fin === '' || t.fin >= hoy),
  )
}

function necesidadesDe(a: Animal, curadas: string[], activos: Tratamiento[]): string[] {
  const salida: string[] = []
  const vistos = new Set<string>()
  const agregar = (texto: string) => {
    const limpio = quitarDatosSensibles(texto.trim())
    const clave = normalizar(limpio)
    if (limpio && !vistos.has(clave)) (vistos.add(clave), salida.push(limpio))
  }
  curadas.forEach(agregar)
  a.advertencias.forEach(agregar)
  const textoCurado = normalizar(curadas.join(' '))
  for (const t of activos) {
    // Si el perfil curado ya nombra el medicamento, no se repite
    if (textoCurado.includes(normalizar(t.medicamento))) continue
    agregar(`${t.medicamento} ${t.dosis} a las ${horasHablado(t.horas)}`)
  }
  return salida
}

/**
 * Qué tan urgente es ayudarlo, de 0 a 1. Suma señales y se recorta a 1:
 * salud (tratamiento activo o en tratamiento) 0.25, advertencias hasta 0.15, sin padrino 0.2,
 * edad (≥ 8 años 0.25, ≥ 6 años 0.1), cuarentena 0.15. Base 0.05.
 */
function urgenciaDe(a: Animal, edad: number, activos: number, advertencias: number, padrinos: number): number {
  let u = 0.05
  if (activos > 0 || a.estado === 'tratamiento') u += 0.25
  u += Math.min(0.15, advertencias * 0.05)
  if (padrinos === 0) u += 0.2
  if (edad >= 8) u += 0.25
  else if (edad >= 6) u += 0.1
  if (a.estado === 'cuarentena') u += 0.15
  return Math.round(Math.min(1, u) * 100) / 100
}

export function construirPerfil(
  animal: Animal,
  datos: DatosRag,
  perfilesCurados: Record<string, PerfilCurado>,
  ahora: Date,
): PerfilRico {
  const curado = perfilesCurados[normalizar(animal.nombre)] as PerfilCurado | undefined
  const hoy = ahoraBogota(ahora).fecha
  const activos = tratamientosActivos(animal.id, datos, hoy)

  const edadAnios = curado?.edadAnios ?? edadPorDefecto(animal.caracter)
  const mensualCOP = curado?.mensualCOP ?? MENSUAL_COP_POR_DEFECTO
  // Tiene padrino si la ficha lo dice o si hay padrinazgos activos; el conteo es el mayor de los dos
  const padrinos = Math.max(datos.padrinosPorAnimal[animal.id] ?? 0, animal.padrino ? 1 : 0)
  const necesidadesMedicas = necesidadesDe(animal, curado?.necesidadesMedicas ?? [], activos)

  return {
    id: animal.id,
    nombre: animal.nombre,
    especie: animal.especie,
    estado: animal.estado,
    edadAnios,
    edadTexto: edadTexto(edadAnios, !curado),
    tamano: curado?.tamano ?? tamanoPorDefecto(animal),
    personalidad: curado?.personalidad ?? personalidadDe(animal.caracter),
    historia: curado?.historia ?? historiaPorDefecto(animal),
    historiaConfirmada: Boolean(curado),
    compatibilidad: curado?.compatibilidad ?? compatibilidadPorDefecto(animal.caracter),
    necesidadesMedicas,
    // Marcador: la base no guarda cuánto aporta cada padrino, así que con padrino se asume la mitad
    // de la meta cubierta y sin padrino nada. Se reemplaza cuando exista el monto real.
    meta: { mensualCOP, padrinos, cubiertoPct: padrinos > 0 ? 50 : 0 },
    foto: animal.foto && /^https?:\/\//i.test(animal.foto) ? animal.foto : null,
    urgencia: urgenciaDe(animal, edadAnios, activos.length, animal.advertencias.length, padrinos),
    adoptable: animal.estado === 'adoptable' || animal.estado === 'hogar_temporal',
  }
}
