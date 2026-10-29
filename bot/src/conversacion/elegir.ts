// Responder escribiendo o en audio lo que también se puede tocar: "sí", "bórralo", "sin foto", el nombre de una opción.
import type { Fila } from '../tipos.js'
import { sinTildes } from './numeros.js'

/** Minúsculas, sin tildes ni signos: "¡Sí, está bien!" → "si esta bien" */
export const normal = (t: string) =>
  sinTildes(t.toLowerCase())
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const SI = /^(si|sii+|sip|ok|okey|okay|dale|listo|correcto|perfecto|exacto|bien|claro|confirmo|confirmar|guarda(lo)?)\b|\b(esta bien|todo bien|asi es|eso es)\b/
const NO = /^(no|nop|nel)\b/

// Para el "¿Está bien?" solo cuenta un mensaje que sea SOLO la respuesta: todas sus palabras son de respuesta
// y trae al menos una que decide. "Listo, también abrí un bulto" o "le quité los puntos a Mateo" son registros nuevos.
const RELLENO = ['si', 'no', 'eso', 'todo', 'ya', 'mejor', 'por', 'favor', 'gracias', 'porfa', 'esta', 'es', 'muy', 'pues', 'y', 'lo', 'de', 'una']
const RESPUESTAS = {
  borrar: ['borralo', 'borra', 'borrar', 'borrelo', 'eliminalo', 'elimina', 'eliminar', 'anulalo', 'anula', 'anular', 'quitalo'],
  corregir: ['corrigelo', 'corrige', 'corregir', 'corrijalo', 'mal', 'cambialo', 'cambiar', 'equivoque', 'error', 'me', 'asi', 'hay', 'que'],
  si: ['si', 'sii', 'siii', 'sip', 'ok', 'okey', 'okay', 'dale', 'listo', 'correcto', 'perfecto', 'exacto', 'bien', 'claro', 'confirmo', 'confirmar', 'guardalo', 'guarda', 'asi', 'vale', 'va'],
} as const
const DECIDEN: Record<keyof typeof RESPUESTAS, string[]> = {
  borrar: RESPUESTAS.borrar.slice(),
  corregir: ['corrigelo', 'corrige', 'corregir', 'corrijalo', 'mal', 'cambialo', 'cambiar', 'equivoque', 'error'],
  si: RESPUESTAS.si.filter((p) => p !== 'asi'),
}
const MAX_PALABRAS = 6

/** "Sí, está bien" / "No, bórralo" / "corrígelo": la respuesta al "¿Está bien?", o null si es otra cosa */
export function respuestaAConfirmar(texto: string): 'si' | 'corregir' | 'borrar' | null {
  const palabras = normal(texto).split(' ').filter(Boolean)
  if (palabras.length === 0 || palabras.length > MAX_PALABRAS) return null
  for (const r of ['borrar', 'corregir', 'si'] as const) {
    const validas = new Set<string>([...RESPUESTAS[r], ...RELLENO])
    if (palabras.every((p) => validas.has(p)) && palabras.some((p) => DECIDEN[r].includes(p))) return r
  }
  return null
}

export const esSi = (texto: string) => SI.test(normal(texto)) && !NO.test(normal(texto))
export const esNo = (texto: string) => NO.test(normal(texto)) || /\b(sin|ninguna|no tengo)\b/.test(normal(texto))

/** La fila de una lista que nombra el texto ("fue una donación" → Donación). Si hay varias o ninguna, null. */
export function filaPorTexto<F extends Pick<Fila, 'id' | 'titulo'>>(texto: string, filas: F[], palabras: Record<string, string[]> = {}): F | null {
  const t = ` ${normal(texto)} `
  const nombra = (f: F) =>
    [normal(f.titulo), ...(palabras[f.id] ?? [])].some((p) => p && (t.includes(` ${p} `) || (p.length >= 5 && t.includes(p))))
  const halladas = filas.filter(nombra)
  return halladas.length === 1 ? halladas[0] : null
}
