// Cliente mínimo de Google Sheets API v4 (placa viva Task 10a). Todo se escribe RAW (sin que Sheets interprete fórmulas ni fechas).
// Un fallo (429 de cuota, red) lanza ErrorSheets: la copia a Sheets nunca bloquea al usuario, la fila sigue en la cola (Review Focus 5).
import type { Env } from '../env'
import { obtenerToken, type FetchFn } from './google-auth'
import { HOJAS } from './hojas'
import type { Kv } from './kv'

const API = 'https://sheets.googleapis.com/v4/spreadsheets'

export class ErrorSheets extends Error {
  constructor(
    /** Estado HTTP de la respuesta (429 = cuota) */
    readonly estado: number,
    detalle: string,
  ) {
    super(`Sheets respondió ${estado}${detalle === '' ? '' : `: ${detalle}`}`)
    this.name = 'ErrorSheets'
  }
}

export class SheetsClient {
  constructor(
    private sheetsId: string,
    private tokenFn: () => Promise<string>,
    private fetchFn: FetchFn = fetch,
  ) {}

  private async pedir(ruta: string, metodo: 'GET' | 'POST' | 'PUT', cuerpo?: unknown): Promise<unknown> {
    const headers: Record<string, string> = { Authorization: `Bearer ${await this.tokenFn()}` }
    if (cuerpo !== undefined) headers['Content-Type'] = 'application/json'
    const respuesta = await this.fetchFn(`${API}/${this.sheetsId}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
    if (!respuesta.ok) throw new ErrorSheets(respuesta.status, (await respuesta.text().catch(() => '')).slice(0, 200))
    return respuesta.json().catch(() => ({}))
  }

  /** Todas las filas de la pestaña, encabezados incluidos (la fila 1). Una pestaña vacía devuelve []. */
  async leer(tab: string): Promise<string[][]> {
    const cuerpo = await this.pedir(`/values/${encodeURIComponent(tab)}`, 'GET')
    const values = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>).values : undefined
    return Array.isArray(values) ? values.map((fila) => (Array.isArray(fila) ? fila.map(String) : [])) : []
  }

  /** Agrega filas al final de la tabla de la pestaña. */
  async agregar(tab: string, filas: string[][]): Promise<void> {
    if (filas.length === 0) return
    await this.pedir(`/values/${encodeURIComponent(tab)}!A1:append?valueInputOption=RAW`, 'POST', { values: filas })
  }

  /** Reemplaza una fila. `fila` es el número de fila de la hoja: 1 son los encabezados, 2 el primer dato. */
  async actualizarFila(tab: string, fila: number, valores: string[]): Promise<void> {
    if (!Number.isInteger(fila) || fila < 1) throw new Error(`La fila debe ser un entero desde 1 (llegó ${fila})`)
    await this.pedir(`/values/${encodeURIComponent(tab)}!A${fila}?valueInputOption=RAW`, 'PUT', { values: [valores] })
  }

  /** Títulos de las pestañas que ya tiene el libro. */
  async pestanas(): Promise<string[]> {
    const cuerpo = await this.pedir('?fields=sheets.properties.title', 'GET')
    const hojas = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>).sheets : undefined
    if (!Array.isArray(hojas)) return []
    return hojas.flatMap((h: unknown) => {
      const props = typeof h === 'object' && h !== null ? (h as Record<string, unknown>).properties : undefined
      const titulo = typeof props === 'object' && props !== null ? (props as Record<string, unknown>).title : undefined
      return typeof titulo === 'string' ? [titulo] : []
    })
  }

  async crearPestana(tab: string): Promise<void> {
    await this.pedir(':batchUpdate', 'POST', { requests: [{ addSheet: { properties: { title: tab } } }] })
  }
}

/** El cliente de las variables de entorno, o null si falta SHEETS_ID o GOOGLE_SA_JSON (el servidor sigue sin copia a Sheets). */
export function sheetsDeEnv(env: Pick<Env, 'SHEETS_ID' | 'GOOGLE_SA_JSON'>, kv: Kv, fetchFn: FetchFn = fetch): SheetsClient | null {
  if (!env.SHEETS_ID || !env.GOOGLE_SA_JSON) return null
  return new SheetsClient(env.SHEETS_ID, () => obtenerToken(env, kv, fetchFn), fetchFn)
}

/**
 * Crea las pestañas de HOJAS que falten y escribe sus encabezados en la fila 1 si están vacías.
 * Es idempotente: no toca una pestaña que ya tiene filas. Devuelve las pestañas que cambió.
 */
export async function crearHojas(cliente: Pick<SheetsClient, 'pestanas' | 'crearPestana' | 'leer' | 'agregar'>): Promise<string[]> {
  const existentes = new Set(await cliente.pestanas())
  const cambiadas: string[] = []
  for (const [tab, cabecera] of Object.entries(HOJAS)) {
    const nueva = !existentes.has(tab)
    if (nueva) await cliente.crearPestana(tab)
    if ((await cliente.leer(tab)).length > 0) continue
    await cliente.agregar(tab, [cabecera])
    cambiadas.push(tab)
  }
  return cambiadas
}
