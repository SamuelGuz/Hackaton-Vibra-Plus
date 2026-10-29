// Arranque del servicio: lee .env, conecta Postgres, WhatsApp y la IA (Gemini y OpenRouter), y abre el puerto.
process.env.TZ = 'America/Bogota'

import { serve } from '@hono/node-server'
import { join } from 'node:path'
import { cargarEventos } from './api/hoy.js'
import { crearApp } from './app.js'
import { crearArchivosDisco } from './datos/archivos.js'
import { crearPool } from './datos/db.js'
import { crearRepoPg } from './datos/repo-pg.js'
import { crearIa } from './ia/gemini.js'
import { crearIaOpenRouter } from './ia/openrouter.js'
import { crearIaConRespaldo, type IaConNombre } from './ia/respaldo.js'
import { armarExterno } from './externo.js'
import { crearDibujante } from './informes/dibujar.js'
import type { Deps, Ia } from './tipos.js'
import { crearWa } from './wa/cliente.js'

const SEGUNDOS_REVISAR_BUZON = 15

function exigir(nombre: string): string {
  const v = process.env[nombre]
  if (!v) {
    console.error(`Falta ${nombre} en .env (ver .env.example)`)
    process.exit(1)
  }
  return v
}

/** Gemini primero; OpenRouter de respaldo. Sirve con una sola de las dos llaves. */
function crearIas(): Ia {
  const ias: IaConNombre[] = []
  if (process.env.GEMINI_API_KEY) {
    ias.push({ nombre: 'Gemini', ia: crearIa({ apiKey: process.env.GEMINI_API_KEY, modelo: process.env.GEMINI_MODEL || 'gemini-2.5-flash' }) })
  }
  if (process.env.OPENROUTER_API_KEY) {
    const modelo = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
    ias.push({ nombre: 'OpenRouter', ia: crearIaOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY, modelo }) })
  }
  if (ias.length === 0) {
    console.error('Falta GEMINI_API_KEY u OPENROUTER_API_KEY en .env (ver .env.example)')
    process.exit(1)
  }
  console.log(`IA: ${ias.map((x) => x.nombre).join(', luego ')}`)
  return crearIaConRespaldo(ias)
}

const pool = crearPool(exigir('DATABASE_URL'))
const repo = crearRepoPg(pool)
const archivos = crearArchivosDisco(process.env.ARCHIVOS_DIR || join(process.cwd(), 'archivos'))

const deps: Deps = {
  repo,
  wa: crearWa({ token: exigir('WA_TOKEN'), phoneId: exigir('WA_PHONE_ID'), version: process.env.WA_API_VERSION || 'v21.0' }),
  ia: crearIas(),
  archivos,
  dibujar: crearDibujante(),
  panelUrl: exigir('PANEL_URL'),
  ahora: () => new Date(),
}

// Catálogo público, agente de adopciones y campañas, en el mismo servidor
const externo = armarExterno(process.env, deps)
console.log(
  externo
    ? `Frente externo: rutas /api/publico/* y agente para números desconocidos${externo.correo.enviador ? '' : ' (campañas sin envío: falta RESEND_API_KEY o SMTP_HOST)'}`
    : 'Frente externo apagado: falta GEMINI_API_KEY',
)

const app = crearApp({
  deps,
  externo,
  usuarioPorSesion: repo.usuarioPorSesion,
  eventos: (r) => cargarEventos(pool, r),
  leerArchivo: archivos.leer,
  verifyToken: exigir('WA_VERIFY_TOKEN'),
  appSecret: exigir('WA_APP_SECRET'),
})

const puerto = Number(process.env.PUERTO || 8787)
serve({ fetch: app.fetch, port: puerto }, () => console.log(`Bot del Refugio Yesenia escuchando en http://localhost:${puerto}`))

// Lo que quedó sin atender si el bot se cayó, y los reintentos que ya tocan
const retomar = () =>
  app
    .retomar()
    .then((n) => n && console.log(`Buzón: retomando ${n} mensaje(s) pendiente(s)`))
    .catch((e) => console.error('No se pudo revisar el buzón:', e))
void retomar()
setInterval(retomar, SEGUNDOS_REVISAR_BUZON * 1000)
