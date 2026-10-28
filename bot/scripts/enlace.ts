// Enlace personal al panel sin pasar por WhatsApp, para probar en el PC.
//
// Uso: npm run enlace -- Carolina      (sirve el nombre o el comienzo: "carol", "don luis", "andres")

import { crearPool } from '../src/datos/db.js'
import { crearRepoPg } from '../src/datos/repo-pg.js'

const sinTildes = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const buscado = sinTildes(process.argv.slice(2).join(' '))
const pool = crearPool(process.env.DATABASE_URL!)

try {
  const { rows } = await pool.query<{ id: number; nombre: string; rol: string }>(
    `SELECT id, nombre, rol FROM usuarios WHERE activo ORDER BY id`,
  )
  const persona = buscado ? rows.find((u) => sinTildes(u.nombre).startsWith(buscado)) : undefined
  if (!persona) {
    console.error(`No encontré a "${process.argv.slice(2).join(' ')}". Personas del equipo:`)
    for (const u of rows) console.error(`  - ${u.nombre} (${u.rol})`)
    process.exitCode = 1
  } else {
    const token = await crearRepoPg(pool).crearSesion(persona.id)
    const panel = (process.env.PANEL_URL ?? 'http://localhost:5173').replace(/\/$/, '')
    console.log(`${persona.nombre} (${persona.rol}): ${panel}/?t=${token}`)
  }
} finally {
  await pool.end()
}
