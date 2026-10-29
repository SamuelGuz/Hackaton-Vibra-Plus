// Perfil rico de un animal: lo que guarda la base (nombre, estado, carácter, advertencias, padrino)
// más lo que la dueña enriquece a mano (historia, edad, tamaño, compatibilidad). Sin perfil curado
// se arma uno determinista y honesto: nunca se inventan detalles de rescate.
import { quitarDatosSensibles } from '../ia/redactar.js'
import { fotoPublicaSegura } from '../catalogo/datos.js'
import { fechaLocal } from '../formato.js'
import type { Animal, DatosAlbergue, Tratamiento } from '../panel-tipos.js'
import type { Compatibilidad, PerfilCurado, PerfilExtra, PerfilRico, Tamano } from './tipos.js'

export const MENSUAL_COP_POR_DEFECTO = 40_000
/** Aporte mínimo mensual de un padrino (desde $20.000 COP). Se asume cuando los datos no dicen cuánto aporta */
export const APORTE_MINIMO_PADRINO_COP = 20_000

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

/**
 * Cuánto aporta este mes quien apadrina al animal, en pesos.
 * 1) Si la contabilidad tiene ingresos de categoría "padrino" de este mes cuya nota nombra al animal
 *    ("Padrino de Luna"), se suman: es el monto real.
 * 2) Si no hay ninguno pero el animal tiene padrino, se asume el aporte mínimo ($20.000) por padrino.
 * 3) Sin padrino ni ingresos: 0.
 */
export function aporteMensualCOP(animal: Animal, datos: DatosAlbergue, ahora: Date): number {
  const mes = fechaLocal(ahora).slice(0, 7)
  const clave = normalizar(animal.nombre)
  const aliases = ((animal as Animal & { alias?: string[] }).alias ?? []).map(normalizar)
  const nombra = (nota: string) => {
    const palabras = normalizar(nota).split(/[^a-z0-9]+/)
    return palabras.includes(clave) || aliases.some((a) => palabras.includes(a))
  }
  const real = datos.movimientos
    .filter((m) => m.tipo === 'ingreso' && m.categoria === 'padrino' && m.fechaHora.startsWith(mes) && nombra(m.nota))
    .reduce((suma, m) => suma + m.monto, 0)
  if (real > 0) return real
  return animal.padrino ? APORTE_MINIMO_PADRINO_COP : 0
}

/** Porcentaje (0 a 100, entero) de la meta mensual que ya cubren los aportes; la meta 0 o sin aportes da 0 */
export function porcentajeCubierto(aporteCOP: number, metaCOP: number): number {
  if (metaCOP <= 0 || aporteCOP <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((aporteCOP / metaCOP) * 100)))
}

function horasHablado(horas: string[]): string {
  if (horas.length <= 1) return horas[0] ?? ''
  return `${horas.slice(0, -1).join(', ')} y ${horas[horas.length - 1]}`
}

export function tratamientosActivos(animalId: string, datos: DatosAlbergue, hoy: string): Tratamiento[] {
  return datos.tratamientos.filter((t) => t.animalId === animalId && t.inicio <= hoy && t.fin >= hoy)
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
function urgenciaDe(a: Animal, edad: number, activos: number, advertencias: number): number {
  let u = 0.05
  if (activos > 0 || a.estado === 'tratamiento') u += 0.25
  u += Math.min(0.15, advertencias * 0.05)
  if (!a.padrino) u += 0.2
  if (edad >= 8) u += 0.25
  else if (edad >= 6) u += 0.1
  if (a.estado === 'cuarentena') u += 0.15
  return Math.round(Math.min(1, u) * 100) / 100
}

/** Campos opcionales del perfil curado que se propagan tal cual; los que no existen no aparecen (nada de undefined) */
function extrasDe(curado: PerfilCurado | undefined): PerfilExtra {
  if (!curado) return {}
  const extra: PerfilExtra = {}
  if (curado.vacunado !== undefined) extra.vacunado = curado.vacunado
  if (curado.esterilizado !== undefined) extra.esterilizado = curado.esterilizado
  if (curado.desparasitado !== undefined) extra.desparasitado = curado.desparasitado
  if (curado.microchip !== undefined) extra.microchip = curado.microchip
  if (curado.pesoKg !== undefined) extra.pesoKg = curado.pesoKg
  if (curado.comidaFavorita) extra.comidaFavorita = curado.comidaFavorita
  if (curado.rutinaDia) extra.rutinaDia = curado.rutinaDia
  if (curado.cuidadosEspeciales?.length) extra.cuidadosEspeciales = curado.cuidadosEspeciales
  if (curado.curiosidades?.length) extra.curiosidades = curado.curiosidades
  if (curado.fechaRescate) extra.fechaRescate = curado.fechaRescate
  if (curado.lugarRescate) extra.lugarRescate = curado.lugarRescate
  return extra
}

export function construirPerfil(
  animal: Animal,
  datos: DatosAlbergue,
  perfilesCurados: Record<string, PerfilCurado>,
  ahora: Date,
): PerfilRico {
  const curado = perfilesCurados[normalizar(animal.nombre)] as PerfilCurado | undefined
  const hoy = fechaLocal(ahora)
  const activos = tratamientosActivos(animal.id, datos, hoy)

  const edadAnios = curado?.edadAnios ?? edadPorDefecto(animal.caracter)
  const mensualCOP = curado?.mensualCOP ?? MENSUAL_COP_POR_DEFECTO
  const aporte = aporteMensualCOP(animal, datos, ahora)
  const padrinos = animal.padrino || aporte > 0 ? 1 : 0
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
    historiaConfirmada: curado?.historiaConfirmada === true,
    compatibilidad: curado?.compatibilidad ?? compatibilidadPorDefecto(animal.caracter),
    necesidadesMedicas,
    // cubiertoPct = aporte mensual de los padrinos / meta mensual (ver aporteMensualCOP), entre 0 y 100
    meta: { mensualCOP, padrinos, cubiertoPct: porcentajeCubierto(aporte, mensualCOP) },
    foto: fotoPublicaSegura(animal.foto),
    urgencia: urgenciaDe(animal, edadAnios, activos.length, animal.advertencias.length),
    adoptable: animal.estado === 'adoptable' || animal.estado === 'hogar_temporal',
    ...extrasDe(curado),
  }
}
