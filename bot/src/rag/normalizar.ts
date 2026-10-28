// Utilidades de texto para entender preguntas escritas "como habla la gente": sin tildes, con jerga
// colombiana, abreviaturas de chat y errores de dedo. Todo es determinista y no depende de Gemini.

/** Minúsculas y sin tildes (conserva puntuación y espacios) */
export function sinTildes(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

/**
 * Abreviaturas y jerga de chat → forma estándar. Va por palabra completa, ya sin tildes ni signos.
 * Solo lo que tiene un único sentido razonable en una pregunta sobre un refugio.
 */
const EQUIVALENCIAS: Record<string, string> = {
  q: 'que', k: 'que', ke: 'que', qe: 'que', xq: 'porque', pq: 'porque', pk: 'porque', porq: 'porque', porqe: 'porque',
  x: 'por', d: 'de', tb: 'tambien', tmb: 'tambien', tbn: 'tambien', bn: 'bien', dnd: 'donde', dnde: 'donde', cmo: 'como', cm: 'como',
  cuantos: 'cuantos', cnt: 'cuanto', cuant: 'cuanto', ps: '', pues: '', pa: 'para', pal: 'para el', pla: 'para la', ud: 'usted', uds: 'ustedes',
  vcs: 'veces', xfa: 'favor', xfavor: 'favor', porfa: 'favor', porfis: 'favor', plis: 'favor', pls: 'favor', hla: 'hola', ola: 'hola',
  lomito: 'perro', lomitos: 'perros', lomita: 'perra', lomitas: 'perras', chandoso: 'perro', chandosos: 'perros', perrote: 'perro', perrotes: 'perros',
  perrito: 'perro', perritos: 'perros', perrita: 'perra', perritas: 'perras', chucho: 'perro', chuchos: 'perros', canino: 'perro', caninos: 'perros',
  gatico: 'gato', gaticos: 'gatos', gatica: 'gata', gaticas: 'gatas', michi: 'gato', michis: 'gatos', michito: 'gato', michitos: 'gatos',
  gatito: 'gato', gatitos: 'gatos', gatita: 'gata', gatitas: 'gatas', minino: 'gato', mininos: 'gatos', felino: 'gato', felinos: 'gatos',
  cachorrito: 'cachorro', cachorritos: 'cachorros', cachorrita: 'cachorra', cachorritas: 'cachorras',
  viejito: 'viejo', viejitos: 'viejos', viejita: 'vieja', viejitas: 'viejas', abuelito: 'viejo', abuelitos: 'viejos', abuelita: 'vieja', mayorcito: 'viejo', mayorcita: 'vieja',
  pequenito: 'pequeno', pequenita: 'pequena', pequenitos: 'pequenos', chiquito: 'pequeno', chiquita: 'pequena', chiquitos: 'pequenos', chiquitas: 'pequenas',
  chiquitico: 'pequeno', chiquitica: 'pequena', grandote: 'grande', grandota: 'grande', grandotes: 'grandes', grandecito: 'grande',
  tranquilito: 'tranquilo', tranquilita: 'tranquila', juguetoncito: 'jugueton', carinosito: 'carinoso',
  mascota: 'animal', mascotas: 'animales', peludo: 'animal', peludos: 'animales', peludito: 'animal', peluditos: 'animales',
  animalito: 'animal', animalitos: 'animales', companero: 'animal', companeros: 'animales',
  meds: 'medicinas', medi: 'medicina', medis: 'medicinas', pastillas: 'medicinas', pastilla: 'medicina', remedio: 'medicina', remedios: 'medicinas',
  medicamento: 'medicina', medicamentos: 'medicinas', droga: 'medicina', drogas: 'medicinas', pildora: 'medicina', pildoras: 'medicinas',
  apadrinarlo: 'apadrinar', apadrinarla: 'apadrinar', adoptarlo: 'adoptar', adoptarla: 'adoptar', apadrino: 'apadrinar', apadrina: 'apadrinar',
  guau: '', jeje: '', jaja: '', jajaja: '', jejeje: '',
}

/** Solo letras y números; todo lo demás separa palabras */
export function palabrasSimples(texto: string): string[] {
  return sinTildes(texto).split(/[^a-z0-9ñ]+/).filter(Boolean)
}

/**
 * Normaliza una pregunta: minúsculas, sin tildes ni signos, jerga colombiana y abreviaturas
 * expandidas ("q tal lomito" → "que tal perro"), espacios colapsados.
 */
export function normalizarTexto(texto: string): string {
  const base = sinTildes(texto).replace(/ñ/g, 'n').replace(/(\d)[.,](\d{3})\b/g, '$1$2')
  return base
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((p) => (p in EQUIVALENCIAS ? EQUIVALENCIAS[p] : p))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokens(texto: string): string[] {
  const n = normalizarTexto(texto)
  return n ? n.split(' ') : []
}

/** Distancia de edición con transposiciones (Damerau-Levenshtein restringida), con corte temprano */
export function distancia(a: string, b: string, maximo = 3): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1
  const prev2: number[] = []
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const act: number[] = [i]
    let minFila = i
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, act[j - 1] + 1, prev[j - 1] + costo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (prev2[j - 2] ?? Infinity) + 1)
      act[j] = v
      if (v < minFila) minFila = v
    }
    if (minFila > maximo) return maximo + 1
    prev2.length = 0
    prev2.push(...prev)
    prev = act
  }
  return prev[b.length]
}

/** Clave fonética del español: "Toby" y "Tobi", "Kira" y "Quira", "Hugo" y "Ugo" suenan igual */
export function fonetica(palabra: string): string {
  return sinTildes(palabra)
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, '')
    .replace(/ph/g, 'f')
    .replace(/qu([ei])/g, 'k$1')
    .replace(/q/g, 'k')
    .replace(/c([ei])/g, 's$1')
    .replace(/c/g, 'k')
    .replace(/g([ei])/g, 'j$1')
    .replace(/gu([ei])/g, 'g$1')
    .replace(/z/g, 's')
    .replace(/v/g, 'b')
    .replace(/ll/g, 'i')
    .replace(/y/g, 'i')
    .replace(/w/g, 'u')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1')
}

/** Cuántos errores de dedo se toleran según el largo de la palabra */
export function toleranciaPara(largo: number): number {
  if (largo <= 3) return 0
  if (largo <= 6) return 1
  return 2
}

/**
 * ¿Escriben "a" queriendo decir "b"? Igual, igual al sonar, o con pocas letras de diferencia
 * (proporcional al largo). Ambas ya normalizadas.
 */
export function parecidas(a: string, b: string): boolean {
  if (a === b) return true
  const menor = Math.min(a.length, b.length)
  if (menor < 3) return false
  const fa = fonetica(a)
  const fb = fonetica(b)
  if (fa === fb) return true
  const tol = toleranciaPara(menor)
  if (tol === 0) return false
  return distancia(a, b, tol) <= tol || distancia(fa, fb, Math.min(tol, 1)) <= Math.min(tol, 1)
}

/** 0 a 1: qué tan parecidas se ven dos palabras (para ordenar sugerencias de "¿quisiste decir…?") */
export function similitud(a: string, b: string): number {
  if (a === b) return 1
  const largo = Math.max(a.length, b.length)
  if (largo === 0) return 1
  const d = Math.min(distancia(a, b, largo), distancia(fonetica(a), fonetica(b), largo) + 0.5)
  let s = 1 - d / largo
  // Un prefijo claro ("tobi" de "tobias") cuenta mucho
  const prefijo = a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))
  if (prefijo) s = Math.max(s, 0.85)
  return Math.max(0, s)
}

// ---------------------------------------------------------------------------------------------
// Raíces de conceptos: "apadrinar", "apadrino" y "padrinos" son la misma idea
// ---------------------------------------------------------------------------------------------

/** Prefijo de la palabra (ya sin tildes) → concepto. Va de lo más específico a lo más general. */
const CONCEPTOS: [RegExp, string][] = [
  [/^(apadrin|padrin|madrin)/, 'padrin'],
  [/^(adopt|adopc)/, 'adopt'],
  [/^(dona|donac|donar|aporte|aportar|aporto|contribu|colabor)/, 'donar'],
  [/^(visit|conocer|conocerlo|conozc)/, 'visit'],
  [/^(voluntar)/, 'voluntar'],
  [/^(costo|costos|cuesta|cuestan|precio|valor|pagar|pago|tarifa|cobran|cobra|cobro|cuota)/, 'costo'],
  [/^(horario|horarios|abren|abre|abierto|atienden|atiende|cierran|cierra)/, 'horario'],
  [/^(ubicac|direccion|queda|llegar|mapa)/, 'ubic'],
  [/^(comida|alimento|alimentar|concentrado|croqueta|cuido|bulto|comer|comen|come)/, 'comid'],
  [/^(vacun|desparas|esteril|castra|castrac)/, 'salud'],
  [/^(requisito|requisitos|papeles|documento|documentos|necesito|necesita|requiere|piden|piden)/, 'requis'],
  [/^(devolver|devolu|devuelvo|regresar|retornar)/, 'devol'],
  [/^(contrato|compromiso|firmar|firma)/, 'contrat'],
  [/^(seguimiento|acompan|sigui)/, 'segui'],
  [/^(turno|turnos)/, 'turno'],
  [/^(rescat|rescate|abandon|encontr)/, 'rescat'],
  [/^(telefono|celular|whatsapp|wasap|llamar|llamada|contactar|contacto|escribir|correo|email|mail)/, 'contact'],
]

const SUFIJOS_VERBO = ['amientos', 'imientos', 'amiento', 'imiento', 'aciones', 'acion', 'iendo', 'ando', 'arlo', 'arla', 'erlo', 'irlo', 'ado', 'ido', 'ar', 'er', 'ir']
const SUFIJOS_NOMBRE = ['itos', 'itas', 'ito', 'ita', 'ones', 'on', 'es', 'os', 'as', 's', 'o', 'a', 'e']

/** Concepto o raíz ligera de una palabra ya normalizada */
export function concepto(palabra: string): string {
  for (const [re, c] of CONCEPTOS) if (re.test(palabra)) return c
  if (palabra.length <= 3) return palabra
  for (const suf of SUFIJOS_VERBO) if (palabra.endsWith(suf) && palabra.length - suf.length >= 3) return palabra.slice(0, -suf.length)
  for (const suf of SUFIJOS_NOMBRE) if (palabra.endsWith(suf) && palabra.length - suf.length >= 3) return palabra.slice(0, -suf.length)
  return palabra
}

/** Palabras que no aportan para comparar preguntas (ya normalizadas) */
export const PALABRAS_VACIAS = new Set(
  `a al algo algun alguna alguno algunos algunas ante aqui ahi alla como con contra cual cuales cuando cuanto cuantos cuanta cuantas de del desde donde el ella ellos ellas en entre era eres es esa ese eso esas esos esta este
  estan estas estos estoy fue ha han hay hasta la las le les lo los me mi mis mucho muy nos o os otro otra otros otras para pero poder podria podrian puedo puede pueden por porque que quien quienes se ser si sin sobre son su sus
  tambien tan te tengo tener tiene tienen tu tus un una unas uno unos usted ustedes va vamos van voy y ya yo favor hola buenas buenos dias tardes noches quiero quisiera quiere queria saber decir dime dame digame decirme
  tema gracias please mas menos hacer hace hacen hago ver verlo puedo podria podemos debo deben debe necesito necesitan haber estar estoy esta estamos son sea sean seria soy tienes tenemos dan dar doy dar da`.split(/\s+/),
)

/** Palabras con contenido (conceptos) de un texto, sin repetir */
export function conceptosDe(texto: string): string[] {
  const salida: string[] = []
  const vistos = new Set<string>()
  for (const p of tokens(texto)) {
    if (PALABRAS_VACIAS.has(p) || p.length < 2) continue
    const c = concepto(p)
    if (!vistos.has(c)) (vistos.add(c), salida.push(c))
  }
  return salida
}

/** ¿El texto (normalizado) contiene la frase como secuencia de palabras completas? */
export function contieneFrase(textoNormalizado: string, frase: string): boolean {
  return ` ${textoNormalizado} `.includes(` ${frase} `)
}
