import { describe, expect, it } from 'vitest'
import { crearCorreo, leerConfigCorreo } from '../../src/campanas/index.js'

const URL_BASE = 'https://huellitas.test'

describe('leerConfigCorreo', () => {
  it('sin variables: remitente por defecto y ningún canal de correo', () => {
    const cfg = leerConfigCorreo({}, URL_BASE, null)

    expect(cfg).toEqual({ remitente: 'Refugio Yesenia <onboarding@resend.dev>', urlBase: URL_BASE, whatsappPublico: null })
    expect(crearCorreo(cfg)).toBeNull()
  })

  it('lee Resend, SMTP y la clave de envío del entorno', () => {
    const cfg = leerConfigCorreo(
      {
        CORREO_REMITENTE: 'Huellitas <hola@ej.test>',
        RESEND_API_KEY: 're_1',
        SMTP_HOST: 'smtp.ej.test',
        SMTP_PORT: '2525',
        SMTP_USER: 'u',
        SMTP_PASS: 'p',
        SMTP_SECURE: 'true',
        CAMPANAS_CLAVE: 'clave',
      },
      URL_BASE,
      '573001234567',
    )

    expect(cfg).toEqual({
      remitente: 'Huellitas <hola@ej.test>',
      resendApiKey: 're_1',
      smtp: { host: 'smtp.ej.test', port: 2525, user: 'u', pass: 'p', secure: true },
      claveEnvio: 'clave',
      urlBase: URL_BASE,
      whatsappPublico: '573001234567',
    })
  })

  it('SMTP sin puerto usa 587 y sin TLS directo', () => {
    const cfg = leerConfigCorreo({ SMTP_HOST: 'smtp.ej.test' }, URL_BASE, null)
    expect(cfg.smtp).toEqual({ host: 'smtp.ej.test', port: 587, user: '', pass: '', secure: false })
  })
})
