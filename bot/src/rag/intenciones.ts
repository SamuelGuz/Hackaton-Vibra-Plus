// Entender una pregunta: qué animal(es) menciona, qué quiere saber de él y de qué tipo es la pregunta.
// Todo por reglas y palabras (nada de Gemini): es la base determinista del motor de respuestas.
import { conceptosDe, contieneFrase, distancia, fonetica, normalizarTexto, PALABRAS_VACIAS, parecidas, similitud, sinTildes, tokens } from './normalizar.js'
import type { EntradaConocimiento } from './tipos.js'

// ---------------------------------------------------------------------------------------------
// Animales mencionados
// ---------------------------------------------------------------------------------------------

export interface EntradaNombre {
  id: string
  nombre: string
  alias: string[]
}

export interface MencionAnimal {
  id: string
  nombre: string
  /** true si el nombre está escrito tal cual; false si fue por parecido (error de dedo, apodo, abreviatura) */
  exacta: boolean
}

/** Palabras de las preguntas que nunca son un nombre propio aunque se parezcan a uno */
const PALABRAS_DE_PREGUNTA = new Set(
  `edad anos ano cumple cumpleanos nacio viejo vieja joven cachorro tamano grande pequeno pequena mediano peso pesa kilos kilo kg caracter personalidad temperamento historia rescate rescatado vacuna vacunas vacunado
  vacunada esterilizado esterilizada castrado castrada desparasitado desparasitada microchip chip nino ninos gato gatos perro perros apartamento casa comida come comio comido comer favorita favorito rutina cuidados cuidado
  medicina medicinas tratamiento toma tomo dosis hoy ahora padrino padrinos apadrinar adoptar adopcion adoptable disponible foto estado salud enfermo sano animal animales refugio fundacion huellitas cuanto cuantos cuantas
  cuantas cual cuales quien quienes donde cuando como porque cuentame hablame dime informacion ficha perfil necesita necesitan lleva bien llevar mejor mas menos tiene tienen tuvo hay ser es son era esta estan estar tipo
  tranquilo juguetón jugueton carinoso timido sociable amigable bravo agresivo manso ladra ladrar duerme duerme duerme dormir corre salta camina paseo pasear paseos juego juegos jugar juguete juguetes bano banar banos
  hora horas horario horarios mañana tarde noche manana`.split(/\s+/).map(sinTildes),
)

const MARCADORES_NOMBRE = new Set(['de', 'del', 'a', 'sobre', 'con', 'llama', 'llamado', 'llamada', 'perro', 'perra', 'gato', 'gata', 'animal', 'tiene', 'adoptar', 'apadrinar', 'conocer', 'visitar'])
/** Nombres propios que aparecen en preguntas sobre el refugio y no son animales */
const PROPIOS_NO_ANIMAL = new Set(['huellitas', 'fundacion', 'colombia', 'medellin', 'bogota', 'cali', 'whatsapp', 'instagram', 'facebook', 'google', 'gemini', 'hola', 'buenas', 'buenos', 'gracias'])

export interface ResultadoNombres {
  animales: MencionAnimal[]
  /** Un nombre que parece de animal pero no está en el refugio (ya sin tildes ni mayúsculas) */
  desconocido: string | null
  /** El desconocido como lo escribió la persona */
  desconocidoOriginal: string | null
  /** Los nombres del refugio más parecidos al desconocido, del más al menos parecido */
  parecidos: string[]
  /** true si el desconocido viene justo después de "de/a/sobre/llamado…" (más probable que sea un animal y no un lugar) */
  marcado?: boolean
}

/** Claves de un animal: su nombre y sus apodos, normalizados */
function clavesDe(e: EntradaNombre): string[] {
  const claves = [e.nombre, ...e.alias].map((x) => normalizarTexto(x)).filter(Boolean)
  return [...new Set(claves)]
}

/** Mismo nombre escrito distinto: suena igual ("Toby"/"Tobi"), o difiere en una letra si es largo (6+), dos si es muy largo */
function mismoNombre(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return false
  if (fonetica(a) === fonetica(b)) return true
  const menor = Math.min(a.length, b.length)
  if (menor < 6) return false
  const tol = menor >= 8 ? 2 : 1
  return distancia(a, b, tol) <= tol
}

/**
 * Busca animales en la pregunta. Acepta el nombre exacto, el apodo ("Tobi" por Tobías), y el nombre mal escrito
 * ("tobis", "Toby", "bruno" sin tilde). Las palabras comunes de las preguntas nunca cuentan como nombre.
 */
export function buscarAnimales(pregunta: string, roster: EntradaNombre[]): ResultadoNombres {
  const n = normalizarTexto(pregunta)
  const ps = n ? n.split(' ') : []
  const encontrados = new Map<string, MencionAnimal & { puntos: number }>()

  const agregar = (e: EntradaNombre, exacta: boolean, puntos: number) => {
    const previo = encontrados.get(e.id)
    if (!previo || puntos > previo.puntos) encontrados.set(e.id, { id: e.id, nombre: e.nombre, exacta, puntos })
  }

  for (const e of roster) {
    for (const clave of clavesDe(e)) {
      if (clave.includes(' ')) {
        if (contieneFrase(n, clave)) agregar(e, true, 3)
        continue
      }
      for (const p of ps) {
        if (p === clave) agregar(e, true, 3)
        else if (p.length >= 3 && !PALABRAS_DE_PREGUNTA.has(p) && !PALABRAS_VACIAS.has(p)) {
          // Prefijo claro ("tobi" de "tobias") o error de dedo / sonido parecido ("toby", "tobias" por tobias)
          const prefijo = p.length >= 4 && (clave.startsWith(p) || p.startsWith(clave)) && Math.min(p.length, clave.length) >= 4
          if (prefijo || mismoNombre(p, clave)) {
            agregar(e, false, prefijo ? 2 : 1)
          }
        }
      }
    }
  }

  // Si una palabra es exacta de un animal, los parecidos de esa misma palabra no cuentan ("Luna" no arrastra a "Lunita")
  const lista = [...encontrados.values()]
  const hayExacto = lista.some((x) => x.exacta)
  const animales = (hayExacto ? lista.filter((x) => x.exacta) : lista)
    .sort((a, b) => b.puntos - a.puntos)
    .map(({ id, nombre, exacta }) => ({ id, nombre, exacta }))

  if (animales.length > 0) return { animales, desconocido: null, desconocidoOriginal: null, parecidos: [] }

  // ¿Habla de un animal que no está? Candidata: palabra capitalizada que no abre la frase, o la que sigue a "de/a/sobre…"
  const crudas = pregunta.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const conocidas = new Set<string>([...PALABRAS_DE_PREGUNTA, ...PALABRAS_VACIAS, ...PROPIOS_NO_ANIMAL])
  let candidata: string | null = null
  let marcado = false
  for (let k = 0; k < crudas.length && !candidata; k++) {
    const original = crudas[k]
    const norm = normalizarTexto(original)
    if (!norm || norm.includes(' ') || norm.length < 3 || conocidas.has(norm) || /\d/.test(norm)) continue
    const mayuscula = /^\p{Lu}/u.test(original) && k > 0
    const prev = k > 0 ? normalizarTexto(crudas[k - 1]) : ''
    const despuesDeMarcador = MARCADORES_NOMBRE.has(prev) && /^\p{Lu}/u.test(original)
    if (mayuscula || despuesDeMarcador) {
      candidata = original
      marcado = despuesDeMarcador
    }
  }
  if (!candidata) return { animales: [], desconocido: null, desconocidoOriginal: null, parecidos: [] }

  const clave = normalizarTexto(candidata)
  const parecidos = roster
    .map((e) => ({ e, s: Math.max(...clavesDe(e).map((c) => similitud(clave, c))) }))
    .filter((x) => x.s >= 0.6)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.e.nombre)
  return { animales: [], desconocido: clave, desconocidoOriginal: candidata, parecidos, marcado }
}

// ---------------------------------------------------------------------------------------------
// Qué quiere saber de un animal
// ---------------------------------------------------------------------------------------------

export type AtributoAnimal =
  | 'edad' | 'peso' | 'tamano' | 'caracter' | 'historia' | 'rescate'
  | 'vacunas' | 'esterilizacion' | 'desparasitacion' | 'microchip'
  | 'ninos' | 'gatos' | 'perros' | 'apartamento'
  | 'comida_favorita' | 'comio_hoy' | 'rutina' | 'cuidados' | 'salud'
  | 'medicina' | 'medicina_hoy' | 'padrino' | 'adopcion' | 'curiosidades' | 'foto' | 'estado' | 'ficha'

/** [atributo, regex sobre el texto normalizado] */
const REGLAS_ATRIBUTO: [AtributoAnimal, RegExp][] = [
  ['edad', /\bedad\b|\banos?\b|\bcumple\w*|\bnacio\b|\bnacimiento\b|\bque tan (viejo|vieja|joven)|\b(es|esta|ya) (viejo|vieja|joven|cachorro|adulto|adulta|mayor)\b|\bcuanto tiene\b|\bcuantos anos\b/],
  ['peso', /\bpes[ao]s?\b|\bpesa\b|\bkilos?\b|\bkg\b|\blibras?\b|\bgordo\b|\bgorda\b|\bflaco\b|\bflaca\b|\bdelgad[oa]\b/],
  ['tamano', /\btamano\b|\bque tan grande\b|\btalla\b|\bmide\b|\baltura\b|\bes (grande|pequeno|pequena|mediano|mediana|chico|chica)\b|\bgrande o pequeno\b/],
  ['caracter', /\bcaracter\b|\bpersonalidad\b|\btemperamento\b|\bmanso\b|\bbravo\b|\bbrava\b|\bagresiv\w*|\bmuerde\b|\bes (carinos\w*|tranquil\w*|jugueton\w*|timid\w*|sociable|amigable|energic\w*|ladrador\w*|calmad\w*|noble)\b|\bladra\b|\bque (personalidad|caracter)\b|\bcomo es de caracter\b/],
  ['historia', /\bhistoria\b|\bque le paso\b|\bde donde (viene|vino|salio|es)\b|\bpasado\b|\bcomo llego\b|\bcomo (lo|la) (encontraron|rescataron|recogieron)\b|\bque paso con\b|\bsu vida\b|\bcuentame (su|la) historia/],
  ['rescate', /\brescat\w*|\bcuando llego\b|\bdesde cuando\b|\bdonde (lo|la) (encontraron|recogieron|hallaron)\b|\bcuanto tiempo (lleva|lleva en|tiene en)\b|\bfecha de (ingreso|llegada|rescate)\b|\bcuando (lo|la) (rescataron|recogieron|encontraron)\b|\blleva (aqui|en el refugio|en huellitas)\b|\bcuanto lleva\b/],
  ['vacunas', /\bvacun\w*/],
  ['esterilizacion', /\besteriliz\w*|\bcastrad\w*|\bcapad\w*|\bcastrar\b|\bcastracion\b/],
  ['desparasitacion', /\bdesparasit\w*|\bpulgas\b|\bgarrapatas\b|\blombrices\b/],
  ['microchip', /\bmicrochip\w*|\bchip\b/],
  ['ninos', /\b(nino|nina|ninos|ninas|bebes?|peques|pequenos de la casa|hijos?|familia con ninos)\b/],
  ['gatos', /\b(gato|gata|gatos|gatas)\b/],
  ['perros', /\b(otros )?(perro|perra|perros|perras)\b/],
  ['apartamento', /\bapartament\w*|\bapto\b|\bdepartament\w*|\bcasa pequena\b|\bpoco espacio\b|\bespacio\b/],
  ['comio_hoy', /\b(comio|comido|comiendo|desayuno|almorzo|ceno|alimentado|probo bocado|ya comio|se comio|come hoy|esta comiendo)\b|\bha comido\b|\bapetito\b/],
  ['comida_favorita', /\bque (le gusta|come|le dan|le dais|le gusta comer)\b|\bcomida favorit\w*|\bfavorit[oa]\b|\bconcentrado\b|\bpremios?\b|\bsnacks?\b|\bgolosina\w*|\balimento\b|\bque come\b|\bcomida\b/],
  ['rutina', /\brutina\b|\bsu dia\b|\bque hace (en|durante) el dia\b|\bcomo es su dia\b|\bun dia (normal|tipico)/],
  ['cuidados', /\bcuidados?\b|\batencion especial\b|\brequiere\b|\bnecesita (algo|cuidados)\b|\bque necesita\b|\bcosas especiales\b|\bcuidar\w*/],
  ['salud', /\bsalud\b|\benferm\w*|\bsano\b|\bsana\b|\bnecesidades medicas\b|\bproblemas?\b|\blesion\w*|\bherid\w*|\bdiagnostico\b|\bpadece\b|\bsufre\b|\bdiscapac\w*|\bcojea\b|\boperacion\b|\bcirugia\b/],
  ['medicina', /\bmedicinas?\b|\btratamientos?\b|\btoma\b|\btomar\b|\btomando\b|\bdosis\b|\bjarabe\b|\bantibiotic\w*|\binyecc\w*|\bgotas\b|\bcampu\b|\bmedicado\b|\ba que horas\b.*\b(le dan|toca|se le da)\b/],
  ['medicina_hoy', /\b(ya|hoy|todavia|aun|le falta|le dieron|le dio|tomo|tomado|dosis de hoy|le toca|le tocan|han dado|le han dado)\b/],
  ['padrino', /\bpadrin\w*|\bapadrin\w*|\bmadrin\w*/],
  ['adopcion', /\badopt\w*|\bdisponible\b|\bllevarlo\b|\bllevarla\b|\bllevarmelo\b|\bquedarme con\b|\bquedarmelo\b|\bse puede (adoptar|llevar)\b/],
  ['curiosidades', /\bcuriosidad\w*|\bdato curioso\b|\bgracia\b|\btravesur\w*|\bmanias?\b|\bgustos?\b|\bque le gusta\b|\bque le encanta\b|\bdivertid\w*/],
  ['foto', /\bfotos?\b|\bimagen\w*|\bverlo\b|\bverla\b|\bcomo se ve\b/],
  ['estado', /\bestado\b|\bcomo (esta|sigue|va|amanecio|anda|se encuentra)\b|\bse recupera\b|\brecuperacion\b|\bmejoro\b|\bevolucion\b/],
  ['ficha', /\bcuentame\b|\bhablame\b|\bdime (de|sobre|algo)\b|\bquien es\b|\bcomo es\b|\binformacion\b|\bdatos\b|\bficha\b|\bperfil\b|\bsobre\b|\bconocer\b|\bde que se trata\b|\bpresentame\b|\bmuestrame\b|\bque sabes\b/],
]

export function detectarAtributos(n: string): Set<AtributoAnimal> {
  const salida = new Set<AtributoAnimal>()
  for (const [id, re] of REGLAS_ATRIBUTO) if (re.test(n)) salida.add(id)
  // "¿Ya tomó su medicina?" es medicina de hoy; "¿qué medicina toma?" solo medicina
  if (!salida.has('medicina')) salida.delete('medicina_hoy')
  // "¿Ya comió?" es comida de hoy; "qué come" es su comida favorita (comio_hoy gana solo si pregunta por hoy)
  if (salida.has('comida_favorita') && salida.has('comio_hoy') && /\bque (le gusta|come)\b|\bcomida favorit/.test(n) && !/\b(hoy|ya|todavia|aun)\b/.test(n)) salida.delete('comio_hoy')
  if (salida.has('comio_hoy')) salida.delete('comida_favorita')
  // "¿se lleva bien con otros perros?" no es ficha ni adopción
  if (salida.has('medicina') && salida.has('salud')) salida.delete('salud')
  if (salida.has('rescate') && salida.has('historia')) salida.delete('rescate')
  if (salida.has('estado') && salida.has('medicina')) salida.delete('estado')
  // "cuéntame de Toby" pide la ficha; si además pide algo concreto se responde lo concreto
  const concretos = [...salida].filter((a) => a !== 'ficha')
  if (concretos.length > 0 && salida.has('ficha') && !/\bcuentame\b.*\b(todo|completo)\b|\bficha\b|\bperfil\b/.test(n)) salida.delete('ficha')
  return salida
}

// ---------------------------------------------------------------------------------------------
// Tipos de pregunta
// ---------------------------------------------------------------------------------------------

export const SALUDO = /^(hola+|holi+|ola|hey|buenas?( (tardes|noches|dias))?|buenos dias|saludos|que tal|como estas|como esta usted|como van|que mas|todo bien|hello|buen dia)( .{0,30})?$/
export const SOLO_GRACIAS = /^(muchas |mil )?(gracias|grax)( .{0,40})?$|^(listo|perfecto|genial|excelente|vale|ok|okay|dale|super) ?(gracias)?$|^(chao|adios|hasta luego|nos vemos|bye|hasta pronto)( .{0,30})?$/
export const PREGUNTA_CAPACIDAD = /\b(que (puedes|sabes|haces|puede hacer)|en que (me )?(puedes|puede) ayudar|como funcionas|quien eres|que eres|para que sirves|eres un (bot|robot)|eres real|eres humano)\b/

/** Pedir datos de una persona (padrino, donante, adoptante, voluntario, equipo) */
const PERSONA = /\b(padrin\w*|madrin\w*|donante\w*|donador\w*|adoptante\w*|voluntari\w*|equipo|cuidador\w*|veterinari\w*|administrador\w*|coordinador\w*|directora?|encargad\w*|personal|empleado\w*|trabajador\w*|dueno\w*|duena\w*|doctor\w*|doctora|fundador\w*|representante)\b|\bquien(es)? (apadrina\w*|dona\w*|adopto|adopta\w*|apadrino|ayuda a)\b/
const DATO_PERSONAL = /\b(telefono|celular|numero|whatsapp|correo|email|mail|direccion|apellido|cedula|documento|quien es|quienes son|quien(es)? (apadrina\w*|dona\w*|adopto|adopta\w*)|como se llama|como se llaman|nombre|nombres|datos de|contacto de|donde vive|viven|redes)\b/

/** Pregunta por información de uso interno de la fundación */
export const INTERNO_FINANZAS = /\b(deuda|deudas|debe|debemos|deben|caja|ingresos|gastos|utilidad|balance|presupuesto|salario|salarios|sueldo|sueldos|nomina|cuanta plata|cuanto dinero|cuanto (hay|tienen|tiene) en caja|facturas?)\b/
export const INTERNO_INVENTARIO = /\b(stock|inventario|existencias|bodega|proveedor\w*|lotes?|vencimiento\w*|vence\w*|caduc\w*|bajo (el )?minimo|stock minimo|reponer|comprar mas|se (esta )?acab\w*|quedan?\b|cuanta?s? (queda|quedan|hay|tenemos|tienen)|precio unitario|cuanto (cuesta|vale|costo) (la|el|una|un) (medicina|amoxicilina|medicamento)|dias de stock|alcanza para)\b/

export function pideDatosPersonales(n: string): boolean {
  return PERSONA.test(n) && DATO_PERSONAL.test(n)
}

// ---------------------------------------------------------------------------------------------
// Base de conocimiento: parecido entre la pregunta y las que ya conocemos
// ---------------------------------------------------------------------------------------------

export interface PuntajeConocimiento {
  entrada: EntradaConocimiento
  /** 0 a 1 */
  puntaje: number
}

interface IndiceEntrada {
  entrada: EntradaConocimiento
  preguntas: { texto: string; normal: string; conceptos: Set<string> }[]
  claves: { normal: string; conceptos: string[]; frase: boolean }[]
}

export function indexarConocimiento(entradas: EntradaConocimiento[]): IndiceEntrada[] {
  return entradas.map((entrada) => ({
    entrada,
    preguntas: entrada.preguntas.map((texto) => ({ texto, normal: normalizarTexto(texto), conceptos: new Set(conceptosDe(texto)) })),
    claves: entrada.palabrasClave.map((k) => {
      const normal = normalizarTexto(k)
      return { normal, conceptos: conceptosDe(k), frase: normal.includes(' ') }
    }),
  }))
}

/** Cuántos conceptos de `a` aparecen en `b` (igual o escrito casi igual) */
function coincidencias(a: string[], b: Set<string>): number {
  let n = 0
  for (const c of a) {
    if (b.has(c)) n++
    else if (c.length >= 5 && [...b].some((x) => x.length >= 5 && parecidas(c, x))) n += 0.8
  }
  return n
}

/** 0 a 1: qué tan bien responde esta entrada a la pregunta, solo con palabras */
export function puntuarConocimiento(pregunta: string, indice: IndiceEntrada[]): PuntajeConocimiento[] {
  const normal = normalizarTexto(pregunta)
  const q = conceptosDe(pregunta)
  const qSet = new Set(q)
  if (q.length === 0) return indice.map((x) => ({ entrada: x.entrada, puntaje: 0 }))

  return indice.map((x) => {
    // Parecido con cada forma de preguntarlo (Dice sobre conceptos)
    let mejorDice = 0
    for (const p of x.preguntas) {
      if (p.normal === normal && normal) {
        mejorDice = 1
        break
      }
      const comun = coincidencias(q, p.conceptos)
      const dice = (2 * comun) / (q.length + p.conceptos.size || 1)
      // Cubrir casi toda la pregunta del usuario pesa más que cubrir toda la de referencia (la gente pregunta corto)
      const cobertura = comun / q.length
      mejorDice = Math.max(mejorDice, 0.6 * dice + 0.4 * cobertura * Math.min(1, comun / Math.max(1, p.conceptos.size) + 0.3))
    }
    // Palabras clave: una frase completa vale más que una palabra suelta
    let claveSuma = 0
    for (const k of x.claves) {
      if (k.frase) {
        if (contieneFrase(normal, k.normal)) claveSuma += 0.55
        else if (k.conceptos.length > 1 && k.conceptos.every((c) => qSet.has(c))) claveSuma += 0.4
      } else if (k.conceptos.some((c) => qSet.has(c)) || (k.normal.length >= 5 && q.some((c) => c.length >= 5 && parecidas(c, k.conceptos[0] ?? k.normal)))) {
        claveSuma += 0.3
      }
    }
    const claves = Math.min(1, claveSuma)
    return { entrada: x.entrada, puntaje: Math.min(1, 0.65 * mejorDice + 0.45 * claves) }
  })
}

/** Primeras `n` palabras con contenido (para explicar de qué trató la pregunta) */
export function palabrasClaveDe(texto: string, n = 4): string[] {
  return tokens(texto).filter((p) => !PALABRAS_VACIAS.has(p) && p.length > 2).slice(0, n)
}
