import { afterEach, describe, expect, it, vi } from 'vitest'
import { crearCorreo, enviarCampana } from '../../src/campanas/enviar'
import { completar } from '../../src/campanas/plantilla'
import type { Correo } from '../../src/campanas/tipos'
import { CONFIG, CorreoFalso } from './fakes'

const campana = completar({
  asunto: 'Hola',
  preheader: 'p',
  saludo: 'Hola,',
  parrafos: ['Texto'],
  llamado: { texto: 'Ayuda', url: 'https://huellitas.test/' },
  perritos: [],
  objetivo: 'comida',
})
const mensaje = { para: 'ana@ej.test', asunto: 'Hola', html: '<p>x</p>', texto: 'x' }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('crearCorreo', () => {
  it('sin Resend ni SMTP no hay correo', () => {
    expect(crearCorreo(CONFIG)).toBeNull()
  })

  it('con clave de Resend llama a su API con la clave, el remitente y el contenido', async () => {
    const fetchFalso = vi.fn(async () => new Response(JSON.stringify({ id: 're_123' }), { status: 200 }))
    const correo = crearCorreo({ ...CONFIG, resendApiKey: 'resend_abc' }, { fetch: fetchFalso as unknown as typeof fetch })

    expect(await correo?.enviar(mensaje)).toEqual({ id: 're_123' })
    expect(fetchFalso).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ authorization: 'Bearer resend_abc', 'content-type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({
      from: CONFIG.remitente,
      to: 'ana@ej.test',
      subject: 'Hola',
      html: '<p>x</p>',
      text: 'x',
    })
  })

  it('sin inyección usa el fetch global', async () => {
    const fetchGlobal = vi.fn(async () => new Response('{"id":"re_9"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchGlobal)
    const correo = crearCorreo({ ...CONFIG, resendApiKey: 'k' })

    expect(await correo?.enviar(mensaje)).toEqual({ id: 're_9' })
    expect(fetchGlobal).toHaveBeenCalledTimes(1)
  })

  it('si Resend rechaza el envío lanza un error que no filtra la clave', async () => {
    const fetchFalso = vi.fn(async () => new Response(JSON.stringify({ message: 'Invalid from' }), { status: 422 }))
    const correo = crearCorreo({ ...CONFIG, resendApiKey: 'resend_secreta' }, { fetch: fetchFalso as unknown as typeof fetch })

    const error = await correo!.enviar(mensaje).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Resend respondió 422: Invalid from')
    expect((error as Error).message).not.toContain('resend_secreta')
  })

  it('con SMTP envía usando el transporte inyectado', async () => {
    const sendMail = vi.fn(async () => ({ messageId: '<m1@smtp>' }))
    const crearTransporte = vi.fn(() => ({ sendMail }))
    const correo = crearCorreo(
      { ...CONFIG, smtp: { host: 'smtp.ej.test', port: 465, user: 'u', pass: 'p' } },
      { crearTransporte },
    )

    expect(crearTransporte).toHaveBeenCalledWith({ host: 'smtp.ej.test', port: 465, user: 'u', pass: 'p' })
    expect(await correo?.enviar(mensaje)).toEqual({ id: '<m1@smtp>' })
    expect(sendMail).toHaveBeenCalledWith({ from: CONFIG.remitente, to: 'ana@ej.test', subject: 'Hola', html: '<p>x</p>', text: 'x' })
  })

  it('si hay clave de Resend no usa SMTP aunque también esté configurado', () => {
    const crearTransporte = vi.fn()
    crearCorreo(
      { ...CONFIG, resendApiKey: 'k', smtp: { host: 'h', port: 25, user: '', pass: '' } },
      { crearTransporte },
    )
    expect(crearTransporte).not.toHaveBeenCalled()
  })
})

describe('enviarCampana', () => {
  it('sigue con los demás si uno falla, quita duplicados y descarta correos mal escritos', async () => {
    const correo = new CorreoFalso()
    correo.fallarPara.add('b@ej.test')

    const r = await enviarCampana(correo, campana, ['a@ej.test', 'B@ej.test ', 'b@ej.test', 'c@ej.test', 'no-es-correo'])

    expect(r.enviados).toBe(2)
    expect([...r.fallidos].sort((x, y) => x.para.localeCompare(y.para))).toEqual([
      { para: 'b@ej.test', error: 'rebotó b@ej.test' },
      { para: 'no-es-correo', error: 'dirección no válida' },
    ])
    expect(correo.enviados.map((m) => m.para).sort()).toEqual(['a@ej.test', 'c@ej.test'])
    expect(correo.enviados[0]!.html).toBe(campana.html)
  })

  it('envía de a 3 como máximo', async () => {
    let enCurso = 0
    let maximo = 0
    const correo: Correo = {
      enviar: async () => {
        enCurso++
        maximo = Math.max(maximo, enCurso)
        await new Promise((resolver) => setTimeout(resolver, 5))
        enCurso--
        return {}
      },
    }
    const destinatarios = Array.from({ length: 7 }, (_, i) => `p${i}@ej.test`)

    const r = await enviarCampana(correo, campana, destinatarios)

    expect(r).toEqual({ enviados: 7, fallidos: [] })
    expect(maximo).toBe(3)
  })
})
