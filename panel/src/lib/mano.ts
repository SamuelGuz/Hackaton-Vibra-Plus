// Utilidades para que las formas se vean hechas a mano, pero siempre iguales
// para el mismo elemento (no cambian en cada render).

/** Número pseudoaleatorio estable a partir de un texto (FNV-1a + xorshift). */
export function semilla(texto: string): () => number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 10000) / 10000
  }
}

/** Rotación pequeña y estable, p. ej. para fotos o etiquetas: entre -max y +max grados. */
export function giro(texto: string, max = 1.5): number {
  return (semilla(texto)() * 2 - 1) * max
}

/**
 * Trazo de "círculo dibujado a mano": un círculo cuyo radio varía un poco
 * en cada punto, unido con curvas suaves. Devuelve el atributo `d` de un <path>.
 */
export function circuloAMano(texto: string, cx: number, cy: number, r: number, variacion = 0.06): string {
  const rnd = semilla(texto)
  const puntos = 10
  const pts = Array.from({ length: puntos }, (_, i) => {
    const a = (i / puntos) * Math.PI * 2
    const rr = r * (1 + (rnd() * 2 - 1) * variacion)
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]
  })
  // Curva cerrada: cada punto medio es un ancla, cada punto original es el control
  const medio = (i: number) => {
    const [x1, y1] = pts[i % puntos]
    const [x2, y2] = pts[(i + 1) % puntos]
    return [(x1 + x2) / 2, (y1 + y2) / 2]
  }
  const [mx, my] = medio(0)
  let d = `M${mx.toFixed(1)},${my.toFixed(1)}`
  for (let i = 1; i <= puntos; i++) {
    const [cx1, cy1] = pts[i % puntos]
    const [ax, ay] = medio(i)
    d += ` Q${cx1.toFixed(1)},${cy1.toFixed(1)} ${ax.toFixed(1)},${ay.toFixed(1)}`
  }
  return d + 'Z'
}
