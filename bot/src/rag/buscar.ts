// Búsqueda híbrida: palabras (con sinónimos y reglas de intención) + significado (embeddings de Gemini).
// Todo lo determinista vive aquí; el servicio solo le pasa los vectores si Gemini respondió.
import { createHash } from 'node:crypto'
import { normalizar } from './perfil'
import type { Llm, PerfilRico, PerritoPublico, ResultadoBusqueda } from './tipos'

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
  `a al algo algun alguna alguno ante aqui busco buscando como con cual cuando de del desde donde el ella ellos en eres es esa ese eso esta este estoy favor ha hacer hay hola buenas buenos
  la las le lo los llevar me mejor mi mis mucho muy necesito no o otro otros para pero por porque puede pueda que quien quiero quisiera se ser sea si sin sobre su sus te tenga tengo tiene tu tus
  un una unas uno unos vivo vivimos y ya mas menos adoptar adopcion conseguir encontrar gustaria dame hablame cuentame quiero busca`.split(/\s+/),
)

const PALABRAS_PERRO = new Set(['perro', 'perros', 'perra', 'perras', 'perrito', 'perritos', 'perrita', 'perritas', 'canino', 'caninos', 'lomito', 'lomitos', 'chandoso'])
const PALABRAS_GATO = new Set(['gato', 'gatos', 'gata', 'gatas', 'gatito', 'gatitos', 'gatita', 'gatitas', 'felino', 'felinos', 'minino', 'mininos'])

interface Grupo {
  terminos: string[]
  /** grupos cuyo significado se parece lo suficiente para contar a medias (p. ej. tranquilo ≈ viejito) */
  relacionados?: string[]
}

const GRUPOS: Record<string, Grupo> = {
  calma: { terminos: ['tranquilo', 'calmado', 'paciente', 'sereno', 'pacifico', 'apacible', 'relajado', 'docil', 'quieto', 'suave', 'sosegado'], relacionados: ['vejez'] },
  vejez: { terminos: ['viejito', 'viejo', 'senior', 'mayor', 'anciano', 'abuelito', 'veterano'], relacionados: ['calma'] },
  ninos: { terminos: ['nino', 'nina', 'ninos', 'familia', 'hijos', 'hijo', 'bebes', 'menores'] },
  apartamento: { terminos: ['apartamento', 'apto', 'departamento', 'espacio', 'estudio'] },
  guardian: { terminos: ['guardian', 'vigilante', 'protector', 'alerta', 'ladrador', 'guardia', 'cuidador'] },
  jugueton: { terminos: ['jugueton', 'activo', 'energico', 'energia', 'travieso', 'deportista', 'aventurero', 'movido', 'corredor'] },
  cachorro: { terminos: ['cachorro', 'bebe', 'chiquito', 'joven', 'jovencito'] },
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
  return new Set(ids.flatMap((id) => GRUPOS[id]?.terminos.map(raiz) ?? []))
}

function sinonimosDe(r: string): { iguales: Set<string>; parecidos: Set<string> } {
  const ids = GRUPOS_POR_RAIZ.get(r) ?? []
  const iguales = raicesDeGrupos(ids)
  const parecidos = raicesDeGrupos(ids.flatMap((id) => GRUPOS[id]?.relacionados ?? []))
  return { iguales, parecidos }
}

// ---------------------------------------------------------------------------------------------
// Intención de la consulta
// ---------------------------------------------------------------------------------------------

export interface Intenciones {
  especie: 'perro' | 'gato' | null
  /** quiere uno de edad avanzada */
  vejez: boolean
  cachorro: boolean
  apartamento: boolean
  ninos: boolean
  /** que se lleve bien con gatos */
  gatos: boolean
  /** quiere ayudar / apadrinar / lo más urgente */
  ayuda: boolean
  calma: boolean
  energia: boolean
  /** la compañía es una persona mayor (mamá, abuela…): pide calma */
  paraMayor: boolean
  /** raíces que se buscan en el texto de los perfiles */
  terminos: string[]
  /** palabras sueltas que podrían ser un nombre propio */
  nombres: string[]
}

const PARA_MAYOR = /\b(para|con|de)\s+(mi|mis|una?|el|la|un)?\s*(mama|mami|papa|papi|abuel\w+|persona\w* mayor\w*|adult\w* mayor\w*|ancian\w+|tia|tio|suegr\w+|senor\w*|vecin\w+)\b/
const CON_ANIMALES = /\bcon\s+(otros\s+|otras\s+|los\s+|las\s+|mis\s+|mi\s+)?(perr\w*|gat\w*|minin\w*)/g
const LLEVE_BIEN_GATOS = /\b(lleve|lleva|convive|convivir|conviva|compatible|tolere|tolera|acepte|acepta)\b[^,.;]{0,25}\b(gat\w*|minin\w*)/
const AYUDA = /\bayud\w*|\bapadrin\w*|\bpadrin\w*|\burgent\w*|\bdonar\b|\bdonacion|\bmas necesit\w*|\bsin padrino/
const VEJEZ = /\bviej\w*|\bsenior\b|\bancian\w*|\bmayor(es)?\b|\babuelit\w*|\bveteran\w*/
const CACHORRO = /\bcachorr\w*|\bbebe\w*|\bjovencit\w*|\bjoven(es)?\b|\bpequenit\w*/
const APARTAMENTO = /\bapartament\w*|\bapto\b|\bdepartament\w*|\bespacio (pequeno|reducido|chico)|\bcasa pequena|\bpoco espacio/
const NINOS = /\bnin[oa]s?\b|\bhij[oa]s?\b|\bfamilia\b|\bbebes?\b|\bchiquit[oa]s? en casa/
const CALMA = /\btranquil\w*|\bcalm\w*|\bseren\w*|\bpacific\w*|\bapacible|\brelajad\w*|\bdocil\w*|\bquiet\w*|\bsuave\b/
const ENERGIA = /\bjuguet\w*|\benergi\w*|\bactiv\w*|\bdeportist\w*|\bcorrer\b|\bcaminat\w*|\btravies\w*|\baventurer\w*|\bmovid\w*/

export function detectarIntenciones(consulta: string): Intenciones {
  let t = normalizar(consulta)

  const paraMayor = PARA_MAYOR.test(t)
  if (paraMayor) t = t.replace(PARA_MAYOR, ' ')

  const gatos = LLEVE_BIEN_GATOS.test(t) || /\bcon\s+(otros\s+|los\s+|mis\s+)?gat\w*/.test(t)
  // "con perros" / "con gatos" hablan de compatibilidad, no de la especie que se busca
  t = t.replace(CON_ANIMALES, ' ')

  const ps = palabras(t)
  const quiereGato = ps.some((p) => PALABRAS_GATO.has(p))
  const quierePerro = ps.some((p) => PALABRAS_PERRO.has(p))
  const especie = quiereGato && !quierePerro ? 'gato' : quierePerro && !quiereGato ? 'perro' : null

  const ayuda = AYUDA.test(t)
  const sinAyuda = t.replace(new RegExp(AYUDA.source, 'g'), ' ')
  const candidatos = palabras(sinAyuda).filter((p) => !SIN_VALOR.has(p) && !PALABRAS_PERRO.has(p) && !PALABRAS_GATO.has(p))

  return {
    especie,
    vejez: VEJEZ.test(t),
    cachorro: CACHORRO.test(t),
    apartamento: APARTAMENTO.test(t),
    ninos: NINOS.test(t),
    gatos,
    ayuda,
    calma: paraMayor || CALMA.test(t),
    energia: ENERGIA.test(t),
    paraMayor,
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
      lote.forEach((d, k) => guardados.set(d.id, { huella: d.huella, vector: vectores[k] ?? [] }))
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
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    punto += x * y
    na += x * x
    nb += y * y
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

function lexico(terminos: string[], p: PerritoPublico): number {
  if (terminos.length === 0) return 0
  const central = new Set(palabras(nucleo(p)).map(raiz))
  const resto = new Set(palabras(`${p.historia} ${p.necesidadesMedicas.join(' ')}`).map(raiz))
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
    )
  }
  return suma / terminos.length
}

interface Razon {
  boost: number
  razon?: string
}

function reglas(i: Intenciones, p: PerritoPublico): Razon[] {
  const rs: Razon[] = []
  const tiene = (...etiquetas: string[]) => p.personalidad.some((x) => etiquetas.includes(normalizar(x)))
  const calmo = tiene('tranquilo', 'calmado', 'viejito', 'sereno', 'noble')
  const activo = tiene('energico', 'jugueton')

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
  if (i.ayuda) {
    const razon = p.estado === 'tratamiento' || p.necesidadesMedicas.length > 0 ? 'necesita cuidados médicos y ayuda' : p.meta.padrinos === 0 ? 'aún no tiene padrino' : 'su meta mensual aún no está cubierta'
    rs.push({ boost: 0.45 * p.urgencia, razon: p.urgencia >= 0.4 ? razon : undefined })
  }
  if (i.calma) {
    rs.push({
      boost: (calmo ? 0.3 : 0) + (p.edadAnios >= 7 ? 0.1 : 0) - (i.paraMayor && activo ? 0.2 : 0),
      razon: i.paraMayor ? (calmo ? 'ideal para una persona mayor' : undefined) : calmo ? 'es de los más calmados' : undefined,
    })
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
    .filter((x) => x.split(/\s+/).length <= 3 && !NO_ES_RASGO.test(normalizar(x.split(/\s+/)[0] ?? '')))
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

/**
 * Ordena los perfiles para una consulta con texto. El puntaje es 0.6 de palabras (y de significado si hay
 * vectores) más lo que sumen las reglas de intención (viejito, apartamento, niños, ayudar…). El orden usa la
 * suma sin recortar; el `puntaje` que se muestra se recorta a 0..1.
 */
export function ordenar(e: EntradaRanking): ResultadoBusqueda[] {
  const i = detectarIntenciones(e.consulta)
  const candidatos = e.perritos.filter((p) => !i.especie || p.especie === i.especie)

  const puntuados = candidatos.map((p) => {
    const nombrado = i.nombres.includes(normalizar(p.nombre))
    const lex = nombrado ? 1 : lexico(i.terminos, p)
    const vec = e.semantica?.documentos.get(p.id)
    const base = e.semantica && vec ? 0.4 * lex + 0.6 * semantico(coseno(e.semantica.consulta, vec)) : lex

    const rs = reglas(i, p)
    // El tope superior es holgado a propósito: "el más viejito" debe seguir ordenando por edad aunque varias reglas sumen
    const boost = clamp(rs.reduce((s, r) => s + r.boost, 0) + (nombrado ? 0.4 : 0), -0.6, 0.8)
    const crudo = base * 0.6 + boost
    const razones = rs.flatMap((r) => (r.razon ? [r.razon] : []))
    return { perrito: p, crudo, veto: rs.some((r) => r.boost < 0), motivo: motivoDe(p, razones, lex, nombrado) }
  })

  const buenos = puntuados.filter((r) => r.crudo >= UMBRAL)
  // Si nada encaja se sugiere a los más urgentes, pero nunca al que dice explícitamente "no" a algo pedido
  if (buenos.length === 0) return sugerirUrgentes(puntuados.filter((r) => !r.veto).map((r) => r.perrito), e.limite)

  return buenos
    .sort((a, b) => b.crudo - a.crudo || porUrgencia(a.perrito, b.perrito))
    .slice(0, e.limite)
    .map((r) => ({ perrito: r.perrito, puntaje: Math.round(clamp(r.crudo) * 100) / 100, motivo: r.motivo }))
}

/** Los que más necesitan ayuda hoy, como respuesta de relleno cuando nada encaja o no hay consulta */
export function sugerirUrgentes(perritos: PerritoPublico[], limite: number, especie?: 'perro' | 'gato' | null): ResultadoBusqueda[] {
  return perritos
    .filter((p) => !especie || p.especie === especie)
    .sort(porUrgencia)
    .slice(0, limite)
    .map((perrito) => ({ perrito, puntaje: 0.1, motivo: motivoUrgente(perrito) }))
}
