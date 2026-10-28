// Arranque del servicio: lee .env, conecta Postgres, WhatsApp y Gemini, y abre el puerto.
process.env.TZ = 'America/Bogota'

import { serve } from '@hono/node-server'
import { join } from 'node:path'
import { cargarEventos } from './api/hoy.js'
import { crearApp } from './app.js'
import { crearArchivosDisco } from './datos/archivos.js'
import { crearPool } from './datos/db.js'
import { crearRepoPg } from './datos/repo-pg.js'
import { crearIa } from './ia/gemini.js'
import { crearWa } from './wa/cliente.js'

function exigir(nombre: string): string {
  const v = process.env[nombre]
  if (!v) {
    console.error(`Falta ${nombre} en .env (ver .env.example)`)
    process.exit(1)
  }
  return v
}

const pool = crearPool(exigir('DATABASE_URL'))
const repo = crearRepoPg(pool)
const archivos = crearArchivosDisco(process.env.ARCHIVOS_DIR || join(process.cwd(), 'archivos'))

const app = crearApp({
  deps: {
    repo,
    wa: crearWa({ token: exigir('WA_TOKEN'), phoneId: exigir('WA_PHONE_ID'), version: process.env.WA_API_VERSION || 'v21.0' }),
    ia: crearIa({ apiKey: exigir('GEMINI_API_KEY'), modelo: process.env.GEMINI_MODEL || 'gemini-2.5-flash' }),
    archivos,
    panelUrl: exigir('PANEL_URL'),
    ahora: () => new Date(),
  },
  usuarioPorSesion: repo.usuarioPorSesion,
  eventos: (r) => cargarEventos(pool, r),
  leerArchivo: archivos.leer,
  verifyToken: exigir('WA_VERIFY_TOKEN'),
  appSecret: exigir('WA_APP_SECRET'),
})

const puerto = Number(process.env.PUERTO || 8787)
serve({ fetch: app.fetch, port: puerto }, () => console.log(`Bot de Huellitas escuchando en http://localhost:${puerto}`))
