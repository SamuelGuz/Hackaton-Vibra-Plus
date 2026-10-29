// Conexión con el backend del refugio (el bot): de ahí salen la misión, lo que hace Yesenia y las donaciones.
// Si el backend no responde, se usa /data/progreso.json para que la página nunca quede en blanco.

/** Se fija al compilar: NEXT_PUBLIC_API_URL=http://localhost:8787 para probar en local */
export const API = (process.env.NEXT_PUBLIC_API_URL ?? 'https://bot.huellitasrefugio.lat').replace(/\/$/, '')

const ESPERA_MS = 6000

async function leer(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ESPERA_MS) })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

/** El progreso real del backend; si falla, el JSON de respaldo de la página */
export async function leerProgreso(): Promise<unknown> {
  try {
    return await leer(`${API}/api/publico/progreso`)
  } catch {
    return leer('/data/progreso.json')
  }
}

/** "Ya doné": le llega a Yesenia por WhatsApp para que confirme si le llegó. Nunca bloquea a la persona. */
export async function avisarDonacion(monto: number, apodo?: string): Promise<boolean> {
  try {
    const r = await fetch(`${API}/api/publico/donacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monto, ...(apodo ? { apodo } : {}) }),
      signal: AbortSignal.timeout(ESPERA_MS),
    })
    return r.ok
  } catch {
    return false
  }
}
