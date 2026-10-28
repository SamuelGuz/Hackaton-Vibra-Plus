import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MemoryKv } from '../../src/store/kv'
import { HOJAS } from '../../src/store/hojas'
import { crearHojas, ErrorSheets, SheetsClient, sheetsDeEnv } from '../../src/store/sheets'

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets/HOJA123'

interface Llamada {
  url: string
  metodo: string
  autorizacion: string | null
  contentType: string | null
  cuerpo: unknown
}

type Respuesta = { status: number; cuerpo: unknown }

/** fetch falso de Sheets: responde en orden lo que se le da y anota cada llamada. */
function sheetsFalso(...respuestas: Respuesta[]) {
  const llamadas: Llamada[] = []
  const pendientes = [...respuestas]
  const fetchFn = async (input: string, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers)
    llamadas.push({
      url: input,
      metodo: init?.method ?? 'GET',
      autorizacion: headers.get('authorization'),
      contentType: headers.get('content-type'),
      cuerpo: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    })
    const r = pendientes.shift() ?? { status: 200, cuerpo: {} }
    return new Response(JSON.stringify(r.cuerpo), { status: r.status })
  }
  return { fetchFn, llamadas }
}

const token = async () => 'tok-abc'

describe('SheetsClient.leer', () => {
  it('pide los valores de la pestaña con el token de servicio y devuelve las filas', async () => {
    const { fetchFn, llamadas } = sheetsFalso({ status: 200, cuerpo: { values: [['id', 'nombre'], ['a1', 'Luna']] } })
    const filas = await new SheetsClient('HOJA123', token, fetchFn).leer('Animales')

    expect(filas).toEqual([['id', 'nombre'], ['a1', 'Luna']])
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]?.metodo).toBe('GET')
    expect(llamadas[0]?.url).toBe(`${BASE}/values/Animales`)
    expect(llamadas[0]?.autorizacion).toBe('Bearer tok-abc')
  })

  it('una pestaña vacía (Sheets no manda "values") devuelve []', async () => {
    const { fetchFn } = sheetsFalso({ status: 200, cuerpo: { range: 'Animales!A1:Z1000' } })
    expect(await new SheetsClient('HOJA123', token, fetchFn).leer('Animales')).toEqual([])
  })

  it('un error HTTP lanza ErrorSheets con el estado (429 = cuota)', async () => {
    const { fetchFn } = sheetsFalso({ status: 429, cuerpo: { error: { message: 'Quota exceeded' } } })
    const intento = new SheetsClient('HOJA123', token, fetchFn).leer('Animales')
    await expect(intento).rejects.toBeInstanceOf(ErrorSheets)
    await expect(intento).rejects.toMatchObject({ estado: 429 })
    await expect(intento).rejects.toThrow('Sheets respondió 429')
  })
})

describe('SheetsClient.agregar', () => {
  it('hace POST a values/{tab}!A1:append?valueInputOption=RAW con las filas', async () => {
    const { fetchFn, llamadas } = sheetsFalso()
    await new SheetsClient('HOJA123', token, fetchFn).agregar('Eventos', [['r-1', 'x'], ['r-2', 'y']])

    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]?.metodo).toBe('POST')
    expect(llamadas[0]?.url).toBe(`${BASE}/values/Eventos!A1:append?valueInputOption=RAW`)
    expect(llamadas[0]?.autorizacion).toBe('Bearer tok-abc')
    expect(llamadas[0]?.contentType).toBe('application/json')
    expect(llamadas[0]?.cuerpo).toEqual({ values: [['r-1', 'x'], ['r-2', 'y']] })
  })

  it('sin filas no llama a Google', async () => {
    const { fetchFn, llamadas } = sheetsFalso()
    await new SheetsClient('HOJA123', token, fetchFn).agregar('Eventos', [])
    expect(llamadas).toHaveLength(0)
  })

  it('un 429 lanza ErrorSheets: la fila sigue en la cola para el próximo cron', async () => {
    const { fetchFn } = sheetsFalso({ status: 429, cuerpo: {} })
    await expect(new SheetsClient('HOJA123', token, fetchFn).agregar('Eventos', [['r-1']])).rejects.toMatchObject({ estado: 429 })
  })
})

describe('SheetsClient.actualizarFila', () => {
  it('hace PUT a values/{tab}!A{fila}?valueInputOption=RAW con la fila (la 1 son los encabezados)', async () => {
    const { fetchFn, llamadas } = sheetsFalso()
    await new SheetsClient('HOJA123', token, fetchFn).actualizarFila('Eventos', 5, ['r-1', 'confirmado'])

    expect(llamadas[0]?.metodo).toBe('PUT')
    expect(llamadas[0]?.url).toBe(`${BASE}/values/Eventos!A5?valueInputOption=RAW`)
    expect(llamadas[0]?.cuerpo).toEqual({ values: [['r-1', 'confirmado']] })
  })

  it('una fila menor que 1 lanza un error y no llama a Google', async () => {
    const { fetchFn, llamadas } = sheetsFalso()
    await expect(new SheetsClient('HOJA123', token, fetchFn).actualizarFila('Eventos', 0, ['x'])).rejects.toThrow('fila')
    expect(llamadas).toHaveLength(0)
  })
})

describe('SheetsClient: pestañas', () => {
  it('pestanas lista los títulos del libro', async () => {
    const { fetchFn, llamadas } = sheetsFalso({ status: 200, cuerpo: { sheets: [{ properties: { title: 'Hoja 1' } }, { properties: { title: 'Animales' } }] } })
    expect(await new SheetsClient('HOJA123', token, fetchFn).pestanas()).toEqual(['Hoja 1', 'Animales'])
    expect(llamadas[0]?.url).toBe(`${BASE}?fields=sheets.properties.title`)
  })

  it('crearPestana usa batchUpdate con addSheet', async () => {
    const { fetchFn, llamadas } = sheetsFalso()
    await new SheetsClient('HOJA123', token, fetchFn).crearPestana('Eventos')
    expect(llamadas[0]?.metodo).toBe('POST')
    expect(llamadas[0]?.url).toBe(`${BASE}:batchUpdate`)
    expect(llamadas[0]?.cuerpo).toEqual({ requests: [{ addSheet: { properties: { title: 'Eventos' } } }] })
  })
})

describe('crearHojas', () => {
  /** Libro en memoria que implementa solo lo que usa crearHojas. */
  function libro(existentes: Record<string, string[][]>) {
    const tabs = new Map(Object.entries(existentes))
    return {
      tabs,
      cliente: {
        pestanas: async () => [...tabs.keys()],
        crearPestana: async (tab: string) => void tabs.set(tab, []),
        leer: async (tab: string) => tabs.get(tab) ?? [],
        agregar: async (tab: string, filas: string[][]) => void tabs.set(tab, [...(tabs.get(tab) ?? []), ...filas]),
      },
    }
  }

  it('crea las pestañas que faltan y escribe sus encabezados en la fila 1', async () => {
    const { tabs, cliente } = libro({ 'Hoja 1': [] })
    const creadas = await crearHojas(cliente)

    expect(creadas.sort()).toEqual(Object.keys(HOJAS).sort())
    for (const [tab, cabecera] of Object.entries(HOJAS)) expect(tabs.get(tab), tab).toEqual([cabecera])
  })

  it('es idempotente: no toca una pestaña que ya tiene datos ni repite encabezados', async () => {
    const { tabs, cliente } = libro({ Animales: [HOJAS.Animales ?? [], ['perro-1', 'Mateo']] })
    await crearHojas(cliente)
    const segunda = await crearHojas(cliente)

    expect(segunda).toEqual([])
    expect(tabs.get('Animales')).toEqual([HOJAS.Animales, ['perro-1', 'Mateo']])
    expect(tabs.get('Eventos')).toEqual([HOJAS.Eventos])
  })
})

describe('sheetsDeEnv', () => {
  it('sin SHEETS_ID o sin GOOGLE_SA_JSON devuelve null', () => {
    expect(sheetsDeEnv({}, new MemoryKv())).toBeNull()
    expect(sheetsDeEnv({ SHEETS_ID: 'H' }, new MemoryKv())).toBeNull()
    expect(sheetsDeEnv({ GOOGLE_SA_JSON: '{}' }, new MemoryKv())).toBeNull()
  })

  it('con ambos arma un cliente que pide el token de servicio y lo usa en Sheets', async () => {
    const privada = readFileSync(new URL('../fixtures/google/clave-privada.pem', import.meta.url), 'utf8')
    const env = { SHEETS_ID: 'HOJA123', GOOGLE_SA_JSON: JSON.stringify({ client_email: 'a@b.iam', private_key: privada, token_uri: 'https://oauth.test/token' }) }
    const urls: string[] = []
    const autorizaciones: Array<string | null> = []
    const fetchFn = async (input: string, init?: RequestInit): Promise<Response> => {
      urls.push(input)
      autorizaciones.push(new Headers(init?.headers).get('authorization'))
      return input === 'https://oauth.test/token'
        ? new Response(JSON.stringify({ access_token: 'tok-real', expires_in: 3600 }))
        : new Response(JSON.stringify({ values: [['id']] }))
    }

    const cliente = sheetsDeEnv(env, new MemoryKv(), fetchFn)
    expect(await cliente?.leer('Animales')).toEqual([['id']])
    expect(urls).toEqual(['https://oauth.test/token', `${BASE}/values/Animales`])
    expect(autorizaciones[1]).toBe('Bearer tok-real')
  })
})
