import { readFileSync } from 'node:fs'
import { verify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { obtenerToken } from '../../src/store/google-auth'
import { MemoryKv } from '../../src/store/kv'

const llavePrivada = readFileSync(new URL('../fixtures/google/clave-privada.pem', import.meta.url), 'utf8')
const llavePublica = readFileSync(new URL('../fixtures/google/clave-publica.pem', import.meta.url), 'utf8')

const TOKEN_URI = 'https://oauth2.googleapis.com/token'
const cuenta = JSON.stringify({
  client_email: 'huellitas@proyecto.iam.gserviceaccount.com',
  private_key: llavePrivada,
  token_uri: TOKEN_URI,
})

interface Llamada {
  url: string
  metodo: string
  contentType: string | null
  form: URLSearchParams
}

/** fetch falso de Google OAuth: responde un token y anota cada llamada. */
function googleFalso(respuesta: { status: number; cuerpo: unknown } = { status: 200, cuerpo: { access_token: 'ya29.token-1', expires_in: 3600 } }) {
  const llamadas: Llamada[] = []
  const fetchFn = async (input: string, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers)
    llamadas.push({
      url: input,
      metodo: init?.method ?? 'GET',
      contentType: headers.get('content-type'),
      form: new URLSearchParams(String(init?.body ?? '')),
    })
    return new Response(JSON.stringify(respuesta.cuerpo), { status: respuesta.status })
  }
  return { fetchFn, llamadas }
}

const partes = (jwt: string) => {
  const [cabecera, claims, firma] = jwt.split('.')
  if (cabecera === undefined || claims === undefined || firma === undefined) throw new Error('El JWT no tiene 3 partes')
  return { cabecera, claims, firma }
}
const decodificar = (b64url: string): unknown => JSON.parse(Buffer.from(b64url, 'base64url').toString('utf8'))

describe('obtenerToken', () => {
  it('pide el token con un JWT RS256 cuyo header es {"alg":"RS256","typ":"JWT"}', async () => {
    const { fetchFn, llamadas } = googleFalso()
    const token = await obtenerToken({ GOOGLE_SA_JSON: cuenta }, new MemoryKv(), fetchFn)

    expect(token).toBe('ya29.token-1')
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]?.url).toBe(TOKEN_URI)
    expect(llamadas[0]?.metodo).toBe('POST')
    expect(llamadas[0]?.contentType).toBe('application/x-www-form-urlencoded')
    expect(llamadas[0]?.form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')

    const jwt = partes(llamadas[0]?.form.get('assertion') ?? '')
    expect(Buffer.from(jwt.cabecera, 'base64url').toString('utf8')).toBe('{"alg":"RS256","typ":"JWT"}')
  })

  it('el claim scope incluye spreadsheets y el JWT identifica a la cuenta de servicio', async () => {
    const { fetchFn, llamadas } = googleFalso()
    await obtenerToken({ GOOGLE_SA_JSON: cuenta }, new MemoryKv(), fetchFn)

    const { claims } = partes(llamadas[0]?.form.get('assertion') ?? '')
    const c = decodificar(claims) as Record<string, unknown>
    expect(String(c.scope)).toContain('spreadsheets')
    expect(c.iss).toBe('huellitas@proyecto.iam.gserviceaccount.com')
    expect(c.aud).toBe(TOKEN_URI)
    expect(typeof c.iat).toBe('number')
    expect(c.exp).toBe(Number(c.iat) + 3600)
  })

  it('la firma se verifica con la llave pública del fixture', async () => {
    const { fetchFn, llamadas } = googleFalso()
    await obtenerToken({ GOOGLE_SA_JSON: cuenta }, new MemoryKv(), fetchFn)

    const { cabecera, claims, firma } = partes(llamadas[0]?.form.get('assertion') ?? '')
    const valida = verify('RSA-SHA256', Buffer.from(`${cabecera}.${claims}`), llavePublica, Buffer.from(firma, 'base64url'))
    expect(valida).toBe(true)
  })

  it('guarda el token 50 minutos en Kv y no vuelve a pedirlo antes', async () => {
    let ahora = 1_000_000
    const kv = new MemoryKv(() => ahora)
    const { fetchFn, llamadas } = googleFalso()

    expect(await obtenerToken({ GOOGLE_SA_JSON: cuenta }, kv, fetchFn)).toBe('ya29.token-1')
    ahora += 49 * 60 * 1000
    expect(await obtenerToken({ GOOGLE_SA_JSON: cuenta }, kv, fetchFn)).toBe('ya29.token-1')
    expect(llamadas).toHaveLength(1)

    ahora += 2 * 60 * 1000 // pasaron 51 minutos
    await obtenerToken({ GOOGLE_SA_JSON: cuenta }, kv, fetchFn)
    expect(llamadas).toHaveLength(2)
  })

  it('sin GOOGLE_SA_JSON lanza un error claro y no llama a Google', async () => {
    const { fetchFn, llamadas } = googleFalso()
    await expect(obtenerToken({}, new MemoryKv(), fetchFn)).rejects.toThrow('Falta GOOGLE_SA_JSON')
    expect(llamadas).toHaveLength(0)
  })

  it('si Google rechaza el JWT lanza el error con el estado y no guarda nada en Kv', async () => {
    const kv = new MemoryKv()
    const { fetchFn } = googleFalso({ status: 400, cuerpo: { error: 'invalid_grant' } })
    await expect(obtenerToken({ GOOGLE_SA_JSON: cuenta }, kv, fetchFn)).rejects.toThrow('Google rechazó el token (400)')

    const bueno = googleFalso()
    expect(await obtenerToken({ GOOGLE_SA_JSON: cuenta }, kv, bueno.fetchFn)).toBe('ya29.token-1')
  })

  it('un GOOGLE_SA_JSON sin private_key o client_email lanza un error claro', async () => {
    await expect(obtenerToken({ GOOGLE_SA_JSON: '{"client_email":"a@b.c"}' }, new MemoryKv(), googleFalso().fetchFn)).rejects.toThrow(
      'GOOGLE_SA_JSON no trae client_email y private_key',
    )
    await expect(obtenerToken({ GOOGLE_SA_JSON: 'no es json' }, new MemoryKv(), googleFalso().fetchFn)).rejects.toThrow('GOOGLE_SA_JSON no es JSON válido')
  })
})
