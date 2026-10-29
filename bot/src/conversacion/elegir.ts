// Responder escribiendo o en audio lo que también se puede tocar: "sí", "bórralo", "sin foto", el nombre de una opción.
import type { Fila } from '../tipos.js'
import { sinTildes } from './numeros.js'

/** Minúsculas, sin tildes ni signos: "¡Sí, está bien!" → "si esta bien" */
export const normal = (t: string) =>
  sinTildes(t.toLowerCase())
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const BORRAR = /\b(borra(lo|r)?|elimina(lo|r)?|anula(lo|r)?|quita(lo|r)?)\b/
const CORREGIR = /\b(corrig\w*|corregir|esta mal|no es asi|cambia(lo|r)?|me equivoque)\b/
const SI = /^(si|sii+|sip|ok|okey|okay|dale|listo|correcto|perfecto|exacto|bien|claro|confirmo|confirmar|guarda(lo)?)\b|\b(esta bien|todo bien|asi es|eso es)\b/
const NO = /^(no|nop|nel)\b/

/** "Sí, está bien" / "No, bórralo" / "corrígelo": la respuesta al "¿Está bien?", o null si es otra cosa */
export function respuestaAConfirmar(texto: string): 'si' | 'corregir' | 'borrar' | null {
  const t = normal(texto)
  if (BORRAR.test(t)) return 'borrar'
  if (CORREGIR.test(t)) return 'corregir'
  if (SI.test(t)) return 'si'
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
