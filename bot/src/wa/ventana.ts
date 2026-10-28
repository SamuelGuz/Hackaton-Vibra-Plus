// Ventana de servicio de 24 h de WhatsApp: solo se puede escribir texto libre si la persona
// nos escribió hace menos de 24 h. Se guarda el instante (ms) del último mensaje entrante.
import type { Kv } from '../store/kv'

const VENTANA_MS = 24 * 60 * 60 * 1000
// Margen sobre la ventana para que el Kv limpie la clave sin que el vencimiento decida nada
const TTL_SEGUNDOS = 25 * 60 * 60

const clave = (tel: string) => `ventana:${tel}`

/** Registra un mensaje entrante recibido en `ts` (ms). Un `ts` más viejo que el guardado no lo acorta. */
export async function marcarVentana(kv: Kv, tel: string, ts: number): Promise<void> {
  const previo = Number(await kv.get(clave(tel)))
  if (Number.isFinite(previo) && previo >= ts) return
  await kv.put(clave(tel), String(ts), TTL_SEGUNDOS)
}

/** Abierta mientras hayan pasado menos de 24 h desde el último mensaje de la persona. */
export async function ventanaAbierta(kv: Kv, tel: string, ahoraMs: number): Promise<boolean> {
  const guardado = await kv.get(clave(tel))
  if (guardado === null) return false
  const ts = Number(guardado)
  return Number.isFinite(ts) && ahoraMs - ts < VENTANA_MS
}
