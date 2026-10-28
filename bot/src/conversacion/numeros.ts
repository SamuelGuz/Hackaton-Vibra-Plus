// Montos y cantidades como los escribe o los dice la gente: "50 mil", "$150.000", "un millón y medio", "dos".

const PALABRAS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100, ciento: 100,
  doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700,
  ochocientos: 800, novecientos: 900,
}

export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** "150.000" → 150000; "1,5" → 1.5; "50" → 50 */
function leerCifra(token: string): number {
  if (/^\d{1,3}([.,]\d{3})+$/.test(token)) return Number(token.replace(/[.,]/g, ''))
  return Number(token.replace(',', '.'))
}

/** Pesos enteros, o null si no se encontró un monto. */
export function parsearMonto(texto: string): number | null {
  let t = sinTildes(texto.toLowerCase())
    .replace(/\$/g, ' ')
    .replace(/\bpesos?\b/g, ' ')
    .replace(/\b(un )?millon y medio\b/g, '1.5 millones')
    .replace(/\bmedio millon\b/g, '500 mil')
  for (const [palabra, n] of Object.entries(PALABRAS)) t = t.replace(new RegExp(`\\b${palabra}\\b`, 'g'), String(n))

  const partes = [...t.matchAll(/(\d[\d.,]*)\s*(millones|millon|mil|lucas|luca|k)?\b/g)]
  if (partes.length === 0) return null

  // "ciento cincuenta mil" llega como "100 50 mil": las cifras sueltas se suman antes del multiplicador
  let total = 0
  let suelto = 0
  let conMultiplicador = false
  for (const [, cifra, mult] of partes) {
    const n = leerCifra(cifra.replace(/[.,]$/, ''))
    if (!Number.isFinite(n)) continue
    if (!mult) {
      suelto += n
      continue
    }
    total += (suelto + n) * (mult === 'millones' || mult === 'millon' ? 1_000_000 : 1_000)
    suelto = 0
    conMultiplicador = true
  }
  total = conMultiplicador ? total + suelto : leerCifra(partes[0][1].replace(/[.,]$/, ''))

  const monto = Math.round(total)
  return monto > 0 && monto < 1_000_000_000 ? monto : null
}

/** Un número entero pequeño ("3", "tres bultos"), o null. */
export function parsearCantidad(texto: string): number | null {
  const t = sinTildes(texto.toLowerCase())
  const cifra = t.match(/\d+/)
  if (cifra) return Number(cifra[0])
  for (const palabra of t.split(/\W+/)) if (PALABRAS[palabra] !== undefined) return PALABRAS[palabra]
  return null
}
