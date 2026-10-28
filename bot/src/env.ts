// Variables de entorno del servidor. Solo SESSION_SECRET es obligatoria: sin las demás el servidor
// arranca igual (MemoryRepo sin DATABASE_URL, webhook en 503 sin WA_APP_SECRET; D5 y D12).

export interface Env {
  PORT: number
  /** Postgres. Sin ella el servidor usa MemoryRepo con la semilla. */
  DATABASE_URL?: string
  /** Llave para firmar las sesiones del panel y de la ficha */
  SESSION_SECRET: string
  /** Dirección pública del servidor, sin "/" final: arma /e/:token y /p/:codigo */
  BASE_URL: string
  /** Dirección del panel, sin "/" final: el enlace personal es PANEL_URL/?t=<sesión> */
  PANEL_URL: string
  /** Origen permitido por CORS (solo el panel) */
  PANEL_ORIGIN: string
  WA_TOKEN?: string
  WA_PHONE_ID?: string
  /** Firma de los webhooks de Meta. Sin ella el webhook responde 503. */
  WA_APP_SECRET?: string
  WA_VERIFY_TOKEN?: string
  /** Número del bot, solo dígitos: arma los enlaces wa.me */
  WA_NUMERO_BOT?: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  SHEETS_ID?: string
  GOOGLE_SA_JSON?: string
}

const sinBarraFinal = (url: string) => url.replace(/\/+$/, '')

/** Una variable vacía cuenta como ausente. */
function opcional(fuente: Record<string, string | undefined>, nombre: string): string | undefined {
  const valor = fuente[nombre]
  return valor === undefined || valor === '' ? undefined : valor
}

export function leerEnv(fuente: Record<string, string | undefined>): Env {
  const secreto = opcional(fuente, 'SESSION_SECRET')
  if (!secreto) throw new Error('Falta la variable de entorno SESSION_SECRET')

  const puertoTexto = opcional(fuente, 'PORT') ?? '8787'
  const PORT = Number(puertoTexto)
  if (!Number.isInteger(PORT) || PORT <= 0) throw new Error('PORT debe ser un número')

  const BASE_URL = sinBarraFinal(opcional(fuente, 'BASE_URL') ?? `http://localhost:${PORT}`)
  const PANEL_URL = sinBarraFinal(opcional(fuente, 'PANEL_URL') ?? 'http://localhost:5173')
  const PANEL_ORIGIN = sinBarraFinal(opcional(fuente, 'PANEL_ORIGIN') ?? new URL(PANEL_URL).origin)

  return {
    PORT,
    DATABASE_URL: opcional(fuente, 'DATABASE_URL'),
    SESSION_SECRET: secreto,
    BASE_URL,
    PANEL_URL,
    PANEL_ORIGIN,
    WA_TOKEN: opcional(fuente, 'WA_TOKEN'),
    WA_PHONE_ID: opcional(fuente, 'WA_PHONE_ID'),
    WA_APP_SECRET: opcional(fuente, 'WA_APP_SECRET'),
    WA_VERIFY_TOKEN: opcional(fuente, 'WA_VERIFY_TOKEN'),
    WA_NUMERO_BOT: opcional(fuente, 'WA_NUMERO_BOT'),
    GEMINI_API_KEY: opcional(fuente, 'GEMINI_API_KEY'),
    GEMINI_MODEL: opcional(fuente, 'GEMINI_MODEL'),
    SHEETS_ID: opcional(fuente, 'SHEETS_ID'),
    GOOGLE_SA_JSON: opcional(fuente, 'GOOGLE_SA_JSON'),
  }
}
