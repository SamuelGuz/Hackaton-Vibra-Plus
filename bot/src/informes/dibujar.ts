// HTML → PNG con Chrome o Edge sin ventana (puppeteer-core usa el navegador que ya está instalado).
// En un servidor Linux se instala chromium y se indica con CHROME_PATH.
import { existsSync } from 'node:fs'
import puppeteer, { type Browser } from 'puppeteer-core'
import { ANCHO } from './plantilla.js'

const ESPERA_MAXIMA_MS = 20_000

const CANDIDATOS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

export function buscarNavegador(): string | null {
  return CANDIDATOS.find((r): r is string => Boolean(r) && existsSync(r!)) ?? null
}

/** Devuelve una función que dibuja HTML como PNG. El navegador se abre la primera vez y se reutiliza. */
export function crearDibujante(ruta = buscarNavegador()): (html: string) => Promise<Buffer> {
  let navegador: Promise<Browser> | null = null
  // Una imagen a la vez: así el navegador no se come la memoria con una ráfaga de pedidos
  let fila: Promise<unknown> = Promise.resolve()

  const abrir = () => {
    if (!ruta) throw new Error('No encontré Chrome ni Edge para dibujar los informes: indica la ruta en CHROME_PATH')
    navegador ??= puppeteer
      .launch({ executablePath: ruta, headless: true, args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] })
      .then((b) => {
        b.on('disconnected', () => (navegador = null))
        return b
      })
      .catch((e) => {
        navegador = null
        throw e
      })
    return navegador
  }

  async function dibujar(html: string): Promise<Buffer> {
    const pagina = await (await abrir()).newPage()
    try {
      await pagina.setViewport({ width: ANCHO, height: 800, deviceScaleFactor: 2 })
      await pagina.setContent(html, { waitUntil: 'load', timeout: ESPERA_MAXIMA_MS })
      await pagina.evaluate(() => document.fonts.ready)
      return Buffer.from(await pagina.screenshot({ type: 'png', fullPage: true }))
    } finally {
      await pagina.close().catch(() => {})
    }
  }

  return (html) => {
    const turno = fila.then(() => dibujar(html))
    fila = turno.catch(() => {})
    return turno
  }
}
