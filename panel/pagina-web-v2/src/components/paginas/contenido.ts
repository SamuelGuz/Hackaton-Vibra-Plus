import type { SlugImagen } from '../../contenido/imagenes'

export interface Animal {
  id: string
  titulo: string
  especie: 'perro' | 'gato'
  descripcion: string
  slug: SlugImagen
  /** true cuando la imagen es un recorte transparente (se muestra completa sobre un fondo). */
  recorte?: boolean
}

// Fichas de EJEMPLO. Nombres, edades y caracteres reales: por confirmar con Yesenia.
export const ANIMALES: Animal[] = [
  { id: 'e1', titulo: 'Perro de ejemplo 1', especie: 'perro', descripcion: 'Pelo café, orejas caídas', slug: 'perro-cafe-lengua-ladrillo' },
  { id: 'e2', titulo: 'Gatos de ejemplo', especie: 'gato', descripcion: 'Dos gatos atigrados', slug: 'gatos-abrazados-foto' },
  { id: 'e3', titulo: 'Perro de ejemplo 2', especie: 'perro', descripcion: 'Chihuahua negro y fuego', slug: 'chihuahua-primer-plano' },
  { id: 'e4', titulo: 'Cachorro de ejemplo', especie: 'perro', descripcion: 'Atigrado, orejas caídas', slug: 'cachorro-atigrado-ladrillo' },
  { id: 'e5', titulo: 'Perro de ejemplo 3', especie: 'perro', descripcion: 'Pelo largo café, sonriendo', slug: 'perro-cafe-sonriente', recorte: true },
]

export const MONTOS = [
  { valor: 10000, compra: 'ayuda con carne y huesos de esta semana' },
  { valor: 25000, compra: 'ayuda con menudencias que alcanzan para varios' },
  { valor: 60000, compra: 'se acerca a un bulto de concentrado' },
] as const

export interface Pregunta { clave: string; texto: string; opciones: string[] }
export const PREGUNTAS: Pregunta[] = [
  { clave: 'Vivienda', texto: '¿Dónde vivirá?', opciones: ['Casa con patio', 'Apartamento', 'Aún no lo sé'] },
  { clave: 'Presupuesto', texto: '¿Puedes cubrir comida y veterinario cada mes?', opciones: ['Sí', 'Casi', 'Aún no'] },
  { clave: 'Rejas o cerramientos', texto: '¿La vivienda tiene rejas o cerramientos seguros?', opciones: ['Sí', 'Casi', 'Aún no'] },
  { clave: 'Veterinario', texto: '¿Te comprometes a llevarle al veterinario cuando lo necesite?', opciones: ['Sí', 'Casi', 'Aún no'] },
]
export const esAunNo = (r: string) => r === 'Aún no' || r === 'Aún no lo sé'

export interface Faq { q: string; a: string }

export const FAQ_COMO_AYUDAR: Faq[] = [
  { q: '¿Cuánto es lo mínimo?', a: 'No hay mínimo. El selector parte de montos de ejemplo, por confirmar.' },
  { q: '¿Y si no puedo ahora?', a: 'Guarda la página. La misión cambia cada semana o mes.' },
  { q: '¿Puedo dar comida directamente?', a: 'Por confirmar con Yesenia.' },
]
export const FAQ_ADOPTAR: Faq[] = [
  { q: '¿Tiene costo adoptar?', a: 'Por confirmar.' },
  { q: '¿Puedo adoptar si vivo en apartamento?', a: 'Depende del animal. Se conversa caso por caso.' },
  { q: '¿Entregan vacunado y esterilizado?', a: 'Por confirmar.' },
  { q: '¿Puedo devolverlo?', a: 'Por confirmar con Yesenia.' },
  { q: '¿Puedo visitar antes?', a: 'Sí, se coordina por WhatsApp (por confirmar).' },
]
export const FAQ_APORTAR: Faq[] = [
  { q: '¿Es seguro?', a: 'Esta página no te pide datos bancarios. Aportas directamente a Yesenia por el canal que ella confirme.' },
  { q: '¿Puedo ser anónimo?', a: 'Sí, es lo normal. Solo apareces si marcas la casilla.' },
  { q: '¿Me dan certificado?', a: 'Por confirmar.' },
  { q: '¿Qué pasa si se cumple la meta antes?', a: 'El excedente se pasa a la siguiente misión (política por confirmar).' },
  { q: '¿Puedo aportar un bulto en vez de plata?', a: 'Por confirmar.' },
]
