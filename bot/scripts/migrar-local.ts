// Aplica db/sql/*.sql sobre DATABASE_URL (Postgres local con PGlite, sin Docker).
// Con nombres de archivo aplica solo esos: npx tsx --env-file=.env scripts/migrar-local.ts 004_equipo.sql
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) throw new Error('Falta DATABASE_URL')
const cliente = new pg.Client({ connectionString: url })
await cliente.connect()
const carpeta = join(process.cwd(), '..', 'db', 'sql')
const elegidos = process.argv.slice(2)
const archivos = elegidos.length ? elegidos : readdirSync(carpeta).filter((f) => f.endsWith('.sql')).sort()
for (const archivo of archivos) {
  await cliente.query(readFileSync(join(carpeta, archivo), 'utf8'))
  console.log('aplicado', archivo)
}
const { rows } = await cliente.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`)
console.log('tablas:', rows[0].n)
await cliente.end()
