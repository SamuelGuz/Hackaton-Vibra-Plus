// Contexto de conversación por teléfono: el animal del que se está hablando (o un marcador como
// 'monto_pendiente:<id>'). Dura 10 min; guardar de nuevo lo pisa y reinicia el plazo.
import type { Kv } from '../store/kv'

const TTL_SEGUNDOS = 10 * 60

const clave = (tel: string) => `ctx:${tel}`

export async function guardarContexto(kv: Kv, tel: string, valor: string): Promise<void> {
  await kv.put(clave(tel), valor, TTL_SEGUNDOS)
}

export function leerContexto(kv: Kv, tel: string): Promise<string | null> {
  return kv.get(clave(tel))
}
