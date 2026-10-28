// Dibuja todos los informes con los datos de la base, para revisar el diseño sin pasar por WhatsApp.
//
// Uso: npx tsx --env-file=.env scripts/ver-informes.ts [carpeta]      (por defecto, informes/ en la carpeta temporal)

import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { crearPool } from '../src/datos/db.js'
import { crearRepoPg } from '../src/datos/repo-pg.js'
import { armarInforme, TIPOS_INFORME } from '../src/informes/armar.js'
import { crearDibujante } from '../src/informes/dibujar.js'

process.env.TZ = 'America/Bogota'
const carpeta = process.argv[2] ?? join(tmpdir(), 'informes')
const pool = crearPool(process.env.DATABASE_URL!)

try {
  const ahora = new Date()
  const datos = await crearRepoPg(pool).hoy(ahora)
  const dibujar = crearDibujante()
  await mkdir(carpeta, { recursive: true })
  for (const tipo of TIPOS_INFORME) {
    const html = armarInforme(tipo, datos, ahora, true)
    const archivo = join(carpeta, `${tipo}.png`)
    await writeFile(join(carpeta, `${tipo}.html`), html)
    await writeFile(archivo, await dibujar(html))
    console.log(archivo)
  }
} finally {
  await pool.end()
  process.exit()
}
