// Vista previa por defecto. --aplicar prepara los cinco registros sin borrar el resto.
import { CATALOGO_DEMO } from '../src/catalogo/datos.js'
import { crearPool, enTransaccion } from '../src/datos/db.js'

const animales = CATALOGO_DEMO.map(p => ({ nombre: p.nombre, foto: p.fotoRuta }))

async function main() {
  if (!process.argv.includes('--aplicar')) {
    console.log(JSON.stringify({ modo: 'vista_previa', animales, borraOtrosAnimales: false }, null, 2))
    return
  }
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Falta DATABASE_URL: no se modificó ninguna base')
  const pool = crearPool(url)
  try {
    await enTransaccion(pool, async c => {
      // Evita duplicados si dos operadores preparan la misma demo simultáneamente.
      await c.query("SELECT pg_advisory_xact_lock(hashtext('huellitas-catalogo-demo'))")
      for (const a of animales) {
        const { rows } = await c.query<{ id: number; estado: string }>(
          'SELECT id, estado FROM animales WHERE lower(nombre) = lower($1) AND especie = $2 FOR UPDATE', [a.nombre, 'perro'],
        )
        if (rows.length > 1) throw new Error(`Hay varios perros llamados ${a.nombre}; identifica su id antes de asignar una foto`)
        if (rows.length && ['adoptado', 'fallecido'].includes(rows[0].estado)) {
          throw new Error(`${a.nombre} no está disponible; se cancela la preparación sin cambiar su estado`)
        }
        if (rows.length) {
          await c.query('UPDATE animales SET foto_url = $1 WHERE id = $2', [a.foto, rows[0].id])
        } else {
          await c.query(
            `INSERT INTO animales (nombre, especie, estado, foto_url, caracter, advertencias)
             VALUES ($1, 'perro', 'adoptable', $2, $3, $4)`,
            [a.nombre, a.foto, 'Ficha de demostración; identidad y datos por confirmar', ['DEMO: foto asignada para pruebas; no acredita identidad ni disponibilidad real']],
          )
        }
      }
    })
    console.log('Preparados cinco perros con foto; el resto de registros y sus estados se conservan')
  } finally {
    await pool.end()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'No se pudo preparar el catálogo')
  process.exitCode = 1
})
