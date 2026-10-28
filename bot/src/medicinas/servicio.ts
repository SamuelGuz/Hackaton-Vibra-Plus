// Consultas sobre el inventario de medicinas: búsqueda tolerante, stock, vencimientos y días de stock.
// Trabaja sobre cualquier AlmacenMedicinas (memoria, Excel, mañana Google Sheets) y no guarda estado propio.

import type { Tratamiento } from '../panel-tipos.js'
import { diasEntre, hoyBogota } from './fechas.js'
import { distancia, normalizar, palabras, singular } from './texto.js'
import type {
  AlmacenMedicinas,
  CategoriaMedicamento,
  Contacto,
  DatosMedicinas,
  LoteMedicamento,
  LoteQueVence,
  Medicamento,
  ResumenMedicamento,
  ServicioMedicinas,
} from './tipos.js'

export interface OpcionesServicio {
  /** Reloj para `buscar` y `porId` (las demás consultas reciben `ahora`). Por defecto, el real. */
  ahora?: () => Date
}

// ---------------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------------

/** Palabras que no aportan a la búsqueda ("algo para el dolor" → "dolor") */
const PARADAS = new Set(
  ('algo para el la los las de del un una unos unas que con mi tu su por en y o a al hay tiene tienen tengo necesito quiero ' +
    'cuanto cuanta cuantos cuantas queda quedan stock medicina medicinas medicamento medicamentos remedio remedios algun alguna ' +
    'sirve sirven contra es son se lo le como cual cuales me nos dar dame dime busca buscar tenemos esta estan favor e')
    .split(' '),
)

/** Lo que alguien diría en vez del nombre → categorías donde buscar. Las palabras van sin tildes y en singular o plural. */
const TERMINOS: Record<string, CategoriaMedicamento[]> = {
  antibiotico: ['antibiotico'],
  infeccion: ['antibiotico'],
  bacteria: ['antibiotico'],
  bacteriano: ['antibiotico'],
  pus: ['antibiotico'],
  antiparasitario: ['antiparasitario'],
  desparasitante: ['antiparasitario'],
  desparasitar: ['antiparasitario'],
  parasito: ['antiparasitario'],
  parasitos: ['antiparasitario'],
  pulga: ['antiparasitario'],
  pulgas: ['antiparasitario'],
  garrapata: ['antiparasitario'],
  garrapatas: ['antiparasitario'],
  gusano: ['antiparasitario'],
  gusanos: ['antiparasitario'],
  lombriz: ['antiparasitario'],
  lombrices: ['antiparasitario'],
  sarna: ['antiparasitario', 'dermatologico'],
  analgesico: ['analgesico'],
  dolor: ['analgesico', 'antiinflamatorio'],
  dolores: ['analgesico', 'antiinflamatorio'],
  duele: ['analgesico', 'antiinflamatorio'],
  adolorido: ['analgesico', 'antiinflamatorio'],
  fiebre: ['analgesico', 'antiinflamatorio'],
  antiinflamatorio: ['antiinflamatorio'],
  inflamacion: ['antiinflamatorio', 'analgesico'],
  inflamado: ['antiinflamatorio', 'analgesico'],
  hinchazon: ['antiinflamatorio'],
  hinchado: ['antiinflamatorio'],
  artritis: ['antiinflamatorio', 'analgesico'],
  cojera: ['antiinflamatorio', 'analgesico'],
  anticonvulsivante: ['anticonvulsivante'],
  anticonvulsivo: ['anticonvulsivante'],
  convulsion: ['anticonvulsivante'],
  convulsiones: ['anticonvulsivante'],
  epilepsia: ['anticonvulsivante'],
  ataque: ['anticonvulsivante'],
  ataques: ['anticonvulsivante'],
  vitamina: ['vitamina'],
  vitaminas: ['vitamina'],
  defensas: ['vitamina'],
  anemia: ['vitamina'],
  apetito: ['vitamina'],
  debilidad: ['vitamina'],
  suplemento: ['vitamina'],
  dermatologico: ['dermatologico'],
  piel: ['dermatologico'],
  hongo: ['dermatologico'],
  hongos: ['dermatologico'],
  dermatitis: ['dermatologico'],
  picazon: ['dermatologico'],
  comezon: ['dermatologico'],
  herida: ['dermatologico'],
  heridas: ['dermatologico'],
  cicatriz: ['dermatologico'],
  cicatrizante: ['dermatologico'],
  alergia: ['dermatologico', 'antiinflamatorio'],
  oftalmico: ['oftalmico'],
  ojo: ['oftalmico'],
  ojos: ['oftalmico'],
  conjuntivitis: ['oftalmico'],
  ocular: ['oftalmico'],
  vacuna: ['vacuna'],
  vacunas: ['vacuna'],
  vacunar: ['vacuna'],
  inmunizar: ['vacuna'],
  rabia: ['vacuna'],
  parvovirus: ['vacuna'],
  moquillo: ['vacuna'],
  suero: ['suero'],
  hidratar: ['suero'],
  hidratacion: ['suero'],
  deshidratacion: ['suero'],
  deshidratado: ['suero'],
}

function categoriasDe(token: string): CategoriaMedicamento[] {
  const directo = TERMINOS[token] ?? TERMINOS[singular(token)]
  if (directo) return directo
  // un error de tipeo en la palabra clave ("antibiotco")
  if (token.length >= 6) {
    for (const clave of Object.keys(TERMINOS)) {
      if (clave.length >= 6 && distancia(token, clave, 1) <= 1) return TERMINOS[clave]
    }
  }
  return []
}

interface PalabraConPeso {
  palabra: string
  peso: number
}

const PESO_NOMBRE = 10
const PESO_ALIAS = 9
const PESO_PRINCIPIO = 8
const PESO_CATEGORIA = 5
const PESO_USO = 3

function palabrasFuertes(m: Medicamento): PalabraConPeso[] {
  const mejor = new Map<string, number>()
  const agregar = (texto: string, peso: number) => {
    for (const p of palabras(texto)) {
      if (PARADAS.has(p)) continue
      const s = singular(p)
      if ((mejor.get(s) ?? 0) < peso) mejor.set(s, peso)
    }
  }
  agregar(m.nombre, PESO_NOMBRE)
  for (const a of m.alias) agregar(a, PESO_ALIAS)
  agregar(m.principioActivo, PESO_PRINCIPIO)
  return [...mejor].map(([palabra, peso]) => ({ palabra, peso }))
}

function puntajeToken(token: string, fuertes: PalabraConPeso[], uso: Set<string>, categorias: CategoriaMedicamento[], m: Medicamento): number {
  const t = singular(token)
  let mejor = 0
  for (const { palabra, peso } of fuertes) {
    let p = 0
    if (palabra === t) p = peso
    else if (t.length >= 3 && (palabra.startsWith(t) || (palabra.length >= 4 && t.startsWith(palabra)))) p = peso * 0.8
    else if (t.length >= 5 && distancia(t, palabra, t.length >= 9 ? 2 : 1) <= (t.length >= 9 ? 2 : 1)) p = peso * 0.6
    if (p > mejor) mejor = p
  }
  if (categorias.includes(m.categoria)) mejor = Math.max(mejor, PESO_CATEGORIA)
  if (uso.has(t)) mejor = Math.max(mejor, PESO_USO)
  return mejor
}

function puntaje(consulta: string, tokens: string[], m: Medicamento): number {
  const fuertes = palabrasFuertes(m)
  const uso = new Set(palabras(m.usoComun).map(singular))
  let total = 0
  for (const token of tokens) total += puntajeToken(token, fuertes, uso, categoriasDe(token), m)
  if (total === 0) return 0
  // La frase completa igual al nombre o a un alias gana; a igualdad, el nombre más corto (más específico)
  if ([m.nombre, ...m.alias].some((n) => normalizar(n) === consulta)) total += 3
  return total - 0.01 * palabras(m.nombre).length
}

// ---------------------------------------------------------------------------
// Dosis y días de stock
// ---------------------------------------------------------------------------

type UnidadDosis = 'ml' | 'gota' | 'tableta' | 'bano' | 'sobre' | 'ampolla' | 'dosis' | 'frasco' | 'tubo' | 'masa'

interface DosisLeida {
  cantidad: number
  unidad: UnidadDosis | null
}

const NUMEROS_EN_LETRAS: Record<string, number> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, media: 0.5, medio: 0.5 }

const UNIDADES: [RegExp, UnidadDosis][] = [
  [/^(ml|mililitros?|cc)\b/, 'ml'],
  [/^gotas?\b/, 'gota'],
  [/^(pastillas?|tabletas?|comprimidos?|capsulas?|tabs?)\b/, 'tableta'],
  [/^banos?\b/, 'bano'],
  [/^sobres?\b/, 'sobre'],
  [/^ampollas?\b/, 'ampolla'],
  [/^dosis\b/, 'dosis'],
  [/^frascos?\b/, 'frasco'],
  [/^tubos?\b/, 'tubo'],
  [/^(mg|g|gr|gramos?)\b/, 'masa'],
]

/** "3 ml", "0,5 pastilla", "media pastilla", "1/2 pastilla", "2 gotas" → cantidad + unidad. null si no empieza con una cantidad. */
export function parsearDosis(texto: string): DosisLeida | null {
  const t = texto.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().trim()
  let cantidad: number
  let resto: string
  let m: RegExpMatchArray | null
  if ((m = t.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/))) {
    cantidad = Number(m[1]) / Number(m[2])
    resto = m[3]
  } else if ((m = t.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/))) {
    cantidad = Number(m[1].replace(',', '.'))
    resto = m[2]
    const fraccion = resto.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/) // "1 1/2 pastilla"
    if (fraccion) {
      cantidad += Number(fraccion[1]) / Number(fraccion[2])
      resto = fraccion[3]
    }
  } else if ((m = t.match(/^(un|uno|una|dos|tres|cuatro|cinco|seis|media|medio)\b\s*(.*)$/))) {
    cantidad = NUMEROS_EN_LETRAS[m[1]]
    resto = m[2]
  } else {
    return null
  }
  if (!Number.isFinite(cantidad) || cantidad <= 0) return null
  const unidad = UNIDADES.find(([re]) => re.test(resto))?.[1] ?? null
  return { cantidad, unidad }
}

/** Equivalencias aproximadas, documentadas en docs/operacion/medicinas-excel.md */
const GOTAS_POR_ML = 20
const ML_POR_BANO = 30

function mlDe(d: DosisLeida): number | null {
  if (d.unidad === 'ml') return d.cantidad
  if (d.unidad === 'gota') return d.cantidad / GOTAS_POR_ML
  if (d.unidad === 'bano') return d.cantidad * ML_POR_BANO
  return null
}

/** Mililitros que trae un envase, leídos de la presentación: "Frasco gotero 10 ml" → 10 */
function contenidoEnMl(m: Medicamento): number | null {
  const t = m.presentacion.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()
  const r = t.match(/(?:frasco|ampolla|tubo|bolsa|botella|sobre)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*ml/)
  return r ? Number(r[1].replace(',', '.')) : null
}

/**
 * Cuántas unidades del medicamento (en su `unidad`) gasta una toma.
 * - Misma unidad que el inventario: la cantidad tal cual ("2 pastillas" de un medicamento en tabletas = 2).
 * - ml, gotas (20 por ml) o baños (30 ml) contra un envase (frasco, ampolla, tubo, sobre): se pasa a ml y se divide por
 *   los ml del envase, leídos de la presentación ("Frasco 60 ml"). Contra un medicamento en ml: ml tal cual.
 * - Dosis sin unidad ("2"): se toma como cantidad en la unidad del inventario.
 * - Dosis que no se entiende o no se puede convertir: 1 unidad por toma.
 */
export function unidadesPorToma(m: Medicamento, dosis: string): number {
  const d = parsearDosis(dosis)
  if (!d) return 1
  if (d.unidad === null) return d.cantidad
  const u = m.unidad
  if (u === 'tableta') return d.unidad === 'tableta' ? d.cantidad : 1
  const ml = mlDe(d)
  if (u === 'ml') return ml ?? 1
  if (d.unidad === u) return d.cantidad
  const contenido = contenidoEnMl(m)
  if (ml !== null && contenido) return ml / contenido
  return 1
}

const contieneFrase = (texto: string, frase: string) => ` ${texto} `.includes(` ${frase} `)

/** Qué tanto se parece el nombre de un tratamiento a un medicamento (0 = no se parecen) */
function puntajeEnlace(tratamiento: string, m: Medicamento): number {
  const t = normalizar(tratamiento)
  let mejor = 0
  for (const nombre of [m.nombre, ...m.alias]) {
    const n = normalizar(nombre)
    if (n === '') continue
    let p = 0
    if (t === n) p = 1000
    else if (contieneFrase(t, n)) p = 500 + n.length // "fenobarbital anticonvulsivo" contiene "fenobarbital"
    else if (t.length >= 5 && contieneFrase(n, t)) p = 100 + t.length // "amoxicilina" dentro de "amoxicilina acido clavulanico"
    if (p > mejor) mejor = p
  }
  return mejor
}

function medicamentoDelTratamiento(nombre: string, medicamentos: Medicamento[]): Medicamento | null {
  let mejor: Medicamento | null = null
  let mejorPuntaje = 0
  for (const m of medicamentos) {
    const p = puntajeEnlace(nombre, m)
    if (p > mejorPuntaje) {
      mejor = m
      mejorPuntaje = p
    }
  }
  return mejor
}

// ---------------------------------------------------------------------------
// Servicio
// ---------------------------------------------------------------------------

const LIMITE_POR_DEFECTO = 10

export function crearServicioMedicinas(almacen: AlmacenMedicinas, opciones: OpcionesServicio = {}): ServicioMedicinas {
  const reloj = opciones.ahora ?? (() => new Date())

  /** Un lote vale hasta el final del día en que vence (en Bogotá) */
  const vigente = (l: LoteMedicamento, hoy: string) => l.vence >= hoy

  function resumir(m: Medicamento, datos: DatosMedicinas, hoy: string): ResumenMedicamento {
    const lotes = datos.lotes.filter((l) => l.medicamentoId === m.id).sort((a, b) => a.vence.localeCompare(b.vence) || a.id.localeCompare(b.id))
    const vigentes = lotes.filter((l) => vigente(l, hoy))
    const stock = vigentes.reduce((suma, l) => suma + l.cantidad, 0)
    return {
      medicamento: m,
      stock,
      lotes,
      bajoMinimo: stock < m.stockMinimo,
      venceProximo: vigentes.find((l) => l.cantidad > 0)?.vence ?? null,
      proveedor: m.proveedorId ? (datos.contactos.find((c) => c.id === m.proveedorId) ?? null) : null,
    }
  }

  function lotesQueVencen(datos: DatosMedicinas, hoy: string, incluir: (dias: number) => boolean): LoteQueVence[] {
    const salida: LoteQueVence[] = []
    for (const lote of datos.lotes) {
      if (lote.cantidad <= 0) continue
      const dias = diasEntre(hoy, lote.vence)
      if (!incluir(dias)) continue
      const m = datos.medicamentos.find((x) => x.id === lote.medicamentoId)
      if (!m) continue
      salida.push({ ...resumir(m, datos, hoy), lote, diasRestantes: dias })
    }
    return salida.sort((a, b) => a.lote.vence.localeCompare(b.lote.vence) || a.lote.id.localeCompare(b.lote.id))
  }

  return {
    datos: () => almacen.leer(),

    async buscar(texto, limite = LIMITE_POR_DEFECTO) {
      const consulta = normalizar(texto)
      const tokens = consulta.split(' ').filter((p) => p !== '' && !PARADAS.has(p))
      if (tokens.length === 0) return []
      const datos = await almacen.leer()
      const hoy = hoyBogota(reloj())
      return datos.medicamentos
        .map((m) => ({ m, p: puntaje(consulta, tokens, m) }))
        .filter((x) => x.p > 0)
        .sort((a, b) => b.p - a.p || a.m.nombre.localeCompare(b.m.nombre, 'es'))
        .slice(0, Math.max(0, limite))
        .map((x) => resumir(x.m, datos, hoy))
    },

    async porId(id) {
      const datos = await almacen.leer()
      const m = datos.medicamentos.find((x) => x.id === id)
      return m ? resumir(m, datos, hoyBogota(reloj())) : null
    },

    async stockBajo() {
      const datos = await almacen.leer()
      const hoy = hoyBogota(reloj())
      return datos.medicamentos.map((m) => resumir(m, datos, hoy)).filter((r) => r.bajoMinimo)
    },

    async porVencer(dias, ahora) {
      const datos = await almacen.leer()
      return lotesQueVencen(datos, hoyBogota(ahora), (d) => d >= 0 && d <= dias)
    },

    async vencidos(ahora) {
      const datos = await almacen.leer()
      return lotesQueVencen(datos, hoyBogota(ahora), (d) => d < 0)
    },

    async contactos(tipo) {
      const datos = await almacen.leer()
      return tipo ? datos.contactos.filter((c: Contacto) => c.tipo === tipo) : datos.contactos
    },

    async diasDeStock(medicamentoId, tratamientos, ahora) {
      const datos = await almacen.leer()
      const m = datos.medicamentos.find((x) => x.id === medicamentoId)
      if (!m) return null
      const hoy = hoyBogota(ahora)
      let consumoDiario = 0
      let hayUso = false
      for (const t of tratamientos) {
        const activo = (t as Tratamiento & { activo?: boolean }).activo !== false
        if (!activo || t.inicio > hoy || t.fin < hoy) continue
        if (medicamentoDelTratamiento(t.medicamento, datos.medicamentos)?.id !== m.id) continue
        hayUso = true
        consumoDiario += Math.max(1, t.horas.length) * unidadesPorToma(m, t.dosis)
      }
      if (!hayUso || consumoDiario <= 0) return null
      const stock = resumir(m, datos, hoy).stock
      return Math.floor(stock / consumoDiario + 1e-9)
    },
  }
}
