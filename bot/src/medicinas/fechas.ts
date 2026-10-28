// Fechas como texto YYYY-MM-DD en hora de Colombia. Se comparan como texto (el orden alfabético es el cronológico).

const formatoBogota = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** "Hoy" en Bogotá (UTC-5, sin horario de verano) */
export function hoyBogota(ahora: Date): string {
  return formatoBogota.format(ahora)
}

function aUtc(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

export function aFechaISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function sumarDias(fecha: string, dias: number): string {
  return aFechaISO(aUtc(fecha) + dias * 86_400_000)
}

/** Días de `desde` a `hasta` (negativo si `hasta` es anterior) */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aUtc(hasta) - aUtc(desde)) / 86_400_000)
}

/** YYYY-MM-DD que existe en el calendario (rechaza 2027-02-30) */
export function esFechaISO(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  return aFechaISO(aUtc(texto)) === texto
}
