import { describe, expect, it } from 'vitest'
import { leerEnv } from '../src/env'

const MINIMO = { SESSION_SECRET: 's3creto-de-prueba' }

describe('leerEnv', () => {
  it('con solo el secreto de sesión usa los valores por defecto', () => {
    const env = leerEnv(MINIMO)
    expect(env.PORT).toBe(8787)
    expect(env.SESSION_SECRET).toBe('s3creto-de-prueba')
    expect(env.BASE_URL).toBe('http://localhost:8787')
    expect(env.PANEL_URL).toBe('http://localhost:5173')
    expect(env.PANEL_ORIGIN).toBe('http://localhost:5173')
    expect(env.DATABASE_URL).toBeUndefined()
    expect(env.WA_APP_SECRET).toBeUndefined()
    expect(env.GEMINI_API_KEY).toBeUndefined()
  })

  it('lee el puerto como número', () => {
    expect(leerEnv({ ...MINIMO, PORT: '9000' }).PORT).toBe(9000)
  })

  it('quita la barra final de las direcciones', () => {
    const env = leerEnv({ ...MINIMO, BASE_URL: 'https://api.huellitas.org/', PANEL_URL: 'https://panel.huellitas.org/' })
    expect(env.BASE_URL).toBe('https://api.huellitas.org')
    expect(env.PANEL_URL).toBe('https://panel.huellitas.org')
  })

  it('saca el origen del panel de PANEL_URL cuando no se da PANEL_ORIGIN', () => {
    expect(leerEnv({ ...MINIMO, PANEL_URL: 'https://panel.huellitas.org/app' }).PANEL_ORIGIN).toBe('https://panel.huellitas.org')
    expect(leerEnv({ ...MINIMO, PANEL_URL: 'https://panel.huellitas.org', PANEL_ORIGIN: 'https://otro.org' }).PANEL_ORIGIN).toBe('https://otro.org')
  })

  it('pasa las variables opcionales y trata la cadena vacía como ausente', () => {
    const env = leerEnv({
      ...MINIMO,
      DATABASE_URL: 'postgres://u:p@h/db',
      WA_TOKEN: 'tok',
      WA_PHONE_ID: '123',
      WA_APP_SECRET: 'app',
      WA_VERIFY_TOKEN: 'ver',
      WA_NUMERO_BOT: '573001112233',
      GEMINI_API_KEY: '',
      GEMINI_MODEL: 'gemini-flash',
      SHEETS_ID: 'hoja',
      GOOGLE_SA_JSON: '{}',
    })
    expect(env.DATABASE_URL).toBe('postgres://u:p@h/db')
    expect(env.WA_TOKEN).toBe('tok')
    expect(env.WA_PHONE_ID).toBe('123')
    expect(env.WA_APP_SECRET).toBe('app')
    expect(env.WA_VERIFY_TOKEN).toBe('ver')
    expect(env.WA_NUMERO_BOT).toBe('573001112233')
    expect(env.GEMINI_API_KEY).toBeUndefined()
    expect(env.GEMINI_MODEL).toBe('gemini-flash')
    expect(env.SHEETS_ID).toBe('hoja')
    expect(env.GOOGLE_SA_JSON).toBe('{}')
  })

  it('falla con un mensaje claro si falta SESSION_SECRET', () => {
    expect(() => leerEnv({})).toThrow('Falta la variable de entorno SESSION_SECRET')
    expect(() => leerEnv({ SESSION_SECRET: '' })).toThrow('Falta la variable de entorno SESSION_SECRET')
  })

  it('falla si el puerto no es un número', () => {
    expect(() => leerEnv({ ...MINIMO, PORT: 'abc' })).toThrow('PORT debe ser un número')
  })
})
