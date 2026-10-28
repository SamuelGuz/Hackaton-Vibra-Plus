// Usa la primera IA que responda: Gemini primero y OpenRouter si Gemini falla.
// Cuando a una se le acaba la cuota, se salta un rato para no hacer esperar a la persona en cada mensaje.
import type { EntradaIa, Entendido, Ia } from '../tipos.js'

export const PAUSA_SIN_CUOTA_MS = 10 * 60_000

export interface IaConNombre {
  nombre: string
  ia: Ia
}

export function esFaltaDeCuota(e: unknown): boolean {
  const texto = e instanceof Error ? `${e.message} ${(e as { status?: unknown }).status ?? ''}` : String(e)
  return /\b429\b|RESOURCE_EXHAUSTED|quota|cuota|rate.?limit|credits/i.test(texto)
}

export function crearIaConRespaldo(lista: IaConNombre[], ahora: () => number = Date.now): Ia {
  if (lista.length === 0) throw new Error('Se necesita al menos una IA')
  const pausadaHasta = new Map<string, number>()

  return {
    async entender(e: EntradaIa): Promise<Entendido> {
      const disponibles = lista.filter((x) => (pausadaHasta.get(x.nombre) ?? 0) <= ahora())
      // Si todas están en pausa, igual se intenta con todas: a lo mejor ya volvió la cuota
      const turno = disponibles.length ? disponibles : lista
      let ultimoError: unknown
      for (const { nombre, ia } of turno) {
        try {
          const r = await ia.entender(e)
          pausadaHasta.delete(nombre)
          return r
        } catch (err) {
          ultimoError = err
          const sinCuota = esFaltaDeCuota(err)
          if (sinCuota) pausadaHasta.set(nombre, ahora() + PAUSA_SIN_CUOTA_MS)
          console.error(`La IA ${nombre} falló${sinCuota ? ' (sin cuota, se pausa 10 min)' : ''}:`, err instanceof Error ? err.message : err)
        }
      }
      throw ultimoError
    },
  }
}
