// Que el agente se sienta como una persona con quien quiere adoptar: tarda lo que tardaría en escribir.
// El bot del equipo no usa esto: ahí lo útil es responder de una vez.

const BASE_MS = 1500
const POR_CARACTER_MS = 35
const MINIMO_MS = 2500
const MAXIMO_MS = 9000

/** Cuánto esperar antes de mandar `texto`, descontando lo que ya se tardó en pensarlo */
export function pausaParaEscribir(texto: string, yaTardoMs: number): number {
  const escribir = Math.min(MAXIMO_MS, Math.max(MINIMO_MS, BASE_MS + texto.length * POR_CARACTER_MS))
  return Math.max(0, escribir - yaTardoMs)
}

export const pausaReal = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms))
