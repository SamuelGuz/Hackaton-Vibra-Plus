import type { Kv } from '../store/kv'

const DIA_MS = 86_400_000
const VIGENCIA_SESION_MS = 180 * DIA_MS
const TTL_ENLACE_S = 7 * 86_400
const enc = new TextEncoder()

function aBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url')
}

async function firma(cuerpo: string, secreto: string): Promise<Uint8Array> {
  const llave = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', llave, enc.encode(cuerpo)))
}

/** Compara en tiempo constante (el largo de una firma HMAC no es secreto). */
function iguales(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let dif = 0
  for (let i = 0; i < a.length; i++) dif |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return dif === 0
}

/**
 * Token de sesión `agente.vencimiento.firma` (base64url, HMAC-SHA256). Sirve igual como valor de la
 * cookie `hk` y como `Authorization: Bearer`. `venceEnMs` es el instante (epoch ms) en que deja de valer.
 */
export async function firmarSesion(agenteId: string, secreto: string, venceEnMs: number = Date.now() + VIGENCIA_SESION_MS): Promise<string> {
  const cuerpo = `${aBase64Url(enc.encode(agenteId))}.${Math.trunc(venceEnMs)}`
  return `${cuerpo}.${aBase64Url(await firma(cuerpo, secreto))}`
}

/** El agenteId del token, o null si está alterado, mal formado o vencido. */
export async function verificarSesion(token: string | null, secreto: string, ahoraMs: number = Date.now()): Promise<string | null> {
  if (!token) return null
  const partes = token.split('.')
  if (partes.length !== 3) return null
  const [agente, vence, recibida] = partes as [string, string, string]
  if (!/^\d+$/.test(vence)) return null
  const esperada = await firma(`${agente}.${vence}`, secreto)
  if (!iguales(esperada, new Uint8Array(Buffer.from(recibida, 'base64url')))) return null
  if (ahoraMs >= Number(vence)) return null
  return Buffer.from(agente, 'base64url').toString('utf8')
}

function cookieHk(cookie: string): string | null {
  for (const par of cookie.split(';')) {
    const i = par.indexOf('=')
    if (i > 0 && par.slice(0, i).trim() === 'hk') return par.slice(i + 1).trim()
  }
  return null
}

/** Sesión de una petición: la cookie `hk` (página) o `Authorization: Bearer` (panel). */
export async function sesionDesdePeticion(
  headers: { cookie?: string | null; authorization?: string | null },
  secreto: string,
  ahoraMs: number,
): Promise<string | null> {
  const deCookie = headers.cookie ? await verificarSesion(cookieHk(headers.cookie), secreto, ahoraMs) : null
  if (deCookie) return deCookie
  const bearer = headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]
  return bearer ? verificarSesion(bearer, secreto, ahoraMs) : null
}

const llaveEnlace = (token: string) => `enlace:${token}`
const llaveUsado = (token: string) => `enlace-usado:${token}`

/** Token de un solo uso para `/e/:token`, válido 7 días. */
export async function crearTokenEnlace(kv: Kv, agenteId: string): Promise<string> {
  const token = aBase64Url(crypto.getRandomValues(new Uint8Array(24)))
  await kv.put(llaveEnlace(token), agenteId, TTL_ENLACE_S)
  return token
}

/** El agenteId la primera vez; null si no existe, venció o ya se canjeó. Canjes simultáneos: gana uno. */
export async function canjearToken(kv: Kv, token: string): Promise<string | null> {
  const agenteId = await kv.get(llaveEnlace(token))
  if (agenteId === null) return null
  if (!(await kv.ponerSiNoExiste(llaveUsado(token), '1', TTL_ENLACE_S))) return null
  await kv.delete(llaveEnlace(token))
  return agenteId
}
