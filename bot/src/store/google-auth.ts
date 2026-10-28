// Token de servicio de Google (placa viva Task 10a): JWT RS256 firmado con WebCrypto a partir de GOOGLE_SA_JSON,
// canjeado por un access token que se guarda 50 minutos en Kv (el token vale 60).
import type { Env } from '../env'
import type { Kv } from './kv'

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const TOKEN_URI_POR_DEFECTO = 'https://oauth2.googleapis.com/token'
const CLAVE_KV = 'google:token'
const TTL_SEGUNDOS = 50 * 60

interface CuentaServicio {
  client_email: string
  private_key: string
  token_uri: string
}

function leerCuenta(json: string | undefined): CuentaServicio {
  if (!json) throw new Error('Falta GOOGLE_SA_JSON')
  let crudo: unknown
  try {
    crudo = JSON.parse(json)
  } catch {
    throw new Error('GOOGLE_SA_JSON no es JSON válido')
  }
  const c = typeof crudo === 'object' && crudo !== null ? (crudo as Record<string, unknown>) : {}
  if (typeof c.client_email !== 'string' || typeof c.private_key !== 'string') {
    throw new Error('GOOGLE_SA_JSON no trae client_email y private_key')
  }
  return {
    client_email: c.client_email,
    private_key: c.private_key,
    token_uri: typeof c.token_uri === 'string' ? c.token_uri : TOKEN_URI_POR_DEFECTO,
  }
}

const aBase64Url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url')
const textoABase64Url = (texto: string) => aBase64Url(new TextEncoder().encode(texto))

/** PEM PKCS8 -> bytes. Tolera saltos de línea escritos como `\n` literal (variables de entorno mal escapadas). */
function pemABytes(pem: string): Uint8Array<ArrayBuffer> {
  const base64 = pem.replace(/-----[^-]+-----/g, '').replace(/\\n|\s/g, '')
  return Uint8Array.from(Buffer.from(base64, 'base64'))
}

async function firmarJwt(cuenta: CuentaServicio): Promise<string> {
  const llave = await crypto.subtle.importKey('pkcs8', pemABytes(cuenta.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const iat = Math.floor(Date.now() / 1000)
  const cabecera = textoABase64Url('{"alg":"RS256","typ":"JWT"}')
  const claims = textoABase64Url(JSON.stringify({ iss: cuenta.client_email, scope: SCOPE, aud: cuenta.token_uri, iat, exp: iat + 3600 }))
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', llave, new TextEncoder().encode(`${cabecera}.${claims}`))
  return `${cabecera}.${claims}.${aBase64Url(new Uint8Array(firma))}`
}

/** Access token de la cuenta de servicio, con caché de 50 minutos en Kv. */
export async function obtenerToken(env: Pick<Env, 'GOOGLE_SA_JSON'>, kv: Kv, fetchFn: FetchFn = fetch): Promise<string> {
  const guardado = await kv.get(CLAVE_KV)
  if (guardado !== null) return guardado

  const cuenta = leerCuenta(env.GOOGLE_SA_JSON)
  const assertion = await firmarJwt(cuenta)
  const respuesta = await fetchFn(cuenta.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
  })
  if (!respuesta.ok) throw new Error(`Google rechazó el token (${respuesta.status})`)

  const cuerpo: unknown = await respuesta.json()
  const token = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>).access_token : undefined
  if (typeof token !== 'string' || token === '') throw new Error('Google no devolvió access_token')

  await kv.put(CLAVE_KV, token, TTL_SEGUNDOS)
  return token
}
