import { describe, expect, it } from 'vitest'
import { MemoryKv } from '../../src/store/kv'
import { canjearToken, crearTokenEnlace, firmarSesion, sesionDesdePeticion, verificarSesion } from '../../src/web/session'

const SECRETO = 'secreto-de-prueba'
const AHORA = 1_800_000_000_000
const DIA = 86_400_000

describe('sesión firmada', () => {
  it('ida y vuelta: la firma devuelve el agenteId', async () => {
    const token = await firmarSesion('p-andrea', SECRETO)
    expect(await verificarSesion(token, SECRETO)).toBe('p-andrea')
  })

  it('el token sirve como valor de cookie (sin espacios ni ; ni ,)', async () => {
    const token = await firmarSesion('p-andrea', SECRETO)
    expect(token).toMatch(/^[A-Za-z0-9_.-]+$/)
  })

  it('una cookie alterada da null', async () => {
    const token = await firmarSesion('p-andrea', SECRETO)
    const [cuerpo, ...resto] = token.split('.')
    const otro = Buffer.from('p-admin').toString('base64url')
    expect(cuerpo).not.toBe(otro)
    expect(await verificarSesion([otro, ...resto].join('.'), SECRETO)).toBeNull()
    const i = token.lastIndexOf('.') + 1
    const cambiada = token.slice(0, i) + (token[i] === 'A' ? 'B' : 'A') + token.slice(i + 1)
    expect(await verificarSesion(cambiada, SECRETO)).toBeNull()
    expect(await verificarSesion('basura', SECRETO)).toBeNull()
    expect(await verificarSesion('', SECRETO)).toBeNull()
    expect(await verificarSesion(null, SECRETO)).toBeNull()
  })

  it('con otro secreto da null', async () => {
    const token = await firmarSesion('p-andrea', SECRETO)
    expect(await verificarSesion(token, 'otro-secreto')).toBeNull()
  })

  it('vence a los 180 días por defecto', async () => {
    const token = await firmarSesion('p-andrea', SECRETO, AHORA + 180 * DIA)
    expect(await verificarSesion(token, SECRETO, AHORA + 179 * DIA)).toBe('p-andrea')
    expect(await verificarSesion(token, SECRETO, AHORA + 180 * DIA)).toBeNull()
  })

  it('un token vencido da null', async () => {
    const token = await firmarSesion('p-andrea', SECRETO, AHORA - 1)
    expect(await verificarSesion(token, SECRETO, AHORA)).toBeNull()
  })

  it('sin vencimiento explícito dura 180 días desde ahora', async () => {
    const token = await firmarSesion('p-andrea', SECRETO)
    expect(await verificarSesion(token, SECRETO, Date.now() + 179 * DIA)).toBe('p-andrea')
    expect(await verificarSesion(token, SECRETO, Date.now() + 181 * DIA)).toBeNull()
  })
})

describe('sesionDesdePeticion', () => {
  it('acepta la cookie hk entre otras cookies', async () => {
    const token = await firmarSesion('p-andrea', SECRETO, AHORA + DIA)
    const cookie = `a=1; hk=${token}; b=2`
    expect(await sesionDesdePeticion({ cookie }, SECRETO, AHORA)).toBe('p-andrea')
  })

  it('acepta Authorization: Bearer', async () => {
    const token = await firmarSesion('p-carlos', SECRETO, AHORA + DIA)
    expect(await sesionDesdePeticion({ authorization: `Bearer ${token}` }, SECRETO, AHORA)).toBe('p-carlos')
  })

  it('sin cookie ni cabecera da null', async () => {
    expect(await sesionDesdePeticion({}, SECRETO, AHORA)).toBeNull()
    expect(await sesionDesdePeticion({ cookie: null, authorization: null }, SECRETO, AHORA)).toBeNull()
  })

  it('token vencido o alterado en cualquiera de las dos vías da null', async () => {
    const vencido = await firmarSesion('p-andrea', SECRETO, AHORA - 1)
    expect(await sesionDesdePeticion({ cookie: `hk=${vencido}` }, SECRETO, AHORA)).toBeNull()
    expect(await sesionDesdePeticion({ authorization: `Bearer ${vencido}` }, SECRETO, AHORA)).toBeNull()
    expect(await sesionDesdePeticion({ authorization: 'Bearer x.y.z' }, SECRETO, AHORA)).toBeNull()
    expect(await sesionDesdePeticion({ authorization: 'Basic abc' }, SECRETO, AHORA)).toBeNull()
  })

  it('si la cookie no sirve usa el Bearer válido', async () => {
    const bueno = await firmarSesion('p-carlos', SECRETO, AHORA + DIA)
    expect(await sesionDesdePeticion({ cookie: 'hk=mala', authorization: `Bearer ${bueno}` }, SECRETO, AHORA)).toBe('p-carlos')
  })
})

describe('token de enlace de un solo uso', () => {
  it('se canjea una vez y la segunda vez da null', async () => {
    const kv = new MemoryKv()
    const token = await crearTokenEnlace(kv, 'p-andrea')
    expect(await canjearToken(kv, token)).toBe('p-andrea')
    expect(await canjearToken(kv, token)).toBeNull()
  })

  it('canjes simultáneos: solo uno gana', async () => {
    const kv = new MemoryKv()
    const token = await crearTokenEnlace(kv, 'p-andrea')
    const r = await Promise.all([canjearToken(kv, token), canjearToken(kv, token), canjearToken(kv, token)])
    expect(r.filter((x) => x === 'p-andrea')).toHaveLength(1)
  })

  it('un token desconocido da null', async () => {
    expect(await canjearToken(new MemoryKv(), 'no-existe')).toBeNull()
  })

  it('los tokens son distintos y aptos para URL', async () => {
    const kv = new MemoryKv()
    const a = await crearTokenEnlace(kv, 'p-andrea')
    const b = await crearTokenEnlace(kv, 'p-andrea')
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]{32,}$/)
  })

  it('vence a los 7 días', async () => {
    let ahora = 1_000_000
    const kv = new MemoryKv(() => ahora)
    const token = await crearTokenEnlace(kv, 'p-andrea')
    ahora += 7 * DIA - 1000
    expect(await kv.get(`enlace:${token}`)).toBe('p-andrea')
    ahora += 2000
    expect(await canjearToken(kv, token)).toBeNull()
  })
})
