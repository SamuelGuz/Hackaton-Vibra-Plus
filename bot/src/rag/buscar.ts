// Búsqueda híbrida: palabras (con sinónimos, errores de dedo, negaciones y superlativos) + significado
// (embeddings de Gemini). Todo lo determinista vive aquí; el servicio solo le pasa los vectores si Gemini respondió.
import { createHash } from 'node:crypto'
import { distancia, fonetica, normalizarTexto, parecidas, toleranciaPara } from './normalizar.js'
import { normalizar } from './perfil.js'
import type { Llm, PerfilRico, PerritoPublico, ResultadoBusqueda, Tamano } from './tipos.js'

// ---------------------------------------------------------------------------------------------
// Texto: normalización, raíces y sinónimos
// ---------------------------------------------------------------------------------------------

const SUFIJOS = ['itos', 'itas', 'ito', 'ita', 'es', 'os', 'as', 'e', 's', 'o', 'a']

/** Raíz ligera: quita diminutivos, plurales y la vocal final ("perritos", "perro" y "perra" → "perr") */
export function raiz(palabra: string): string {
  const p = normalizar(palabra)
  if (p.length <= 3) return p
  for (const suf of SUFIJOS) if (p.endsWith(suf) && p.length - suf.length >= 3) return p.slice(0, -suf.length)
  return p
}

export function palabras(texto: string): string[] {
  return normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean)
}

const SIN_VALOR = new Set(
  `a al algo algun alguna alguno ante aqui busco buscando como con cual cuales cuando de del desde donde el ella ellos en eres es esa ese eso esta este estoy favor ha hacer hay hola buenas buenos
  la las le lo los llevar me mejor mi mis mucho muy necesito no o otro otros para pero por porque puede pueda que quien quiero quisiera se ser sea si sin sobre su sus te tenga tengo tiene tu tus
  un una unas uno unos y ya mas menos adoptar adopcion conseguir encontrar gustaria dame hablame cuentame quiero busca gustan gusta importa tipo alguien sean tengan vivir casa hogar tambien
  animal animales recomienda recomiendas recomiendan recomiendame sugiere sugieres sugerencia ideal necesitamos queremos quisieramos tienen tienes tenemos hay disponible disponibles favor`.split(/\s+/),
)

const PALABRAS_PERRO = new Set(['perro', 'perros', 'perra', 'perras', 'perrito', 'perritos', 'perrita', 'perritas', 'canino', 'caninos', 'lomito', 'lomitos', 'chandoso', 'chucho', 'chuchos', 'cachorro', 'cachorros'])
const PALABRAS_GATO = new Set(['gato', 'gatos', 'gata', 'gatas', 'gatito', 'gatitos', 'gatita', 'gatitas', 'felino', 'felinos', 'minino', 'mininos', 'gatico', 'gaticos', 'michi', 'michis'])
// "cachorro" a secas no dice si es perro o gato
PALABRAS_PERRO.delete('cachorro')
PALABRAS_PERRO.delete('cachorros')

interface Grupo {
  terminos: string[]
  /** grupos cuyo significado se parece lo suficiente para contar a medias (p. ej. tranquilo ≈ viejito) */
  relacionados?: string[]
}

const GRUPOS: Record<string, Grupo> = {
  calma: { terminos: ['tranquilo', 'calmado', 'paciente', 'sereno', 'pacifico', 'apacible', 'relajado', 'docil', 'quieto', 'suave', 'sosegado', 'manso'], relacionados: ['vejez'] },
  vejez: { terminos: ['viejito', 'viejo', 'senior', 'mayor', 'anciano', 'abuelito', 'veterano'], relacionados: ['calma'] },
  ninos: { terminos: ['nino', 'nina', 'ninos', 'familia', 'hijos', 'hijo', 'bebes', 'menores'] },
  apartamento: { terminos: ['apartamento', 'apto', 'departamento', 'espacio', 'estudio'] },
  guardian: { terminos: ['guardian', 'vigilante', 'protector', 'alerta', 'ladrador', 'guardia', 'cuidador'] },
  jugueton: { terminos: ['jugueton', 'activo', 'energico', 'energia', 'travieso', 'deportista', 'aventurero', 'movido', 'corredor'] },
  cachorro: { terminos: ['cachorro', 'bebe', 'joven', 'jovencito'] },
  carinoso: { terminos: ['carinoso', 'amoroso', 'afectuoso', 'mimoso', 'dulce', 'apegado', 'sociable'] },
  timido: { terminos: ['timido', 'asustadizo', 'miedoso', 'reservado', 'sensible'] },
}

/** raíz → ids de grupo */
const GRUPOS_POR_RAIZ = new Map<string, string[]>()
for (const [id, g] of Object.entries(GRUPOS)) {
  for (const t of g.terminos) {
    const r = raiz(t)
    GRUPOS_POR_RAIZ.set(r, [...(GRUPOS_POR_RAIZ.get(r) ?? []), id])
  }
}

function raicesDeGrupos(ids: string[]): Set<string> {
  return new Set(ids.flatMap((id) => GRUPOS[id].terminos.map(raiz)))
}

function sinonimosDe(r: string): { iguales: Set<string>; parecidos: Set<string> } {
  const ids = GRUPOS_POR_RAIZ.get(r) ?? []
  const iguales = raicesDeGrupos(ids)
  const parecidos = raicesDeGrupos(ids.flatMap((id) => GRUPOS[id].relacionados ?? []))
  return { iguales, parecidos }
}

// ---------------------------------------------------------------------------------------------
// Errores de dedo: se corrigen contra el vocabulario que la búsqueda entiende
// ---------------------------------------------------------------------------------------------

const VOCABULARIO_EXTRA = [
  'perro', 'gato', 'apartamento', 'pequeno', 'grande', 'mediano', 'cachorro', 'viejo', 'ninos', 'familia', 'ayuda', 'ayudar', 'padrino', 'apadrinar', 'urgente', 'necesita',
  'tranquilo', 'jugueton', 'carinoso', 'ladrar', 'ladrador', 'energia', 'enfermo', 'saludable', 'sano', 'timido', 'inquieto', 'hiperactivo', 'escandaloso', 'ruidoso',
  'joven', 'pesado', 'liviano', 'delgado', 'gordo', 'compatible', 'convive', 'adoptar', 'recomienda', 'mayores', 'abuela', 'abuelo', 'mama', 'papa', 'casa', 'espacio',
]
const VOCABULARIO = new Set<string>([...VOCABULARIO_EXTRA, ...Object.values(GRUPOS).flatMap((g) => g.terminos), ...PALABRAS_PERRO, ...PALABRAS_GATO].map((x) => normalizar(x)))
const VOCABULARIO_LISTA = [...VOCABULARIO].filter((v) => v.length >= 4)
const RAICES_VOCABULARIO = new Set([...VOCABULARIO].map(raiz))

/** Si la palabra no se entiende pero se parece mucho a una que sí, se usa esa ("tranqilo" → "tranquilo") */
function corregirPalabra(p: string, protegidas: Set<string>): string {
  if (p.length < 5 || /\d/.test(p) || protegidas.has(p) || SIN_VALOR.has(p) || VOCABULARIO.has(p) || RAICES_VOCABULARIO.has(raiz(p))) return p
  let mejor: string | null = null
  let mejorD = 99
  const fp = fonetica(p)
  for (const v of VOCABULARIO_LISTA) {
    if (Math.abs(v.length - p.length) > 2) continue
    if (v[0] !== p[0] && fonetica(v)[0] !== fp[0]) continue
    const tol = toleranciaPara(Math.min(v.length, p.length))
    const d = distancia(p, v, tol)
    if (d <= tol && d < mejorD) (mejor = v, (mejorD = d))
  }
  return mejor ?? p
}

// ---------------------------------------------------------------------------------------------
// Intención de la consulta
// ---------------------------------------------------------------------------------------------

export type CampoSuperlativo = 'edad' | 'tamano' | 'peso' | 'urgencia' | 'calma' | 'energia' | 'carino'

export interface Superlativo {
  campo: CampoSuperlativo
  sentido: 'max' | 'min'
}

/** Lo que la persona dijo explícitamente que NO quiere ("que no ladre", "no me gustan los grandes") */
export interface Evitar {
  grande: boolean
  pequeno: boolean
  ladrador: boolean
  energico: boolean
  viejo: boolean
  cachorro: boolean
  /** que no necesite medicinas ni cuidados médicos */
  medico: boolean
  timido: boolean
}

export interface Intenciones {
  especie: 'perro' | 'gato' | null
  /** quiere uno de edad avanzada */
  vejez: boolean
  cachorro: boolean
  apartamento: boolean
  ninos: boolean
  /** que se lleve bien con gatos */
  gatos: boolean
  /** que se lleve bien con otros perros */
  perros: boolean
  /** quiere ayudar / apadrinar / lo más urgente */
  ayuda: boolean
  calma: boolean
  energia: boolean
  /** la compañía es una persona mayor (mamá, abuela…): pide calma */
  paraMayor: boolean
  /** tamaño que pide, si lo pide en positivo */
  tamano: Tamano | null
  evitar: Evitar
  /** quiere uno sano, sin necesidades médicas */
  sano: boolean
  /** "el más viejito", "el más pequeño", "el que más necesita ayuda" */
  superlativo: Superlativo | null
  /** raíces que se buscan en el texto de los perfiles */
  terminos: string[]
  /** palabras sueltas que podrían ser un nombre propio */
  nombres: string[]
}

const PARA_MAYOR = /\b(para|con|de)\s+(mi|mis|una?|el|la|un)?\s*(mama|mami|papa|papi|abuel\w+|persona\w* mayor\w*|adult\w* mayor\w*|ancian\w+|tia|tio|suegr\w+|senor\w*|vecin\w+)\b/
const CON_ANIMALES = /\bcon\s+(otros\s+|otras\s+|los\s+|las\s+|mis\s+|mi\s+)?(perr\w*|gat\w*|minin\w*)/g
const LLEVE_BIEN_GATOS = /\b(lleve|lleva|convive|convivir|conviva|compatible|tolere|tolera|acepte|acepta)\b[^,.;]{0,25}\b(gat\w*|minin\w*)/
const LLEVE_BIEN_PERROS = /\b(lleve|lleva|convive|convivir|conviva|compatible|tolere|tolera|acepte|acepta)\b[^,.;]{0,25}\b(perr\w*)/
const AYUDA = /\bayud\w*|\bapadrin\w*|\bpadrin\w*|\burgent\w*|\bdonar\b|\bdonacion|\bmas necesit\w*|\bsinpadrino|\bnecesit\w*\s+(ayuda|apoyo)/
const VEJEZ = /\bviej\w*|\bsenior\b|\bancian\w*|\bmayor(es)?\b|\babuelit\w*|\bveteran\w*|\bmaduro\b|\bde edad\b/
const CACHORRO = /\bcachorr\w*|\bbebe\w*|\bjovencit\w*|\bjoven(es)?\b/
const APARTAMENTO = /\bapartament\w*|\bapto\b|\bdepartament\w*|\bespacio (pequeno|reducido|chico)|\bcasa pequena|\bpoco espacio/
const NINOS = /\bnin[oa]s?\b|\bhij[oa]s?\b|\bfamilia\b|\bbebes?\b|\bchiquit[oa]s? en casa|\bmenores\b/
const CALMA = /\btranquil\w*|\bcalm\w*|\bseren\w*|\bpacific\w*|\bapacible|\brelajad\w*|\bdocil\w*|\bquiet\w*|\bsuave\b|\bmanso\b/
const ENERGIA = /\bjuguet\w*|\benergi\w*|\bactiv\w*|\bdeportist\w*|\bcorrer\b|\bcaminat\w*|\btravies\w*|\baventurer\w*|\bmovid\w*/
const SANO = /\bsan[oa]s?\b|\bsaludable\w*|\bsin problemas de salud\b/
const GRANDE = /\b(grandes?|enorme\w*|gigante\w*|corpulent\w*)\b/
const PEQUENO = /\b(pequen[oa]s?|chic[oa]s?|mini|miniatura|de bolsillo)\b/
const MEDIANO = /\bmedian[oa]s?\b/

const NEGADORES = new Set(['no', 'sin', 'ni', 'nunca', 'tampoco', 'evitar', 'evito', 'evite', 'jamas'])
const CORTES_NEGACION = new Set(['y', 'e', 'pero', 'sino', 'aunque'])

/** Separa lo que se pide de lo que se niega: lo negado ("no ladre mucho") ocupa hasta 5 palabras o hasta un "y/pero" */
function partirNegacion(ps: string[]): { positivo: string[]; negado: string[] } {
  const positivo: string[] = []
  const negado: string[] = []
  let restante = 0
  for (const p of ps) {
    if (NEGADORES.has(p)) {
      restante = 5
      continue
    }
    if (restante > 0) {
      if (CORTES_NEGACION.has(p)) {
        restante = 0
        positivo.push(p)
      } else {
        negado.push(p)
        restante--
      }
    } else positivo.push(p)
  }
  return { positivo, negado }
}

function superlativoDe(t: string): Superlativo | null {
  const edadPalabra = /\b(edad|anos|cumple)\b/.test(t)
  if (/\b(el |la |lo |los |las |uno |una )?(que )?(mas|mayor) (necesit\w*|urgent\w*)|\bcon mas (urgencia|necesidad)|\bmas (urgente|ayuda)|\bque mas ayuda|\bmayor (urgencia|necesidad)/.test(t)) return { campo: 'urgencia', sentido: 'max' }
  if (/\bmas (viej\w*|mayor|veterano\w*|anciano\w*|maduro)/.test(t) || /\bde mayor edad\b/.test(t)) return { campo: 'edad', sentido: 'max' }
  if (/\bmas (joven\w*|jovencit\w*|nuevo\w*)|\bde menor edad\b/.test(t)) return { campo: 'edad', sentido: 'min' }
  if (/\bmas (pesad\w*|gord\w*|robust\w*)|\bpesa mas\b|\bpesan mas\b|\bmayor peso\b/.test(t)) return { campo: 'peso', sentido: 'max' }
  if (/\bmas (livian\w*|flac\w*|delgad\w*|ligero\w*)|\bpesa menos\b|\bpesan menos\b|\bmenor peso\b/.test(t)) return { campo: 'peso', sentido: 'min' }
  if (/\bmas (pequen\w*|chic\w*)/.test(t)) return edadPalabra ? { campo: 'edad', sentido: 'min' } : { campo: 'tamano', sentido: 'min' }
  if (/\bmas (grande\w*|alto|altos)/.test(t)) return edadPalabra ? { campo: 'edad', sentido: 'max' } : { campo: 'tamano', sentido: 'max' }
  if (/\bmas (tranquil\w*|calm\w*|seren\w*|dormilon\w*|manso\w*)/.test(t)) return { campo: 'calma', sentido: 'max' }
  if (/\bmas (juguet\w*|activ\w*|energic\w*|travies\w*|inquiet\w*)/.test(t)) return { campo: 'energia', sentido: 'max' }
  if (/\bmas (carinos\w*|amoros\w*|mimos\w*|dulce\w*|apegad\w*)/.test(t)) return { campo: 'carino', sentido: 'max' }
  return null
}

export function detectarIntenciones(consulta: string, protegidos: string[] = []): Intenciones {
  const protegidas = new Set(protegidos.map((x) => normalizar(x)))

  // Cada cláusula se niega por separado: "tranquilo, que no ladre mucho" no mezcla las dos ideas
  const clausulas = consulta.split(/[,.;:!?¿¡\n]+|\bpero\b/i).map((c) => c.trim()).filter(Boolean)
  const positivas: string[] = []
  const negadas: string[] = []
  for (const c of clausulas.length ? clausulas : ['']) {
    let t = normalizarTexto(c)
    t = t.replace(/\b(sin|no tiene|no tienen|no cuenta con|no cuentan con) padrin\w*/g, ' sinpadrino ')
    const ps = t.split(' ').filter(Boolean).map((p) => corregirPalabra(p, protegidas))
    const { positivo, negado } = partirNegacion(ps)
    positivas.push(...positivo)
    negadas.push(...negado)
  }

  let t = positivas.join(' ')
  const textoNegado = negadas.join(' ')

  const paraMayor = PARA_MAYOR.test(t)
  if (paraMayor) t = t.replace(PARA_MAYOR, ' ')

  const gatos = LLEVE_BIEN_GATOS.test(t) || /\bcon\s+(otros\s+|los\s+|mis\s+)?gat\w*/.test(t)
  const perros = LLEVE_BIEN_PERROS.test(t)
  // "con perros" / "con gatos" hablan de compatibilidad, no de la especie que se busca
  t = t.replace(CON_ANIMALES, ' ')

  const apartamento = APARTAMENTO.test(t)
  // "apartamento pequeño" habla del lugar, no del tamaño del animal
  const tSinLugar = t.replace(/\b(apartament\w*|apto|departament\w*|casa|espacio|lugar|cuarto|hogar)\s+(muy\s+)?(pequen\w*|chic\w*|reducid\w*)/g, ' ')

  const ps = t.split(' ').filter(Boolean)
  const quiereGato = ps.some((p) => PALABRAS_GATO.has(p))
  const quierePerro = ps.some((p) => PALABRAS_PERRO.has(p))
  const especie = quiereGato && !quierePerro ? 'gato' : quierePerro && !quiereGato ? 'perro' : null

  const evitar: Evitar = {
    grande: GRANDE.test(textoNegado),
    pequeno: PEQUENO.test(textoNegado),
    ladrador: /\b(ladr\w*|ruid\w*|escandal\w*|bulla|alborot\w*|gritador\w*|ladrador\w*)/.test(textoNegado),
    energico: /\b(energi\w*|activ\w*|juguet\w*|travies\w*|hiperactiv\w*|inquiet\w*|movid\w*)/.test(textoNegado),
    viejo: /\b(viej\w*|mayor\w*|anciano\w*)/.test(textoNegado),
    cachorro: /\b(cachorr\w*|jovencit\w*|joven\w*)/.test(textoNegado),
    medico: /\b(enferm\w*|medicin\w*|tratamiento\w*|cuidados?|problemas? de salud|achaque\w*)/.test(textoNegado),
    timido: /\b(timid\w*|miedos\w*|asustadiz\w*)/.test(textoNegado),
  }

  const quiereGrande = GRANDE.test(tSinLugar)
  const quierePequeno = PEQUENO.test(tSinLugar)
  const tamano: Tamano | null =
    evitar.grande && evitar.pequeno ? 'mediano' : MEDIANO.test(tSinLugar) ? 'mediano' : quierePequeno && !quiereGrande ? 'pequeno' : quiereGrande && !quierePequeno ? 'grande' : null

  const superlativo = superlativoDe(tSinLugar)
  const ayuda = AYUDA.test(t) || superlativo?.campo === 'urgencia'
  const sinAyuda = t.replace(new RegExp(AYUDA.source, 'g'), ' ')
  // Las palabras de tamaño y de "lo que se quiere sano" ya se interpretaron aparte; lo demás se busca en el texto de los perfiles
  const candidatos = palabras(sinAyuda).filter((p) => !SIN_VALOR.has(p) && !PALABRAS_PERRO.has(p) && !PALABRAS_GATO.has(p))

  return {
    especie,
    vejez: VEJEZ.test(t) && !evitar.viejo,
    cachorro: CACHORRO.test(t) && !evitar.cachorro,
    apartamento,
    ninos: NINOS.test(t),
    gatos,
    perros,
    ayuda,
    calma: paraMayor || CALMA.test(t) || evitar.ladrador || evitar.energico,
    energia: ENERGIA.test(t),
    paraMayor,
    tamano,
    evitar,
    sano: SANO.test(t) || evitar.medico,
    superlativo,
    terminos: [...new Set(candidatos.map(raiz))],
    nombres: candidatos.filter((p) => p.length >= 3 && !GRUPOS_POR_RAIZ.has(raiz(p))),
  }
}

// ---------------------------------------------------------------------------------------------
// Documento de cada perfil
// ---------------------------------------------------------------------------------------------

/** Rasgos cortos y normalizados (cuentan completos en la búsqueda léxica) */
function nucleo(p: PerfilRico): string {
  const etiquetas: string[] = [p.nombre, p.especie === 'perro' ? 'perro perrito' : 'gato gatito', p.edadTexto, p.tamano, ...p.personalidad]
  if (p.edadAnios >= 8) etiquetas.push('viejito mayor senior anciano')
  else if (p.edadAnios >= 6) etiquetas.push('adulto mayor')
  if (p.edadAnios < 1.5) etiquetas.push('cachorro joven')
  if (p.compatibilidad.ninos === true) etiquetas.push('niños familia')
  if (p.compatibilidad.apartamento === true) etiquetas.push('apartamento')
  if (p.compatibilidad.gatos === true) etiquetas.push('gatos')
  if (p.compatibilidad.perros === true) etiquetas.push('otros perros')
  return etiquetas.join(' ')
}

/** Texto que se embebe: legible para el modelo, sin datos del día (para que el caché dure) */
export function textoDocumento(p: PerfilRico): string {
  const c = p.compatibilidad
  const compat = [
    c.ninos === true ? 'se lleva bien con niños' : c.ninos === false ? 'no es ideal con niños' : '',
    c.gatos === true ? 'convive con gatos' : c.gatos === false ? 'no convive con gatos' : '',
    c.perros === true ? 'se lleva bien con otros perros' : c.perros === false ? 'prefiere no convivir con otros perros' : '',
    c.apartamento === true ? 'se adapta a un apartamento' : c.apartamento === false ? 'necesita espacio, no es para apartamento' : '',
  ].filter(Boolean)
  return [
    `${p.nombre}, ${p.especie} de ${p.edadTexto}, tamaño ${p.tamano}.`,
    p.personalidad.length ? `Personalidad: ${p.personalidad.join(', ')}.` : '',
    `Historia: ${p.historia}`,
    compat.length ? `Convivencia: ${compat.join('; ')}.` : '',
    p.necesidadesMedicas.length ? `Cuidados: ${p.necesidadesMedicas.join('; ')}.` : '',
    p.cuidadosEspeciales?.length ? `Cuidados especiales: ${p.cuidadosEspeciales.join('; ')}.` : '',
    p.comidaFavorita ? `Le gusta comer: ${p.comidaFavorita}.` : '',
    p.rutinaDia ? `Rutina: ${p.rutinaDia}` : '',
    p.curiosidades?.length ? `Curiosidades: ${p.curiosidades.join('; ')}.` : '',
    nucleo(p),
  ].filter(Boolean).join('\n')
}

export function huella(texto: string): string {
  return createHash('sha1').update(texto).digest('hex')
}

// ---------------------------------------------------------------------------------------------
// Embeddings con caché por huella del texto
// ---------------------------------------------------------------------------------------------

export interface IndiceSemantico {
  /** Vectores de los documentos; solo manda a Gemini los que cambiaron o faltan */
  vectores(docs: { id: string; texto: string }[]): Promise<Map<string, number[]>>
}

const LOTE = 100

export function crearIndiceSemantico(llm: Llm): IndiceSemantico {
  const guardados = new Map<string, { huella: string; vector: number[] }>()
  let cola: Promise<unknown> = Promise.resolve()

  async function calcular(docs: { id: string; texto: string }[]) {
    const pendientes = docs.map((d) => ({ ...d, huella: huella(d.texto) })).filter((d) => guardados.get(d.id)?.huella !== d.huella)
    for (let i = 0; i < pendientes.length; i += LOTE) {
      const lote = pendientes.slice(i, i + LOTE)
      const vectores = await llm.embeber(lote.map((d) => d.texto), 'documento')
      if (vectores.length !== lote.length) throw new Error('Gemini devolvió menos embeddings de los pedidos')
      lote.forEach((d, k) => guardados.set(d.id, { huella: d.huella, vector: vectores[k] }))
    }
    return new Map(docs.flatMap((d) => (guardados.has(d.id) ? [[d.id, guardados.get(d.id)!.vector] as const] : [])))
  }

  return {
    // Las peticiones se hacen en fila: dos búsquedas a la vez no embeben dos veces lo mismo
    vectores(docs) {
      const hecho = cola.then(() => calcular(docs))
      cola = hecho.catch(() => undefined)
      return hecho
    },
  }
}

export function coseno(a: number[], b: number[]): number {
  let punto = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    punto += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na === 0 || nb === 0 ? 0 : punto / Math.sqrt(na * nb)
}

// ---------------------------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------------------------

export interface EntradaRanking {
  consulta: string
  perritos: PerritoPublico[]
  limite: number
  /** vectores de Gemini; sin ellos el ranking es solo léxico */
  semantica?: { consulta: number[]; documentos: Map<string, number[]> }
}

const UMBRAL = 0.05
const clamp = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x))

/** El coseno de embeddings cortos rara vez baja de 0.35 ni pasa de 0.75: se estira a 0..1 */
function semantico(cos: number): number {
  return clamp((cos - 0.35) / 0.4)
}

/** ¿Alguna palabra del conjunto es el término, o se escribe casi igual? */
function aparece(conjunto: Set<string>, t: string): boolean {
  if (conjunto.has(t)) return true
  if (t.length < 5) return false
  for (const x of conjunto) if (x.length >= 4 && parecidas(x, t)) return true
  return false
}

function lexico(terminos: string[], p: PerritoPublico): number {
  if (terminos.length === 0) return 0
  const extra = [...(p.cuidadosEspeciales ?? []), ...(p.curiosidades ?? []), p.comidaFavorita ?? '', p.lugarRescate ?? ''].join(' ')
  const central = new Set(palabras(nucleo(p)).map(raiz))
  const resto = new Set(palabras(`${p.historia} ${p.necesidadesMedicas.join(' ')} ${extra}`).map(raiz))
  let suma = 0
  for (const t of terminos) {
    const { iguales, parecidos } = sinonimosDe(t)
    const tiene = (conjunto: Set<string>, de: Set<string>) => [...de].some((x) => conjunto.has(x))
    suma += Math.max(
      central.has(t) ? 1 : 0,
      tiene(central, iguales) ? 0.8 : 0,
      resto.has(t) ? 0.6 : 0,
      tiene(resto, iguales) ? 0.5 : 0,
      tiene(central, parecidos) ? 0.4 : 0,
      aparece(central, t) ? 0.85 : 0,
      aparece(resto, t) ? 0.5 : 0,
    )
  }
  return suma / terminos.length
}

const etiquetasDe = (p: PerritoPublico) => p.personalidad.map((x) => normalizar(x))
const esCalmo = (p: PerritoPublico) => etiquetasDe(p).some((x) => /tranquil|calmad|viej|seren|noble|manso|paciente/.test(x))
const esActivo = (p: PerritoPublico) => etiquetasDe(p).some((x) => /energi|juguet|travies|activ/.test(x))

/** Lo que una persona dijo que NO quiere o que no puede ser: nunca se le recomienda eso, aunque sea lo único que quede */
function conflicto(i: Intenciones, p: PerritoPublico): string | null {
  const c = p.compatibilidad
  if (i.ninos && c.ninos === false) return 'no es ideal con niños'
  if (i.gatos && c.gatos === false) return 'no convive con gatos'
  if (i.perros && c.perros === false) return 'no convive con otros perros'
  if (i.apartamento && c.apartamento === false) return 'necesita espacio, no es para apartamento'
  if ((i.evitar.grande || i.tamano === 'pequeno') && p.tamano === 'grande') return 'es grande'
  if ((i.evitar.pequeno || i.tamano === 'grande') && p.tamano === 'pequeno') return 'es pequeño'
  if (i.evitar.energico && esActivo(p)) return 'es muy activo'
  if (i.evitar.ladrador && etiquetasDe(p).some((x) => /ladr|guardian|vigilant|ruidos|escandal/.test(x))) return 'es ladrador'
  if (i.evitar.viejo && p.edadAnios >= 8) return 'es mayor'
  if (i.evitar.cachorro && p.edadAnios < 1.5) return 'es muy joven'
  if (i.evitar.timido && etiquetasDe(p).some((x) => /timid|asustadiz|miedos/.test(x))) return 'es tímido'
  if (i.sano && p.necesidadesMedicas.length > 0) return 'necesita cuidados médicos'
  return null
}

interface Razon {
  boost: number
  razon?: string
}

function reglas(i: Intenciones, p: PerritoPublico): Razon[] {
  const rs: Razon[] = []
  const calmo = esCalmo(p)
  const activo = esActivo(p)

  if (i.vejez) {
    rs.push({ boost: 0.3 * clamp(p.edadAnios / 12) + (p.edadAnios >= 8 ? 0.1 : 0), razon: p.edadAnios >= 8 ? 'de los más veteranos del albergue' : undefined })
  }
  if (i.cachorro) {
    rs.push({ boost: 0.35 * clamp(1 - p.edadAnios / 3), razon: p.edadAnios < 2 ? 'todavía es joven y está lleno de energía' : undefined })
  }
  if (i.apartamento) {
    const a = p.compatibilidad.apartamento
    rs.push({ boost: (a === true ? 0.3 : a === false ? -0.3 : 0) + (p.tamano === 'pequeno' ? 0.05 : 0), razon: a === true ? 'se adapta bien a un apartamento' : undefined })
  }
  if (i.ninos) {
    const n = p.compatibilidad.ninos
    rs.push({ boost: n === true ? 0.3 : n === false ? -0.3 : 0, razon: n === true ? 'se lleva bien con niños' : undefined })
  }
  if (i.gatos) {
    const g = p.compatibilidad.gatos
    rs.push({ boost: g === true ? 0.3 : g === false ? -0.3 : 0, razon: g === true ? 'convive bien con gatos' : undefined })
  }
  if (i.perros) {
    const g = p.compatibilidad.perros
    rs.push({ boost: g === true ? 0.3 : g === false ? -0.3 : 0, razon: g === true ? 'se lleva bien con otros perros' : undefined })
  }
  if (i.tamano) {
    const coincide = p.tamano === i.tamano
    rs.push({ boost: coincide ? 0.25 : 0, razon: coincide ? `es de tamaño ${p.tamano === 'pequeno' ? 'pequeño' : p.tamano}` : undefined })
  }
  if (i.ayuda) {
    const razon = p.estado === 'tratamiento' || p.necesidadesMedicas.length > 0 ? 'necesita cuidados médicos y ayuda' : p.meta.padrinos === 0 ? 'aún no tiene padrino' : 'su meta mensual aún no está cubierta'
    rs.push({ boost: 0.45 * p.urgencia, razon: p.urgencia >= 0.4 ? razon : undefined })
  }
  if (i.calma) {
    const motivoCalma = i.evitar.ladrador ? 'es de carácter tranquilo' : i.evitar.energico ? 'es de ritmo suave' : undefined
    rs.push({
      boost: (calmo ? 0.3 : 0) + (p.edadAnios >= 7 ? 0.1 : 0) - (i.paraMayor && activo ? 0.2 : 0),
      razon: i.paraMayor ? (calmo ? 'ideal para una persona mayor' : undefined) : calmo ? motivoCalma ?? 'es de los más calmados' : undefined,
    })
  }
  if (i.evitar.ladrador) {
    // Lo que la historia diga de ladridos resta, salvo que diga justo lo contrario ("no ladra")
    const ladra = /\bladr(a|ador|ido|idos|ando)\b/.test(normalizar(p.historia)) && !/\bno ladr/.test(normalizar(p.historia))
    if (ladra) rs.push({ boost: -0.2 })
  }
  if (i.energia) {
    rs.push({ boost: activo ? 0.2 : 0, razon: activo ? 'tiene energía para acompañarte' : undefined })
  }
  return rs
}

function motivoDe(p: PerritoPublico, razones: string[], lex: number, nombrado: boolean): string {
  if (nombrado) return `Es ${p.nombre}, justo el que buscabas`
  const base = abrir(p)
  if (razones.length > 0) return `${base} — ${razones.slice(0, 2).join(' y ')}`
  if (lex > 0) return `${base} — encaja con lo que describes`
  return `${base} — te lo sugerimos por cómo encaja con tu búsqueda`
}

/** Frases de personalidad que empiezan así describen una acción, no un rasgo, y no caben en "Es …" */
const NO_ES_RASGO = /^(mucha?|le|se|no|me|lo|la|cuida|disfruta|pasa|necesita|siempre|prefiere|empuja|explora|observa|busca|acepta|confia|ronronea|descansa|duerme|de|con|en|sin|tiene|va|esta)$/

/** "Es viejito y tranquilo y tiene 9 años": solo con rasgos cortos que se leen bien después de "Es" */
function abrir(p: PerritoPublico): string {
  const rasgos = p.personalidad
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x.split(/\s+/).length <= 3 && !NO_ES_RASGO.test(normalizar(x.split(/\s+/)[0])))
    .slice(0, 2)
    .join(' y ')
  return rasgos ? `Es ${rasgos} y tiene ${p.edadTexto}` : `Tiene ${p.edadTexto}`
}

export function motivoUrgente(p: PerritoPublico): string {
  const base = abrir(p)
  const porque = p.estado === 'tratamiento' || p.necesidadesMedicas.length > 0 ? 'necesita cuidados médicos y ayuda' : p.meta.padrinos === 0 ? 'aún no tiene padrino' : 'hoy necesita de ti'
  return `${base} — ${porque}`
}

const porUrgencia = (a: PerritoPublico, b: PerritoPublico) => b.urgencia - a.urgencia || a.nombre.localeCompare(b.nombre, 'es')

// ---------------------------------------------------------------------------------------------
// Superlativos: "el más viejito", "el más pequeño", "el que más necesita ayuda"
// ---------------------------------------------------------------------------------------------

const RANGO_TAMANO: Record<Tamano, number> = { pequeno: 1, mediano: 2, grande: 3 }

/** Valor con el que se compara; null si el dato no existe (no se adivina) */
export function metricaSuperlativo(campo: CampoSuperlativo, p: PerritoPublico): number | null {
  switch (campo) {
    case 'edad':
      return p.edadAnios
    case 'tamano':
      return RANGO_TAMANO[p.tamano]
    case 'peso':
      return p.pesoKg ?? null
    case 'urgencia':
      return p.urgencia
    case 'calma':
      return (esCalmo(p) ? 10 : 0) + (esActivo(p) ? -5 : 0) + Math.min(p.edadAnios, 12) / 12
    case 'energia':
      return (esActivo(p) ? 10 : 0) + (esCalmo(p) ? -5 : 0) + (12 - Math.min(p.edadAnios, 12)) / 12
    case 'carino':
      return etiquetasDe(p).some((x) => /carin|amoros|mimos|dulce|apegad/.test(x)) ? 1 : 0
  }
}

const NOMBRE_SUPERLATIVO: Record<string, string> = {
  'edad:max': 'el más veterano',
  'edad:min': 'el más joven',
  'tamano:max': 'el más grande',
  'tamano:min': 'el más pequeño',
  'peso:max': 'el más pesado',
  'peso:min': 'el más liviano',
  'urgencia:max': 'quien más necesita ayuda',
  'calma:max': 'el más tranquilo',
  'energia:max': 'el más juguetón',
  'carino:max': 'el más cariñoso',
}

export function describirSuperlativo(s: Superlativo): string {
  return NOMBRE_SUPERLATIVO[`${s.campo}:${s.sentido}`] ?? 'el que más encaja'
}

/** Ordena de mejor a peor según el superlativo; los que no tienen el dato quedan fuera. Los empates se devuelven juntos al inicio. */
export function ordenarPorSuperlativo(perritos: PerritoPublico[], s: Superlativo): { perrito: PerritoPublico; valor: number }[] {
  const conValor = perritos.flatMap((perrito) => {
    const valor = metricaSuperlativo(s.campo, perrito)
    return valor === null ? [] : [{ perrito, valor }]
  })
  const dir = s.sentido === 'max' ? -1 : 1
  return conValor.sort(
    (a, c) =>
      dir * (a.valor - c.valor) ||
      // Dentro del mismo tamaño se desempata por peso solo si los dos lo tienen registrado
      (s.campo === 'tamano' && a.perrito.pesoKg !== undefined && c.perrito.pesoKg !== undefined ? dir * (a.perrito.pesoKg - c.perrito.pesoKg) : 0) ||
      porUrgencia(a.perrito, c.perrito),
  )
}

function motivoSuperlativo(s: Superlativo, p: PerritoPublico): string {
  const dato =
    s.campo === 'edad' ? `tiene ${p.edadTexto}`
    : s.campo === 'tamano' ? `es de tamaño ${p.tamano === 'pequeno' ? 'pequeño' : p.tamano}${p.pesoKg ? ` (${p.pesoKg} kg)` : ''}`
    : s.campo === 'peso' ? `pesa ${p.pesoKg} kg`
    : s.campo === 'urgencia' ? motivoUrgente(p).split(' — ')[1] ?? 'necesita ayuda'
    : abrir(p).replace(/^Es /, 'es ').replace(/^Tiene /, 'tiene ')
  return `${describirSuperlativo(s) === 'quien más necesita ayuda' ? 'Es quien más necesita ayuda' : `Es ${describirSuperlativo(s)}`}: ${dato}`
}

/**
 * Ordena los perfiles para una consulta con texto. El puntaje es 0.6 de palabras (y de significado si hay
 * vectores) más lo que sumen las reglas de intención (viejito, apartamento, niños, ayudar…). El orden usa la
 * suma sin recortar; el `puntaje` que se muestra se recorta a 0..1.
 *
 * Lo que la persona descartó explícitamente ("no me gustan los grandes", "que se lleve bien con niños") nunca
 * se recomienda: si eso deja la lista vacía, la respuesta es vacía y es el llamador quien lo dice con honestidad.
 */
export function ordenar(e: EntradaRanking): ResultadoBusqueda[] {
  const i = detectarIntenciones(e.consulta, e.perritos.map((p) => p.nombre))
  const candidatos = e.perritos.filter((p) => (!i.especie || p.especie === i.especie) && conflicto(i, p) === null)
  if (candidatos.length === 0) return []

  const puntuados = candidatos.map((p) => {
    const nombre = normalizar(p.nombre)
    const nombrado = i.nombres.some((n) => n === nombre || (n.length >= 4 && parecidas(n, nombre)))
    const lex = nombrado ? 1 : lexico(i.terminos, p)
    const vec = e.semantica?.documentos.get(p.id)
    const base = e.semantica && vec ? 0.4 * lex + 0.6 * semantico(coseno(e.semantica.consulta, vec)) : lex

    const rs = reglas(i, p)
    // El tope superior es holgado a propósito: "el más viejito" debe seguir ordenando por edad aunque varias reglas sumen
    const boost = clamp(rs.reduce((s, r) => s + r.boost, 0) + (nombrado ? 0.4 : 0), -0.6, 0.8)
    const crudo = base * 0.6 + boost
    const razones = rs.flatMap((r) => (r.razon ? [r.razon] : []))
    return { perrito: p, crudo, motivo: motivoDe(p, razones, lex, nombrado) }
  })

  if (i.superlativo) {
    let sup = i.superlativo
    let ordenados = ordenarPorSuperlativo(candidatos, sup)
    // Sin ningún peso registrado, "el más pesado" se responde por tamaño en vez de inventar kilos
    if (ordenados.length === 0 && sup.campo === 'peso') {
      sup = { campo: 'tamano', sentido: sup.sentido }
      ordenados = ordenarPorSuperlativo(candidatos, sup)
    }
    const porId = new Map(puntuados.map((x) => [x.perrito.id, x]))
    const mejor = ordenados[0]?.valor
    return ordenados.slice(0, e.limite).map((o, k) => ({
      perrito: o.perrito,
      puntaje: o.valor === mejor ? 0.95 : Math.max(0.2, Math.round((0.8 - 0.1 * k) * 100) / 100),
      motivo: o.valor === mejor ? motivoSuperlativo(sup, o.perrito) : (porId.get(o.perrito.id)?.motivo ?? motivoUrgente(o.perrito)),
    }))
  }

  const buenos = puntuados.filter((r) => r.crudo >= UMBRAL)
  // Si nada encaja se dice con honestidad y se sugiere a los más urgentes (que ya pasaron los descartes de la persona)
  if (buenos.length === 0) return sugerirUrgentes(candidatos, e.limite, undefined, true)

  return buenos
    .sort((a, b) => b.crudo - a.crudo || porUrgencia(a.perrito, b.perrito))
    .slice(0, e.limite)
    .map((r) => ({ perrito: r.perrito, puntaje: Math.round(clamp(r.crudo) * 100) / 100, motivo: r.motivo }))
}

/**
 * Los que más necesitan ayuda hoy. Con `honesto`, el motivo aclara que no hubo coincidencia con la búsqueda y el
 * puntaje es 0: no se maquilla una sugerencia de relleno como si fuera una coincidencia.
 */
export function sugerirUrgentes(perritos: PerritoPublico[], limite: number, especie?: 'perro' | 'gato' | null, honesto = false): ResultadoBusqueda[] {
  return perritos
    .filter((p) => !especie || p.especie === especie)
    .sort(porUrgencia)
    .slice(0, limite)
    .map((perrito) =>
      honesto
        ? { perrito, puntaje: 0, motivo: `No encontré uno que encaje exacto con lo que pides; por ahora quien más necesita ayuda es así: ${motivoUrgente(perrito)}` }
        : { perrito, puntaje: 0.1, motivo: motivoUrgente(perrito) },
    )
}
