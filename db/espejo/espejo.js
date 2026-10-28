// Espejo Postgres → Google Sheets (una sola vía).
// Escucha el canal 'espejo' de Postgres y, cuando una tabla cambia, reescribe su pestaña completa.
// Al arrancar (y al reconectar) copia todas las tablas.
//
// Uso: node --env-file=../.env espejo.js

import pg from 'pg'
import { auth, sheets as sheetsApi } from '@googleapis/sheets'

const { DATABASE_URL, SHEET_ID } = process.env
if (!DATABASE_URL || !SHEET_ID) {
  console.error('Faltan DATABASE_URL o SHEET_ID en db/.env')
  process.exit(1)
}

// Google permite 60 escrituras por minuto por cuenta: una escritura cada 2 s como máximo.
const PAUSA_MIN_MS = 2000
const PAUSA_REINTENTO_MS = 5000

// Tablas internas del bot (db/sql/003_bot.sql y 004_equipo.sql). sesiones_panel guarda tokens de entrada
// y solicitudes_equipo, números de gente que no es del equipo.
const NO_COPIAR = new Set(['conversaciones', 'mensajes_wa', 'sesiones_panel', 'solicitudes_equipo'])

// Fechas, horas y números llegan como texto para escribirlos tal cual (hora de Bogotá).
pg.types.setTypeParser(1082, (v) => v)                       // date
pg.types.setTypeParser(1083, (v) => v.slice(0, 5))           // time → HH:MM
pg.types.setTypeParser(1184, (v) => v.slice(0, 19))          // timestamptz → AAAA-MM-DD HH:MM:SS
pg.types.setTypeParser(20, Number)                           // bigint
pg.types.setTypeParser(1700, Number)                         // numeric

const hojas = sheetsApi({
  version: 'v4',
  auth: new auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] }),
})

/** Convierte un valor de Postgres en algo que Sheets muestre bien. */
function aCelda(v) {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) return v.join('; ')
  if (typeof v === 'object') return JSON.stringify(v)
  return v
}

let db
const filasEscritas = new Map() // tabla → filas que tiene hoy la pestaña (con encabezado)
const pendientes = new Set()
let ultimaEscritura = 0
let temporizador = null
let escribiendo = false

async function leerTabla(tabla) {
  const r = await db.query(`SELECT * FROM ${pg.escapeIdentifier(tabla)} ORDER BY 1`)
  const encabezado = r.fields.map((f) => f.name)
  return [encabezado, ...r.rows.map((fila) => encabezado.map((c) => aCelda(fila[c])))]
}

async function crearPestanasFaltantes(tablas) {
  const { data } = await hojas.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties.title' })
  const existentes = new Set(data.sheets.map((s) => s.properties.title))
  const faltan = tablas.filter((t) => !existentes.has(t))
  if (faltan.length === 0) return
  await hojas.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: faltan.map((title) => ({ addSheet: { properties: { title } } })) },
  })
  console.log('Pestañas creadas:', faltan.join(', '))
}

/** Reescribe las pestañas de las tablas dadas en una sola llamada a la API. */
async function escribir(tablas) {
  const data = []
  const largos = new Map()
  for (const tabla of tablas) {
    const valores = await leerTabla(tabla)
    largos.set(tabla, valores.length)
    const ancho = valores[0].length
    const antes = filasEscritas.get(tabla) ?? 0
    // Si la tabla quedó más corta, las filas sobrantes se escriben vacías
    for (let i = valores.length; i < antes; i++) valores.push(Array(ancho).fill(''))
    data.push({ range: `'${tabla}'!A1`, values: valores })
  }
  // RAW: un nombre que empiece por "=" no se vuelve fórmula
  await hojas.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data },
  })
  for (const [tabla, largo] of largos) filasEscritas.set(tabla, largo)
  ultimaEscritura = Date.now()
}

function programar() {
  if (temporizador || escribiendo || pendientes.size === 0) return
  const espera = Math.max(0, ultimaEscritura + PAUSA_MIN_MS - Date.now())
  temporizador = setTimeout(vaciarPendientes, espera)
}

async function vaciarPendientes() {
  temporizador = null
  escribiendo = true
  const tablas = [...pendientes]
  pendientes.clear()
  try {
    await escribir(tablas)
    console.log(new Date().toLocaleTimeString('es-CO'), 'actualizado:', tablas.join(', '))
  } catch (e) {
    console.error('No se pudo escribir en Sheets, se reintenta:', e.message)
    tablas.forEach((t) => pendientes.add(t))
    ultimaEscritura = Date.now() + PAUSA_REINTENTO_MS
  } finally {
    escribiendo = false
    programar()
  }
}

async function copiarTodo() {
  const r = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)
  const tablas = r.rows.map((f) => f.tablename).filter((t) => !NO_COPIAR.has(t))
  await crearPestanasFaltantes(tablas)
  // Se borra todo lo que haya debajo del encabezado y se escribe de nuevo
  await hojas.spreadsheets.values.batchClear({
    spreadsheetId: SHEET_ID,
    requestBody: { ranges: tablas.map((t) => `'${t}'`) },
  })
  filasEscritas.clear()
  await escribir(tablas)
  console.log(`Copia completa: ${tablas.length} tablas`)
}

async function conectar() {
  db = new pg.Client({ connectionString: DATABASE_URL })
  db.on('notification', (n) => {
    if (NO_COPIAR.has(n.payload)) return
    pendientes.add(n.payload)
    programar()
  })
  db.on('error', (e) => reconectar(e))
  await db.connect()
  await db.query(`SET TIME ZONE 'America/Bogota'`)
  await db.query('LISTEN espejo')
  escribiendo = true // los avisos que lleguen durante la copia esperan a que termine
  try {
    pendientes.clear()
    await copiarTodo()
  } finally {
    escribiendo = false
    programar()
  }
  console.log('Escuchando cambios…')
}

let reconectando = false
async function reconectar(e) {
  if (reconectando) return
  reconectando = true
  console.error('Se perdió la conexión:', e?.message ?? e)
  db?.end().catch(() => {})
  for (;;) {
    await new Promise((r) => setTimeout(r, PAUSA_REINTENTO_MS))
    try {
      await conectar()
      break
    } catch (err) {
      console.error('Reintentando:', err.message)
    }
  }
  reconectando = false
}

conectar().catch(reconectar)
