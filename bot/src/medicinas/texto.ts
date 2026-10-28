// Utilidades de texto para buscar sin importar tildes, mayúsculas ni pequeños errores de tipeo.

/** "  Champú  Medicado (Dolor)! " → "champu medicado dolor" */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function palabras(texto: string): string[] {
  const n = normalizar(texto)
  return n === '' ? [] : n.split(' ')
}

/** Plural simple en español: "parasitos" → "parasito", "pastillas" → "pastilla" */
export function singular(palabra: string): string {
  if (palabra.length > 4 && /(iones|ores|ales)$/.test(palabra)) return palabra.slice(0, -2)
  if (palabra.length > 3 && palabra.endsWith('s')) return palabra.slice(0, -1)
  return palabra
}

/** Distancia de edición (Levenshtein). Si supera `max` devuelve max + 1 sin terminar de calcular. */
export function distancia(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const actual = [i]
    let minimo = i
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      const v = Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + costo)
      actual.push(v)
      if (v < minimo) minimo = v
    }
    if (minimo > max) return max + 1
    anterior = actual
  }
  return anterior[b.length]
}
