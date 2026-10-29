// Amount rules for the quick-donate page. Pure helpers so the server page and the client flow agree.

/** Pills shown on /aportar. Same values the Home offers, so `?monto=` from the Home always matches a pill. */
export const MONTOS = [10000, 20000, 50000] as const
export const MONTO_DEFECTO = 20000
export const MONTO_MIN = 1000
export const MONTO_MAX = 10_000_000

/** Reads `?monto=` / `?m=` ("20000", "20.000", "$20.000"). Returns null when missing or out of range. */
export function leerMonto(valor: string | string[] | undefined | null): number | null {
  const crudo = Array.isArray(valor) ? valor[0] : valor
  if (!crudo) return null
  const digitos = crudo.replace(/\D/g, '')
  if (!digitos) return null
  const n = Number.parseInt(digitos, 10)
  return Number.isFinite(n) && n >= MONTO_MIN && n <= MONTO_MAX ? n : null
}

export const esMontoFijo = (n: number) => (MONTOS as readonly number[]).includes(n)
